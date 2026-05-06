from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import datetime
import asyncio
import random

import models, schemas, database, websocket_manager
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Parking Friction Predictor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock Capacity
TOTAL_CAPACITY = 100

@app.on_event("startup")
async def startup_event():
    db = database.SessionLocal()
    try:
        # Check if we already have data
        count = db.query(models.Vehicle).count()
        if count == 0:
            print("Populating initial data...")
            now = datetime.datetime.utcnow()
            default_vehicles = [
                {"lp": "GAD-1029", "mins": 45},
                {"lp": "KLI-9921", "mins": 120},
                {"lp": "TR-552", "mins": 10},
                {"lp": "B-9912", "mins": 30},
                {"lp": "JET-007", "mins": 5}
            ]
            for dv in default_vehicles:
                entry = now - datetime.timedelta(minutes=dv["mins"])
                v = models.Vehicle(license_plate=dv["lp"], entry_time=entry, is_active=True)
                db.add(v)
            
            # Add some completed entries for revenue
            v_exit = models.Vehicle(
                license_plate="REV-101", 
                entry_time=now - datetime.timedelta(hours=5),
                exit_time=now - datetime.timedelta(hours=1),
                fee=37.0,
                is_active=False
            )
            db.add(v_exit)
            
            db.commit()
    finally:
        db.close()

def calculate_fee(entry_time: datetime.datetime, exit_time: datetime.datetime):
    duration = exit_time - entry_time
    hours = duration.total_seconds() / 3600
    
    if hours <= 1:
        return 5.0
    else:
        # $5 for first hour, $8 for every subsequent hour (simplified)
        return 5.0 + (hours - 1) * 8.0

async def get_dashboard_data(db: Session):
    active_vehicles = db.query(models.Vehicle).filter(models.Vehicle.is_active == True).all()
    occupancy = len(active_vehicles)
    
    # Revenue from exits today
    today = datetime.datetime.utcnow().date()
    finished_today = db.query(models.Vehicle).filter(
        models.Vehicle.is_active == False,
        models.Vehicle.exit_time >= datetime.datetime.combine(today, datetime.time.min)
    ).all()
    total_revenue = sum(v.fee for v in finished_today)

    # Prediction Logic
    prediction_alert = None
    
    # Check entries/exits in last 10 mins
    ten_mins_ago = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
    recent_entries = db.query(models.Vehicle).filter(models.Vehicle.entry_time >= ten_mins_ago).count()
    recent_exits = db.query(models.Vehicle).filter(models.Vehicle.exit_time >= ten_mins_ago).count()
    
    occupancy_rate = occupancy / TOTAL_CAPACITY
    
    if occupancy_rate > 0.8 and recent_entries > recent_exits:
        net_rate = (recent_entries - recent_exits) / 10 # vehicles per min
        if net_rate > 0:
            mins_to_full = int((TOTAL_CAPACITY - occupancy) / net_rate)
            prediction_alert = f"Lot {int(occupancy_rate*100)}% full → full in {max(1, mins_to_full)} mins"
    
    if recent_exits > 5:
        prediction_alert = prediction_alert or "Exit congestion expected due to high volume"

    if occupancy_rate > 0.9:
        prediction_alert = prediction_alert or "High frustration period: Lot nearly full"

    # Experience Score (0-10)
    # Penalize high occupancy and congestion
    score = 10.0 - (occupancy_rate * 6) - (min(recent_exits, 10) / 10 * 4)
    score = max(0, min(10, score))

    congestion_level = "Low"
    if occupancy_rate > 0.5: congestion_level = "Moderate"
    if occupancy_rate > 0.8 or recent_exits > 5: congestion_level = "High"

    return {
        "occupancy": occupancy,
        "available_spots": TOTAL_CAPACITY - occupancy,
        "active_vehicles": occupancy,
        "total_revenue": round(total_revenue, 2),
        "prediction_alert": prediction_alert,
        "experience_score": round(score, 1),
        "congestion_level": congestion_level
    }

@app.post("/vehicles/entry", response_model=schemas.Vehicle)
async def vehicle_entry(vehicle: schemas.VehicleCreate, db: Session = Depends(get_db)):
    # Normalize license plate
    lp = vehicle.license_plate.strip().upper()
    
    # 1. Capacity Check
    occupancy = db.query(models.Vehicle).filter(models.Vehicle.is_active == True).count()
    if occupancy >= TOTAL_CAPACITY:
        raise HTTPException(status_code=400, detail="Parking lot is full")

    # 2. Duplicate Entry Check
    existing = db.query(models.Vehicle).filter(models.Vehicle.license_plate == lp, models.Vehicle.is_active == True).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Vehicle {lp} is already in the lot")
    
    db_vehicle = models.Vehicle(license_plate=lp)
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    
    # Broadcast update
    stats = await get_dashboard_data(db)
    await websocket_manager.manager.broadcast({"type": "STATS_UPDATE", "data": stats})
    
    return db_vehicle

@app.post("/vehicles/exit/{license_plate}", response_model=schemas.Vehicle)
async def vehicle_exit(license_plate: str, db: Session = Depends(get_db)):
    lp = license_plate.strip().upper()
    db_vehicle = db.query(models.Vehicle).filter(models.Vehicle.license_plate == lp, models.Vehicle.is_active == True).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle {lp} not found in the lot")
    
    db_vehicle.exit_time = datetime.datetime.utcnow()
    db_vehicle.is_active = False
    db_vehicle.fee = calculate_fee(db_vehicle.entry_time, db_vehicle.exit_time)
    
    db.commit()
    db.refresh(db_vehicle)
    
    # Broadcast update
    stats = await get_dashboard_data(db)
    await websocket_manager.manager.broadcast({"type": "STATS_UPDATE", "data": stats})
    
    return db_vehicle

@app.get("/vehicles/active", response_model=List[schemas.Vehicle])
async def get_active_vehicles(db: Session = Depends(get_db)):
    return db.query(models.Vehicle).filter(models.Vehicle.is_active == True).order_by(models.Vehicle.entry_time.desc()).all()

@app.get("/dashboard", response_model=schemas.DashboardStats)
async def dashboard(db: Session = Depends(get_db)):
    return await get_dashboard_data(db)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket_manager.manager.connect(websocket)
    try:
        while True:
            # Just keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.manager.disconnect(websocket)

@app.post("/simulate/rush-hour")
async def simulate_rush_hour(params: schemas.SimulationParams, db: Session = Depends(get_db)):
    # Calculate remaining capacity
    current_occupancy = db.query(models.Vehicle).filter(models.Vehicle.is_active == True).count()
    remaining = TOTAL_CAPACITY - current_occupancy
    
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="Cannot simulate rush hour: Lot is already full")
    
    count = min(params.count, remaining)
    
    # Add multiple vehicles with random entry times in last hour
    now = datetime.datetime.utcnow()
    for i in range(count):
        lp = f"SIM-{random.randint(10000, 99999)}" # Larger range to avoid collisions
        entry = now - datetime.timedelta(minutes=random.randint(0, 60))
        v = models.Vehicle(license_plate=lp, entry_time=entry, is_active=True)
        db.add(v)
    
    db.commit()
    stats = await get_dashboard_data(db)
    await websocket_manager.manager.broadcast({"type": "STATS_UPDATE", "data": stats})
    return {"message": f"Simulated {count} vehicles (Requested {params.count})"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
