from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import database
import models
import seed
from prediction_engine import (
    predict_landslide_risk,
    get_regional_susceptibility_heatmap,
    get_neighborhood_susceptibility_heatmap
)

app = FastAPI(
    title="NE India Landslide Early-Warning System API",
    description="Backend services for spatial susceptibility and trigger risk live inference.",
    version="1.0.0",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    seed.init_and_seed_db()

class PredictRequest(BaseModel):
    lat: float = Field(..., example=27.33, description="Latitude coordinate in NER India")
    lon: float = Field(..., example=88.61, description="Longitude coordinate in NER India")

class NeighborhoodHeatmapRequest(BaseModel):
    lat: float = Field(..., example=27.33, description="Target latitude")
    lon: float = Field(..., example=88.61, description="Target longitude")
    radius_km: float = Field(20.0, description="Spatial search radius in kilometers")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Landslide Early-Warning API"}

@app.get("/api/users")
def get_users(db: Session = Depends(database.get_db)):
    users = db.query(models.User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.name if u.role else None,
        }
        for u in users
    ]

@app.post("/api/predict")
def predict_landslide(req: PredictRequest, db: Session = Depends(database.get_db)):
    try:
        result = predict_landslide_risk(req.lat, req.lon)
        
        # Check if score exceeds threshold for Alert Generation
        if result["raw_score"] >= 0.60:
            admin_role = db.query(models.Role).filter(models.Role.name == "Admin").first()
            user_role = db.query(models.Role).filter(models.Role.name == "User").first()
            
            new_alert = models.Alert(
                message="CRITICAL LANDSLIDE RISK DETECTED: Prediction score exceeded safety threshold. Please stay alert and follow standard operating procedures.",
                latitude=req.lat,
                longitude=req.lon,
                severity=result["severity_level"],
                created_by_role_id=admin_role.id if admin_role else None,
                target_role_id=user_role.id if user_role else None
            )
            db.add(new_alert)
            db.commit()

        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/api/alerts")
def get_alerts(db: Session = Depends(database.get_db)):
    alerts = db.query(models.Alert).order_by(models.Alert.timestamp.desc()).all()
    return [
        {
            "id": a.id,
            "message": a.message,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "severity": a.severity,
            "timestamp": a.timestamp,
            "is_active": a.is_active,
        }
        for a in alerts
    ]

@app.get("/api/heatmap/regional")
def get_regional_heatmap(step: int = 1):
    """Returns spatial susceptibility grid points for NE India admin heatmap layer."""
    try:
        points = get_regional_susceptibility_heatmap(step=step)
        return {
            "status": "success",
            "count": len(points),
            "data": points
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Regional heatmap error: {str(e)}")


@app.post("/api/heatmap/neighborhood")
def get_neighborhood_heatmap(req: NeighborhoodHeatmapRequest):
    """Returns local grid susceptibility points surrounding a user selected pinpoint."""
    try:
        points = get_neighborhood_susceptibility_heatmap(req.lat, req.lon, radius_km=req.radius_km)
        return {
            "status": "success",
            "center": {"lat": req.lat, "lon": req.lon},
            "radius_km": req.radius_km,
            "count": len(points),
            "data": points
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Neighborhood heatmap error: {str(e)}")

class IncidentVerifyRequest(BaseModel):
    notes: str
    severity: str

@app.get("/api/field/situational")
def get_situational_data(db: Session = Depends(database.get_db)):
    """Unified endpoint for map rendering of active incidents and infrastructure."""
    incidents = db.query(models.Incident).all()
    infrastructure = db.query(models.Infrastructure).all()
    
    return {
        "status": "success",
        "incidents": [
            {
                "id": i.id, "category": i.category, "description": i.description,
                "status": i.status, "risk_level": i.risk_level, 
                "lat": i.latitude, "lon": i.longitude, "timestamp": i.timestamp
            } for i in incidents
        ],
        "infrastructure": [
            {
                "id": inf.id, "name": inf.name, "type": inf.type,
                "status": inf.status, "lat": inf.latitude, "lon": inf.longitude
            } for inf in infrastructure
        ]
    }

@app.get("/api/field/tasks")
def get_field_tasks(db: Session = Depends(database.get_db)):
    """Fetch assigned tasks (mocking field_officer_1 login for MVP)."""
    user = db.query(models.User).filter(models.User.username == "field_officer_1").first()
    if not user:
        return []
        
    tasks = db.query(models.FieldTask).filter(models.FieldTask.assigned_to == user.id).all()
    
    result = []
    for t in tasks:
        inc = db.query(models.Incident).filter(models.Incident.id == t.incident_id).first()
        result.append({
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "incident": {
                "id": inc.id,
                "category": inc.category,
                "lat": inc.latitude,
                "lon": inc.longitude,
                "description": inc.description
            } if inc else None
        })
    return result

@app.post("/api/field/tasks/{task_id}/status")
def update_task_status(task_id: int, req: dict, db: Session = Depends(database.get_db)):
    task = db.query(models.FieldTask).filter(models.FieldTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = req.get("status", task.status)
    db.commit()
    return {"status": "success", "new_status": task.status}

@app.post("/api/field/incidents/{incident_id}/verify")
def verify_incident(incident_id: int, req: IncidentVerifyRequest, db: Session = Depends(database.get_db)):
    inc = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    inc.status = "Verified"
    inc.risk_level = req.severity
    inc.description = inc.description + f" [FIELD VERIFICATION: {req.notes}]"
    db.commit()
    return {"status": "success", "incident_id": inc.id}

@app.post("/api/field/assistance")
def request_assistance(req: PredictRequest, db: Session = Depends(database.get_db)):
    """Trigger an emergency backup request alert."""
    new_alert = models.Alert(
        message="URGENT: Field Officer requesting immediate backup/assistance at location.",
        latitude=req.lat,
        longitude=req.lon,
        severity="Critical",
        is_active=True
    )
    db.add(new_alert)
    db.commit()
    return {"status": "success", "message": "Assistance request broadcasted"}

@app.post("/api/analyze-media")
async def analyze_media(file: UploadFile = File(...), lat: float = Form(None), lon: float = Form(None)):
    """Simulates AI image analysis for landslide damage/risk with Geotag processing."""
    import asyncio
    await asyncio.sleep(1.5) # Simulate processing time
    
    # Mock AI response based on filename or just generic
    risk_level = "High" if "crack" in file.filename.lower() or "debris" in file.filename.lower() else "Moderate"
    damage_est = "Significant slope failure detected." if risk_level == "High" else "Minor surface soil movement."
    
    return {
        "status": "success",
        "filename": file.filename,
        "geotag_extracted": {"lat": lat, "lon": lon} if lat and lon else None,
        "analysis": {
            "risk_level": risk_level,
            "damage_estimate": damage_est,
            "confidence": 0.89,
            "action_required": "Deploy rapid response team" if risk_level == "High" else "Monitor next 24h"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
