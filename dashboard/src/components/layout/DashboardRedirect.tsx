import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';

interface DashboardRedirectProps {
  subpath?: string;
}

export const DashboardRedirect: React.FC<DashboardRedirectProps> = ({ subpath }) => {
  const { guilds, loading, canAccessGlobal } = useAuth();
  const { t } = useI18n();

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
      <h2 className="text-base font-bold text-white mb-2">{t('common.noServersTitle')}</h2>
      <p className="text-xs text-discord-muted">
        {t('common.noServersDesc')}
      </p>
    </div>
  );
};

export default DashboardRedirect;
