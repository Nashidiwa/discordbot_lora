import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface DashboardRedirectProps {
  subpath?: string;
}

export const DashboardRedirect: React.FC<DashboardRedirectProps> = ({ subpath }) => {
  const { guilds, loading, canAccessGlobal } = useAuth();

  if (loading) {
    return null;
  }

  const lastActiveGuildId = localStorage.getItem('lora_last_active_guild');
  const validLastGuild = lastActiveGuildId && guilds.some((g) => g.id === lastActiveGuildId);
  const targetGuildId = validLastGuild ? lastActiveGuildId : guilds[0]?.id;

  if (targetGuildId) {
    const targetPath = subpath
      ? `/dashboard/guilds/${targetGuildId}/${subpath}`
      : `/dashboard/guilds/${targetGuildId}`;
    return <Navigate to={targetPath} replace />;
  }

  // Nếu user không có guild nào nhưng có quyền Global Scope (Bot Owner/Operator)
  if (canAccessGlobal) {
    return <Navigate to="/dashboard/global" replace />;
  }

  return (
    <div className="p-8 text-center glass-panel rounded-3xl text-discord-muted text-sm border border-white/10 max-w-xl mx-auto mt-12">
      <h2 className="text-base font-bold text-white mb-2">Chưa có máy chủ quản trị</h2>
      <p className="text-xs text-discord-muted">
        Tài khoản Discord của bạn hiện chưa tham gia máy chủ nào có bot Lora hoặc chưa được cấp thẩm quyền quản trị.
      </p>
    </div>
  );
};

export default DashboardRedirect;
