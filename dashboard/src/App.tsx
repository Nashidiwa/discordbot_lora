import React from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardRedirect } from './components/layout/DashboardRedirect';
import { GlobalOverviewPage } from './pages/GlobalOverviewPage';
import { GlobalSwarmPage } from './pages/GlobalSwarmPage';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { PerksPage } from './pages/PerksPage';
import { PermitPage } from './pages/PermitPage';
import { SwarmPage } from './pages/SwarmPage';
import { VoiceKeeperPage } from './pages/VoiceKeeperPage';
import { WordchainPage } from './pages/WordchainPage';

// Chuyển tiếp tương thích ngược từ /dashboard/servers/:guildId/* sang /dashboard/guilds/:guildId/*
const LegacyServerParamRedirect: React.FC = () => {
  const { guildId } = useParams<{ guildId: string }>();
  const location = useLocation();
  const subpath = location.pathname.replace(`/dashboard/servers/${guildId}`, '');
  return <Navigate to={`/dashboard/guilds/${guildId}${subpath}`} replace />;
};

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        {/* Fallback & Root Redirects */}
        <Route index element={<DashboardRedirect />} />
        <Route path="guilds" element={<DashboardRedirect />} />
        <Route path="servers" element={<DashboardRedirect />} />

        {/* Server Scope Management (:guildId) */}
        <Route path="guilds/:guildId">
          <Route index element={<OverviewPage />} />
          <Route path="permits" element={<PermitPage />} />
          <Route path="perks" element={<PerksPage />} />
          <Route path="voice-keeper" element={<VoiceKeeperPage />} />
          <Route path="wordchain" element={<WordchainPage />} />
          <Route path="swarm" element={<SwarmPage />} />
        </Route>

        {/* Backward Compatibility for /servers/:guildId */}
        <Route path="servers/:guildId" element={<LegacyServerParamRedirect />} />
        <Route path="servers/:guildId/*" element={<LegacyServerParamRedirect />} />

        {/* Backward Compatibility for legacy un-scoped URLs */}
        <Route path="permits" element={<DashboardRedirect subpath="permits" />} />
        <Route path="perks" element={<DashboardRedirect subpath="perks" />} />
        <Route path="voice-keeper" element={<DashboardRedirect subpath="voice-keeper" />} />
        <Route path="wordchain" element={<DashboardRedirect subpath="wordchain" />} />
        <Route path="swarm" element={<DashboardRedirect subpath="swarm" />} />

        {/* Global Scope Management (Application-wide) */}
        <Route path="global" element={<GlobalOverviewPage />} />
        <Route path="global/swarm" element={<GlobalSwarmPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
