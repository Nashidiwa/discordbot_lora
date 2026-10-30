import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ToastProvider, useToast } from '../ui/Toast';
import { AmbientBackground } from './AmbientBackground';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

const DashboardContent: React.FC = () => {
  const {
    guilds,
    selectedGuild,
    setSelectedGuild,
    isGlobalScope,
    setIsGlobalScope,
    loading,
  } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  // Reactive URL <-> State Sync
  useEffect(() => {
    if (loading) return;

    if (location.pathname.startsWith('/dashboard/guilds/')) {
      if (guilds.length === 0) return;
      const match = location.pathname.match(/^\/dashboard\/guilds\/([^/]+)/);
      const urlGuildId = match ? match[1] : null;

      if (urlGuildId) {
        const foundGuild = guilds.find((g) => g.id === urlGuildId);
        if (foundGuild) {
          if (selectedGuild?.id !== urlGuildId) {
            setSelectedGuild(foundGuild);
          }
          if (isGlobalScope) {
            setIsGlobalScope(false);
          }
        } else {
          toast.error(
            'Máy chủ không khả dụng',
            'Bạn không có quyền quản trị hoặc máy chủ này không tồn tại.',
          );
          navigate('/dashboard', { replace: true });
        }
      }
    } else if (location.pathname.startsWith('/dashboard/global')) {
      if (!isGlobalScope) {
        setIsGlobalScope(true);
      }
    }
  }, [
    location.pathname,
    guilds,
    selectedGuild,
    isGlobalScope,
    loading,
    navigate,
    setSelectedGuild,
    setIsGlobalScope,
    toast,
  ]);

  return (
    <div className="min-h-screen bg-transparent flex flex-col antialiased relative">
      <AmbientBackground />
      <Navbar onToggleMobileSidebar={() => setIsMobileOpen(true)} />
      <div className="flex flex-1">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full transition-all">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const DashboardLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090d] flex items-center justify-center p-6 relative">
        <AmbientBackground />
        <div className="flex flex-col items-center gap-4 glass-panel p-8 rounded-3xl">
          <div className="w-10 h-10 border-4 border-discord-blurple border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Đang tải bảng điều khiển</p>
            <p className="text-xs text-discord-muted mt-0.5">Xác thực phiên làm việc và đối soát máy chủ...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
};

export default DashboardLayout;
