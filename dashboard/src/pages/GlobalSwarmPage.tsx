import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Copy,
  Globe,
  Key,
  Layers,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
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
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { UserDisplay } from '../components/ui/UserDisplay';
import { UserInput } from '../components/ui/UserInput';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { cn, formatDateTime } from '../lib/utils';
import type {
  DiscordUserInfo,
  SwarmGlobalOverviewData,
  SwarmMemberMetadata,
} from '../types';

export const GlobalSwarmPage: React.FC = () => {
  const { t } = useI18n();
  const { canAccessGlobal } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [memberSearch, setMemberSearch] = useState<string>('');

  // Modal gán/thu hồi cấp độ (Global Scope)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [verifiedTargetUser, setVerifiedTargetUser] =
    useState<DiscordUserInfo | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);

  // Form Thêm Operator mới (Owner Scope)
  const [newOperatorId, setNewOperatorId] = useState<string>('');
  const [verifiedNewOperator, setVerifiedNewOperator] =
    useState<DiscordUserInfo | null>(null);

  // Fetch dữ liệu Swarm Toàn Cầu
  const { data, isLoading } = useQuery<SwarmGlobalOverviewData>({
    queryKey: ['swarm-global-overview'],
    queryFn: () => apiFetch<SwarmGlobalOverviewData>('/api/swarm/global'),
    enabled: canAccessGlobal,
  });

  const isBotOwner = data?.isBotOwner ?? false;

  // Mutation gán/thu hồi level thành viên cấp Global
  const updateMemberMutation = useMutation<{ level: number; synced: boolean }>({
    mutationFn: () =>
      apiFetch<{ level: number; synced: boolean }>(
        `/api/swarm/global/members/${targetUserId.trim()}`,
        {
          method: 'POST',
          body: JSON.stringify({ level: selectedLevel }),
        },
      ),
    onSuccess: (res) => {
      if (res.level === 0) {
        toast.success(
          'Hoàn tất thu hồi đặc quyền (Global)',
          `Đã xóa đặc quyền Linked Role The Swarm của user ${targetUserId}. ${res.synced ? '(Đã gửi cập nhật metadata)' : '(User chưa ủy quyền OAuth2, bỏ qua cập nhật metadata)'}`,
        );
      } else {
        toast.success(
          'Hoàn tất cập nhật đặc quyền (Global)',
          `Đã ghi lại Level ${res.level} cho user ${targetUserId}. ${res.synced ? '(Đã gửi cập nhật metadata)' : '(User chưa ủy quyền OAuth2, bỏ qua cập nhật metadata)'}`,
        );
      }
      setIsUpdateModalOpen(false);
      setTargetUserId('');
      void queryClient.invalidateQueries({
        queryKey: ['swarm-global-overview'],
      });
    },
    onError: (err: Error) => toast.error('Cập nhật bản ghi đặc quyền thất bại', err.message),
  });

  // Mutation thêm Operator mới (Bot Owner Only)
  const addOperatorMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/swarm/global/operators', {
        method: 'POST',
        body: JSON.stringify({ userId: newOperatorId.trim() }),
      }),
    onSuccess: () => {
      toast.success(
        'Hoàn tất ủy quyền',
        `Đã cấp quyền hạn Delegated Operator cho user ${newOperatorId}.`,
      );
      setNewOperatorId('');
      void queryClient.invalidateQueries({
        queryKey: ['swarm-global-overview'],
      });
    },
    onError: (err: Error) => toast.error('Cập nhật Delegated Operator thất bại', err.message),
  });

  // Mutation xóa Operator (Bot Owner Only)
  const removeOperatorMutation = useMutation({
    mutationFn: (operatorUserId: string) =>
      apiFetch(`/api/swarm/global/operators/${operatorUserId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success(
        'Thu hồi ủy quyền',
        'Đã gỡ bỏ quyền hạn Delegated Operator thành công.',
      );
      void queryClient.invalidateQueries({
        queryKey: ['swarm-global-overview'],
      });
    },
    onError: (err: Error) =>
      toast.error('Thu hồi Delegated Operator thất bại', err.message),
  });

  const handleCopyVerificationUrl = () => {
    const origin = window.location.origin;
    const url = `${origin}/auth/discord/login`;
    void navigator.clipboard.writeText(url);
    toast.success(
      'Đã sao chép URL ủy quyền OAuth2',
      'Truy cập để ủy quyền OAuth2 cho phép bot cập nhật Application metadata.',
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

  if (!canAccessGlobal) {
    return (
      <div className="p-8 text-center text-discord-muted glass-panel rounded-3xl border border-white/10 space-y-3">
        <Shield className="w-10 h-10 text-discord-red mx-auto" />
        <h3 className="text-base font-bold text-white">{t('globalOverview.accessDeniedTitle')}</h3>
        <p className="text-xs text-discord-muted max-w-md mx-auto">
          {t('globalOverview.accessDeniedDesc')}
        </p>
      </div>
    );
  }

  const allMembers: SwarmMemberMetadata[] = data?.allMembers || [];
  const filteredMembers = allMembers.filter(
    (m) =>
      m.userId.includes(memberSearch) ||
      m.updatedBy.includes(memberSearch) ||
      `Level ${m.swarmLevel}`.toLowerCase().includes(memberSearch.toLowerCase()),
  );

  return (
    <div className="space-y-8 w-full select-none">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-500/25 shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {t('globalSwarm.title')}
                </h1>

                <Badge variant="purple" size="sm">
                  {t('globalSwarm.badge')}
                </Badge>

                {isBotOwner ? (
                  <Badge variant="yellow" size="sm">
                    {t('globalOverview.botOwner')}
                  </Badge>
                ) : (
                  <Badge variant="blurple" size="sm">
                    {t('globalOverview.operator')}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-discord-muted mt-0.5 max-w-2xl">
                {t('globalSwarm.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyVerificationUrl}
            className="gap-2 text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
          >
            <Copy className="w-3.5 h-3.5" />
            {t('globalSwarm.copyOAuthBtn')}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setTargetUserId('');
              setSelectedLevel(1);
              setIsUpdateModalOpen(true);
            }}
            className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
          >
            <UserCheck className="w-3.5 h-3.5" />
            {t('globalSwarm.newRecordBtn')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hover>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-discord-muted uppercase tracking-wider">
                {t('globalSwarm.kpiLinkedUsers')}
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
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-discord-muted uppercase tracking-wider">
                {t('globalSwarm.kpiOperators')}
              </p>
              <h3 className="text-xl font-black text-white mt-0.5">
                {isLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  data?.stats.totalOperators ?? 0
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
                {t('globalSwarm.kpiTiersAvailable')}
              </p>
              <h3 className="text-xl font-black text-white mt-0.5">
                {t('globalSwarm.kpiTiersCount')}
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
                {t('globalSwarm.kpiConfiguredGuilds')}
              </p>
              <h3 className="text-xl font-black text-white mt-0.5">
                {isLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  data?.stats.configuredGuildsCount ?? 0
                )}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: 8 Bậc Role & Cấu Hình Máy Chủ Mạng Lưới */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột 1: 8 Bậc Danh Hiệu Toàn Cầu */}
        <div className="lg:col-span-7 space-y-4">
          <Card hover>
            <CardHeader>
              <CardTitle>
                <Shield className="w-5 h-5 text-indigo-400 inline-block mr-2" />
                {t('globalSwarm.globalTiersTitle')}
              </CardTitle>
              <CardDescription>
                {t('globalSwarm.globalTiersDesc')}
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
                          {count} {t('swarm.memberCount')}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cột 2: Danh Sách Máy Chủ Đã Bật Kênh Thông Báo */}
        <div className="lg:col-span-5 space-y-4">
          <Card hover>
            <CardHeader>
              <CardTitle>
                <Server className="w-5 h-5 text-indigo-400 inline-block mr-2" />
                {t('globalSwarm.configuredServersTitle')}
              </CardTitle>
              <CardDescription>
                {t('globalSwarm.configuredServersDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-36 w-full" />
              ) : !data?.guildConfigs || data.guildConfigs.length === 0 ? (
                <div className="py-6 text-center text-xs text-discord-muted bg-black/20 rounded-2xl border border-white/5">
                  {t('globalSwarm.noConfiguredServers')}
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {data.guildConfigs.map((g) => (
                    <div
                      key={g.guildId}
                      className="p-3 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between"
                    >
                      <div className="overflow-hidden">
                        <span className="font-bold text-white text-xs block truncate">
                          {g.guildName}
                        </span>
                        <span className="text-[10px] text-discord-muted font-mono">
                          ID: {g.guildId}
                        </span>
                      </div>

                      {g.notificationChannelId ? (
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          #{g.notificationChannelId}
                        </span>
                      ) : (
                        <span className="text-xs text-discord-muted italic">
                          {t('globalSwarm.disabled')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* KHU VỰC DÀNH CHO BOT OWNER: QUẢN LÝ DELEGATED OPERATORS */}
      <Card hover className="border-purple-500/30">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-purple-400">
                <Key className="w-5 h-5 inline-block mr-2 text-purple-400" />
                {t('globalSwarm.operatorManagementTitle')}
              </CardTitle>
              {isBotOwner ? (
                <Badge variant="yellow" size="sm">
                  {t('globalOverview.botOwner')}
                </Badge>
              ) : (
                <Badge variant="purple" size="sm">
                  {t('globalOverview.operator')}
                </Badge>
              )}
            </div>
            <CardDescription>
              {t('globalSwarm.operatorManagementDesc')}
            </CardDescription>
          </div>

          {/* Ô Thêm Operator chỉ hiển thị nếu là Bot Owner */}
          {isBotOwner && (
            <div className="flex items-center gap-2 max-w-sm w-full">
              <div className="flex-1">
                <UserInput
                  placeholder={t('globalSwarm.operatorUserIdPlaceholder')}
                  value={newOperatorId}
                  onChange={setNewOperatorId}
                  onVerified={setVerifiedNewOperator}
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => addOperatorMutation.mutate()}
                isLoading={addOperatorMutation.isPending}
                disabled={
                  !newOperatorId.trim() ||
                  !verifiedNewOperator ||
                  addOperatorMutation.isPending
                }
                className="gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold whitespace-nowrap h-[42px] mt-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {t('globalSwarm.confirmAddOperatorBtn')}
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {!data?.operators || data.operators.length === 0 ? (
            <div className="py-6 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
              {t('globalSwarm.noOperators')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {data.operators.map((op) => (
                <div
                  key={op.userId}
                  className="p-3 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between"
                >
                  <div className="space-y-1 overflow-hidden">
                    <UserDisplay userId={op.userId} />
                    <div className="text-[10px] text-discord-muted">
                      {t('globalSwarm.authorizedBy')}{' '}
                      <UserDisplay userId={op.addedBy} showAvatar={false} /> •{' '}
                      {formatDateTime(op.createdAt)}
                    </div>
                  </div>

                  {isBotOwner && (
                    <button
                      type="button"
                      title={t('globalSwarm.revokeOperatorBtn')}
                      onClick={() => removeOperatorMutation.mutate(op.userId)}
                      className="p-2 text-discord-muted hover:text-red-400 hover:bg-red-500/10 rounded-xl transition shrink-0 ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quản Lý Toàn Bộ Thành Viên Trong Mạng Lưới (Global Scope) */}
      <Card hover>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>
                <Layers className="w-5 h-5 text-indigo-400 inline-block mr-2" />
                {t('globalSwarm.allMembersTitle')} ({allMembers.length})
              </CardTitle>
              <Badge variant="purple" size="sm">
                {t('swarm.sortBadge')}
              </Badge>
            </div>
            <CardDescription>
              {t('globalSwarm.allMembersDesc')}
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-discord-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={t('swarm.searchMemberPlaceholder')}
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
              {t('globalSwarm.noMembersMatched')}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-discord-text">
                <thead className="bg-[#11131a] text-discord-muted uppercase text-[10px] font-extrabold tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4">{t('swarm.userCol')}</th>
                    <th className="py-3.5 px-4">{t('swarm.levelCol')}</th>
                    <th className="py-3.5 px-4">{t('swarm.updatedByCol')}</th>
                    <th className="py-3.5 px-4">{t('swarm.updatedAtCol')}</th>
                    <th className="py-3.5 px-4 text-right">{t('common.actions')}</th>
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
                            : t('swarm.revoked')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-discord-muted">
                        <UserDisplay userId={m.updatedBy} showAvatar={false} />
                      </td>
                      <td className="py-3.5 px-4 text-discord-muted">
                        {formatDateTime(m.updatedAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
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
                          {t('swarm.editLevelBtn')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Gán / Điều Chỉnh Level Cấp Toàn Cầu */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title={t('globalSwarm.modalRecordTitle')}
        description={t('globalSwarm.modalRecordDesc')}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsUpdateModalOpen(false)}
            >
              {t('common.cancel')}
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
              {t('globalSwarm.confirmSaveRecordBtn')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <UserInput
            label={t('globalSwarm.targetUser')}
            placeholder={t('swarm.targetUserPlaceholder')}
            value={targetUserId}
            onChange={setTargetUserId}
            onVerified={setVerifiedTargetUser}
            hint={t('swarm.fetchUserGatewayHint')}
          />

          <div className="space-y-2">
            <label className="block text-xs font-bold text-discord-text uppercase tracking-wider">
              {t('globalSwarm.selectTier')}
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
                <span className="text-[10px] font-normal">({t('swarm.revoked')})</span>
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
    </div>
  );
};

export default GlobalSwarmPage;
