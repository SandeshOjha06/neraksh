import React from 'react';
import { LayoutDashboard, Map, Bell, FileText, Settings, HelpCircle, Layers } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'overview', label: 'Command Overview', icon: LayoutDashboard },
    { id: 'risk_map', label: 'NER Risk Map', icon: Map },
    { id: 'monitoring', label: 'Live Sensors & Satellite', icon: Layers },
    { id: 'alerts', label: 'Alerts & Incidents', icon: Bell },
    { id: 'reports', label: 'Reports & Analytics', icon: FileText },
  ];

  return (
    <aside style={{
      width: '240px',
      backgroundColor: 'var(--primary-900)',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      borderRight: '1px solid var(--primary-800)',
      padding: '16px 12px'
    }}>
      <div>
        <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--primary-800)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--neutral-300)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <Icon size={18} color={isActive ? 'var(--secondary-500)' : 'var(--neutral-400)'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div style={{ borderTop: '1px solid var(--primary-800)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'var(--neutral-400)',
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
          color: 'var(--neutral-400)',
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
