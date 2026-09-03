import React, { useState, useEffect } from 'react';
import {
  FileText,
  BarChart3,
  ShieldAlert,
  CheckCircle2,
  Clock,
  MapPin,
  AlertTriangle,
  RefreshCw,
  Printer,
  Download,
  Filter,
  Layers,
  Building2,
  X,
  TrendingUp
} from 'lucide-react';

export default function AdminAnalyticsView() {
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [infrastructure, setInfrastructure] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSitRepModal, setShowSitRepModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [sitRes, alertRes] = await Promise.all([
        fetch('http://localhost:8000/api/field/situational'),
        fetch('http://localhost:8000/api/alerts')
      ]);

      if (sitRes.ok) {
        const sitData = await sitRes.json();
        setIncidents(sitData.incidents || []);
        setInfrastructure(sitData.infrastructure || []);
      }

      if (alertRes.ok) {
        const alertData = await alertRes.json();
        setAlerts(alertData || []);
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const intervalId = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(intervalId);
  }, []);

  const totalIncidents = incidents.length;
  const verifiedCount = incidents.filter(i => i.status === 'Verified').length;
  const unverifiedCount = incidents.filter(i => i.status === 'Unverified').length;
  const verificationRate = totalIncidents > 0 ? ((verifiedCount / totalIncidents) * 100).toFixed(0) : '0';

  const categoryBreakdown = incidents.reduce((acc, inc) => {
    acc[inc.category] = (acc[inc.category] || 0) + 1;
    return acc;
  }, {});

  const filteredIncidents = incidents.filter(inc => {
    if (selectedFilter === 'unverified') return inc.status === 'Unverified';
    if (selectedFilter === 'verified') return inc.status === 'Verified';
    return true;
  });

  const corridors = [
    { name: 'NH-10 Siliguri - Gangtok Highway', risk: 'Critical', score: 0.88, landslides: 14, status: 'Active Watch' },
    { name: 'Shillong - Cherrapunji Expressway', risk: 'High', score: 0.74, landslides: 9, status: 'Monitored' },
    { name: 'Guwahati - Haflong Rail Corridor', risk: 'High', score: 0.69, landslides: 7, status: 'Monitored' },
    { name: 'Imphal - Moreh Border Highway', risk: 'Moderate', score: 0.52, landslides: 4, status: 'Normal' },
  ];

  return (
    <div style={{
      height: '100%',
      width: '100%',
      backgroundColor: '#F7F9FB',
      overflowY: 'auto',
      padding: '24px',
      boxSizing: 'border-box'
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#0F2747',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <BarChart3 size={24} color="#158A7D" />
            Disaster Risk Intelligence & Operational Analytics
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#596577', fontSize: '13px' }}>
            Multi-hazard analytics, critical infrastructure exposure matrix, and official SDMA operational situation reports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => fetchData(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              padding: '9px 14px',
              borderRadius: '4px',
              border: '1px solid #CBD2DB',
              backgroundColor: '#FFFFFF',
              color: '#263247',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh Telemetry
          </button>

          <button
            onClick={() => setShowSitRepModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              padding: '9px 16px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#0F2747',
              color: '#FFFFFF',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FileText size={16} color="#20A18F" />
            Generate NDMA Executive SitRep
          </button>
        </div>
      </div>

      {/* Operational KPI Strip - Unified Strip with Dividers (DESIGN.md Section 10 & 14) */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '0px',
        border: '1px solid #E2E7ED',
        padding: '16px 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingRight: '16px', borderRight: '1px solid #E2E7ED' }}>
          <FileText size={18} color="#2563A8" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#727E8F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Incident Reports
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F2747', marginTop: '2px' }}>
              {totalIncidents}
            </div>
            <div style={{ fontSize: '12px', color: '#596577', marginTop: '2px' }}>
              Citizen & NDRF logged reports
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingLeft: '16px', paddingRight: '16px', borderRight: '1px solid #E2E7ED' }}>
          <CheckCircle2 size={18} color="#159447" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#727E8F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ground Verification Rate
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#159447', marginTop: '2px' }}>
              {verificationRate}%
            </div>
            <div style={{ fontSize: '12px', color: '#596577', marginTop: '2px' }}>
              {verifiedCount} of {totalIncidents} reports confirmed
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingLeft: '16px', paddingRight: '16px', borderRight: '1px solid #E2E7ED' }}>
          <ShieldAlert size={18} color="#C92A2A" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#727E8F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Elevated Alerts
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#C92A2A', marginTop: '2px' }}>
              {alerts.length}
            </div>
            <div style={{ fontSize: '12px', color: '#596577', marginTop: '2px' }}>
              High & Critical model triggers
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingLeft: '16px' }}>
          <TrendingUp size={18} color="#158A7D" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#727E8F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Avg Response Velocity
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#158A7D', marginTop: '2px' }}>
              14.2 min
            </div>
            <div style={{ fontSize: '12px', color: '#596577', marginTop: '2px' }}>
              Field team dispatch speed
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Main Analytics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Left Column: Spatial Hazard Breakdown & Lifeline Exposure */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Spatial Hazard Categorization */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0px',
            border: '1px solid #E2E7ED',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F2747', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#2563A8" />
              Spatial Hazard Categorization Breakdown
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.keys(categoryBreakdown).length === 0 ? (
                <div style={{ color: '#727E8F', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                  No spatial hazard data recorded yet.
                </div>
              ) : (
                Object.entries(categoryBreakdown).map(([cat, count]) => {
                  const pct = totalIncidents > 0 ? ((count / totalIncidents) * 100).toFixed(0) : 0;
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: '#263247', marginBottom: '6px' }}>
                        <span>{cat}</span>
                        <span style={{ color: '#596577' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#F0F3F6', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#2563A8', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Critical Infrastructure Lifeline Exposure */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0px',
            border: '1px solid #E2E7ED',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F2747', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} color="#158A7D" />
              Critical Infrastructure Lifeline Exposure Table
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E7ED', textAlign: 'left', color: '#727E8F', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 4px' }}>Asset / Facility</th>
                  <th style={{ padding: '8px 4px' }}>Type</th>
                  <th style={{ padding: '8px 4px' }}>Risk Exposure</th>
                  <th style={{ padding: '8px 4px' }}>Operational Status</th>
                </tr>
              </thead>
              <tbody>
                {infrastructure.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#727E8F' }}>
                      No critical assets currently compromised.
                    </td>
                  </tr>
                ) : (
                  infrastructure.map((asset) => (
                    <tr key={asset.id} style={{ borderBottom: '1px solid #F0F3F6' }}>
                      <td style={{ padding: '10px 4px', fontWeight: 600, color: '#0F2747' }}>{asset.name}</td>
                      <td style={{ padding: '10px 4px', color: '#596577' }}>{asset.type}</td>
                      <td style={{ padding: '10px 4px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: asset.risk_level === 'High' ? '#FCE8D3' : '#FFF3D9',
                          color: asset.risk_level === 'High' ? '#E57A17' : '#D9A441'
                        }}>
                          {asset.risk_level}
                        </span>
                      </td>
                      <td style={{ padding: '10px 4px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: asset.status === 'Operational' ? '#E4F5EA' : '#FBE1E1',
                          color: asset.status === 'Operational' ? '#159447' : '#C92A2A'
                        }}>
                          {asset.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Corridor Vulnerability Matrix & Ground Verification Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Highway & Railway Corridor Vulnerability Index */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0px',
            border: '1px solid #E2E7ED',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F2747', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#E57A17" />
              Highway & Transit Corridor Vulnerability Matrix
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E7ED', textAlign: 'left', color: '#727E8F', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 4px' }}>Strategic Corridor</th>
                  <th style={{ padding: '8px 4px' }}>Susceptibility Index</th>
                  <th style={{ padding: '8px 4px' }}>Historical Failure Points</th>
                  <th style={{ padding: '8px 4px' }}>Watch Level</th>
                </tr>
              </thead>
              <tbody>
                {corridors.map((corridor, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F0F3F6' }}>
                    <td style={{ padding: '10px 4px', fontWeight: 600, color: '#0F2747' }}>{corridor.name}</td>
                    <td style={{ padding: '10px 4px', fontWeight: 700, color: corridor.risk === 'Critical' ? '#C92A2A' : '#E57A17' }}>
                      {(corridor.score * 100).toFixed(0)} / 100
                    </td>
                    <td style={{ padding: '10px 4px', color: '#596577' }}>{corridor.landslides} zones</td>
                    <td style={{ padding: '10px 4px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: corridor.risk === 'Critical' ? '#FBE1E1' : '#FCE8D3',
                        color: corridor.risk === 'Critical' ? '#C92A2A' : '#E57A17'
                      }}>
                        {corridor.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Live Incident Verification Log Table */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0px',
            border: '1px solid #E2E7ED',
            padding: '20px',
            flex: 1
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F2747', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#159447" />
                Live Incident Ground Verification Audit Log
              </h3>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setSelectedFilter('all')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid #CBD2DB',
                    backgroundColor: selectedFilter === 'all' ? '#0F2747' : '#FFFFFF',
                    color: selectedFilter === 'all' ? '#FFFFFF' : '#3B4759',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedFilter('unverified')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid #CBD2DB',
                    backgroundColor: selectedFilter === 'unverified' ? '#C92A2A' : '#FFFFFF',
                    color: selectedFilter === 'unverified' ? '#FFFFFF' : '#3B4759',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Unverified ({unverifiedCount})
                </button>
                <button
                  onClick={() => setSelectedFilter('verified')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid #CBD2DB',
                    backgroundColor: selectedFilter === 'verified' ? '#159447' : '#FFFFFF',
                    color: selectedFilter === 'verified' ? '#FFFFFF' : '#3B4759',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Verified ({verifiedCount})
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E7ED', textAlign: 'left', color: '#727E8F', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 4px' }}>Category</th>
                    <th style={{ padding: '8px 4px' }}>Description / Evidence</th>
                    <th style={{ padding: '8px 4px' }}>Status</th>
                    <th style={{ padding: '8px 4px' }}>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#727E8F' }}>
                        No incident reports matching the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredIncidents.slice(0, 5).map((inc) => (
                      <tr key={inc.id} style={{ borderBottom: '1px solid #F0F3F6' }}>
                        <td style={{ padding: '10px 4px', fontWeight: 600, color: '#0F2747' }}>{inc.category}</td>
                        <td style={{ padding: '10px 4px', color: '#3B4759', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {inc.description}
                        </td>
                        <td style={{ padding: '10px 4px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: inc.status === 'Unverified' ? '#FBE1E1' : '#E4F5EA',
                            color: inc.status === 'Unverified' ? '#C92A2A' : '#159447'
                          }}>
                            {inc.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 4px', color: '#596577', fontSize: '12px' }}>
                          {inc.location_name || `${inc.lat?.toFixed(2)}°N, ${inc.lon?.toFixed(2)}°E`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Official Executive NDMA SitRep Modal */}
      {showSitRepModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(11, 18, 32, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0px',
            width: '800px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxSizing: 'border-box'
          }}>
            {/* Modal Header */}
            <div style={{
              backgroundColor: '#0F2747',
              color: '#FFFFFF',
              padding: '18px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, letterSpacing: '0.04em' }}>
                  STATE DISASTER MANAGEMENT AUTHORITY (SDMA)
                </h2>
                <div style={{ fontSize: '12px', color: '#20A18F', marginTop: '2px', fontWeight: 600 }}>
                  OFFICIAL EXECUTIVE SITUATION REPORT (SITREP #2026-NE-09)
                </div>
              </div>

              <button
                onClick={() => setShowSitRepModal(false)}
                style={{ background: 'none', border: 'none', color: '#CBD2DB', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Document Body */}
            <div style={{ padding: '24px', color: '#172033', fontSize: '13px', lineHeight: '1.6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0F2747', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <strong>Region:</strong> Northeast Strategic Mountain Corridors (Sikkim, Meghalaya, Assam)<br />
                  <strong>Reporting Period:</strong> 24-Hour Operations Cycle<br />
                  <strong>Security Clear Level:</strong> SDMA Command Operations
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>Date:</strong> {new Date().toLocaleDateString()}<br />
                  <strong>Time:</strong> {new Date().toLocaleTimeString()}<br />
                  <strong>Platform:</strong> NERAKSH Disaster AI System
                </div>
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F2747', marginTop: 0, marginBottom: '8px' }}>
                1. EXECUTIVE HAZARD SUMMARY
              </h4>
              <p style={{ marginTop: 0 }}>
                Continuous monsoon precipitation across high-gradient slopes has triggered elevated landslide susceptibility along critical national transit arteries. Remote sensing models indicate <strong>{alerts.length} active high-probability hazard zones</strong> requiring immediate slope stabilization and field surveillance.
              </p>

              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F2747', marginBottom: '8px' }}>
                2. FIELD GROUND REPORT AUDIT
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F0F3F6', textAlign: 'left', fontWeight: 700 }}>
                    <th style={{ padding: '6px' }}>Total Reports</th>
                    <th style={{ padding: '6px' }}>Verified Incidents</th>
                    <th style={{ padding: '6px' }}>Pending Audit</th>
                    <th style={{ padding: '6px' }}>Verification Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px' }}>{totalIncidents}</td>
                    <td style={{ padding: '6px', color: '#159447', fontWeight: 700 }}>{verifiedCount}</td>
                    <td style={{ padding: '6px', color: '#C92A2A', fontWeight: 700 }}>{unverifiedCount}</td>
                    <td style={{ padding: '6px', fontWeight: 700 }}>{verificationRate}%</td>
                  </tr>
                </tbody>
              </table>

              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F2747', marginBottom: '8px' }}>
                3. CRITICAL LIFELINE & HIGHWAY CORRIDOR STATUS
              </h4>
              <p style={{ marginTop: 0 }}>
                NH-10 Siliguri - Gangtok remains under <strong>Active Watch</strong> due to localized debris accumulation. NDRF Battalion 12 teams are staged at Gangtok and Rangpo transit points.
              </p>

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #CBD2DB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#727E8F' }}>
                  Generated automatically by NERAKSH Operational Analytics Core.
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => window.print()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '4px',
                      border: '1px solid #CBD2DB',
                      backgroundColor: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={14} />
                    Print SitRep
                  </button>

                  <button
                    onClick={() => alert('Downloading Official NDMA SitRep PDF...')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: '#0F2747',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Download size={14} color="#20A18F" />
                    Export Official PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
