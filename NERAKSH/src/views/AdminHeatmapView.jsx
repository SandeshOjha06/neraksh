import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { ShieldAlert, AlertTriangle, Layers, MapPin, Bell, Clock, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import GisRasterHeatmapLayer from '../components/GisRasterHeatmapLayer';

// Key strategic monitoring locations across North Eastern Region (NER) India
const monitoringStations = [
  {
    name: 'Gangtok - Mangan Corridor (Sikkim)',
    severity: 'Critical',
    riskScore: 0.88,
    color: '#C92A2A',
    fillColor: '#C92A2A',
    center: [27.33, 88.61],
    radius: 10,
    rainfall: '145mm (72h)',
    slope: '38.5°',
    affectedVillages: 14,
  },
  {
    name: 'Cherrapunji - Sohra Escarpment (Meghalaya)',
    severity: 'High',
    riskScore: 0.74,
    color: '#E57A17',
    fillColor: '#E57A17',
    center: [25.27, 91.73],
    radius: 10,
    rainfall: '210mm (72h)',
    slope: '34.0°',
    affectedVillages: 22,
  },
  {
    name: 'Haflong Hill Railway Zone (Dima Hasao, Assam)',
    severity: 'High',
    riskScore: 0.69,
    color: '#E57A17',
    fillColor: '#E57A17',
    center: [25.17, 93.02],
    radius: 10,
    rainfall: '120mm (72h)',
    slope: '29.2°',
    affectedVillages: 18,
  },
  {
    name: 'Bomdila - Tawang Highway Segment (Arunachal)',
    severity: 'Moderate',
    riskScore: 0.48,
    color: '#D9A441',
    fillColor: '#D9A441',
    center: [27.26, 92.42],
    radius: 8,
    rainfall: '85mm (72h)',
    slope: '26.8°',
    affectedVillages: 9,
  },
  {
    name: 'Kohima Bypass Slopes (Nagaland)',
    severity: 'Moderate',
    riskScore: 0.42,
    color: '#D9A441',
    fillColor: '#D9A441',
    center: [25.67, 94.11],
    radius: 8,
    rainfall: '65mm (72h)',
    slope: '24.1°',
    affectedVillages: 11,
  },
  {
    name: 'Guwahati Urban Fringe (Assam)',
    severity: 'Low',
    riskScore: 0.12,
    color: '#159447',
    fillColor: '#159447',
    center: [26.15, 91.77],
    radius: 7,
    rainfall: '32mm (72h)',
    slope: '8.4°',
    affectedVillages: 5,
  }
];

export default function AdminHeatmapView() {
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    criticalCount: 0,
    highCount: 0,
    totalPoints: 0,
    avgScore: 0
  });
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [sideTab, setSideTab] = useState('alerts'); // 'alerts' or 'incidents'

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [heatmapRes, alertsRes, sitRes] = await Promise.all([
          fetch('http://localhost:8000/api/heatmap/regional?step=1'),
          fetch('http://localhost:8000/api/alerts'),
          fetch('http://localhost:8000/api/field/situational')
        ]);
        
        if (heatmapRes.ok) {
          const json = await heatmapRes.json();
          if (json.data && json.data.length > 0) {
            setHeatmapPoints(json.data);
            let critical = 0, high = 0, sumScore = 0;
            json.data.forEach(p => {
              sumScore += p.score;
              if (p.severity === 'Critical' || p.score >= 0.75) critical++;
              else if (p.severity === 'High' || p.score >= 0.50) high++;
            });
            setKpis({
              criticalCount: critical,
              highCount: high,
              totalPoints: json.data.length,
              avgScore: (sumScore / json.data.length * 100).toFixed(1)
            });
          }
        }

        if (alertsRes.ok) {
          const alertsJson = await alertsRes.json();
          setAlerts(alertsJson);
        }

        if (sitRes.ok) {
          const sitJson = await sitRes.json();
          if (sitJson.incidents) {
            setIncidents(sitJson.incidents);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const unverifiedCount = incidents.filter(i => i.status === 'Unverified').length;
  const verifiedCount = incidents.filter(i => i.status === 'Verified').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative' }}>
      {/* Top Operational KPI Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--neutral-200)',
        padding: '12px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        zIndex: 500
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '16px', borderRight: '1px solid var(--neutral-200)' }}>
          <div style={{ backgroundColor: 'var(--risk-critical-bg)', padding: '10px', borderRadius: '8px' }}>
            <ShieldAlert size={20} color="var(--risk-critical)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase' }}>Very High Risk Cells</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--neutral-900)' }}>
              {loading ? '...' : `${kpis.criticalCount.toLocaleString()} Grid Cells`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '16px', borderRight: '1px solid var(--neutral-200)' }}>
          <div style={{ backgroundColor: 'var(--risk-high-bg)', padding: '10px', borderRadius: '8px' }}>
            <AlertTriangle size={20} color="var(--risk-high)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase' }}>High Risk Cells</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--neutral-900)' }}>
              {loading ? '...' : `${kpis.highCount.toLocaleString()} Grid Cells`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '16px', borderRight: '1px solid var(--neutral-200)' }}>
          <div style={{ backgroundColor: 'var(--primary-50)', padding: '10px', borderRadius: '8px' }}>
            <FileText size={20} color="var(--primary-600)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase' }}>Citizen Incident Reports</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--neutral-900)' }}>
              {incidents.length} ({unverifiedCount} Pending)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: 'var(--secondary-50)', padding: '10px', borderRadius: '8px' }}>
            <Layers size={20} color="var(--secondary-700)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase' }}>Average Susceptibility</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--neutral-900)' }}>
              {loading ? '...' : `${kpis.avgScore}%`}
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Workspace */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        <MapContainer
          center={[26.20, 92.50]}
          zoom={7}
          minZoom={7}
          maxZoom={15}
          maxBounds={[[21.0, 87.5], [30.5, 98.0]]}
          maxBoundsViscosity={1.0}
          style={{ width: '100%', height: '100%', background: '#e5e9ec' }}
          zoomControl={true}
        >

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Scientific GIS Raster Susceptibility Heatmap Layer */}
          {heatmapPoints.length > 0 && (
            <GisRasterHeatmapLayer
              points={heatmapPoints}
              cellSizeDeg={0.05}
              showLandslidePoints={true}
              opacity={0.85}
            />
          )}

          {/* Monitoring Station Markers */}
          {monitoringStations.map((station, idx) => (
            <CircleMarker
              key={idx}
              center={station.center}
              radius={station.radius}
              pathOptions={{
                color: '#ffffff',
                fillColor: station.fillColor,
                fillOpacity: 0.9,
                weight: 2
              }}
            >
              <Popup>
                <div style={{ width: '230px', padding: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className={`risk-chip risk-${station.severity.toLowerCase()}`}>
                      {station.severity} RISK
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--neutral-500)' }}>
                      Score: {(station.riskScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: 'var(--neutral-900)' }}>
                    {station.name}
                  </h4>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-600)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>Antecedent Rain:</strong> {station.rainfall}</div>
                    <div><strong>Terrain Slope:</strong> {station.slope}</div>
                    <div><strong>Exposed Villages:</strong> {station.affectedVillages}</div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Live Citizen Reported Incidents Layer */}
          {incidents.map((inc) => (
            <CircleMarker
              key={`admin-inc-${inc.id}`}
              center={[inc.lat || 27.33, inc.lon || 88.61]}
              radius={inc.status === 'Unverified' ? 14 : 10}
              pathOptions={{
                color: '#ffffff',
                fillColor: inc.status === 'Unverified' ? '#C92A2A' : '#159447',
                fillOpacity: 0.9,
                weight: 3,
                dashArray: inc.status === 'Unverified' ? '4, 4' : undefined
              }}
            >
              <Popup>
                <div style={{ width: '240px', padding: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: inc.status === 'Unverified' ? 'var(--risk-critical)' : 'var(--risk-low)', textTransform: 'uppercase' }}>
                      CITIZEN REPORT • {inc.status}
                    </span>
                    <span className={`risk-chip risk-${(inc.risk_level || 'high').toLowerCase()}`}>
                      {inc.risk_level || 'High'}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px 0' }}>{inc.category}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--neutral-700)', margin: '0 0 8px 0', lineHeight: '1.4' }}>{inc.description}</p>
                  <div style={{ fontSize: '11px', color: 'var(--neutral-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} /> Coordinates: {inc.lat?.toFixed(4)}°N, {inc.lon?.toFixed(4)}°E
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Live Active Alerts & Citizen Incidents Drawer Panel */}
        <div style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          width: '360px',
          maxHeight: '460px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--neutral-300)',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(15, 39, 71, 0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header Tabs */}
          <div style={{
            backgroundColor: 'var(--primary-900)',
            color: '#ffffff',
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <button
              onClick={() => setSideTab('alerts')}
              style={{
                flex: 1,
                padding: '12px 14px',
                border: 'none',
                backgroundColor: sideTab === 'alerts' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Bell size={15} color="var(--risk-critical)" />
              Alerts ({alerts.length})
            </button>
            <button
              onClick={() => setSideTab('incidents')}
              style={{
                flex: 1,
                padding: '12px 14px',
                border: 'none',
                backgroundColor: sideTab === 'incidents' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <FileText size={15} color="var(--secondary-500)" />
              Reports ({incidents.length})
            </button>
          </div>
          
          {/* Content Area */}
          <div style={{ padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            {sideTab === 'alerts' && (
              alerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--neutral-500)', fontSize: '13px' }}>
                  No active critical alerts
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} style={{
                    backgroundColor: 'var(--risk-critical-bg)',
                    border: '1px solid var(--risk-critical)',
                    borderRadius: '8px',
                    padding: '12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--risk-critical)', textTransform: 'uppercase' }}>
                        {alert.severity} RISK
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--neutral-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-900)', marginBottom: '4px', lineHeight: '1.4' }}>
                      {alert.message}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--neutral-600)' }}>
                      Loc: {alert.latitude.toFixed(4)}°N, {alert.longitude.toFixed(4)}°E
                    </div>
                  </div>
                ))
              )
            )}

            {sideTab === 'incidents' && (
              incidents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--neutral-500)', fontSize: '13px' }}>
                  No citizen incidents reported yet.
                </div>
              ) : (
                incidents.map(inc => (
                  <div key={inc.id} style={{
                    backgroundColor: inc.status === 'Unverified' ? '#fff5f5' : '#f4fbf7',
                    border: `1px solid ${inc.status === 'Unverified' ? 'var(--risk-critical)' : 'var(--risk-low)'}`,
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: inc.status === 'Unverified' ? 'var(--risk-critical)' : 'var(--risk-low)' }}>
                        {inc.status.toUpperCase()}
                      </span>
                      <span className={`risk-chip risk-${(inc.risk_level || 'high').toLowerCase()}`}>
                        {inc.risk_level || 'High'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neutral-900)', marginBottom: '4px' }}>
                      {inc.category}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--neutral-700)', marginBottom: '6px', lineHeight: '1.4' }}>
                      {inc.description}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--neutral-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={11} /> {inc.lat ? `${inc.lat.toFixed(3)}°N, ${inc.lon.toFixed(3)}°E` : 'Gangtok'}
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* Scientific GIS Map Legend Matching Reference Standards */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--neutral-300)',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 4px 16px rgba(15, 39, 71, 0.12)',
          zIndex: 1000,
          width: '230px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neutral-900)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            GIS Susceptibility Scale
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0288D1', border: '1px solid #ffffff' }}></span>
              <span>Landslides_SL (Monitored)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '2px', backgroundColor: '#B71C1C' }}></span>
              <span>Very High (&ge; 0.75)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '2px', backgroundColor: '#E26D40' }}></span>
              <span>High (0.60 - 0.75)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '2px', backgroundColor: '#FFF3B0', border: '1px solid #d4c78d' }}></span>
              <span>Moderate (0.40 - 0.60)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '2px', backgroundColor: '#87C34B' }}></span>
              <span>Low (0.20 - 0.40)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '2px', backgroundColor: '#1E6B29' }}></span>
              <span>Very Low (&lt; 0.20)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

