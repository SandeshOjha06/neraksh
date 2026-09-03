import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, AlertCircle, CheckCircle2, CloudRain, Mountain, Activity, X, Compass } from 'lucide-react';
import GisRasterHeatmapLayer from '../components/GisRasterHeatmapLayer';

// Custom pin icon for tap location
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

export default function UserPredictionView() {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [neighborhoodHeatmap, setNeighborhoodHeatmap] = useState([]);
  const [error, setError] = useState(null);

  const handleLocationSelect = async (point) => {
    setSelectedPoint(point);
    setPredictionResult(null);
    setError(null);

    // Immediately fetch neighborhood susceptibility heatmap around tapped point
    try {
      const latVal = parseFloat(point.lat.toFixed(4));
      const lonVal = parseFloat(point.lon.toFixed(4));
      const heatRes = await fetch('http://localhost:8000/api/heatmap/neighborhood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: latVal, lon: lonVal, radius_km: 30.0 }),
      });
      if (heatRes.ok) {
        const heatData = await heatRes.json();
        if (heatData.data) {
          setNeighborhoodHeatmap(heatData.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch neighborhood heatmap:', err);
    }
  };

  const handleCancel = () => {
    setSelectedPoint(null);
    setPredictionResult(null);
    setNeighborhoodHeatmap([]);
    setError(null);
  };

  const handlePredict = async () => {
    if (!selectedPoint) return;
    setLoading(true);
    setError(null);
    setPredictionResult(null);

    try {
      const latVal = parseFloat(selectedPoint.lat.toFixed(4));
      const lonVal = parseFloat(selectedPoint.lon.toFixed(4));

      const [predRes, heatRes] = await Promise.all([
        fetch('http://localhost:8000/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: latVal, lon: lonVal }),
        }),
        fetch('http://localhost:8000/api/heatmap/neighborhood', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: latVal, lon: lonVal, radius_km: 30.0 }),
        })
      ]);

      if (!predRes.ok) {
        throw new Error(`Prediction API returned status ${predRes.status}`);
      }

      const resData = await predRes.json();
      setPredictionResult(resData.data);

      if (heatRes.ok) {
        const heatData = await heatRes.json();
        if (heatData.data) {
          setNeighborhoodHeatmap(heatData.data);
        }
      }
    } catch (err) {
      console.error('Prediction / Heatmap API Error:', err);
      setError('Could not complete live prediction. Ensure FastAPI backend is running at http://localhost:8000.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'Low':
        return { bg: 'var(--risk-low-bg)', text: 'var(--risk-low)', border: 'rgba(21, 148, 71, 0.4)' };
      case 'Moderate':
        return { bg: 'var(--risk-moderate-bg)', text: 'var(--risk-moderate)', border: 'rgba(217, 164, 65, 0.4)' };
      case 'High':
        return { bg: 'var(--risk-high-bg)', text: 'var(--risk-high)', border: 'rgba(229, 122, 23, 0.4)' };
      case 'Critical':
        return { bg: 'var(--risk-critical-bg)', text: 'var(--risk-critical)', border: 'rgba(201, 42, 42, 0.4)' };
      default:
        return { bg: 'var(--neutral-100)', text: 'var(--neutral-800)', border: 'var(--neutral-300)' };
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', position: 'relative' }}>
      {/* Left / Bottom Floating Sidebar Panel for User Results */}
      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
        <MapContainer
          center={[26.20, 92.50]}
          zoom={7}
          minZoom={7}
          maxZoom={15}
          maxBounds={[[21.0, 87.5], [30.5, 98.0]]}
          maxBoundsViscosity={1.0}
          style={{ width: '100%', height: '100%' }}
        >

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onLocationSelect={handleLocationSelect} />

          {/* Scientific GIS Raster Susceptibility Heatmap Layer around pinpoint */}
          {neighborhoodHeatmap.length > 0 && (
            <GisRasterHeatmapLayer
              points={neighborhoodHeatmap}
              cellSizeDeg={0.05}
              showLandslidePoints={true}
              opacity={0.85}
            />
          )}


          {selectedPoint && (
            <Marker
              key={`${selectedPoint.lat}-${selectedPoint.lon}`}
              position={[selectedPoint.lat, selectedPoint.lon]}
              icon={defaultIcon}
              eventHandlers={{
                add: (e) => {
                  e.target.openPopup();
                },
              }}
            >
              <Popup autoPan={true} closeButton={false}>
                <div style={{ width: '220px', padding: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-600)', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <MapPin size={14} color="var(--primary-600)" />
                    Selected Coordinates
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neutral-900)', marginBottom: '12px' }}>
                    {selectedPoint.lat.toFixed(4)}°N, {selectedPoint.lon.toFixed(4)}°E
                  </div>

                  {!loading && !predictionResult && (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel();
                        }}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePredict();
                        }}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Predict Landslide
                      </button>
                    </div>
                  )}

                  {loading && (
                    <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div className="spinner" style={{ borderTopColor: 'var(--primary-600)', borderColor: 'var(--neutral-200)', width: '24px', height: '24px' }}></div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary-700)' }}>
                        Fetching DEM & neighborhood grid...
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--neutral-500)' }}>
                        Running XGBoost inference engine
                      </div>
                    </div>
                  )}

                  {predictionResult && (
                    <div style={{ fontSize: '12px', color: 'var(--secondary-700)', fontWeight: 600 }}>
                      Prediction & Neighborhood Heatmap Ready!
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>


        {/* Map Instruction Banner */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ffffff',
          border: '1px solid var(--neutral-300)',
          borderRadius: '24px',
          padding: '8px 20px',
          boxShadow: '0 4px 12px rgba(15, 39, 71, 0.12)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--primary-900)'
        }}>
          <Compass size={16} color="var(--primary-600)" />
          Tap any location in North East India to analyze landslide risk
        </div>
      </div>

      {/* Result Panel (Appears when prediction is completed) */}
      {predictionResult && (
        <div style={{
          width: '380px',
          backgroundColor: '#ffffff',
          borderLeft: '1px solid var(--neutral-200)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 16px rgba(15, 39, 71, 0.08)',
          zIndex: 1000,
          overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            backgroundColor: 'var(--primary-900)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="var(--secondary-500)" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>On-Demand Risk Analysis</h3>
            </div>
            <button
              onClick={handleCancel}
              style={{ background: 'none', border: 'none', color: 'var(--neutral-400)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Severity Card */}
            {(() => {
              const sev = getSeverityStyle(predictionResult.severity_level);
              return (
                <div style={{
                  backgroundColor: sev.bg,
                  border: `1px solid ${sev.border}`,
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: sev.text, marginBottom: '4px' }}>
                    Assessed Severity Level
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: sev.text, marginBottom: '8px' }}>
                    {predictionResult.severity_level.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--neutral-700)' }}>
                    Combined Risk Score: <strong>{(predictionResult.raw_score * 100).toFixed(1)}%</strong>
                  </div>
                </div>
              );
            })()}

            {/* Model Sub-scores */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ backgroundColor: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase' }}>Terrain Susceptibility</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-800)', marginTop: '2px' }}>
                  {(predictionResult.susceptibility_score * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '10px', color: 'var(--neutral-500)' }}>Model v3 (9 static features)</div>
              </div>

              <div style={{ backgroundColor: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase' }}>Dynamic Trigger</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--secondary-800)', marginTop: '2px' }}>
                  {(predictionResult.trigger_score * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '10px', color: 'var(--neutral-500)' }}>NASA Rain + MODIS NDVI</div>
              </div>
            </div>

            {/* Feature Breakdown */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neutral-900)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mountain size={16} color="var(--primary-600)" />
                Extracted Terrain Features
              </h4>
              <div style={{ backgroundColor: 'var(--neutral-50)', borderRadius: '8px', border: '1px solid var(--neutral-200)', padding: '12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--neutral-600)' }}>Elevation:</span>
                  <strong>{predictionResult.features.terrain.elevation.toFixed(1)} m</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--neutral-600)' }}>Slope Angle:</span>
                  <strong>{predictionResult.features.terrain.slope_deg.toFixed(1)}°</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--neutral-600)' }}>Relief Amplitude:</span>
                  <strong>{predictionResult.features.terrain.relief_amplitude.toFixed(1)} m</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--neutral-600)' }}>Surface Roughness:</span>
                  <strong>{predictionResult.features.terrain.roughness.toFixed(1)}</strong>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neutral-900)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CloudRain size={16} color="var(--secondary-600)" />
                Dynamic Environmental Triggers
              </h4>
              <div style={{ backgroundColor: 'var(--neutral-50)', borderRadius: '8px', border: '1px solid var(--neutral-200)', padding: '12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--neutral-600)' }}>Rainfall (1-Day):</span>
                  <strong>{predictionResult.features.trigger.rain_1d.toFixed(1)} mm</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--neutral-600)' }}>Antecedent Rain (7-Day):</span>
                  <strong>{predictionResult.features.trigger.rain_7d.toFixed(1)} mm</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--neutral-600)' }}>Antecedent Rain (30-Day):</span>
                  <strong>{predictionResult.features.trigger.rain_30d.toFixed(1)} mm</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--neutral-600)' }}>MODIS Vegetation Index (NDVI):</span>
                  <strong>{predictionResult.features.trigger.ndvi.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={handleCancel} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          backgroundColor: 'var(--risk-critical-bg)',
          border: '1px solid var(--risk-critical)',
          color: 'var(--risk-critical)',
          borderRadius: '8px',
          padding: '12px 16px',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          maxWidth: '400px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
