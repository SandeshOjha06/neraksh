import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import {
  Home,
  ShieldAlert,
  Camera,
  Upload,
  Wifi,
  WifiOff,
  RefreshCw,
  Bot,
  Bell,
  User,
  MapPin,
  Send,
  CheckCircle2,
  AlertTriangle,
  FileImage,
  CloudCheck,
  ChevronRight,
  MessageSquare
} from 'lucide-react';

export default function CitizenDashboardView({ currentUser }) {
  const [activeNav, setActiveNav] = useState('home');
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Synced (Live)');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Incident reporting state
  const [reportText, setReportText] = useState('');
  const [locationName, setLocationName] = useState('Gangtok Highway NH10, KM 14');
  const [selectedCategory, setSelectedCategory] = useState('Rockfall / Minor Landslide');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [submittedReports, setSubmittedReports] = useState([
    {
      id: 1,
      category: 'Slope Cracks Observed',
      location: 'Near Mangan Helipad Road',
      time: 'Today, 08:30 AM',
      status: 'Synced to NDMA Grid',
      mediaCount: 2,
      riskLevel: 'Moderate'
    },
    {
      id: 2,
      category: 'Debris Flow on Road',
      location: 'Sohra Escarpment Pass',
      time: 'Yesterday, 04:15 PM',
      status: 'Pending Field Sync',
      mediaCount: 1,
      riskLevel: 'High'
    }
  ]);

  // AI Assistant Chat state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Namaste Anita! I am your NERAKSH Emergency AI Assistant. Ask me about local slope warnings, evacuation routes, or SOP guidelines.' }
  ]);
  const [inputQuery, setInputQuery] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Heavy Rainfall Warning', desc: 'Sikkim North District IMD Alert: 120mm expected over next 24 hours.', time: '10m ago', unread: true },
    { id: 2, title: 'Local Safety Status', desc: 'Your current location (Gangtok Zone B) is categorized as MODERATE RISK.', time: '1h ago', unread: true },
    { id: 3, title: 'Offline Data Cached', desc: 'Offline GIS maps for Sikkim & North Bengal stored locally.', time: '3h ago', unread: false }
  ]);

  React.useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('http://localhost:8000/api/alerts');
        if (res.ok) {
          const data = await res.json();
          const apiNotifications = data.map(a => ({
            id: `api-${a.id}`,
            title: `[NDMA] ${a.severity.toUpperCase()} LANDSLIDE RISK ALERT`,
            desc: `${a.message} (Location: ${a.latitude.toFixed(4)}°N, ${a.longitude.toFixed(4)}°E)`,
            time: new Date(a.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            unread: true,
            isCritical: a.severity === 'Critical'
          }));
          
          setNotifications(prev => {
            // Filter out existing api alerts to avoid duplicates if re-rendered
            const existing = prev.filter(p => !String(p.id).startsWith('api-'));
            return [...apiNotifications, ...existing];
          });
        }
      } catch (e) {
        console.error('Failed to fetch alerts:', e);
      }
    }
    fetchAlerts();
    // Refresh alerts every 30 seconds
    const intervalId = setInterval(fetchAlerts, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const [aiAnalysisResults, setAiAnalysisResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setIsAnalyzing(true);
      const newResults = [];
      
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        
        // Append Citizen's known GPS location to simulate EXIF Geotag extraction from the device
        formData.append("lat", "27.33");
        formData.append("lon", "88.61");
        
        try {
          const res = await fetch('http://localhost:8000/api/analyze-media', {
            method: 'POST',
            body: formData
          });
          
          if (res.ok) {
            const data = await res.json();
            newResults.push({
              fileName: file.name,
              imageUrl: URL.createObjectURL(file),
              geotag: data.geotag_extracted,
              analysis: data.analysis
            });
          } else {
            newResults.push({ fileName: file.name, imageUrl: URL.createObjectURL(file), analysis: { risk_level: "Error", damage_estimate: "Failed to analyze." }});
          }
        } catch (err) {
          console.error("Upload error:", err);
          newResults.push({ fileName: file.name, imageUrl: URL.createObjectURL(file), analysis: { risk_level: "Error", damage_estimate: "Network error." }});
        }
      }
      
      setAiAnalysisResults(prev => [...prev, ...newResults]);
      setMediaFiles(prev => [...prev, ...files.map(f => f.name)]);
      setIsAnalyzing(false);
    }
  };

  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    if (!reportText.trim()) return;

    let latVal = 27.33;
    let lonVal = 88.61;
    let assessedRisk = 'High';

    if (aiAnalysisResults.length > 0) {
      const lastAnalysis = aiAnalysisResults[aiAnalysisResults.length - 1];
      if (lastAnalysis.geotag && lastAnalysis.geotag.lat && lastAnalysis.geotag.lon) {
        latVal = parseFloat(lastAnalysis.geotag.lat);
        lonVal = parseFloat(lastAnalysis.geotag.lon);
      }
      if (lastAnalysis.analysis && lastAnalysis.analysis.risk_level) {
        assessedRisk = lastAnalysis.analysis.risk_level;
      }
    }

    const payload = {
      category: selectedCategory,
      description: reportText,
      latitude: latVal,
      longitude: lonVal,
      risk_level: assessedRisk,
      location_name: locationName
    };

    if (isOnline) {
      try {
        const res = await fetch('http://localhost:8000/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          const newReport = {
            id: data.incident.id,
            category: data.incident.category,
            location: locationName || `${latVal.toFixed(3)}°N, ${lonVal.toFixed(3)}°E`,
            time: 'Just Now',
            status: 'Synced to NDMA Grid',
            mediaCount: mediaFiles.length,
            riskLevel: data.incident.risk_level || assessedRisk
          };
          setSubmittedReports(prev => [newReport, ...prev]);
          alert('Incident report transmitted live to NDMA Control Room & NDRF Field Officers!');
        } else {
          throw new Error(`API response status ${res.status}`);
        }
      } catch (err) {
        console.error('Failed to submit incident:', err);
        const fallbackReport = {
          id: Date.now(),
          category: selectedCategory,
          location: locationName,
          time: 'Just Now',
          status: 'Saved Offline (Pending Sync)',
          mediaCount: mediaFiles.length,
          riskLevel: assessedRisk
        };
        setSubmittedReports(prev => [fallbackReport, ...prev]);
        setPendingSyncCount(prev => prev + 1);
        setSyncStatus(`Offline (${pendingSyncCount + 1} pending)`);
        alert('Connection error. Incident report saved locally and queued for auto-sync.');
      }
    } else {
      const offlineReport = {
        id: Date.now(),
        category: selectedCategory,
        location: locationName,
        time: 'Just Now',
        status: 'Saved Offline (Pending Sync)',
        mediaCount: mediaFiles.length,
        riskLevel: assessedRisk
      };
      setSubmittedReports(prev => [offlineReport, ...prev]);
      setPendingSyncCount(prev => prev + 1);
      setSyncStatus(`Offline (${pendingSyncCount + 1} pending)`);
      alert('Offline mode active. Incident report saved locally and queued for sync.');
    }

    setReportText('');
    setMediaFiles([]);
  };

  const handleSyncNow = () => {
    if (!isOnline) {
      alert('Offline mode active. Reconnect to network to sync local offline reports.');
      return;
    }
    setSyncStatus('Syncing...');
    setTimeout(() => {
      setPendingSyncCount(0);
      setSyncStatus('Synced (Live)');
      setSubmittedReports(prev => prev.map(r => ({ ...r, status: 'Synced to NDMA Grid' })));
    }, 1200);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    const userMsg = inputQuery;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInputQuery('');

    // Simulate AI Response based on domain SOPs
    setTimeout(() => {
      let reply = "Stay safe! Based on active telemetry for Gangtok-Mangan corridor: Avoid steep hill cuts, monitor sudden water discoloration in mountain streams, and report any road cracks immediately.";
      if (userMsg.toLowerCase().includes('rain') || userMsg.toLowerCase().includes('weather')) {
        reply = "Current telemetry shows 145mm (72h) antecedent rainfall in your zone. Soil saturation is near 82%. High vulnerability to slope failures near cut slopes.";
      } else if (userMsg.toLowerCase().includes('evacuat') || userMsg.toLowerCase().includes('shelter')) {
        reply = "Nearest designated emergency shelter: Gangtok Community High School (1.4 km away). High ground evacuation route via NH10 Bypass.";
      }
      setChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
    }, 800);
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', backgroundColor: 'var(--neutral-50)', overflow: 'hidden' }}>
      {/* Left Navigation Sidebar Rail for Citizen */}
      <aside style={{
        width: '240px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid var(--neutral-200)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px 12px'
      }}>
        <div>
          <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Citizen Portal Navigation
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
            {[
              { id: 'home', label: 'Home Overview', icon: Home },
              { id: 'local_risk', label: 'Local Risk Map', icon: ShieldAlert },
              { id: 'reporting', label: 'Incident Reporting', icon: Camera },
              { id: 'media', label: 'Media Upload', icon: Upload },
              { id: 'offline_sync', label: 'Offline & Sync', icon: RefreshCw, badge: pendingSyncCount > 0 ? pendingSyncCount : null },
              { id: 'ai_assistant', label: 'AI Safety Assistant', icon: Bot },
              { id: 'notifications', label: 'Notifications', icon: Bell, badge: notifications.filter(n=>n.unread).length },
              { id: 'profile', label: 'Citizen Profile', icon: User }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--primary-50)' : 'transparent',
                    color: isActive ? 'var(--primary-700)' : 'var(--neutral-700)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={18} color={isActive ? 'var(--primary-600)' : 'var(--neutral-500)'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span style={{
                      backgroundColor: 'var(--risk-critical)',
                      color: '#ffffff',
                      borderRadius: '10px',
                      padding: '2px 7px',
                      fontSize: '10px',
                      fontWeight: 700
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Connectivity Status Banner */}
        <div style={{
          borderTop: '1px solid var(--neutral-200)',
          paddingTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: isOnline ? 'var(--risk-low-bg)' : 'var(--risk-moderate-bg)',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: isOnline ? 'var(--risk-low)' : 'var(--risk-moderate)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              <span>{isOnline ? 'Online (Live)' : 'Offline Mode'}</span>
            </div>
            <button
              onClick={() => setIsOnline(!isOnline)}
              style={{
                fontSize: '10px',
                border: 'none',
                background: 'none',
                textDecoration: 'underline',
                cursor: 'pointer',
                color: 'inherit'
              }}
            >
              Toggle
            </button>
          </div>
        </div>
      </aside>

      {/* Main Surface */}
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {/* HOME OVERVIEW */}
        {activeNav === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              backgroundColor: 'var(--primary-900)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {notifications.filter(n => String(n.id).startsWith('api-')).length > 0 ? (
                  <div style={{ 
                    backgroundColor: 'var(--risk-critical)', 
                    color: '#ffffff', 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    border: '1px solid #ff4d4d',
                    marginBottom: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '14px' }}>
                      <AlertTriangle size={18} />
                      EMERGENCY ALERT ISSUED BY NDMA
                    </div>
                    {notifications.filter(n => String(n.id).startsWith('api-')).map(n => (
                      <div key={n.id} style={{ fontSize: '13px', fontWeight: 500, lineHeight: '1.4' }}>
                        <strong>{n.title}:</strong> {n.desc}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <span className="risk-chip risk-moderate" style={{ marginBottom: '8px' }}>
                      ZONE STATUS: NO CRITICAL EMERGENCIES
                    </span>
                  </div>
                )}
                
                <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '6px 0' }}>
                  Welcome, {currentUser?.full_name || 'Anita Roy'}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--neutral-300)', margin: 0 }}>
                  Location: Gangtok Municipal Area, Sikkim (Elev: 1,650m) | 72h Rainfall: 145mm
                </p>
              </div>
              <button
                onClick={() => setActiveNav('reporting')}
                className="btn-primary"
                style={{ backgroundColor: 'var(--risk-critical)', padding: '12px 20px', fontSize: '14px' }}
              >
                <Camera size={18} />
                Report Emergency Hill Failure
              </button>
            </div>

            {/* Quick Action Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div
                onClick={() => setActiveNav('local_risk')}
                style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '10px', padding: '16px', cursor: 'pointer' }}
              >
                <ShieldAlert size={24} color="var(--primary-600)" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Local Risk Map</div>
                <div style={{ fontSize: '12px', color: 'var(--neutral-500)', marginTop: '4px' }}>Check 30km neighborhood grid susceptibility</div>
              </div>

              <div
                onClick={() => setActiveNav('reporting')}
                style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '10px', padding: '16px', cursor: 'pointer' }}
              >
                <Camera size={24} color="var(--secondary-600)" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Incident Reporting</div>
                <div style={{ fontSize: '12px', color: 'var(--neutral-500)', marginTop: '4px' }}>Report slope cracks or road blockages</div>
              </div>

              <div
                onClick={() => setActiveNav('offline_sync')}
                style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '10px', padding: '16px', cursor: 'pointer' }}
              >
                <RefreshCw size={24} color="var(--risk-high)" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Offline State & Sync</div>
                <div style={{ fontSize: '12px', color: 'var(--neutral-500)', marginTop: '4px' }}>{pendingSyncCount} pending reports stored offline</div>
              </div>

              <div
                onClick={() => setActiveNav('ai_assistant')}
                style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '10px', padding: '16px', cursor: 'pointer' }}
              >
                <Bot size={24} color="var(--primary-700)" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 700, fontSize: '14px' }}>AI Safety Assistant</div>
                <div style={{ fontSize: '12px', color: 'var(--neutral-500)', marginTop: '4px' }}>Get instant SOP disaster guidance</div>
              </div>
            </div>

            {/* Recent Local Reports */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '10px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Your Reported Incidents</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {submittedReports.map(rep => (
                  <div key={rep.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--neutral-50)', borderRadius: '8px', border: '1px solid var(--neutral-200)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{rep.category}</div>
                      <div style={{ fontSize: '12px', color: 'var(--neutral-600)' }}>{rep.location} — {rep.time}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: rep.status.includes('Synced') ? 'var(--risk-low)' : 'var(--risk-high)' }}>
                        {rep.status}
                      </span>
                      <span className={`risk-chip risk-${rep.riskLevel.toLowerCase()}`}>
                        {rep.riskLevel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LOCAL RISK MAP */}
        {activeNav === 'local_risk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Local Community Risk Map</h2>
                <p style={{ fontSize: '12px', color: 'var(--neutral-600)' }}>Showing high-resolution GIS landslide susceptibility grid in your vicinity (Gangtok-Mangan Sector)</p>
              </div>
              <span className="risk-chip risk-high">ZONE ELEVATION: 1,650m</span>
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ backgroundColor: 'var(--neutral-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--neutral-200)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--neutral-500)', fontWeight: 600 }}>SOIL SATURATION</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-800)' }}>82.4%</div>
                </div>
                <div style={{ backgroundColor: 'var(--neutral-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--neutral-200)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--neutral-500)', fontWeight: 600 }}>24H RAINFALL THRESHOLD</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--risk-high)' }}>120 mm (EXCEEDED)</div>
                </div>
                <div style={{ backgroundColor: 'var(--neutral-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--neutral-200)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--neutral-500)', fontWeight: 600 }}>EVACUATION STATUS</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--risk-low)' }}>Route Open (NH10)</div>
                </div>
              </div>

              <div style={{ height: '360px', backgroundColor: '#e5e9ec', borderRadius: '8px', border: '1px solid var(--neutral-300)', position: 'relative', overflow: 'hidden' }}>
                <MapContainer
                  center={[27.33, 88.61]}
                  zoom={12}
                  style={{ width: '100%', height: '100%' }}
                  zoomControl={true}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  
                  <CircleMarker
                    center={[27.33, 88.61]}
                    radius={30}
                    pathOptions={{ color: 'var(--risk-critical)', fillColor: 'var(--risk-critical)', fillOpacity: 0.3, weight: 2 }}
                  >
                    <Popup>Your Location Zone (High Susceptibility)</Popup>
                  </CircleMarker>

                  <Marker position={[27.33, 88.61]}>
                    <Popup>
                      <strong>Gangtok (27.33°N, 88.61°E)</strong><br/>
                      Susceptibility Score: 0.78
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          </div>
        )}

        {/* INCIDENT REPORTING */}
        {activeNav === 'reporting' && (
          <div style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Citizen Incident Reporting</h2>
              <p style={{ fontSize: '12px', color: 'var(--neutral-600)' }}>Directly notify State Disaster Management Authority (SDMA) & NDRF response teams</p>
            </div>

            <form onSubmit={handleIncidentSubmit} style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neutral-700)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Hazard Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--neutral-300)', fontSize: '13px' }}
                >
                  <option value="Rockfall / Minor Landslide">Rockfall / Minor Landslide</option>
                  <option value="Major Slope Failure">Major Slope Failure</option>
                  <option value="Road Blockade due to Debris">Road Blockade due to Debris</option>
                  <option value="Creep / Ground Cracks">Creep / Ground Cracks</option>
                  <option value="Mudflow / Flash Flood">Mudflow / Flash Flood</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neutral-700)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Landslide Location / Landmark
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. NH10 Highway Mile 14"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--neutral-300)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neutral-700)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Observation Details & Description
                </label>
                <textarea
                  rows={4}
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Describe slope cracks, falling boulders, water mudness, or road damage..."
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--neutral-300)', fontSize: '13px', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neutral-700)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Attach Photo / Video Media
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  style={{ fontSize: '12px' }}
                />
                {mediaFiles.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--primary-700)', fontWeight: 600 }}>
                    Attached Files ({mediaFiles.length}): {mediaFiles.join(', ')}
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '12px', justifyContent: 'center' }}>
                <Send size={16} />
                Submit Incident Report ({isOnline ? 'Live Transmit' : 'Store Offline'})
              </button>
            </form>
          </div>
        )}

        {/* MEDIA UPLOAD */}
        {activeNav === 'media' && (
          <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Media & Ground Imagery Upload</h2>
              <p style={{ fontSize: '12px', color: 'var(--neutral-600)' }}>Upload geo-tagged slope photos for automatic AI damage estimation</p>
            </div>

            <div style={{
              border: '2px dashed var(--primary-600)',
              backgroundColor: 'var(--primary-50)',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}>
              <Upload size={36} color="var(--primary-600)" />
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Drag & Drop photos/videos here</div>
              <div style={{ fontSize: '12px', color: 'var(--neutral-600)' }}>Supports JPG, PNG, MP4 up to 50MB per file</div>
              <input type="file" multiple accept="image/*,video/*" onChange={handleMediaUpload} style={{ marginTop: '8px' }} />
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px', border: '1px solid var(--neutral-200)' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>AI Image Analysis Results</h4>
              {isAnalyzing && (
                <div style={{ fontSize: '12px', color: 'var(--primary-600)', marginBottom: '12px', fontWeight: 'bold' }}>
                  Running deep learning model on uploaded media...
                </div>
              )}
              {aiAnalysisResults.length === 0 && !isAnalyzing ? (
                <div style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>No pending uploads.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {aiAnalysisResults.map((res, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '16px', padding: '16px', backgroundColor: 'var(--neutral-50)', borderRadius: '8px', border: '1px solid var(--neutral-200)' }}>
                      {res.imageUrl && (
                        <div style={{ flexShrink: 0, width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--neutral-300)' }}>
                          <img src={res.imageUrl} alt="Uploaded media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700 }}>
                            <FileImage size={16} color="var(--primary-600)" />
                            {res.fileName}
                          </span>
                          <span style={{ color: res.analysis.risk_level === 'High' ? 'var(--risk-critical)' : (res.analysis.risk_level === 'Error' ? 'var(--neutral-500)' : 'var(--risk-moderate)'), fontWeight: 800, fontSize: '14px', textTransform: 'uppercase' }}>
                            {res.analysis.risk_level} RISK
                          </span>
                        </div>
                        
                        {res.geotag && (
                          <div style={{ fontSize: '12px', color: 'var(--neutral-500)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} />
                            Geotag Extracted: {parseFloat(res.geotag.lat).toFixed(4)}°N, {parseFloat(res.geotag.lon).toFixed(4)}°E
                          </div>
                        )}

                        <div style={{ fontSize: '14px', color: 'var(--neutral-800)', marginBottom: '4px' }}>
                          <strong>Estimate:</strong> {res.analysis.damage_estimate}
                        </div>
                        {res.analysis.action_required && (
                          <div style={{ fontSize: '13px', color: 'var(--primary-700)', fontWeight: 600 }}>
                            Action: {res.analysis.action_required} (Confidence: {(res.analysis.confidence * 100).toFixed(0)}%)
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* OFFLINE STATE & SYNC */}
        {activeNav === 'offline_sync' && (
          <div style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Offline State & Sync Center</h2>
              <p style={{ fontSize: '12px', color: 'var(--neutral-600)' }}>Ensures continuous warning system operation even when cellular networks fail during disasters</p>
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-500)', fontWeight: 600 }}>SYNC ENGINE STATUS</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: isOnline ? 'var(--risk-low)' : 'var(--risk-moderate)' }}>
                    {syncStatus}
                  </div>
                </div>
                <button onClick={handleSyncNow} className="btn-primary" style={{ padding: '10px 16px', fontSize: '13px' }}>
                  <RefreshCw size={14} />
                  Force Sync Now
                </button>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--neutral-200)' }} />

              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Cached Offline Map Bundles</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--neutral-50)', borderRadius: '6px', fontSize: '12px' }}>
                    <span>Sikkim & North Bengal DEM 30m Grid</span>
                    <span style={{ color: 'var(--risk-low)', fontWeight: 700 }}>Cached (42 MB)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--neutral-50)', borderRadius: '6px', fontSize: '12px' }}>
                    <span>Offline Emergency SOP & Shelters</span>
                    <span style={{ color: 'var(--risk-low)', fontWeight: 700 }}>Cached (8 MB)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI ASSISTANT */}
        {activeNav === 'ai_assistant' && (
          <div style={{ maxWidth: '700px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>NERAKSH AI Safety Assistant</h2>
              <p style={{ fontSize: '12px', color: 'var(--neutral-600)' }}>Automated emergency guidance trained on NDMA & GSI landslide response SOPs</p>
            </div>

            <div style={{ flex: 1, backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '12px', display: 'flex', flexDirection: 'column', height: '420px' }}>
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {chatMessages.map((msg, idx) => (
                  <div key={idx} style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    backgroundColor: msg.sender === 'user' ? 'var(--primary-600)' : 'var(--neutral-100)',
                    color: msg.sender === 'user' ? '#ffffff' : 'var(--neutral-900)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    lineHeight: 1.4
                  }}>
                    {msg.text}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} style={{ borderTop: '1px solid var(--neutral-200)', padding: '12px', display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask AI about evacuation, slope safety, or weather..."
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--neutral-300)', fontSize: '13px' }}
                />
                <button type="submit" className="btn-primary">
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeNav === 'notifications' && (
          <div style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Citizen Alert Center</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.map(notif => (
                <div key={notif.id} style={{
                  backgroundColor: notif.isCritical ? 'var(--risk-critical-bg)' : '#ffffff',
                  borderLeft: notif.unread ? '4px solid var(--risk-critical)' : '1px solid var(--neutral-200)',
                  border: notif.isCritical ? '1px solid var(--risk-critical)' : undefined,
                  borderLeftWidth: notif.unread ? '4px' : '1px',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: notif.isCritical ? 'var(--risk-critical)' : 'inherit' }}>
                      {notif.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--neutral-600)', marginTop: '2px' }}>{notif.desc}</div>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--neutral-400)' }}>{notif.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE */}
        {activeNav === 'profile' && (
          <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Citizen Profile</h2>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--secondary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 700, fontSize: '20px' }}>
                  {currentUser?.full_name?.charAt(0) || 'A'}
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{currentUser?.full_name || 'Anita Roy'}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>Registered Citizen (Gangtok, Sikkim)</div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--neutral-200)' }} />

              <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div><strong>Email:</strong> {currentUser?.email || 'anita.roy@gmail.com'}</div>
                <div><strong>Role Access Level:</strong> Citizen / Local Community Member</div>
                <div><strong>Offline Sync Token:</strong> Registered (Active)</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
