import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Crown,
  Key,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
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
import { Modal } from '../components/ui/Modal';
import { RoleSelect } from '../components/ui/RoleSelect';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { UserDisplay } from '../components/ui/UserDisplay';
import { UserInput } from '../components/ui/UserInput';
import { useAuth } from '../context/AuthContext';
import { cn, formatDateTime } from '../lib/utils';
import type { DiscordUserInfo, PermitOverview } from '../types';

const PERMIT_FLAGS = [
  {
    key: 'VIEW_DASHBOARD',
    flag: 1 << 0,
    label: 'Xem Dashboard',
    hex: '0x01',
    desc: 'Cho phép đăng nhập và theo dõi số liệu của server trên web.',
  },
  {
    key: 'MANAGE_PERMITS',
    flag: 1 << 1,
    label: 'Quản lý Permit',
    hex: '0x02',
    desc: 'Bổ nhiệm/thu hồi Co-Owner, Trusted Admin và Custom Grants.',
  },
  {
    key: 'MANAGE_SETTINGS',
    flag: 1 << 2,
    label: 'Cài đặt Server',
    hex: '0x04',
    desc: 'Điều chỉnh các cài đặt chung và kênh thông báo của bot.',
  },
  {
    key: 'MANAGE_PERKS',
    flag: 1 << 3,
    label: 'Quản lý Perks',
    hex: '0x08',
    desc: 'Cấu hình Server Booster Grace Period & Nạp giờ Donator Time-Bank.',
  },
  {
    key: 'MANAGE_VOICE_KEEPER',
    flag: 1 << 4,
    label: 'Quản lý Voice 24/7',
    hex: '0x10',
    desc: 'Chọn phòng thoại, kích hoạt Reconnect và đổi trạng thái giữ kênh.',
  },
  {
    key: 'MANAGE_WORDCHAIN',
    flag: 1 << 5,
    label: 'Quản lý Nối Từ',
    hex: '0x20',
    desc: 'Cấu hình trò chơi nối từ đa tầng và quyền quản trị từ điển.',
  },
  {
    key: 'MANAGE_SWARM',
    flag: 1 << 6,
    label: 'Quản lý The Swarm',
    hex: '0x40',
    desc: 'Quản lý vai trò Discord Linked Roles và phân cấp người dùng.',
  },
];

export const PermitPage: React.FC = () => {
  const { guildId: paramGuildId } = useParams<{ guildId: string }>();
  const { selectedGuild, guilds } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const currentGuild =
    (paramGuildId ? guilds.find((g) => g.id === paramGuildId) : null) ||
    selectedGuild;
  const guildId = currentGuild?.id || paramGuildId;

  const [activeTab, setActiveTab] = useState<'co_owner' | 'trusted' | 'custom'>(
    'co_owner',
  );

  // Forms
  const [newCoOwnerUserId, setNewCoOwnerUserId] = useState<string>('');
  const [verifiedCoOwnerUser, setVerifiedCoOwnerUser] =
    useState<DiscordUserInfo | null>(null);

  const [trustedTargetType, setTrustedTargetType] = useState<'USER' | 'ROLE'>('USER');
  const [trustedTargetId, setTrustedTargetId] = useState<string>('');
  const [verifiedTrustedUser, setVerifiedTrustedUser] =
    useState<DiscordUserInfo | null>(null);

  const [customTargetType, setCustomTargetType] = useState<'USER' | 'ROLE'>('USER');
  const [customTargetId, setCustomTargetId] = useState<string>('');
  const [verifiedCustomUser, setVerifiedCustomUser] =
    useState<DiscordUserInfo | null>(null);
  const [selectedFlags, setSelectedFlags] = useState<number>(1);

  // Confirmation Modal for Revoking
  const [revokeTarget, setRevokeTarget] = useState<{
    targetType: 'USER' | 'ROLE';
    targetId: string;
    tierName: string;
  } | null>(null);

  // Lấy danh sách Permit
  const { data, isLoading } = useQuery({
    queryKey: ['guild-permits', guildId],
    queryFn: () =>
      apiFetch<PermitOverview>(`/api/guilds/${guildId}/permits`),
    enabled: Boolean(guildId),
  });

  // Lắng nghe SSE thời gian thực khi có thay đổi Permit
  useEffect(() => {
    if (!guildId) return;

    const eventSource = new EventSource(`/api/sse/guilds/${guildId}`, {
      withCredentials: true,
    });

    eventSource.addEventListener('permit:changed', () => {
      void queryClient.invalidateQueries({ queryKey: ['guild-permits', guildId] });
    });

    return () => {
      eventSource.close();
    };
  }, [guildId, queryClient]);

  // Mutations
  const assignMutation = useMutation({
    mutationFn: (payload: {
      targetType: 'USER' | 'ROLE';
      targetId: string;
      tier: 'CO_OWNER' | 'TRUSTED_ADMIN' | 'CUSTOM';
      permissions?: number;
    }) =>
      apiFetch(`/api/guilds/${guildId}/permits/assign`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success('Cấp quyền thành công', 'Danh sách phân quyền đã được cập nhật.');
      setNewCoOwnerUserId('');
      setTrustedTargetId('');
      setCustomTargetId('');
      void queryClient.invalidateQueries({ queryKey: ['guild-permits', guildId] });
    },
    onError: (err: Error) => toast.error('Cấp quyền thất bại', err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (payload: { targetType: 'USER' | 'ROLE'; targetId: string }) =>
      apiFetch(`/api/guilds/${guildId}/permits/revoke`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.warning('Đã thu hồi quyền', 'Quyền hạn của đối tượng đã bị gỡ bỏ.');
      setRevokeTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['guild-permits', guildId] });
    },
    onError: (err: Error) => toast.error('Thu hồi thất bại', err.message),
  });

  if (!guildId) {
    return (
      <div className="p-8 text-center text-discord-muted glass-panel rounded-3xl border border-white/10">
        Vui lòng chọn một Server từ thanh điều hướng phía trên để quản lý Phân quyền Permit.
      </div>
    );
  }

  const toggleFlag = (flag: number) => {
    setSelectedFlags((prev) => prev ^ flag);
  };

  const renderFlagChips = (flags: number) => {
    return PERMIT_FLAGS.filter((f) => (flags & f.flag) === f.flag).map((f) => (
      <span
        key={f.key}
        className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold"
      >
        {f.label}
      </span>
    ));
  };

  return (
    <div className="space-y-8 max-w-5xl select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-black shadow-lg shadow-purple-500/25">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Phân Quyền Custom Permit
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  Wick-style RBAC
                </span>
              </h1>
              <p className="text-xs text-discord-muted mt-0.5">
                Hệ thống kiểm soát thẩm quyền 4 tầng độc lập không phụ thuộc vào Discord native permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Server Owner Identity */}
        {data?.ownerId && (
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#14161f] border border-white/10 text-xs">
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-discord-muted">Chủ Server:</span>
            <code className="text-white font-mono font-bold">{data.ownerId}</code>
          </div>
        )}
      </div>

      {/* Authority Tiers Diagram Card */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-3xl glass-panel text-xs">
        <div className="p-3.5 rounded-2xl bg-black/20 border border-amber-500/30 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-300 font-extrabold">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Tier 1: Server Owner</span>
          </div>
          <p className="text-[11px] text-discord-muted">Thẩm quyền tối cao, bổ nhiệm Co-Owner.</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/20 border border-purple-500/30 space-y-1">
          <div className="flex items-center gap-1.5 text-purple-300 font-extrabold">
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            <span>Tier 2: Co-Owner</span>
          </div>
          <p className="text-[11px] text-discord-muted">Ủy quyền toàn diện, quản lý toàn bộ bot.</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/20 border border-emerald-500/30 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-300 font-extrabold">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Tier 3: Trusted Admin</span>
          </div>
          <p className="text-[11px] text-discord-muted">Vận hành tính năng (Voice, Perks, Settings).</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/20 border border-cyan-500/30 space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-300 font-extrabold">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>Tier 4: Custom Grants</span>
          </div>
          <p className="text-[11px] text-discord-muted">Gán quyền linh hoạt theo Bitfield flags.</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-[#14161f] border border-white/10 w-fit">
        <button
          onClick={() => setActiveTab('co_owner')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200',
            activeTab === 'co_owner'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-discord-muted hover:text-white',
          )}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Co-Owners ({data?.coOwners?.length ?? 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('trusted')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200',
            activeTab === 'trusted'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-discord-muted hover:text-white',
          )}
        >
          <UserCheck className="w-4 h-4" />
          <span>Trusted Admins ({data?.trustedAdmins?.length ?? 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200',
            activeTab === 'custom'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-discord-muted hover:text-white',
          )}
        >
          <Key className="w-4 h-4" />
          <span>Custom Grants ({data?.customPermits?.length ?? 0})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CO-OWNERS (TIER 2) */}
      {/* ========================================================================= */}
      {activeTab === 'co_owner' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card hover>
            <CardHeader>
              <CardTitle className="text-purple-300">Bổ Nhiệm Co-Owner Mới</CardTitle>
              <CardDescription>
                Chỉ Server Owner hoặc Bot Owner mới có quyền bổ nhiệm Co-Owner. Co-Owner có toàn quyền quản trị các tính năng bot trong máy chủ.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 w-full">
                  <UserInput
                    label="Discord User ID Thành Viên"
                    placeholder="Nhập User ID cần bổ nhiệm Co-Owner..."
                    value={newCoOwnerUserId}
                    onChange={setNewCoOwnerUserId}
                    onVerified={setVerifiedCoOwnerUser}
                    hint="Tài khoản sẽ được xác thực trực tiếp qua Discord Gateway."
                  />
                </div>
                <Button
                  variant="primary"
                  size="md"
                  disabled={
                    !newCoOwnerUserId ||
                    !verifiedCoOwnerUser ||
                    assignMutation.isPending
                  }
                  isLoading={assignMutation.isPending}
                  onClick={() =>
                    assignMutation.mutate({
                      targetType: 'USER',
                      targetId: newCoOwnerUserId,
                      tier: 'CO_OWNER',
                    })
                  }
                  className="w-full sm:w-auto text-xs font-bold bg-purple-600 hover:bg-purple-700 border-0 h-[42px]"
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  Bổ Nhiệm Co-Owner
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Co-Owners List */}
          <Card hover>
            <CardHeader>
              <CardTitle>Danh Sách Co-Owners Hiện Tại</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : !data?.coOwners || data.coOwners.length === 0 ? (
                <div className="py-8 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
                  Chưa có Co-Owner nào được bổ nhiệm cho máy chủ này.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.coOwners.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between text-xs hover:border-purple-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold border border-purple-500/30">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <UserDisplay userId={p.targetId} className="text-sm font-bold" />
                          <span className="text-[11px] text-discord-muted block mt-0.5">
                            Được cấp bởi: <UserDisplay userId={p.createdBy} showAvatar={false} /> • {formatDateTime(p.createdAt)}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          setRevokeTarget({
                            targetType: p.targetType,
                            targetId: p.targetId,
                            tierName: 'Co-Owner',
                          })
                        }
                        className="text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Bãi nhiệm
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRUSTED ADMINS (TIER 3) */}
      {/* ========================================================================= */}
      {activeTab === 'trusted' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card hover>
            <CardHeader>
              <CardTitle className="text-emerald-300">Bổ Nhiệm Trusted Admin</CardTitle>
              <CardDescription>
                Trusted Admin có các quyền vận hành mặc định: Xem Dashboard, Cài đặt Server, Quản lý Perks, Voice Keeper 24/7 (nhưng không thể sửa Permit).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTrustedTargetType('USER')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl text-xs font-bold border transition',
                      trustedTargetType === 'USER'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-black/30 text-discord-muted border-white/10',
                    )}
                  >
                    Gán cho User
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrustedTargetType('ROLE')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl text-xs font-bold border transition',
                      trustedTargetType === 'ROLE'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-black/30 text-discord-muted border-white/10',
                    )}
                  >
                    Gán cho Role
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="flex-1 w-full">
                    {trustedTargetType === 'USER' ? (
                      <UserInput
                        label="Discord User ID Thành Viên"
                        placeholder="Nhập User ID để tra cứu..."
                        value={trustedTargetId}
                        onChange={setTrustedTargetId}
                        onVerified={setVerifiedTrustedUser}
                        hint="Tài khoản sẽ được xác thực trực tiếp qua Discord Gateway."
                      />
                    ) : (
                      <RoleSelect
                        label="Vai Trò Được Cấp Quyền (Role)"
                        placeholder="Chọn vai trò trong server..."
                        value={trustedTargetId || null}
                        onChange={(val) => setTrustedTargetId(val || '')}
                        guildId={guildId}
                        hint="Tất cả thành viên nắm giữ vai trò này sẽ có quyền Trusted Admin."
                      />
                    )}
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    disabled={
                      !trustedTargetId ||
                      (trustedTargetType === 'USER' && !verifiedTrustedUser) ||
                      assignMutation.isPending
                    }
                    isLoading={assignMutation.isPending}
                    onClick={() =>
                      assignMutation.mutate({
                        targetType: trustedTargetType,
                        targetId: trustedTargetId,
                        tier: 'TRUSTED_ADMIN',
                      })
                    }
                    className="w-full sm:w-auto text-xs font-bold bg-purple-600 hover:bg-purple-700 border-0 h-[42px]"
                  >
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    Thêm Trusted Admin
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trusted Admins List */}
          <Card hover>
            <CardHeader>
              <CardTitle>Danh Sách Trusted Admins Hiện Tại</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : !data?.trustedAdmins || data.trustedAdmins.length === 0 ? (
                <div className="py-8 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
                  Chưa có Trusted Admin nào được bổ nhiệm.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.trustedAdmins.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between text-xs hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/30">
                          {p.targetType === 'USER' ? (
                            <User className="w-5 h-5" />
                          ) : (
                            <Users className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {p.targetType === 'USER' ? (
                              <UserDisplay userId={p.targetId} className="text-sm font-bold" />
                            ) : (
                              <span className="font-mono font-bold text-white text-sm">
                                Role ID: {p.targetId}
                              </span>
                            )}
                            <Badge variant={p.targetType === 'USER' ? 'blurple' : 'yellow'} size="sm">
                              {p.targetType}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-discord-muted block mt-0.5">
                            Được cấp bởi: <UserDisplay userId={p.createdBy} showAvatar={false} /> • {formatDateTime(p.createdAt)}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          setRevokeTarget({
                            targetType: p.targetType,
                            targetId: p.targetId,
                            tierName: 'Trusted Admin',
                          })
                        }
                        className="text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Gỡ bỏ
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CUSTOM GRANTS (TIER 4) */}
      {/* ========================================================================= */}
      {activeTab === 'custom' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card hover>
            <CardHeader>
              <CardTitle className="text-cyan-300">Cấp Quyền Tùy Chỉnh (Bitfield Grants)</CardTitle>
              <CardDescription>
                Bật/tắt các cờ quyền cụ thể cho một User hoặc Role độc lập.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCustomTargetType('USER')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-bold border transition',
                    customTargetType === 'USER'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-black/30 text-discord-muted border-white/10',
                  )}
                >
                  Gán cho User
                </button>
                <button
                  type="button"
                  onClick={() => setCustomTargetType('ROLE')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-bold border transition',
                    customTargetType === 'ROLE'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-black/30 text-discord-muted border-white/10',
                  )}
                >
                  Gán cho Role
                </button>
              </div>

              {customTargetType === 'USER' ? (
                <UserInput
                  label="Discord User ID Thành Viên"
                  placeholder="Nhập User ID để tra cứu..."
                  value={customTargetId}
                  onChange={setCustomTargetId}
                  onVerified={setVerifiedCustomUser}
                  hint="Tài khoản sẽ được xác thực trực tiếp qua Discord Gateway."
                />
              ) : (
                <RoleSelect
                  label="Vai Trò Được Cấp Quyền (Role)"
                  placeholder="Chọn vai trò trong server..."
                  value={customTargetId || null}
                  onChange={(val) => setCustomTargetId(val || '')}
                  guildId={guildId}
                  hint="Tất cả thành viên nắm giữ vai trò này sẽ nhận các cờ quyền đã chọn."
                />
              )}

              {/* Bitfield Checkbox Chips Grid */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-discord-muted uppercase tracking-wider block">
                  Chọn Các Cờ Quyền (Bitfield: {selectedFlags} - 0x{selectedFlags.toString(16)})
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PERMIT_FLAGS.map((f) => {
                    const isChecked = (selectedFlags & f.flag) === f.flag;
                    return (
                      <div
                        key={f.key}
                        onClick={() => toggleFlag(f.flag)}
                        className={cn(
                          'p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none',
                          isChecked
                            ? 'bg-purple-500/20 border-purple-500 shadow-md shadow-purple-500/20'
                            : 'bg-black/30 border-white/10 hover:border-white/20',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-purple-600 focus:ring-0 cursor-pointer pointer-events-none"
                        />
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{f.label}</span>
                            <span className="text-[10px] text-purple-300 font-mono font-normal">
                              ({f.hex})
                            </span>
                          </div>
                          <p className="text-[11px] text-discord-muted leading-tight">
                            {f.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  disabled={
                    !customTargetId ||
                    (customTargetType === 'USER' && !verifiedCustomUser) ||
                    assignMutation.isPending
                  }
                  isLoading={assignMutation.isPending}
                  onClick={() =>
                    assignMutation.mutate({
                      targetType: customTargetType,
                      targetId: customTargetId,
                      tier: 'CUSTOM',
                      permissions: selectedFlags,
                    })
                  }
                  className="text-xs font-bold bg-purple-600 hover:bg-purple-700 border-0"
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  Lưu Quyền Custom
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Custom Grants List */}
          <Card hover>
            <CardHeader>
              <CardTitle>Danh Sách Custom Grants Hiện Tại</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : !data?.customPermits || data.customPermits.length === 0 ? (
                <div className="py-8 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
                  Chưa có quyền Custom nào được thiết lập.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.customPermits.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {p.targetType === 'USER' ? (
                            <UserDisplay userId={p.targetId} className="text-sm font-bold" />
                          ) : (
                            <span className="font-mono font-bold text-white text-sm">
                              Role ID: {p.targetId}
                            </span>
                          )}
                          <Badge variant={p.targetType === 'USER' ? 'blurple' : 'yellow'} size="sm">
                            {p.targetType}
                          </Badge>
                        </div>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setRevokeTarget({
                              targetType: p.targetType,
                              targetId: p.targetId,
                              tierName: 'Custom Grant',
                            })
                          }
                          className="text-xs h-7"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Thu hồi
                        </Button>
                      </div>

                      {/* Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.06]">
                        <span className="text-discord-muted text-[11px] mr-1">Các quyền được cấp:</span>
                        {renderFlagChips(p.permissions)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        title="Xác nhận thu hồi quyền"
        description={`Bạn có chắc chắn muốn thu hồi quyền ${revokeTarget?.tierName} của đối tượng này?`}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRevokeTarget(null)}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={revokeMutation.isPending}
              onClick={() => {
                if (revokeTarget) {
                  revokeMutation.mutate({
                    targetType: revokeTarget.targetType,
                    targetId: revokeTarget.targetId,
                  });
                }
              }}
            >
              Đồng ý Thu hồi
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs text-discord-muted">
          <p>
            Đối tượng: <strong className="text-white font-mono">{revokeTarget?.targetId}</strong> ({revokeTarget?.targetType})
          </p>
          <p>
            Sau khi thu hồi, đối tượng này sẽ không còn quyền hạn tương ứng trên Dashboard và Bot của server này.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default PermitPage;
