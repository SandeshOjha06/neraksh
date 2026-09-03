import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
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
  const { t, getSeverityLabel } = useLanguage();
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
      categoryKey: 'incident.category_slope_cracks',
      category: 'Slope Cracks Observed',
      location: 'Near Mangan Helipad Road',
      timeDayKey: 'incident.today',
      timeStr: '08:30 AM',
      statusKey: 'incident.status_synced',
      status: 'Synced to NDMA Grid',
      mediaCount: 2,
      riskLevel: 'Moderate'
    },
    {
      id: 2,
      categoryKey: 'incident.category_debris_flow',
      category: 'Debris Flow on Road',
      location: 'Sohra Escarpment Pass',
      timeDayKey: 'incident.yesterday',
      timeStr: '04:15 PM',
      statusKey: 'incident.status_pending_sync',
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
  // Static notifications use translation keys so they update when language changes
  const [notifications, setNotifications] = useState([
    { id: 1, titleKey: 'notification.heavy_rainfall_warning', descKey: 'notification.heavy_rainfall_desc', time: '10m ago', unread: true },
    { id: 2, titleKey: 'notification.local_safety_status', descKey: 'notification.local_safety_desc', time: '1h ago', unread: true },
    { id: 3, titleKey: 'notification.offline_data_cached', descKey: 'notification.offline_cached_desc', time: '3h ago', unread: false }
  ]);

  React.useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('http://localhost:8000/api/alerts');
        if (res.ok) {
          const data = await res.json();
          // Store structured fields — title/desc composed at render time using selected language
          const apiNotifications = data.map(a => ({
            id: `api-${a.id}`,
            severity: a.severity,
            latitude: a.latitude,
            longitude: a.longitude,
            time: new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
            newResults.push({ fileName: file.name, imageUrl: URL.createObjectURL(file), analysis: { risk_level: "Error", damage_estimate: "Failed to analyze." } });
          }
        } catch (err) {
          console.error("Upload error:", err);
          newResults.push({ fileName: file.name, imageUrl: URL.createObjectURL(file), analysis: { risk_level: "Error", damage_estimate: "Network error." } });
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
      location: locationName,
      time: 'Just Now',
      statusKey: isOnline ? 'incident.status_synced' : 'incident.status_pending_sync',
      status: isOnline ? 'Synced to NDMA Grid' : 'Pending Field Sync',
      mediaCount: mediaFiles.length,
      riskLevel: 'High'
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
      setSubmittedReports(prev => prev.map(r => ({ ...r, statusKey: 'incident.status_synced', status: 'Synced to NDMA Grid' })));
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
              { id: 'home', label: t('navigation.home'), icon: Home },
              { id: 'local_risk', label: t('navigation.local_risk'), icon: ShieldAlert },
              { id: 'reporting', label: t('navigation.reporting'), icon: Camera },
              { id: 'media', label: t('navigation.media'), icon: Upload },
              { id: 'offline_sync', label: t('navigation.offline_sync'), icon: RefreshCw, badge: pendingSyncCount > 0 ? pendingSyncCount : null },
              { id: 'ai_assistant', label: t('navigation.ai_assistant'), icon: Bot },
              { id: 'notifications', label: t('navigation.notifications'), icon: Bell, badge: notifications.filter(n => n.unread).length },
              { id: 'profile', label: t('navigation.profile'), icon: User }
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
                    borderRadius: '0px',
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
                      borderRadius: '0px',
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
            borderRadius: '4px',
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
              borderRadius: '0px',
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
                    borderRadius: '0px',
                    border: '1px solid #ff4d4d',
                    marginBottom: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '14px' }}>
                      <AlertTriangle size={18} />
                      {t('notification.emergency_alert_ndma')}
                    </div>
                    {notifications.filter(n => String(n.id).startsWith('api-')).map(n => (
                      <div key={n.id} style={{ fontSize: '13px', fontWeight: 500, lineHeight: '1.4' }}>
                        <strong>[NDMA] {getSeverityLabel(n.severity).toUpperCase()} {t('notification.landslide_risk_alert')}:</strong>{' '}
                        {t('notification.landslide_warning')} ({t('alert.location_label')}: {n.latitude.toFixed(4)}°N, {n.longitude.toFixed(4)}°E)
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <span className="risk-chip risk-moderate" style={{ marginBottom: '8px' }}>
                      {t('ui.zone_no_emergency')}
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
                {t('ui.report_emergency')}
              </button>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div
                onClick={() => setActiveNav('local_risk')}
                className="btn-secondary"
                style={{ padding: '10px 16px', fontSize: '13px' }}
              >
                <ShieldAlert size={24} color="var(--primary-600)" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{t('ui.quick_action_grid_risk')}</div>
                <div style={{ fontSize: '12px', color: 'var(--neutral-500)', marginTop: '4px' }}>{t('ui.quick_action_grid_risk_desc')}</div>
              </div>

            <div
              onClick={() => setActiveNav('reporting')}
              className="btn-secondary"
              style={{ padding: '10px 16px', fontSize: '13px' }}
            >
              <Camera size={24} color="var(--secondary-600)" style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{t('ui.quick_action_grid_report')}</div>
              <div style={{ fontSize: '12px', color: 'var(--neutral-500)', marginTop: '4px' }}>{t('ui.quick_action_grid_report_desc')}</div>
            </div>

            <div
              onClick={() => setActiveNav('offline_sync')}
              className="btn-secondary"
              style={{ padding: '10px 16px', fontSize: '13px' }}
            >
              <RefreshCw size={24} color="var(--risk-high)" style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{t('ui.quick_action_grid_offline')}</div>
              <div style={{ fontSize: '12px', color: 'var(--neutral-500)', marginTop: '4px' }}>{t('ui.quick_action_grid_offline_desc', { count: pendingSyncCount })}</div>
            </div>

            <div
              onClick={() => setActiveNav('ai_assistant')}
              className="btn-secondary"
              style={{ padding: '10px 16px', fontSize: '13px' }}
            >
              <Bot size={24} color="var(--primary-700)" style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{t('ui.quick_action_grid_ai')}</div>
              <div style={{ fontSize: '12px', color: 'var(--neutral-500)', marginTop: '4px' }}>{t('ui.quick_action_grid_ai_desc')}</div>
            </div>
          </div>

            {/* Recent Local Reports */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '10px', padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>{t('ui.your_reported_incidents')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {submittedReports.map(rep => {
              const categoryName = rep.categoryKey
                ? t(rep.categoryKey)
                : (rep.category === 'Slope Cracks Observed'
                  ? t('incident.category_slope_cracks')
                  : rep.category === 'Debris Flow on Road'
                    ? t('incident.category_debris_flow')
                    : rep.category === 'Rockfall / Minor Landslide'
                      ? t('incident.category_rockfall')
                      : rep.category === 'Major Slope Failure'
                        ? t('incident.category_major_failure')
                        : rep.category === 'Road Blockade due to Debris'
                          ? t('incident.category_road_blockade')
                          : rep.category === 'Creep / Ground Cracks'
                            ? t('incident.category_creep_cracks')
                            : rep.category === 'Mudflow / Flash Flood'
                              ? t('incident.category_mudflow')
                              : rep.category);

              const statusName = rep.statusKey
                ? t(rep.statusKey)
                : (rep.status?.includes('Synced')
                  ? t('incident.status_synced')
                  : t('incident.status_pending_sync'));

              let timeDisplay = rep.time;
              if (rep.timeDayKey && rep.timeStr) {
                timeDisplay = `${t(rep.timeDayKey)}, ${rep.timeStr}`;
              } else if (typeof rep.time === 'string') {
                if (rep.time.startsWith('Today')) {
                  timeDisplay = rep.time.replace('Today', t('incident.today'));
                } else if (rep.time.startsWith('Yesterday')) {
                  timeDisplay = rep.time.replace('Yesterday', t('incident.yesterday'));
                } else if (rep.time === 'Just Now') {
                  timeDisplay = t('incident.just_now');
                }
              }

              const isSynced = (rep.statusKey === 'incident.status_synced') || (rep.status?.includes('Synced'));

              return (
                <div key={rep.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--neutral-50)', borderRadius: '8px', border: '1px solid var(--neutral-200)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--neutral-900)' }}>{categoryName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--neutral-600)', marginTop: '2px' }}>{rep.location} — {timeDisplay}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: isSynced ? 'var(--risk-low)' : 'var(--risk-high)' }}>
                      {statusName}
                    </span>
                    <span className={`risk-chip risk-${rep.riskLevel.toLowerCase()}`} style={{ fontWeight: 700, letterSpacing: '0.04em' }}>
                      {getSeverityLabel(rep.riskLevel).toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}

    {/* LOCAL RISK MAP */}
        {
          activeNav === 'local_risk' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Local Community Risk Map</h2>
                  <p style={{ fontSize: '12px', color: 'var(--neutral-600)' }}>Showing high-resolution GIS landslide susceptibility grid in your vicinity (Gangtok-Mangan Sector)</p>
                </div>
                <span className="risk-chip risk-high">ZONE ELEVATION: 1,650m</span>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '0px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--neutral-200)',
                  borderRadius: '0px'
                }}>
                  <div style={{ padding: '16px', borderRight: '1px solid var(--neutral-200)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--neutral-500)', fontWeight: 600 }}>SOIL SATURATION</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-800)' }}>82.4%</div>
                  </div>
                  <div style={{ padding: '16px', borderRight: '1px solid var(--neutral-200)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--neutral-500)', fontWeight: 600 }}>24H RAINFALL THRESHOLD</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--risk-high)' }}>120 mm (EXCEEDED)</div>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--neutral-500)', fontWeight: 600 }}>EVACUATION STATUS</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--risk-low)' }}>Route Open (NH10)</div>
                  </div>
                </div>

                <div style={{ height: '360px', backgroundColor: '#e5e9ec', borderRadius: '0px', border: '1px solid var(--neutral-300)', position: 'relative', overflow: 'hidden' }}>
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
                        <strong>Gangtok (27.33°N, 88.61°E)</strong><br />
                        Susceptibility Score: 0.78
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
            </div>
          )
        }

        {/* INCIDENT REPORTING */}
        {
          activeNav === 'reporting' && (
            <div style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Citizen Incident Reporting</h2>
                <p style={{ fontSize: '12px', color: 'var(--neutral-600)' }}>Directly notify State Disaster Management Authority (SDMA) & NDRF response teams</p>
              </div>

              <form onSubmit={handleIncidentSubmit} style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '0px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neutral-700)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Hazard Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--neutral-300)', fontSize: '13px' }}
                  >
                    <option value="Rockfall / Minor Landslide">{t('incident.category_rockfall')}</option>
                    <option value="Major Slope Failure">{t('incident.category_major_failure')}</option>
                    <option value="Road Blockade due to Debris">{t('incident.category_road_blockade')}</option>
                    <option value="Creep / Ground Cracks">{t('incident.category_creep_cracks')}</option>
                    <option value="Mudflow / Flash Flood">{t('incident.category_mudflow')}</option>
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
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--neutral-300)', fontSize: '13px' }}
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
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--neutral-300)', fontSize: '13px', fontFamily: 'inherit' }}
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
          )
        }

        {/* MEDIA UPLOAD */}
        {
          activeNav === 'media' && (
            <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Media & Ground Imagery Upload</h2>
                <p style={{ fontSize: '12px', color: 'var(--neutral-600)' }}>Upload geo-tagged slope photos for automatic AI damage estimation</p>
              </div>

              <div style={{
                border: '2px dashed var(--primary-600)',
                backgroundColor: 'var(--primary-50)',
                borderRadius: '0px',
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

              <div style={{ backgroundColor: '#ffffff', borderRadius: '0px', padding: '16px', border: '1px solid var(--neutral-200)' }}>
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
                      <div key={idx} style={{ display: 'flex', gap: '16px', padding: '16px', backgroundColor: 'var(--neutral-50)', borderRadius: '0px', border: '1px solid var(--neutral-200)' }}>
                        {res.imageUrl && (
                          <div style={{ flexShrink: 0, width: '100px', height: '100px', borderRadius: '0px', overflow: 'hidden', border: '1px solid var(--neutral-300)' }}>
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
          )
        }

        {/* OFFLINE STATE & SYNC */}
        {
          activeNav === 'offline_sync' && (
            <div style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Offline State & Sync Center</h2>
                <p style={{ fontSize: '12px', color: 'var(--neutral-600)' }}>Ensures continuous warning system operation even when cellular networks fail during disasters</p>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '0px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--neutral-50)', borderRadius: '4px', fontSize: '12px' }}>
                      <span>Sikkim & North Bengal DEM 30m Grid</span>
                      <span style={{ color: 'var(--risk-low)', fontWeight: 700 }}>Cached (42 MB)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--neutral-50)', borderRadius: '4px', fontSize: '12px' }}>
                      <span>Offline Emergency SOP & Shelters</span>
                      <span style={{ color: 'var(--risk-low)', fontWeight: 700 }}>Cached (8 MB)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* AI ASSISTANT */}
        {
          activeNav === 'ai_assistant' && (
            <div style={{ maxWidth: '700px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>NERAKSH AI Safety Assistant</h2>
                <p style={{ fontSize: '12px', color: 'var(--neutral-600)' }}>Automated emergency guidance trained on NDMA & GSI landslide response SOPs</p>
              </div>

              <div style={{ flex: 1, backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '0px', display: 'flex', flexDirection: 'column', height: '420px' }}>
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} style={{
                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      backgroundColor: msg.sender === 'user' ? 'var(--primary-600)' : 'var(--neutral-100)',
                      color: msg.sender === 'user' ? '#ffffff' : 'var(--neutral-900)',
                      padding: '10px 14px',
                      borderRadius: '0px',
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
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '4px', border: '1px solid var(--neutral-300)', fontSize: '13px' }}
                  />
                  <button type="submit" className="btn-primary">
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>
          )
        }

        {/* NOTIFICATIONS */}
        {
          activeNav === 'notifications' && (
            <div style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{t('ui.citizen_alert_center')}</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifications.map(notif => {
                  // API-sourced alerts have structured severity/lat/lon; static ones have titleKey/descKey
                  const isApiAlert = 'severity' in notif;
                  const displayTitle = isApiAlert
                    ? `[NDMA] ${getSeverityLabel(notif.severity).toUpperCase()} ${t('notification.landslide_risk_alert')}`
                    : t(notif.titleKey);
                  const displayDesc = isApiAlert
                    ? `${t('notification.landslide_warning')} (${t('alert.location_label')}: ${notif.latitude.toFixed(4)}°N, ${notif.longitude.toFixed(4)}°E)`
                    : t(notif.descKey);
                  return (
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
                          {displayTitle}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--neutral-600)', marginTop: '2px' }}>{displayDesc}</div>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--neutral-400)' }}>{notif.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        }

        {/* PROFILE */}
        {
          activeNav === 'profile' && (
            <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Citizen Profile</h2>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '0px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
          )
        }
      </main >
    </div >
  );
}
