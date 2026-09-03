import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AdminHeatmapView from './views/AdminHeatmapView';
import UserPredictionView from './views/UserPredictionView';

export default function App() {
  const [role, setRole] = useState('admin'); // 'admin' or 'user'
  const [activeTab, setActiveTab] = useState('risk_map');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Top persistent header */}
      <Header currentRole={role} setRole={setRole} />

      {/* Main Workspace Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Render Sidebar rail only for Admin role */}
        {role === 'admin' && (
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        {/* View Surface */}
        <main style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
          {role === 'admin' ? (
            <AdminHeatmapView />
          ) : (
            <UserPredictionView />
          )}
        </main>
      </div>
    </div>
  );
}
