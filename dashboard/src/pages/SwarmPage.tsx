import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Copy,
  Globe,
  Info,
  Layers,
  Lock,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { apiFetch } from '../api/client';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import { ChannelSelect } from '../components/ui/ChannelSelect';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { UserDisplay } from '../components/ui/UserDisplay';
import { UserInput } from '../components/ui/UserInput';
import { useAuth } from '../context/AuthContext';
import { cn, formatDateTime } from '../lib/utils';
import type {
  DiscordUserInfo,
  SwarmServerMember,
  SwarmServerOverviewData,
} from '../types';

export const SwarmPage: React.FC = () => {
  const { guildId: paramGuildId } = useParams<{ guildId: string }>();
  const { selectedGuild, guilds, setIsGlobalScope } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const currentGuild =
    (paramGuildId ? guilds.find((g) => g.id === paramGuildId) : null) ||
    selectedGuild;
  const guildId = currentGuild?.id || paramGuildId;

  // Search & Filter
  const [memberSearch, setMemberSearch] = useState<string>('');

  // Form Channel Config (Server Scope)
  const [notificationChannelId, setNotificationChannelId] =
    useState<string>('');
  const [hasInitChannel, setHasInitChannel] = useState<boolean>(false);

  // Modal gán/thu hồi cấp độ (Chỉ Operator / Bot Owner)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [verifiedTargetUser, setVerifiedTargetUser] =
    useState<DiscordUserInfo | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);

  // Fetch dữ liệu Swarm của riêng Guild này
  const { data, isLoading } = useQuery<SwarmServerOverviewData>({
    queryKey: ['swarm-server-overview', guildId],
    queryFn: () =>
      apiFetch<SwarmServerOverviewData>(`/api/guilds/${guildId}/swarm`),
    enabled: Boolean(guildId),
  });

  const isOperator = data?.callerPermissions?.isOperator ?? false;
  const isBotOwner = data?.callerPermissions?.isBotOwner ?? false;
  const canEditConfig = data?.callerPermissions?.canEditConfig ?? false;
  const canManageMembers = data?.callerPermissions?.canManageMembers ?? false;

  // Đồng bộ config khi có data
  useEffect(() => {
    if (data?.config && !hasInitChannel) {
      setNotificationChannelId(data.config.notificationChannelId || '');
      setHasInitChannel(true);
    }
  }, [data?.config, hasInitChannel]);

  // Mutation cập nhật kênh thông báo (Server Scope - Operator Only)
  const updateConfigMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/guilds/${guildId}/swarm/config`, {
        method: 'PUT',
        body: JSON.stringify({
          notificationChannelId: notificationChannelId.trim() || null,
        }),
      }),
    onSuccess: () => {
      toast.success(
        'Đã lưu cấu hình máy chủ',
        'Kênh thông báo cấp bậc The Swarm của server này đã được cập nhật.',
      );
      void queryClient.invalidateQueries({
        queryKey: ['swarm-server-overview', guildId],
      });
    },
    onError: (err: Error) => toast.error('Lỗi cập nhật cấu hình', err.message),
  });

  // Mutation gán/thu hồi level thành viên (Application Scope - Operator Only)
  const updateMemberMutation = useMutation<{ level: number; synced: boolean }>({
    mutationFn: () =>
      apiFetch<{ level: number; synced: boolean }>(
        `/api/guilds/${guildId}/swarm/members/${targetUserId.trim()}`,
        {
          method: 'POST',
          body: JSON.stringify({ level: selectedLevel }),
        },
      ),
    onSuccess: (res) => {
      if (res.level === 0) {
        toast.success(
          'Đã thu hồi cấp bậc toàn cầu',
          `Đã xóa danh hiệu The Swarm của thành viên ${targetUserId}. ${res.synced ? '(Đã đồng bộ sang Discord)' : '(Chờ thành viên liên kết OAuth2)'}`,
        );
      } else {
        toast.success(
          'Cập nhật cấp bậc thành công!',
          `Đã gán Level ${res.level} cho thành viên ${targetUserId}. ${res.synced ? '(Đã đồng bộ sang Discord)' : '(Chờ thành viên liên kết OAuth2)'}`,
        );
      }
      setIsUpdateModalOpen(false);
      setTargetUserId('');
      void queryClient.invalidateQueries({
        queryKey: ['swarm-server-overview', guildId],
      });
    },
    onError: (err: Error) => toast.error('Lỗi gán cấp bậc', err.message),
  });

  const handleCopyVerificationUrl = () => {
    const origin = window.location.origin;
    const url = `${origin}/auth/discord/login`;
    void navigator.clipboard.writeText(url);
    toast.success(
      'Đã sao chép URL xác thực',
      'Dán vào ô "Linked Roles Verification URL" trên Discord Developer Portal.',
    );
  };

  const getTierColorClass = (level: number) => {
    if (level === 0) return 'text-discord-muted bg-white/5 border-white/10';
    if (level <= 2)
      return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    if (level <= 4)
      return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (level <= 6)
      return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  };

  if (!guildId) {
    return (
      <div className="p-8 text-center text-discord-muted glass-panel rounded-3xl border border-white/10">
        Vui lòng chọn một Server từ thanh điều hướng phía trên để quản trị The Swarm.
      </div>
    );
  }

  const serverMembers: SwarmServerMember[] = data?.serverMembers || [];
  const filteredMembers = serverMembers.filter(
    (m) =>
      m.userId.includes(memberSearch) ||
      (m.username && m.username.toLowerCase().includes(memberSearch.toLowerCase())) ||
      `Level ${m.swarmLevel}`.toLowerCase().includes(memberSearch.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
                <Layers className="w-6 h-6" />
              </span>
              The Swarm Linked Roles
            </h1>

            {/* Thẩm quyền caller badge */}
            {isBotOwner ? (
              <Badge variant="yellow" size="sm">
                Bot Owner (Toàn Quyền)
              </Badge>
            ) : isOperator ? (
              <Badge variant="purple" size="sm">
                Delegated Operator
              </Badge>
            ) : (
              <Badge variant="blurple" size="sm">
                Server Scope (Phạm Vi Máy Chủ)
              </Badge>
            )}
          </div>

          <p className="text-xs text-discord-muted mt-1 max-w-2xl">
            Quản trị vai trò liên kết The Swarm trong phạm vi máy chủ{' '}
            <strong className="text-white">{currentGuild?.name}</strong>. Cấp độ
            được người dùng tự kết nối qua Discord OAuth2 Native Verification.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyVerificationUrl}
            className="gap-2 text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
          >
            <Copy className="w-3.5 h-3.5" />
            Sao chép Verification URL
          </Button>

          {/* Lối tắt sang Quản Trị Toàn Cầu nếu là Operator / Bot Owner */}
          {isOperator && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsGlobalScope(true);
                navigate('/dashboard/global/swarm');
              }}
              className="gap-2 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-md shadow-indigo-500/25"
            >
              <Globe className="w-3.5 h-3.5" />
              Bảng Quản Trị Swarm Toàn Cầu
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Thông báo phân ranh giới quyền hạn nếu caller không phải Operator */}
      {!isOperator && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed space-y-1">
            <span className="font-bold text-amber-300 block">
              Quyền Hạn Cấp Máy Chủ (Server-Scoped Mode)
            </span>
            <p className="text-white/80">
              Bạn đang xem danh sách các thành viên thuộc máy chủ này đã kết nối
              danh hiệu The Swarm. Do cấp bậc The Swarm có hiệu lực toàn hệ thống
              ở cấp Ứng Dụng (Application-wide), việc cấu hình kênh thông báo và
              gán/thu hồi cấp độ được bảo vệ nghiêm ngặt và chỉ thực hiện bởi{' '}
              <strong>Bot Owner</strong> hoặc <strong>Delegated Operator</strong>{' '}
              được ủy quyền.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards (Không hiển thị số Operator ở cấp server) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card hover>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-discord-muted uppercase tracking-wider">
                Thành Viên Liên Kết Trong Server
              </p>
              <h3 className="text-xl font-black text-white mt-0.5">
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  data?.stats.totalLinked ?? 0
                )}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-discord-muted uppercase tracking-wider">
                Cấp Độ Khả Dụng
              </p>
              <h3 className="text-xl font-black text-white mt-0.5">
                8 Bậc (Level 1-8)
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-discord-muted uppercase tracking-wider">
                Kênh Thông Báo Của Server
              </p>
              <h3 className="text-sm font-bold text-white mt-0.5 truncate max-w-[180px]">
                {isLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : data?.config?.notificationChannelId ? (
                  <span className="font-mono text-emerald-400">
                    #{data.config.notificationChannelId}
                  </span>
                ) : (
                  <span className="text-discord-muted italic">Chưa thiết lập</span>
                )}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: 8 Bậc Role Trong Server & Cấu Hình Kênh Máy Chủ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột 1: Danh sách 8 Bậc Swarm Trong Server */}
        <div className="lg:col-span-7 space-y-4">
          <Card hover>
            <CardHeader>
              <CardTitle>
                <Shield className="w-5 h-5 text-indigo-400 inline-block mr-2" />
                Thành Viên Từng Bậc Trong Server (The Swarm I → VIII)
              </CardTitle>
              <CardDescription>
                Số lượng thành viên hiện diện trong máy chủ này đã sở hữu từng cấp bậc danh hiệu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(data?.roles || []).map((role) => {
                    const count =
                      data?.stats.levelDistribution?.[role.level] || 0;
                    return (
                      <div
                        key={role.level}
                        className={cn(
                          'p-3.5 rounded-2xl border transition flex items-center justify-between',
                          getTierColorClass(role.level),
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center font-black text-xs">
                            {role.level}
                          </div>
                          <div>
                            <span className="font-extrabold text-sm block">
                              {role.name}
                            </span>
                            <span className="text-[10px] text-discord-muted">
                              metadata.swarm_level == {role.level}
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant={
                            role.level > 6
                              ? 'yellow'
                              : role.level > 4
                                ? 'purple'
                                : 'blurple'
                          }
                          size="sm"
                        >
                          {count} member
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cột 2: Cấu Hình Kênh Máy Chủ & Hướng Dẫn Tích Hợp */}
        <div className="lg:col-span-5 space-y-6">
          <Card hover>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  <Bell className="w-5 h-5 text-indigo-400 inline-block mr-2" />
                  Kênh Thông Báo Của Máy Chủ
                </CardTitle>
                <Badge variant={canEditConfig ? 'purple' : 'muted'} size="sm">
                  {canEditConfig ? 'Được phép sửa' : 'Chỉ xem'}
                </Badge>
              </div>
              <CardDescription>
                Kênh gửi thông báo chúc mừng khi có thành viên trong server thăng cấp danh hiệu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ChannelSelect
                label="Kênh Thông Báo Của Máy Chủ"
                placeholder="Chọn kênh gửi thông báo..."
                value={notificationChannelId || null}
                onChange={(val) => setNotificationChannelId(val || '')}
                guildId={guildId}
                disabled={!canEditConfig}
                channelTypes={['TEXT', 'ANNOUNCEMENT']}
                hint={
                  canEditConfig
                    ? 'Để trống nếu muốn tắt tính năng gửi tin nhắn thông báo tự động.'
                    : 'Chỉ Bot Owner hoặc Delegated Operator mới có thẩm quyền thiết lập kênh thông báo.'
                }
              />

              {canEditConfig ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => updateConfigMutation.mutate()}
                  isLoading={updateConfigMutation.isPending}
                  className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  <Save className="w-4 h-4" />
                  Lưu Kênh Thông Báo Máy Chủ
                </Button>
              ) : (
                <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-center gap-2 text-xs text-discord-muted">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Cấu hình kênh được quản lý bởi Quản trị viên The Swarm</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cẩm nang thiết lập Discord Portal */}
          <div className="p-4 rounded-3xl bg-indigo-950/20 border border-indigo-500/20 text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <Info className="w-4 h-4" />
              <span>Quy trình nhận Linked Roles trên Server:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-discord-muted leading-relaxed pl-1">
              <li>
                Bot Owner đã đăng ký metadata schema với Discord REST API.
              </li>
              <li>
                Quản trị viên vào <strong>Server Settings → Roles → Links</strong>{' '}
                của server này để tạo 8 roles với yêu cầu{' '}
                <code className="text-white">swarm_level = 1..8</code>.
              </li>
              <li>
                Thành viên vào mục <strong>Linked Roles</strong> trên Discord của
                Server để bấm liên kết và tự động nhận vai trò!
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Danh Sách Thành Viên Có The Swarm Trong Server (Sắp xếp từ The Swarm 8 về 0) */}
      <Card hover>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>
                <Users className="w-5 h-5 text-indigo-400 inline-block mr-2" />
                Thành Viên The Swarm Trong Máy Chủ ({serverMembers.length})
              </CardTitle>
              <Badge variant="blurple" size="sm">
                Xếp từ Bậc 8 → 0
              </Badge>
            </div>
            <CardDescription>
              Danh sách đầy đủ các thành viên của server này đã kết nối danh hiệu The Swarm.
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-discord-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo Tên, User ID, Level..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full bg-[#1e2029] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-discord-muted focus:outline-none focus:border-indigo-500/60 transition"
            />
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : filteredMembers.length === 0 ? (
            <div className="py-8 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
              Chưa có thành viên nào trong máy chủ này kết nối The Swarm hoặc khớp với tìm kiếm.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-discord-text">
                <thead className="bg-[#11131a] text-discord-muted uppercase text-[10px] font-extrabold tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4">Thành Viên</th>
                    <th className="py-3.5 px-4">Cấp Bậc The Swarm</th>
                    {/* CỘT NGƯỜI CẬP NHẬT: ẨN HOÀN TOÀN NẾU KHÔNG PHẢI OPERATOR/OWNER */}
                    {canManageMembers && (
                      <th className="py-3.5 px-4">Người Cập Nhật</th>
                    )}
                    <th className="py-3.5 px-4">Thời Gian Cập Nhật</th>
                    <th className="py-3.5 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredMembers.map((m) => (
                    <tr
                      key={m.userId}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-white">
                        <UserDisplay userId={m.userId} />
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border',
                            getTierColorClass(m.swarmLevel),
                          )}
                        >
                          {m.swarmLevel > 0
                            ? `The Swarm ${m.swarmLevel}`
                            : 'Unranked (Đã Thu Hồi)'}
                        </span>
                      </td>

                      {/* Hiển thị Người cập nhật nếu có thẩm quyền */}
                      {canManageMembers && (
                        <td className="py-3.5 px-4 font-mono text-discord-muted">
                          {m.updatedBy ? (
                            <UserDisplay userId={m.updatedBy} showAvatar={false} />
                          ) : (
                            <span className="italic">Hệ thống</span>
                          )}
                        </td>
                      )}

                      <td className="py-3.5 px-4 text-discord-muted">
                        {formatDateTime(m.updatedAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {canManageMembers ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setTargetUserId(m.userId);
                              setSelectedLevel(m.swarmLevel);
                              setIsUpdateModalOpen(true);
                            }}
                            className="text-xs h-7 px-2.5 hover:border-indigo-400"
                          >
                            Điều Chỉnh
                          </Button>
                        ) : (
                          <span className="text-[11px] text-discord-muted italic flex items-center justify-end gap-1">
                            <Lock className="w-3 h-3" /> Chỉ xem
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Gán / Điều Chỉnh Level (Chỉ mở cho Operator / Owner) */}
      {canManageMembers && (
        <Modal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          title="Điều Chỉnh Cấp Bậc The Swarm"
          description="Đồng bộ trực tiếp cấp bậc vai trò liên kết vào tài khoản Discord của người dùng trên toàn bộ hệ thống."
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsUpdateModalOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={updateMemberMutation.isPending}
                disabled={
                  !targetUserId ||
                  !verifiedTargetUser ||
                  updateMemberMutation.isPending
                }
                onClick={() => updateMemberMutation.mutate()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Lưu Cấp Bậc Toàn Cầu
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <UserInput
              label="Thành Viên Nhận Cấp Bậc"
              placeholder="Nhập Discord User ID để tra cứu..."
              value={targetUserId}
              onChange={setTargetUserId}
              onVerified={setVerifiedTargetUser}
              hint="Hệ thống sẽ tự động xác minh người dùng trực tiếp qua Discord Gateway."
            />

            <div className="space-y-2">
              <label className="block text-xs font-bold text-discord-text uppercase tracking-wider">
                Chọn Cấp Bậc Danh Hiệu Toàn Cầu
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLevel(0)}
                  className={cn(
                    'p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1',
                    selectedLevel === 0
                      ? 'border-red-500 bg-red-500/15 text-red-400'
                      : 'border-white/10 bg-black/30 text-discord-muted hover:border-white/30',
                  )}
                >
                  <span>Level 0</span>
                  <span className="text-[10px] font-normal">(Thu Hồi)</span>
                </button>

                {[1, 2, 3, 4, 5, 6, 7, 8].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedLevel(lvl)}
                    className={cn(
                      'p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1',
                      selectedLevel === lvl
                        ? 'border-indigo-400 bg-indigo-500/20 text-white'
                        : 'border-white/10 bg-black/30 text-discord-muted hover:border-white/30',
                    )}
                  >
                    <span>Level {lvl}</span>
                    <span className="text-[10px] font-normal">Swarm {lvl}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SwarmPage;
