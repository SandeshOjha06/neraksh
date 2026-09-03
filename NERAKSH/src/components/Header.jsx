import React from 'react';
import { ShieldCheck, MapPinned, UserCheck, Activity } from 'lucide-react';

export default function Header({ currentRole, setRole }) {
  return (
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
        <div style={{
          backgroundColor: 'var(--secondary-600)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ShieldCheck size={22} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
            NERAKSHA
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--neutral-400)', margin: 0 }}>
            NE India Landslide Early-Warning System (MVP)
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--primary-800)',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          color: 'var(--secondary-500)'
        }}>
          <Activity size={14} />
          <span>Live Engine Active</span>
        </div>

        <div style={{ display: 'flex', backgroundColor: 'var(--primary-800)', borderRadius: '6px', padding: '3px' }}>
          <button
            onClick={() => setRole('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: currentRole === 'admin' ? 'var(--primary-600)' : 'transparent',
              color: currentRole === 'admin' ? '#ffffff' : 'var(--neutral-400)',
              fontWeight: currentRole === 'admin' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <MapPinned size={14} />
            Admin Heatmap
          </button>
          <button
            onClick={() => setRole('user')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: currentRole === 'user' ? 'var(--primary-600)' : 'transparent',
              color: currentRole === 'user' ? '#ffffff' : 'var(--neutral-400)',
              fontWeight: currentRole === 'user' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <UserCheck size={14} />
            User Live Predict
          </button>
        </div>
      </div>
    </header>
  );
}
