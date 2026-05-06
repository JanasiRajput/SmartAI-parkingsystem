from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean
from database import Base
import datetime

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    license_plate = Column(String, index=True)
    entry_time = Column(DateTime, default=datetime.datetime.utcnow)
    exit_time = Column(DateTime, nullable=True)
    fee = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)

class ParkingStats(Base):
    __tablename__ = "stats"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    occupancy = Column(Integer)
    revenue = Column(Float)
