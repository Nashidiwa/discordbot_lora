import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Globe,
  Layers,
  Radio,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Users,
  Wifi,
} from 'lucide-react';
import { apiFetch } from '../api/client';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { formatDurationSeconds } from '../lib/utils';
import type { SystemOverview } from '../types';

export const GlobalOverviewPage: React.FC = () => {
  const { user, canAccessGlobal, guilds, setSelectedGuild, setIsGlobalScope } =
    useAuth();
  const navigate = useNavigate();

  const [searchGuild, setSearchGuild] = useState<string>('');

  const [liveMetrics, setLiveMetrics] = useState<{
    uptime?: number;
    ping?: number;
    memory?: { rssMb: number; heapUsedMb: number };
  }>({});

  // Ping history array for live SVG Sparkline chart
  const [pingHistory, setPingHistory] = useState<number[]>([
    25, 28, 24, 30, 26, 22, 28, 25,
  ]);

  // Query dữ liệu overview (chỉ dành cho Bot Owner)
  const { data, isLoading } = useQuery({
    queryKey: ['system-overview'],
    queryFn: () => apiFetch<SystemOverview>('/api/bot/overview'),
    enabled: Boolean(user?.isBotOwner),
    refetchInterval: 15000,
  });

  // Đăng ký nhận SSE live stream metrics nếu là Bot Owner
  useEffect(() => {
    if (!user?.isBotOwner) return;

    const eventSource = new EventSource('/api/sse/system', {
      withCredentials: true,
    });

    eventSource.addEventListener('metrics', (e) => {
      try {
        const payload = JSON.parse(e.data);
        setLiveMetrics(payload);
        if (typeof payload.ping === 'number') {
          setPingHistory((prev) => [...prev.slice(-14), payload.ping]);
        }
      } catch {
        // ignore
      }
    });

    return () => {
      eventSource.close();
    };
  }, [user?.isBotOwner]);

  const uptime = liveMetrics.uptime ?? data?.system.uptime ?? 0;
  const ping = liveMetrics.ping ?? data?.system.ping ?? 24;
  const memoryRss =
    liveMetrics.memory?.rssMb ?? data?.system.memory.rssMb ?? 180;
  const memoryHeap =
    liveMetrics.memory?.heapUsedMb ?? data?.system.memory.heapUsedMb ?? 85;
  const memoryTotal = data?.system.memory.heapTotalMb ?? 160;
  const heapPercent = Math.min(
    Math.round((memoryHeap / memoryTotal) * 100),
    100,
  );

  // SVG Sparkline path builder
  const maxPing = Math.max(...pingHistory, 60);
  const minPing = Math.max(Math.min(...pingHistory) - 10, 0);
  const sparkWidth = 140;
  const sparkHeight = 36;
  const points = pingHistory
    .map((val, idx) => {
      const x = (idx / (pingHistory.length - 1 || 1)) * sparkWidth;
      const normalized = (val - minPing) / (maxPing - minPing || 1);
      const y = sparkHeight - normalized * (sparkHeight - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  if (!canAccessGlobal) {
    return (
      <div className="p-8 text-center text-discord-muted glass-panel rounded-3xl border border-white/10 space-y-3">
        <Shield className="w-10 h-10 text-discord-red mx-auto" />
        <h3 className="text-base font-bold text-white">Truy Cập Bị Giới Hạn</h3>
        <p className="text-xs text-discord-muted max-w-md mx-auto">
          Bảng điều khiển cấp Toàn Cầu chỉ dành riêng cho Bot Owner hoặc
          Delegated Operator được ủy quyền.
        </p>
      </div>
    );
  }

  const filteredGuilds = guilds.filter(
    (g) =>
      g.name.toLowerCase().includes(searchGuild.toLowerCase()) ||
      g.id.includes(searchGuild),
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
    <div className="space-y-8 select-none max-w-6xl">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
                <Globe className="w-6 h-6" />
              </span>
              Trạm Chỉ Huy Toàn Hệ Thống
            </h1>
            <Badge variant="purple" size="md">
              Global Control
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-discord-muted">
            Giám sát sức khỏe hạ tầng bot và quản trị mạng lưới máy chủ cấp Ứng
            Dụng (Application Scope).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.isBotOwner ? (
            <Badge variant="yellow" size="md" dot>
              Bot Owner (Toàn Quyền)
            </Badge>
          ) : (
            <Badge variant="purple" size="md" dot>
              Delegated Operator
            </Badge>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CHỈ SỐ HẠ TẦNG RUNTIME (BENTO GRID TELEMETRY) - DÀNH CHO BOT OWNER */}
      {/* ========================================================================= */}
      {user?.isBotOwner ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-discord-muted flex items-center gap-2">
              <Server className="w-4 h-4 text-discord-blurple" />
              <span>Chỉ Số Hạ Tầng Runtime (Real-time Bento Grid)</span>
            </h2>
            <span className="text-[11px] text-emerald-400 font-extrabold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SSE Stream Connected
            </span>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Bento Card 1: Live WebSocket Ping with SVG Sparkline */}
            <Card hover className="md:col-span-6 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block mb-1">
                    Gateway Latency Telemetry
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {isLoading ? '...' : `${ping}`}
                    </span>
                    <span className="text-xs font-bold text-discord-muted">
                      ms ping
                    </span>
                  </div>
                </div>

                {/* Live SVG Sparkline Chart */}
                <div className="flex flex-col items-end">
                  <svg
                    width={sparkWidth}
                    height={sparkHeight}
                    className="overflow-visible"
                  >
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                      className="filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    />
                  </svg>
                  <span className="text-[10px] text-discord-muted font-mono mt-1">
                    15s Live Sparkline
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-discord-muted">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Wifi className="w-3.5 h-3.5" />
                  Đường truyền Gateway ổn định
                </span>
                <span className="font-mono text-[11px]">Heartbeat: 41.25s</span>
              </div>
            </Card>

            {/* Bento Card 2: Memory Progress & RSS Gauge */}
            <Card hover className="md:col-span-6 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block mb-1">
                    Node.js Runtime Memory
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {isLoading ? '...' : `${memoryHeap}`}
                    </span>
                    <span className="text-xs font-bold text-discord-muted">
                      / {memoryRss} MB RSS
                    </span>
                  </div>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xs">
                  {heapPercent}%
                </div>
              </div>

              {/* Memory Visual Progress Bar */}
              <div className="mt-4 space-y-2">
                <div className="w-full bg-[#0c0d12] rounded-full h-2.5 overflow-hidden p-0.5 border border-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500 shadow-sm shadow-amber-500/50"
                    style={{ width: `${heapPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-discord-muted">
                  <span>
                    Heap Used: <strong>{memoryHeap}MB</strong>
                  </span>
                  <span>
                    Heap Total: <strong>{memoryTotal}MB</strong>
                  </span>
                </div>
              </div>
            </Card>

            {/* Bento Card 3: Uptime Digital Clock */}
            <Card hover className="md:col-span-4 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-discord-blurple/20 text-discord-blurple flex items-center justify-center border border-discord-blurple/30 shrink-0">
                <Activity className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-discord-muted font-extrabold uppercase block">
                  Uptime Tiến Trình
                </span>
                <span className="text-base font-extrabold text-white truncate block mt-0.5">
                  {isLoading ? '...' : formatDurationSeconds(uptime)}
                </span>
              </div>
            </Card>

            {/* Bento Card 4: Guilds & Members Count */}
            <Card hover className="md:col-span-4 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-discord-muted font-extrabold uppercase block">
                  Mạng Lưới Máy Chủ
                </span>
                <span className="text-base font-extrabold text-white truncate block mt-0.5">
                  {isLoading
                    ? '...'
                    : `${data?.stats.totalGuilds ?? 0} servers (${data?.stats.totalMembers ?? 0} users)`}
                </span>
              </div>
            </Card>

            {/* Bento Card 5: Active Modules Summary */}
            <Card hover className="md:col-span-4 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
                <Radio className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-discord-muted font-extrabold uppercase block">
                  Cấu Hình Voice / Perks
                </span>
                <span className="text-base font-extrabold text-white truncate block mt-0.5">
                  {isLoading
                    ? '...'
                    : `${data?.stats.activeVoiceKeeperConfigs ?? 0} voice / ${data?.stats.activeBoosterPerks ?? 0} roles`}
                </span>
              </div>
            </Card>
          </div>
        </section>
      ) : (
        /* Delegated Operator Information Banner */
        <Card hover className="p-6 border-indigo-500/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-lg shadow-indigo-500/25">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Chào mừng Delegated Operator
              </h3>
              <p className="text-xs text-discord-muted mt-0.5">
                Bạn có toàn quyền quản trị và phân bổ vai trò The Swarm Linked
                Roles trên toàn bộ mạng lưới máy chủ của bot.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Lối tắt quản trị The Swarm Toàn Cầu */}
      <Card hover className="border-indigo-500/30 bg-gradient-to-r from-indigo-950/20 to-purple-950/20">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Phân Hệ The Swarm Linked Roles Toàn Cầu
                <Badge variant="purple" size="sm">
                  8 Bậc Danh Hiệu
                </Badge>
              </h3>
              <p className="text-xs text-discord-muted mt-1 max-w-xl">
                Quản lý toàn bộ danh sách thành viên được gán cấp bậc, phân bổ 8
                bậc danh hiệu và ủy quyền Delegated Operators.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/dashboard/global/swarm')}
            className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shrink-0"
          >
            Quản Trị Swarm Toàn Cầu
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* DANH SÁCH MÁY CHỦ TRONG MẠNG LƯỚI & NÚT HƯỚNG TỚI SETTINGS */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-discord-muted flex items-center gap-2">
              <Server className="w-4 h-4 text-discord-blurple" />
              <span>Mạng Lưới Máy Chủ Discord ({guilds.length})</span>
            </h2>
            <p className="text-xs text-discord-muted mt-0.5">
              Chọn máy chủ bên dưới để chuyển trực tiếp sang bảng cài đặt chi tiết của máy chủ đó.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-discord-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm máy chủ..."
              value={searchGuild}
              onChange={(e) => setSearchGuild(e.target.value)}
              className="w-full bg-[#1e2029] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-discord-muted focus:outline-none focus:border-indigo-500/60 transition"
            />
          </div>
        </div>

        {filteredGuilds.length === 0 ? (
          <div className="py-8 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
            Không tìm thấy máy chủ nào phù hợp với bộ lọc tìm kiếm.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuilds.map((guild) => (
              <Card
                key={guild.id}
                hover
                className="p-5 flex flex-col justify-between group"
              >
                <div className="flex items-start gap-3.5 mb-4">
                  {guild.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`}
                      alt={guild.name}
                      className="w-12 h-12 rounded-2xl object-cover ring-1 ring-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-discord-blurple/20 text-discord-blurple flex items-center justify-center font-black text-base shrink-0">
                      {guild.name.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-discord-blurple transition-colors">
                      {guild.name}
                    </h3>
                    <span className="text-[10px] text-discord-muted font-mono block">
                      ID: {guild.id}
                    </span>

                    <div className="flex items-center gap-2 mt-1.5">
                      {getTierBadge(guild.roleTier)}
                      {guild.memberCount > 0 && (
                        <span className="text-[11px] text-discord-muted flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {guild.memberCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedGuild(guild);
                    setIsGlobalScope(false);
                    navigate(`/dashboard/guilds/${guild.id}`);
                  }}
                  className="w-full justify-between text-xs font-bold hover:border-discord-blurple group-hover:bg-discord-blurple/10"
                >
                  <span>Cài đặt máy chủ này</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default GlobalOverviewPage;
