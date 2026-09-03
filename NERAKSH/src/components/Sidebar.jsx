import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Map, Bell, FileText, Settings, HelpCircle, Layers } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, unreadCount = 0 }) {
  const [unverifiedCount, setUnverifiedCount] = useState(unreadCount);

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch('http://localhost:8000/api/field/situational');
        if (res.ok) {
          const data = await res.json();
          if (data.incidents) {
            const count = data.incidents.filter(i => i.status === 'Unverified').length;
            setUnverifiedCount(count);
          }
        }
      } catch (err) {
        // Fallback to prop
      }
    }
    fetchUnread();
    const intervalId = setInterval(fetchUnread, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const countDisplay = unreadCount || unverifiedCount;

  const menuItems = [
    { id: 'overview', label: 'Command Overview', icon: LayoutDashboard },
    { id: 'alerts', label: 'Alerts & Reports', icon: Bell, hasBadge: true },
    { id: 'analytics', label: 'Analytics', icon: FileText },
  ];

  return (
    <aside style={{
      width: '240px',
      backgroundColor: '#0F2747',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      borderRight: '1px solid #163A63',
      padding: '16px 12px',
      boxSizing: 'border-box'
    }}>
      <div>
        <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: '#9AA4B2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Operations Rail
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isActive ? '#163A63' : 'transparent',
                  color: isActive ? '#ffffff' : '#CBD2DB',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={18} color={isActive ? '#20A18F' : '#9AA4B2'} />
                  <span>{item.label}</span>
                </div>

                {item.hasBadge && countDisplay > 0 && (
                  <span style={{
                    backgroundColor: '#C92A2A',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    borderRadius: '10px',
                    padding: '2px 8px',
                    boxShadow: '0 0 8px rgba(201, 42, 42, 0.6)'
                  }}>
                    {countDisplay}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div style={{ borderTop: '1px solid #163A63', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: 'transparent',
          color: '#9AA4B2',
          fontSize: '13px',
          cursor: 'pointer'
        }}>
          <Settings size={18} />
          <span>System Settings</span>
        </button>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: 'transparent',
          color: '#9AA4B2',
          fontSize: '13px',
          cursor: 'pointer'
        }}>
          <HelpCircle size={18} />
          <span>SOP & Documentation</span>
        </button>
      </div>
    </aside>
  );
}
