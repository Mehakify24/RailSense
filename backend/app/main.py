from __future__ import annotations

import asyncio
import json
import random
from datetime import datetime
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import Base, SessionLocal, engine, get_db
from app.models import AgentAction, Incident, SensorReading
from app.pdf import incident_pdf
from app.railway import (
    SCENARIO_EFFECTS,
    STATIONS,
    ROUTES,
    build_reasoning,
    generate_readings,
    impacted_trains,
    train_positions,
)
from app.schemas import FutureProjection, IncidentOut, SensorReadingOut, SimulationRequest

Base.metadata.create_all(bind=engine)

settings = get_settings()
app = FastAPI(title="Shinkansen Brain API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

state: dict[str, Any] = {
    "ticks": 0,
    "last_payload": None,
    "scenario": None,
    "scenario_location": None,
    "scenario_until": 0,
}


def seed_database() -> None:
    db = SessionLocal()
    try:
        if db.query(Incident).count() > 0:
            return
        for location in ["Delhi", "Jhansi", "Bhopal", "Nagpur"]:
            for reading in generate_readings(location):
                db.add(SensorReading(**reading))
        samples = [
            ("Jhansi", "Track crack", "critical", "Track vibration exceeded safe corridor threshold.", "Rerouted Hikari Sentinel and locked maintenance possession."),
            ("Bhopal", "Bridge stress", "warning", "Bridge stress trending above historical baseline.", "Reduced axle load and dispatched structural inspection team."),
            ("Lucknow", "Signal failure", "critical", "Signal health dropped below fail-safe threshold.", "Activated protected manual block and rerouted express services."),
        ]
        for location, incident_type, severity, cause, action in samples:
            reading = {
                "location": location,
                "sensor_type": "track_vibration" if "Track" in incident_type else "bridge_stress" if "Bridge" in incident_type else "signal_health",
                "value": 8.2 if "Track" in incident_type else 540 if "Bridge" in incident_type else 41,
                "unit": "mm/s" if "Track" in incident_type else "MPa" if "Bridge" in incident_type else "%",
                "status": severity,
            }
            incident = create_incident(db, reading, incident_type)
            incident.cause = cause
            incident.action_taken = action
        db.commit()
    finally:
        db.close()


def create_incident(db: Session, reading: dict, scenario: str | None = None) -> Incident:
    reasoning = build_reasoning(reading, scenario)
    affected = impacted_trains(reading["location"])
    incident = Incident(
        location=reading["location"],
        incident_type=scenario or reasoning["decide"].split(" as ")[-1].split(" with ")[0],
        severity=reading["status"],
        cause=reasoning["detect"],
        action_taken=reasoning["act"],
        affected_trains=", ".join(affected),
        reasoning="\n".join([f"{key.upper()}: {value}" for key, value in reasoning.items()]),
        timeline="\n".join(
            [
                f"{datetime.utcnow().isoformat()}Z DETECT {reasoning['detect']}",
                f"{datetime.utcnow().isoformat()}Z REASON {reasoning['reason']}",
                f"{datetime.utcnow().isoformat()}Z DECIDE {reasoning['decide']}",
                f"{datetime.utcnow().isoformat()}Z ACT {reasoning['act']}",
            ]
        ),
    )
    db.add(incident)
    db.flush()
    for stage, summary in reasoning.items():
        db.add(AgentAction(stage=stage.upper(), summary=summary, incident_id=incident.id))
    db.commit()
    db.refresh(incident)
    return incident


seed_database()


def simulation_tick() -> dict:
    state["ticks"] += 1
    db = SessionLocal()
    try:
        scenario_active = state["scenario"] and state["ticks"] <= state["scenario_until"]
        scenario_location = state["scenario_location"] or random.choice(STATIONS)["name"]
        scenario = state["scenario"] if scenario_active else None
        location = scenario_location if scenario else random.choice(STATIONS)["name"]
        overrides = {}
        if scenario:
            effect = SCENARIO_EFFECTS[scenario]
            overrides[effect["sensor"]] = effect["value"]

        readings_payload = []
        incidents = []
        for station in STATIONS:
            station_overrides = overrides if station["name"] == location else {}
            readings = generate_readings(station["name"], station_overrides)
            for reading in readings:
                row = SensorReading(**reading)
                db.add(row)
                readings_payload.append(reading)
                if reading["status"] == "critical" and len(incidents) < 2:
                    incidents.append(create_incident(db, reading, scenario))
        db.commit()
        latest_actions = db.query(AgentAction).order_by(desc(AgentAction.timestamp)).limit(5).all()
        payload = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "stations": STATIONS,
            "routes": ROUTES,
            "trains": train_positions(state["ticks"]),
            "readings": readings_payload,
            "alerts": [
                {
                    "id": incident.id,
                    "location": incident.location,
                    "type": incident.incident_type,
                    "severity": incident.severity,
                    "action": incident.action_taken,
                    "affected_trains": incident.affected_trains,
                }
                for incident in incidents
            ],
            "agent": [
                {"stage": action.stage, "summary": action.summary, "timestamp": action.timestamp.isoformat()}
                for action in latest_actions
            ],
            "active_scenario": scenario,
        }
        state["last_payload"] = payload
        if state["ticks"] > state["scenario_until"]:
            state["scenario"] = None
        return payload
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "name": "Shinkansen Brain"}


@app.get("/network")
def network():
    return {"stations": STATIONS, "routes": ROUTES, "trains": train_positions(state["ticks"])}


@app.get("/sensors", response_model=list[SensorReadingOut])
def sensors(limit: int = 180, db: Session = Depends(get_db)):
    return db.query(SensorReading).order_by(desc(SensorReading.timestamp)).limit(limit).all()


@app.get("/incidents", response_model=list[IncidentOut])
def incidents(limit: int = 80, db: Session = Depends(get_db)):
    return db.query(Incident).order_by(desc(Incident.timestamp)).limit(limit).all()


@app.post("/simulate", response_model=IncidentOut)
def simulate(request: SimulationRequest, db: Session = Depends(get_db)):
    if request.scenario not in SCENARIO_EFFECTS:
        raise HTTPException(status_code=400, detail="Unknown scenario")
    location = request.location or random.choice(STATIONS)["name"]
    state["scenario"] = request.scenario
    state["scenario_location"] = location
    state["scenario_until"] = state["ticks"] + 4
    effect = SCENARIO_EFFECTS[request.scenario]
    reading = next(item for item in generate_readings(location, {effect["sensor"]: effect["value"]}) if item["sensor_type"] == effect["sensor"])
    reading["status"] = "critical"
    incident = create_incident(db, reading, request.scenario)
    return incident


@app.get("/reports/{incident_id}/pdf")
def report_pdf(incident_id: int, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    sensor_rows = (
        db.query(SensorReading)
        .filter(SensorReading.location == incident.location)
        .order_by(desc(SensorReading.timestamp))
        .limit(30)
        .all()
    )
    pdf_bytes = incident_pdf(incident, sensor_rows)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=incident-{incident_id}-black-box.pdf"},
    )


@app.get("/memory/summary")
def memory_summary(db: Session = Depends(get_db)):
    severity = db.query(Incident.severity, func.count(Incident.id)).group_by(Incident.severity).all()
    by_location = db.query(Incident.location, func.count(Incident.id)).group_by(Incident.location).all()
    by_type = db.query(Incident.incident_type, func.count(Incident.id)).group_by(Incident.incident_type).all()
    return {
        "severity": [{"name": name, "value": value} for name, value in severity],
        "locations": [{"name": name, "value": value} for name, value in by_location],
        "types": [{"name": name, "value": value} for name, value in by_type],
    }


@app.get("/future/{year}", response_model=FutureProjection)
def future(year: int):
    if year < 2026 or year > 2040:
        raise HTTPException(status_code=400, detail="Year must be between 2026 and 2040")
    years = year - 2026
    passenger_growth = round(100 * (1.065**years), 1)
    congestion = min(96, round(28 + years * 4.4 + (years**1.28), 1))
    infrastructure_load = min(98, round(42 + years * 3.7 + (passenger_growth - 100) * 0.21, 1))
    recommendations = [
        "Add predictive maintenance windows on Delhi-Agra and Jhansi-Bhopal corridors.",
        "Deploy bridge stress sensor redundancy before seasonal weather peaks.",
        "Introduce dynamic timetabling for high-growth express demand.",
    ]
    if year >= 2035:
        recommendations.append("Commission dedicated high-speed relief track around Lucknow-Kanpur.")
    return FutureProjection(
        year=year,
        passenger_growth=passenger_growth,
        congestion=congestion,
        infrastructure_load=infrastructure_load,
        recommendations=recommendations,
    )


@app.websocket("/ws/live")
async def live(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.send_text(json.dumps(simulation_tick(), default=str))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        return
