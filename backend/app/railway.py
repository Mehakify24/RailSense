from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime


STATIONS = [
    {"name": "Delhi", "x": 13, "y": 18},
    {"name": "Agra", "x": 28, "y": 31},
    {"name": "Jhansi", "x": 42, "y": 48},
    {"name": "Bhopal", "x": 57, "y": 63},
    {"name": "Nagpur", "x": 73, "y": 78},
    {"name": "Kanpur", "x": 40, "y": 24},
    {"name": "Lucknow", "x": 53, "y": 18},
]

ROUTES = [
    ("Delhi", "Agra"),
    ("Agra", "Jhansi"),
    ("Jhansi", "Bhopal"),
    ("Bhopal", "Nagpur"),
    ("Delhi", "Kanpur"),
    ("Kanpur", "Lucknow"),
    ("Lucknow", "Jhansi"),
]

TRAINS = [
    {"id": "SB-01", "name": "Hikari Sentinel", "route": ["Delhi", "Agra", "Jhansi", "Bhopal", "Nagpur"], "speed": 0.018},
    {"id": "SB-02", "name": "Nozomi North", "route": ["Lucknow", "Kanpur", "Delhi", "Agra"], "speed": 0.022},
    {"id": "SB-03", "name": "Kodama Relief", "route": ["Nagpur", "Bhopal", "Jhansi", "Lucknow"], "speed": 0.016},
]

SENSOR_PROFILES = {
    "track_vibration": {"unit": "mm/s", "normal": (0.8, 3.4), "warning": 5.8, "critical": 7.5},
    "track_temperature": {"unit": "C", "normal": (28, 48), "warning": 58, "critical": 66},
    "bridge_stress": {"unit": "MPa", "normal": (120, 310), "warning": 430, "critical": 520},
    "signal_health": {"unit": "%", "normal": (92, 100), "warning": 78, "critical": 62},
    "weather": {"unit": "risk", "normal": (8, 42), "warning": 68, "critical": 82},
}

SCENARIO_EFFECTS = {
    "Flood": {"sensor": "weather", "value": 92, "type": "Flood risk", "action": "Reduce speeds and reroute exposed services to elevated track"},
    "Earthquake": {"sensor": "track_vibration", "value": 9.4, "type": "Seismic vibration", "action": "Emergency stop, dispatch inspection drones, isolate corridor"},
    "Track Crack": {"sensor": "track_vibration", "value": 8.6, "type": "Track crack", "action": "Reroute train and lock maintenance possession"},
    "Signal Failure": {"sensor": "signal_health", "value": 38, "type": "Signal failure", "action": "Switch to protected manual block and reroute priority trains"},
    "Bridge Failure": {"sensor": "bridge_stress", "value": 610, "type": "Bridge stress", "action": "Close bridge segment and dispatch structural response team"},
}


@dataclass
class TrainState:
    train_id: str
    segment_index: int
    progress: float


def classify(sensor_type: str, value: float) -> str:
    profile = SENSOR_PROFILES[sensor_type]
    if sensor_type == "signal_health":
        if value <= profile["critical"]:
            return "critical"
        if value <= profile["warning"]:
            return "warning"
        return "normal"
    if value >= profile["critical"]:
        return "critical"
    if value >= profile["warning"]:
        return "warning"
    return "normal"


def generate_readings(location: str, overrides: dict[str, float] | None = None) -> list[dict]:
    readings = []
    overrides = overrides or {}
    for sensor_type, profile in SENSOR_PROFILES.items():
        low, high = profile["normal"]
        value = overrides.get(sensor_type, random.uniform(low, high))
        if random.random() < 0.035 and sensor_type != "signal_health":
            value *= random.uniform(1.32, 1.85)
        if random.random() < 0.025 and sensor_type == "signal_health":
            value -= random.uniform(18, 36)
        readings.append(
            {
                "timestamp": datetime.utcnow(),
                "location": location,
                "sensor_type": sensor_type,
                "value": round(value, 2),
                "unit": profile["unit"],
                "status": classify(sensor_type, value),
            }
        )
    return readings


def train_positions(ticks: int) -> list[dict]:
    positions = []
    station_lookup = {station["name"]: station for station in STATIONS}
    for train in TRAINS:
        route = train["route"]
        segment_count = len(route) - 1
        travel = (ticks * train["speed"]) % segment_count
        segment_index = int(travel)
        progress = travel - segment_index
        start = station_lookup[route[segment_index]]
        end = station_lookup[route[segment_index + 1]]
        positions.append(
            {
                **train,
                "from": start["name"],
                "to": end["name"],
                "x": round(start["x"] + (end["x"] - start["x"]) * progress, 2),
                "y": round(start["y"] + (end["y"] - start["y"]) * progress, 2),
                "progress": round(progress, 3),
            }
        )
    return positions


def impacted_trains(location: str) -> list[str]:
    affected = []
    for train in TRAINS:
        if location in train["route"]:
            affected.append(f"{train['id']} {train['name']}")
    return affected


def build_reasoning(reading: dict, scenario: str | None = None) -> dict:
    historical = random.randint(2, 9)
    risk = "critical" if reading["status"] == "critical" else "elevated"
    incident_type = scenario or reading["sensor_type"].replace("_", " ").title()
    action_map = {
        "track_vibration": "Reroute nearest trains, reduce corridor speed to 40 km/h, and request ultrasonic inspection.",
        "track_temperature": "Apply heat-speed restriction and schedule track geometry validation.",
        "bridge_stress": "Close bridge approach, shift trains to alternate corridor, and dispatch structural engineers.",
        "signal_health": "Activate protected manual block, fail closed, and reroute express services.",
        "weather": "Pre-position response crews, slow services, and avoid flood-prone segment.",
    }
    action = action_map[reading["sensor_type"]]
    return {
        "detect": f"{reading['sensor_type'].replace('_', ' ')} at {reading['location']} reached {reading['value']} {reading['unit']}.",
        "reason": f"Risk is {risk}; {historical} similar historical patterns were found under comparable operating conditions.",
        "decide": f"Classify as {incident_type} with {reading['status']} severity.",
        "act": action,
        "report": "Incident timeline and black-box PDF are ready for operations review.",
    }
