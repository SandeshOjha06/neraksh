import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, AlertCircle, CloudRain, Mountain,
  Activity, X, Compass, Bell, Camera,
  PhoneCall, Sparkles, FileText
} from 'lucide-react';
import GisRasterHeatmapLayer from '../components/GisRasterHeatmapLayer';
import MarkdownRenderer from '../components/MarkdownRenderer';

// Custom pin icon for tap location
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const officerIcon = L.icon({
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

  // Field Operations State
  const [situationalData, setSituationalData] = useState({ incidents: [], infrastructure: [] });
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('alerts');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [verifySeverity, setVerifySeverity] = useState("Moderate");

  const officerLat = 27.33;
  const officerLon = 88.61;

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchData = async () => {
    try {
      const [sitRes, alertRes] = await Promise.all([
        fetch('http://localhost:8000/api/field/situational'),
        fetch('http://localhost:8000/api/alerts')
      ]);

      if (sitRes.ok) setSituationalData((await sitRes.json()) || { incidents: [], infrastructure: [] });
      if (alertRes.ok) {
        const al = await alertRes.json();
        setAlerts(al);
      }
    } catch (e) {
      console.error("Error fetching field data:", e);
    }
  };

  const handleLocationSelect = async (point) => {
    setSelectedPoint(point);
    setPredictionResult(null);
    setError(null);

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

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await fetch(`http://localhost:8000/api/field/tasks/${taskId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchData();
    } catch (e) {
      console.error("Error updating task:", e);
    }
  };

  const submitVerification = async () => {
    if (!selectedIncident) return;
    try {
      await fetch(`http://localhost:8000/api/field/incidents/${selectedIncident.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: verifyNotes, severity: verifySeverity })
      });
      setShowVerifyModal(false);
      setVerifyNotes("");
      setSelectedIncident(null);
      fetchData();
    } catch (e) {
      console.error("Error verifying incident:", e);
    }
  };

  const requestBackup = async () => {
    if (window.confirm("Broadcast URGENT backup request to NDMA?")) {
      try {
        await fetch('http://localhost:8000/api/field/assistance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: officerLat, lon: officerLon })
        });
        alert("Backup request broadcasted successfully.");
      } catch (e) {
        console.error("Failed to request backup:", e);
      }
    }
  };

  const openVerifyModal = (incident) => {
    setSelectedIncident(incident);
    setShowVerifyModal(true);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative' }}>

      {/* Top Banner (Officer Status) */}
      <div style={{
        backgroundColor: '#0f2747',
        color: '#ffffff',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 500
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            RG
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>Rajesh Gogoi</div>
            <div style={{ fontSize: '12px', color: 'var(--neutral-300)' }}>Assam NDRF Field Unit 4 • GPS: ACTIVE</div>
          </div>
        </div>
        <button
          onClick={requestBackup}
          style={{
            backgroundColor: 'var(--risk-critical)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <PhoneCall size={16} />
          EMERGENCY BACKUP
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, height: '100%', position: 'relative' }}>

        {/* Field Ops Left Sidebar */}
        <div style={{
          width: '440px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid var(--neutral-200)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          boxShadow: '4px 0 16px rgba(0,0,0,0.05)'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--neutral-200)' }}>
            <button
              onClick={() => setActiveTab('alerts')}
              style={{ flex: 1, padding: '16px 0', fontWeight: 700, backgroundColor: activeTab === 'alerts' ? '#fff' : '#f8f9fa', border: 'none', borderBottom: activeTab === 'alerts' ? '2px solid var(--primary-600)' : '2px solid transparent', cursor: 'pointer' }}
            >
              Alert Notifications
            </button>
            <button
              onClick={() => setActiveTab('incidents')}
              style={{ flex: 1, padding: '16px 0', fontWeight: 700, backgroundColor: activeTab === 'incidents' ? '#fff' : '#f8f9fa', border: 'none', borderBottom: activeTab === 'incidents' ? '2px solid var(--primary-600)' : '2px solid transparent', cursor: 'pointer' }}
            >
              Live Map Data
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {activeTab === 'alerts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={18} color="var(--risk-critical)" />
                  Active Alerts
                </h3>
                {alerts.length === 0 ? (
                  <p style={{ color: 'var(--neutral-500)', fontSize: '13px' }}>No active alerts in your area.</p>
                ) : (
                  alerts.map(a => (
                    <div key={a.id} style={{
                      border: '1px solid var(--risk-critical)',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: 'var(--risk-critical-bg)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--risk-critical)', textTransform: 'uppercase' }}>
                          {a.severity} SEVERITY
                        </span>
                      </div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--risk-critical)' }}>{a.message}</h4>
                      <div style={{ fontSize: '12px', color: 'var(--neutral-600)' }}>
                        Location: {a.latitude.toFixed(3)}°N, {a.longitude.toFixed(3)}°E
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'incidents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Nearby Unverified Incidents</h3>
                  {situationalData.incidents?.filter(i => i.status === 'Unverified').map(inc => (
                    <div key={inc.id} style={{ fontSize: '13px', padding: '12px', border: '1px solid #eee', borderRadius: '6px', marginBottom: '8px' }}>
                      <strong>{inc.category}</strong>
                      <p style={{ margin: '4px 0', color: '#666' }}>{inc.description}</p>
                      <button onClick={() => openVerifyModal(inc)} style={{ marginTop: '4px', padding: '6px 12px', background: 'var(--primary-600)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Verify on Map</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Map */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          <MapContainer
            center={[officerLat, officerLon]}
            zoom={8}
            minZoom={7}
            maxZoom={15}
            maxBounds={[[21.0, 87.5], [30.5, 98.0]]}
            maxBoundsViscosity={1.0}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
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

            {/* Pinpoint Selection */}
            {selectedPoint && (
              <Marker
                key={`${selectedPoint.lat}-${selectedPoint.lon}`}
                position={[selectedPoint.lat, selectedPoint.lon]}
                icon={defaultIcon}
                eventHandlers={{ add: (e) => e.target.openPopup() }}
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
                        <button onClick={(e) => { e.stopPropagation(); handleCancel(); }} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
                        <button onClick={(e) => { e.stopPropagation(); handlePredict(); }} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Predict Landslide</button>
                      </div>
                    )}

                    {loading && (
                      <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div className="spinner" style={{ borderTopColor: 'var(--primary-600)', borderColor: 'var(--neutral-200)', width: '24px', height: '24px' }}></div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary-700)' }}>Fetching DEM & neighborhood grid...</div>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Officer Location */}
            <Marker position={[officerLat, officerLon]} icon={officerIcon}>
              <Popup><strong>You are here</strong><br />Unit 4 Vehicle</Popup>
            </Marker>

            {/* Incidents Layer */}
            {situationalData.incidents && situationalData.incidents.map(inc => (
              <CircleMarker
                key={`inc-${inc.id}`}
                center={[inc.lat, inc.lon]}
                radius={12}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: inc.risk_level === 'High' ? '#C92A2A' : (inc.risk_level === 'Moderate' ? '#E57A17' : '#D9A441'),
                  fillOpacity: 0.9,
                  weight: 2
                }}
                eventHandlers={{ click: () => openVerifyModal(inc) }}
              >
                <Popup>
                  <strong>{inc.category}</strong><br />
                  Status: {inc.status}<br />
                  <button onClick={() => openVerifyModal(inc)} style={{ marginTop: '8px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>Verify Incident</button>
                </Popup>
              </CircleMarker>
            ))}

            {/* Infrastructure Layer */}
            {situationalData.infrastructure && situationalData.infrastructure.map(inf => (
              <CircleMarker
                key={`inf-${inf.id}`}
                center={[inf.lat, inf.lon]}
                radius={8}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: inf.status === 'Operational' ? '#159447' : '#C92A2A',
                  fillOpacity: 0.8,
                  weight: 2
                }}
              >
                <Popup>
                  <strong>{inf.name}</strong> ({inf.type})<br />
                  Status: {inf.status}
                </Popup>
              </CircleMarker>
            ))}

          </MapContainer>

          {/* Map Instruction Banner */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
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
            Tap any location on the map to analyze landslide risk
          </div>
        </div>

        {/* Result Panel (Appears on right side when prediction is completed) */}
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

              {/* OpenAI AI Scientific Explanation & Prescription Card (Markdown Rendered) */}
              {predictionResult.llm_reasoning && (
                <div style={{
                  backgroundColor: 'var(--primary-50)',
                  border: '1px solid var(--primary-200)',
                  borderRadius: '10px',
                  padding: '16px',
                  fontSize: '12px',
                  lineHeight: '1.5'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    color: 'var(--primary-900)',
                    marginBottom: '10px',
                    fontSize: '13px'
                  }}>
                    <Sparkles size={16} color="var(--primary-600)" />
                    AI Prescriptive Hazard Analysis (OpenAI gpt-4o-mini)
                  </div>
                  <MarkdownRenderer content={predictionResult.llm_reasoning} />
                </div>
              )}

              {/* Model Feature Importance Breakdown */}
              {predictionResult.feature_importance && (
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neutral-900)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} color="var(--secondary-600)" />
                    Model Feature Importance Drivers
                  </h4>
                  <div style={{ backgroundColor: 'var(--neutral-50)', borderRadius: '8px', border: '1px solid var(--neutral-200)', padding: '12px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--neutral-700)', marginBottom: '4px' }}>Static Terrain Model (v3) Top Weights:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {Object.entries(predictionResult.feature_importance.susceptibility_model || {}).map(([key, val]) => (
                          <span key={key} style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-300)', borderRadius: '4px', padding: '2px 6px', color: 'var(--neutral-800)' }}>
                            {key}: <strong>{(val * 100).toFixed(1)}%</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ borderTop: '1px dashed var(--neutral-200)', paddingTop: '6px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--neutral-700)', marginBottom: '4px' }}>Dynamic Trigger Model Top Weights:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {Object.entries(predictionResult.feature_importance.trigger_model || {}).map(([key, val]) => (
                          <span key={key} style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-300)', borderRadius: '4px', padding: '2px 6px', color: 'var(--neutral-800)' }}>
                            {key}: <strong>{(val * 100).toFixed(1)}%</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Feature Breakdown */}
              {predictionResult.features?.terrain && (
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
              )}

              {predictionResult.features?.trigger && (
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
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={handleCancel} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Incident Verification Modal Overlay */}
      {showVerifyModal && selectedIncident && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            width: '450px',
            maxWidth: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 16px 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Field Verification Report</h2>
              <button onClick={() => setShowVerifyModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--neutral-500)', fontWeight: 'bold' }}>INCIDENT DETAILS</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{selectedIncident.category}</div>
                <div style={{ fontSize: '13px', color: '#444' }}>{selectedIncident.description}</div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Actual Severity Observed</label>
                <select
                  value={verifySeverity}
                  onChange={e => setVerifySeverity(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--neutral-300)' }}
                >
                  <option value="Low">Low Risk - Monitor</option>
                  <option value="Moderate">Moderate Risk - Needs Clearing</option>
                  <option value="High">High Risk - Escalation Required</option>
                  <option value="Critical">Critical - Immediate Evacuation</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Field Notes / Evidence</label>
                <textarea
                  rows={3}
                  placeholder="Describe ground conditions..."
                  value={verifyNotes}
                  onChange={e => setVerifyNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--neutral-300)', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{
                border: '1px dashed var(--neutral-400)',
                backgroundColor: 'var(--neutral-50)',
                padding: '16px',
                textAlign: 'center',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                <Camera size={24} color="var(--neutral-500)" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--neutral-700)' }}>Tap to Capture Photo/Video</div>
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--neutral-200)', backgroundColor: '#f8f9fa', display: 'flex', gap: '12px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <button onClick={() => setShowVerifyModal(false)} style={{ flex: 1, padding: '12px', border: '1px solid var(--neutral-300)', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={submitVerification} className="btn-primary" style={{ flex: 2, padding: '12px', fontSize: '14px' }}>Submit Verification</button>
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
