import React, { useEffect } from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Gift,
  Globe,
  Layers,
  Radio,
  Server,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { selectedGuild, guilds, isGlobalScope } = useAuth();
  const location = useLocation();
  const { guildId: paramGuildId } = useParams<{ guildId: string }>();

  // Khóa cuộn trang nền và lắng nghe phím Escape khi mở mobile drawer
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen, onCloseMobile]);

  const isGlobal = isGlobalScope || location.pathname.startsWith('/dashboard/global');
  const activeGuild =
    (paramGuildId ? guilds.find((g) => g.id === paramGuildId) : null) ||
    selectedGuild;
  const currentGuildId = activeGuild?.id || paramGuildId || '';

  const serverNavItems = [
    {
      to: `/dashboard/guilds/${currentGuildId}`,
      label: 'Tổng quan Máy chủ',
      icon: Activity,
      end: true,
      badge: 'Server',
    },
    {
      to: `/dashboard/guilds/${currentGuildId}/permits`,
      label: 'Phân quyền (Permit)',
      icon: ShieldCheck,
    },
    {
      to: `/dashboard/guilds/${currentGuildId}/perks`,
      label: 'Quản lý Đặc quyền',
      icon: Gift,
    },
    {
      to: `/dashboard/guilds/${currentGuildId}/voice-keeper`,
      label: 'Voice Keeper 24/7',
      icon: Radio,
    },
    {
      to: `/dashboard/guilds/${currentGuildId}/wordchain`,
      label: 'Wordchain Engine',
      icon: BookOpen,
      badge: 'Game',
    },
    {
      to: `/dashboard/guilds/${currentGuildId}/swarm`,
      label: 'The Swarm Linked',
      icon: Layers,
      badge: 'Roles',
    },
  ];

  const globalNavItems = [
    {
      to: '/dashboard/global',
      label: 'Tổng quan Hệ thống',
      icon: Activity,
      end: true,
      badge: 'System',
    },
    {
      to: '/dashboard/global/swarm',
      label: 'The Swarm Toàn Cầu',
      icon: Layers,
      badge: 'Roles',
    },
  ];

  const navItems = isGlobal ? globalNavItems : serverNavItems;

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-3 select-none">
      <div className="space-y-4">
        {/* Scope Mini-Banner */}
        {isGlobal ? (
          <div
            className={cn(
              'p-2.5 bg-indigo-950/30 rounded-xl border border-indigo-500/30 flex items-center transition-all',
              isCollapsed ? 'justify-center p-2' : 'gap-3',
            )}
            title="Toàn Hệ Thống (Application Scope)"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md shadow-indigo-500/25">
              <Globe className="w-4 h-4" />
            </div>

            {!isCollapsed && (
              <div className="overflow-hidden min-w-0">
                <h2 className="text-xs font-bold text-white truncate">
                  Toàn Hệ Thống
                </h2>
                <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 animate-pulse" />
                  <span className="truncate">Application Scope</span>
                </div>
              </div>
            )}
          </div>
        ) : activeGuild ? (
          <div
            className={cn(
              'p-2.5 bg-[#1e1f22] rounded-xl border border-[#3f4147]/80 flex items-center transition-all',
              isCollapsed ? 'justify-center p-2' : 'gap-3',
            )}
            title={`${activeGuild.name} (${activeGuild.roleTier})`}
          >
            {activeGuild.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${activeGuild.id}/${activeGuild.icon}.png?size=64`}
                alt={activeGuild.name}
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-discord-blurple/20 flex items-center justify-center text-discord-blurple font-bold text-xs shrink-0">
                {activeGuild.name.charAt(0)}
              </div>
            )}

            {!isCollapsed && (
              <div className="overflow-hidden min-w-0">
                <h2 className="text-xs font-bold text-white truncate">
                  {activeGuild.name}
                </h2>
                <div className="flex items-center gap-1.5 text-[10px] text-discord-muted mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-discord-green shrink-0 animate-pulse" />
                  <span className="truncate">{activeGuild.roleTier}</span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Navigation Section */}
        <nav className="space-y-1">
          {!isCollapsed && (
            <div className="text-[11px] font-semibold text-discord-muted px-3 mb-2 flex items-center justify-between">
              <span>{isGlobal ? 'Quản trị toàn cầu' : 'Quản trị máy chủ'}</span>
              {isGlobal && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                  GLOBAL
                </span>
              )}
            </div>
          )}

          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-xl font-medium text-xs transition-all group relative',
                  isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? isGlobal
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                      : 'bg-discord-blurple text-white shadow-md shadow-discord-blurple/25 font-semibold'
                    : 'text-discord-muted hover:text-white hover:bg-[#313338]',
                )
              }
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'ml-auto text-[9px] px-1.5 py-0.5 rounded font-bold uppercase',
                        isGlobal
                          ? 'bg-indigo-400/20 text-indigo-300'
                          : 'bg-discord-green/20 text-discord-green',
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer Controls: Collapse Toggle & Backend Status */}
      <div className="space-y-3 pt-3 border-t border-[#3f4147]/50">
        {/* Collapse Button (Desktop only) */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center w-full py-2 rounded-xl text-discord-muted hover:text-white hover:bg-[#313338] transition-colors text-xs gap-2"
          title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Thu gọn menu</span>
            </>
          )}
        </button>

        {/* Backend Online Pill */}
        {!isCollapsed ? (
          <div className="p-2.5 rounded-xl bg-[#1e1f22]/70 border border-[#3f4147]/60 text-xs">
            <div className="flex items-center justify-between text-white font-medium mb-1">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Server className="w-3.5 h-3.5 text-discord-green" />
                Backend Gateway
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-discord-green/20 text-discord-green font-bold">
                Online
              </span>
            </div>
            <p className="text-[10px] text-discord-muted truncate">
              Fastify + Discord.js v14
            </p>
          </div>
        ) : (
          <div
            className="flex justify-center p-2 rounded-xl bg-[#1e1f22] text-discord-green"
            title="Backend Gateway: Online"
          >
            <Server className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-[#10121a]/90 backdrop-blur-xl border-r border-white/[0.08] shrink-0 h-[calc(100vh-4rem)] sticky top-16 transition-all duration-200 z-20',
          isCollapsed ? 'w-16' : 'w-64',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide-Over) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          {/* Drawer Menu */}
          <div className="fixed inset-y-0 left-0 w-72 bg-[#12141c] border-r border-white/10 shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-[#3f4147]">
              <span className="text-sm font-bold text-white">Menu Điều hướng</span>
              <button
                onClick={onCloseMobile}
                className="p-2 rounded-lg text-discord-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
