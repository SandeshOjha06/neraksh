import React, { useState, useEffect } from 'react';
import { ShieldCheck, MapPinned, UserCheck, Activity, User, LogIn, Lock, LogOut, Building, ShieldAlert, CheckCircle, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function Header({ currentRole, setRole, currentUser, setCurrentUser }) {
  const { language, setLanguage, languages, t } = useLanguage();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(currentRole || 'admin');
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.id || 1);

  // Fetch users from FastAPI database on mount
  useEffect(() => {
    fetch('http://localhost:8000/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data);
          const initialUser = data.find(u => u.role?.toLowerCase() === currentRole.toLowerCase()) || data[0];
          if (!currentUser) setCurrentUser(initialUser);
        }
      })
      .catch((err) => console.error('Failed to fetch users:', err));
  }, []);

  const handleSignIn = (e) => {
    e.preventDefault();
    const foundUser = users.find(u => u.id === parseInt(selectedUserId));
    if (foundUser) {
      const userRoleLower = foundUser.role?.toLowerCase() || 'user';
      let mappedRole = 'user';
      if (userRoleLower === 'admin') mappedRole = 'admin';
      else if (userRoleLower === 'citizen') mappedRole = 'citizen';

      setRole(mappedRole);
      setCurrentUser(foundUser);
    } else {
      // Fallback custom profile
      let mockUser;
      if (selectedRole === 'admin') {
        mockUser = { id: 1, username: 'admin_ne', full_name: 'Dr. A. K. Sharma (NE Disaster Cell)', email: 'admin@neraksha.gov.in', role: 'Admin' };
      } else if (selectedRole === 'citizen') {
        mockUser = { id: 3, username: 'citizen_dimapur', full_name: 'Anita Roy (Citizen - Gangtok)', email: 'anita.roy@gmail.com', role: 'Citizen' };
      } else {
        mockUser = { id: 2, username: 'field_officer_1', full_name: 'Rajesh Gogoi (Field Team Assam)', email: 'officer1@neraksha.gov.in', role: 'User' };
      }
      setRole(selectedRole);
      setCurrentUser(mockUser);
    }
    setShowAuthModal(false);
  };

  return (
    <>
      <header style={{
        height: '64px',
        backgroundColor: 'var(--primary-900)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid var(--primary-800)',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
              NERAKSH
            </h1>
            <p style={{ fontSize: '11px', color: 'var(--neutral-400)', margin: 0 }}>
              NE India Landslide Early-Warning System (MVP)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Active Role Dashboard Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--primary-800)',
            borderRadius: '4px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#ffffff',
            border: '1px solid var(--primary-700)'
          }}>
            {currentRole === 'admin' && (
              <>
                <MapPinned size={14} color="var(--risk-critical)" />
                <span>Authority / NDMA Dashboard</span>
              </>
            )}
            {currentRole === 'user' && (
              <>
                <UserCheck size={14} color="var(--primary-500)" />
                <span>Field Officer Predict</span>
              </>
            )}
            {currentRole === 'citizen' && (
              <>
                <User size={14} color="var(--secondary-500)" />
                <span>Citizen Safety Portal</span>
              </>
            )}
          </div>

          {/* Language Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: currentRole === 'citizen' ? '#113552' : 'var(--primary-800)',
            borderRadius: '6px',
            padding: '5px 10px',
            border: currentRole === 'citizen' ? '1px solid var(--secondary-500)' : '1px solid var(--primary-700)',
            boxShadow: currentRole === 'citizen' ? '0 0 8px rgba(45, 212, 191, 0.2)' : 'none',
            transition: 'all 0.2s ease'
          }}>
            <Globe size={15} color={currentRole === 'citizen' ? '#2dd4bf' : 'var(--secondary-400)'} />
            <select
              id="neraksh-language-select"
              aria-label={t('ui.language_selector')}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                backgroundColor: 'transparent',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                paddingRight: '4px'
              }}
            >
              {languages.map((l) => (
                <option
                  key={l.code}
                  value={l.code}
                  style={{ backgroundColor: '#0f2747', color: '#ffffff' }}
                >
                  {l.native} ({l.label})
                </option>
              ))}
            </select>
          </div>

          {/* User Profile / Sign In Action */}
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--primary-800)',
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid var(--primary-700)'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: currentRole === 'admin' ? '#C92A2A' : 'var(--secondary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#ffffff'
                }}>
                  {currentUser.full_name ? currentUser.full_name.charAt(0) : 'U'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', lineHeight: 1.2 }}>
                    {currentUser.full_name}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--neutral-400)' }}>
                    {currentUser.role === 'Admin' ? 'NDMA Disaster Officer' : currentUser.role === 'Citizen' ? 'Registered Citizen' : 'Field Operations Officer'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAuthModal(true)}
                title={t('ui.switch_profile')}
                style={{
                  backgroundColor: 'var(--primary-800)',
                  border: '1px solid var(--primary-700)',
                  color: '#ffffff',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <LogIn size={14} />
                {t('ui.switch_profile')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="btn-primary"
              style={{ fontSize: '13px', padding: '6px 14px' }}
            >
              <LogIn size={14} />
              {t('ui.sign_in')}
            </button>
          )}
        </div>
      </header>

      {/* Role-Based Authentication & Profile Switcher Modal */}
      {showAuthModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(11, 18, 32, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '0px',
            width: '450px',
            maxWidth: '90%',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out',
            border: '1px solid var(--neutral-300)'
          }}>
            <div style={{
              backgroundColor: 'var(--primary-900)',
              color: '#ffffff',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Lock size={20} color="var(--secondary-500)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>NERAKSH Portal Sign In</h3>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--neutral-400)', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSignIn} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neutral-700)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Select Operational Role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div
                    onClick={() => {
                      setSelectedRole('admin');
                      const adminU = users.find(u => u.role?.toLowerCase() === 'admin');
                      if (adminU) setSelectedUserId(adminU.id);
                    }}
                    style={{
                      border: selectedRole === 'admin' ? '2px solid var(--primary-600)' : '1px solid var(--neutral-300)',
                      backgroundColor: selectedRole === 'admin' ? 'var(--primary-50)' : '#ffffff',
                      borderRadius: '0px',
                      padding: '12px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-900)', fontWeight: 700, fontSize: '12px' }}>
                      <Building size={14} color="var(--primary-600)" />
                      Authority
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--neutral-600)' }}>
                      NDMA/SDMA Officers
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedRole('user');
                      const fieldU = users.find(u => u.role?.toLowerCase() === 'user');
                      if (fieldU) setSelectedUserId(fieldU.id);
                    }}
                    style={{
                      border: selectedRole === 'user' ? '2px solid var(--primary-600)' : '1px solid var(--neutral-300)',
                      backgroundColor: selectedRole === 'user' ? 'var(--primary-50)' : '#ffffff',
                      borderRadius: '0px',
                      padding: '12px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-900)', fontWeight: 700, fontSize: '12px' }}>
                      <UserCheck size={14} color="var(--primary-600)" />
                      Field Team
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--neutral-600)' }}>
                      Field Survey Officers
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedRole('citizen');
                      const citU = users.find(u => u.role?.toLowerCase() === 'citizen');
                      if (citU) setSelectedUserId(citU.id);
                    }}
                    style={{
                      border: selectedRole === 'citizen' ? '2px solid var(--secondary-600)' : '1px solid var(--neutral-300)',
                      backgroundColor: selectedRole === 'citizen' ? 'var(--secondary-50)' : '#ffffff',
                      borderRadius: '0px',
                      padding: '12px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary-800)', fontWeight: 700, fontSize: '12px' }}>
                      <User size={14} color="var(--secondary-600)" />
                      Citizen
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--neutral-600)' }}>
                      Local Residents
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neutral-700)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Select Demo User Account
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '4px',
                    border: '1px solid var(--neutral-300)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--neutral-900)',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {users.filter(u => u.role?.toLowerCase() === (selectedRole === 'admin' ? 'admin' : selectedRole === 'citizen' ? 'citizen' : 'user')).length > 0 ? (
                    users
                      .filter(u => u.role?.toLowerCase() === (selectedRole === 'admin' ? 'admin' : selectedRole === 'citizen' ? 'citizen' : 'user'))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} ({u.role}) — {u.email}
                        </option>
                      ))
                  ) : (
                    <>
                      {selectedRole === 'admin' && <option value="1">Dr. A. K. Sharma (NE Disaster Cell) — Admin</option>}
                      {selectedRole === 'user' && <option value="2">Rajesh Gogoi (Field Team Assam) — User</option>}
                      {selectedRole === 'citizen' && <option value="3">Anita Roy (Citizen - Gangtok) — Citizen</option>}
                    </>
                  )}
                </select>
              </div>

              <div style={{ backgroundColor: 'var(--neutral-100)', borderRadius: '0px', padding: '12px', fontSize: '12px', color: 'var(--neutral-700)' }}>
                <strong>Role Access Rights:</strong>
                <ul style={{ paddingLeft: '18px', marginTop: '4px', margin: 0 }}>
                  {selectedRole === 'admin' && (
                    <>
                      <li>Full NE Regional Susceptibility & Trigger GIS Heatmaps</li>
                      <li>Multi-Station Alert Monitors & Command Center SOPs</li>
                    </>
                  )}
                  {selectedRole === 'user' && (
                    <>
                      <li>On-Demand DEM Pinpoint Landslide Hazard Prediction</li>
                      <li>30km Radius Spatial Susceptibility Grid Analysis</li>
                    </>
                  )}
                  {selectedRole === 'citizen' && (
                    <>
                      <li>Incident & Slope Crack Reporting + Geo-Media Uploads</li>
                      <li>Offline State Engine, Local Alerts & AI Safety Assistant</li>
                    </>
                  )}
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Sign In to View Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

