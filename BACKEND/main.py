from fastapi import FastAPI, HTTPException, Depends
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
def predict_landslide(req: PredictRequest):
    try:
        result = predict_landslide_risk(req.lat, req.lon)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

