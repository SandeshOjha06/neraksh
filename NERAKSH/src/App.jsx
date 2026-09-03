import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AdminHeatmapView from './views/AdminHeatmapView';
import AdminAnalyticsView from './views/AdminAnalyticsView';
import AdminAlertsReportsView from './views/AdminAlertsReportsView';
import UserPredictionView from './views/UserPredictionView';
import CitizenDashboardView from './views/CitizenDashboardView';

export default function App() {
  const [role, setRole] = useState('admin'); // 'admin', 'user', or 'citizen'
  const [activeTab, setActiveTab] = useState('overview');
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Top persistent header */}
      <Header
        currentRole={role}
        setRole={setRole}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      {/* Main Workspace Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Render Sidebar rail only for Admin / Authority role */}
        {role === 'admin' && (
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        {/* View Surface */}
        <main style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
          {role === 'admin' && (
            activeTab === 'alerts' ? (
              <AdminAlertsReportsView />
            ) : (activeTab === 'analytics' || activeTab === 'reports') ? (
              <AdminAnalyticsView />
            ) : (
              <AdminHeatmapView />
            )
          )}
          {role === 'user' && <UserPredictionView />}
          {role === 'citizen' && <CitizenDashboardView currentUser={currentUser} />}
        </main>
      </div>
    </div>
  );
}
