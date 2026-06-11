from datetime import datetime
from pydantic import BaseModel


class SensorReadingOut(BaseModel):
    id: int
    timestamp: datetime
    location: str
    sensor_type: str
    value: float
    unit: str
    status: str

    class Config:
        from_attributes = True


class IncidentOut(BaseModel):
    id: int
    timestamp: datetime
    location: str
    incident_type: str
    severity: str
    cause: str
    action_taken: str
    affected_trains: str
    reasoning: str
    timeline: str

    class Config:
        from_attributes = True


class SimulationRequest(BaseModel):
    scenario: str
    location: str | None = None


class FutureProjection(BaseModel):
    year: int
    passenger_growth: float
    congestion: float
    infrastructure_load: float
    recommendations: list[str]
