from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class VehicleBase(BaseModel):
    license_plate: str = Field(..., min_length=1, max_length=15)

class VehicleCreate(VehicleBase):
    pass

class Vehicle(VehicleBase):
    id: int
    entry_time: datetime
    exit_time: Optional[datetime] = None
    fee: float
    is_active: bool

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    occupancy: int
    available_spots: int
    active_vehicles: int
    total_revenue: float
    prediction_alert: Optional[str] = None
    experience_score: float
    congestion_level: str

class SimulationParams(BaseModel):
    count: int
