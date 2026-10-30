import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  Globe,
  Search,
  Server,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';

export const GuildSwitcher: React.FC = () => {
  const {
    guilds,
    selectedGuild,
    setSelectedGuild,
    isGlobalScope,
    setIsGlobalScope,
    canAccessGlobal,
    user,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const urlMatch = location.pathname.match(/^\/dashboard\/guilds\/([^/]+)/);
  const currentUrlGuildId = urlMatch ? urlMatch[1] : null;
  const activeGuild =
    (currentUrlGuildId ? guilds.find((g) => g.id === currentUrlGuildId) : null) ||
    selectedGuild;

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredGuilds = guilds.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'BOT_OWNER':
        return <Badge variant="yellow" size="sm">Bot Owner</Badge>;
      case 'SERVER_OWNER':
        return <Badge variant="blurple" size="sm">Server Owner</Badge>;
      case 'CO_OWNER':
        return <Badge variant="purple" size="sm">Co-Owner</Badge>;
      case 'TRUSTED_ADMIN':
        return <Badge variant="green" size="sm">Trusted Admin</Badge>;
      default:
        return <Badge variant="muted" size="sm">{tier}</Badge>;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-150 text-left select-none',
          'bg-[#1e1f22] border-[#3f4147] hover:border-discord-blurple/60 hover:bg-[#232428]',
          isOpen && 'border-discord-blurple ring-2 ring-discord-blurple/25 bg-[#232428]',
          isGlobalScope && 'border-indigo-500/50 bg-indigo-950/20 hover:border-indigo-400',
        )}
      >
        {isGlobalScope ? (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md shadow-indigo-500/25">
            <Globe className="w-4 h-4" />
          </div>
        ) : activeGuild?.icon ? (
          <img
            src={`https://cdn.discordapp.com/icons/${activeGuild.id}/${activeGuild.icon}.png?size=64`}
            alt={activeGuild.name}
            className="w-7 h-7 rounded-lg object-cover ring-1 ring-white/10 shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-discord-blurple/20 text-discord-blurple flex items-center justify-center font-bold text-xs shrink-0">
            {activeGuild?.name.charAt(0) || 'S'}
          </div>
        )}

        <div className="max-w-[140px] sm:max-w-[180px] overflow-hidden">
          <div className="text-xs font-bold text-white truncate leading-tight">
            {isGlobalScope ? 'Toàn Hệ Thống' : activeGuild?.name || 'Chọn Server'}
          </div>
          <div className="text-[10px] text-discord-muted truncate flex items-center gap-1">
            {isGlobalScope ? (
              <span className="text-indigo-400 font-semibold">Application Scope</span>
            ) : (
              <span>{activeGuild?.roleTier || 'Guest'}</span>
            )}
          </div>
        </div>

        <ChevronDown
          className={cn(
            'w-4 h-4 text-discord-muted transition-transform duration-200 shrink-0',
            isOpen && 'rotate-180 text-white',
          )}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#2b2d31] border border-[#3f4147] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Section 1: Toàn Cầu (Global Scope) - Dành cho Bot Owner hoặc Operator */}
          {canAccessGlobal && (
            <div className="p-2 border-b border-[#3f4147] bg-[#232428]/60">
              <div className="text-[10px] font-bold text-discord-muted uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-indigo-400" />
                <span>Phạm Vi Cấp Ứng Dụng (Global)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsGlobalScope(true);
                  setIsOpen(false);
                  navigate('/dashboard/global');
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left group',
                  isGlobalScope
                    ? 'bg-indigo-600/20 border border-indigo-500/50'
                    : 'hover:bg-[#313338] border border-transparent',
                )}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-lg shadow-indigo-500/25">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                      Toàn Hệ Thống (Global)
                    </span>
                    {isGlobalScope && (
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={user?.isBotOwner ? 'yellow' : 'purple'} size="sm">
                      {user?.isBotOwner ? 'Bot Owner' : 'Operator'}
                    </Badge>
                    <span className="text-[10px] text-discord-muted">
                      Quản trị toàn bot
                    </span>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Section 2: Search Box for Guilds */}
          <div className="p-2.5 border-b border-[#3f4147]">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-discord-muted absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm kiếm máy chủ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-discord-muted focus:outline-none focus:border-discord-blurple"
              />
            </div>
          </div>

          {/* Section 3: Guilds List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            <div className="text-[10px] font-bold text-discord-muted uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
              <Server className="w-3 h-3" />
              <span>Các Máy Chủ Của Bạn ({guilds.length})</span>
            </div>

            {filteredGuilds.length === 0 ? (
              <div className="py-6 text-center text-xs text-discord-muted">
                Không tìm thấy máy chủ nào khớp
              </div>
            ) : (
              filteredGuilds.map((guild) => {
                const isSelected = !isGlobalScope && activeGuild?.id === guild.id;
                return (
                  <button
                    key={guild.id}
                    onClick={() => {
                      setSelectedGuild(guild);
                      setIsGlobalScope(false);
                      setIsOpen(false);
                      setSearchQuery('');

                      // Giữ nguyên tab hiện tại khi đổi server
                      const match = location.pathname.match(
                        /^\/dashboard\/guilds\/[^/]+(\/.*)?$/,
                      );
                      const subpath = match && match[1] ? match[1] : '';
                      navigate(`/dashboard/guilds/${guild.id}${subpath}`);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left group',
                      isSelected
                        ? 'bg-discord-blurple/15 border border-discord-blurple/40'
                        : 'hover:bg-[#313338] border border-transparent',
                    )}
                  >
                    {guild.icon ? (
                      <img
                        src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`}
                        alt={guild.name}
                        className="w-9 h-9 rounded-xl object-cover shrink-0 ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-discord-blurple/20 text-discord-blurple flex items-center justify-center font-bold text-sm shrink-0">
                        {guild.name.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate group-hover:text-discord-blurple transition-colors">
                          {guild.name}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-discord-blurple shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {getTierBadge(guild.roleTier)}
                        {guild.memberCount > 0 && (
                          <span className="text-[10px] text-discord-muted flex items-center gap-0.5">
                            <Users className="w-2.5 h-2.5" />
                            {guild.memberCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GuildSwitcher;
