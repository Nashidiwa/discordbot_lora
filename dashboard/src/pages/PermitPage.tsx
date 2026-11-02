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
import { useI18n } from '../i18n';
import { cn, formatDateTime } from '../lib/utils';
import type { DiscordUserInfo, PermitOverview } from '../types';

const PERMIT_FLAGS = [
  {
    key: 'VIEW_DASHBOARD',
    flag: 1 << 0,
    label: 'View Dashboard',
    hex: '0x01',
  },
  {
    key: 'MANAGE_PERMITS',
    flag: 1 << 1,
    label: 'Permit Management',
    hex: '0x02',
  },
  {
    key: 'MANAGE_SETTINGS',
    flag: 1 << 2,
    label: 'Server Settings',
    hex: '0x04',
  },
  {
    key: 'MANAGE_PERKS',
    flag: 1 << 3,
    label: 'Perks Management',
    hex: '0x08',
  },
  {
    key: 'MANAGE_VOICE_KEEPER',
    flag: 1 << 4,
    label: 'Voice Keeper Management',
    hex: '0x10',
  },
  {
    key: 'MANAGE_WORDCHAIN',
    flag: 1 << 5,
    label: 'Word Chain Management',
    hex: '0x20',
  },
  {
    key: 'MANAGE_SWARM',
    flag: 1 << 6,
    label: 'View Linked Role The Swarm',
    hex: '0x40',
  },
];

const getFlagDesc = (key: string, t: ReturnType<typeof useI18n>['t']) => {
  switch (key) {
    case 'VIEW_DASHBOARD':
      return t('permits.flagDescViewDashboard');
    case 'MANAGE_PERMITS':
      return t('permits.flagDescManagePermits');
    case 'MANAGE_SETTINGS':
      return t('permits.flagDescManageSettings');
    case 'MANAGE_PERKS':
      return t('permits.flagDescManagePerks');
    case 'MANAGE_VOICE_KEEPER':
      return t('permits.flagDescManageVoiceKeeper');
    case 'MANAGE_WORDCHAIN':
      return t('permits.flagDescManageWordchain');
    case 'MANAGE_SWARM':
      return t('permits.flagDescManageSwarm');
    default:
      return '';
  }
};

export const PermitPage: React.FC = () => {
  const { guildId: paramGuildId } = useParams<{ guildId: string }>();
  const { selectedGuild, guilds } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useI18n();

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
      toast.success(t('permits.grantSuccess'), t('permits.grantSuccessDesc'));
      setNewCoOwnerUserId('');
      setTrustedTargetId('');
      setCustomTargetId('');
      void queryClient.invalidateQueries({ queryKey: ['guild-permits', guildId] });
    },
    onError: (err: Error) => toast.error(t('permits.grantError'), err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (payload: { targetType: 'USER' | 'ROLE'; targetId: string }) =>
      apiFetch(`/api/guilds/${guildId}/permits/revoke`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.warning(t('permits.revokeSuccess'), t('permits.revokeSuccessDesc'));
      setRevokeTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['guild-permits', guildId] });
    },
    onError: (err: Error) => toast.error(t('permits.revokeError'), err.message),
  });

  if (!guildId) {
    return (
      <div className="p-8 text-center text-discord-muted glass-panel rounded-3xl border border-white/10">
        {t('common.pleaseSelectServerDesc')}
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
    <div className="space-y-8 w-full select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-black shadow-lg shadow-purple-500/25">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                {t('permits.title')}
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  {t('permits.badge')}
                </span>
              </h1>
              <p className="text-xs text-discord-muted mt-0.5">
                {t('permits.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Server Owner Identity */}
        {data?.ownerId && (
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#14161f] border border-white/10 text-xs">
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-discord-muted">{t('permits.serverOwner')}</span>
            <code className="text-white font-mono font-bold">{data.ownerId}</code>
          </div>
        )}
      </div>

      {/* Authority Tiers Diagram Card */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-3xl glass-panel text-xs">
        <div className="p-3.5 rounded-2xl bg-black/20 border border-amber-500/30 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-300 font-extrabold">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>{t('permits.tier1Title')}</span>
          </div>
          <p className="text-[11px] text-discord-muted">{t('permits.tier1Desc')}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/20 border border-purple-500/30 space-y-1">
          <div className="flex items-center gap-1.5 text-purple-300 font-extrabold">
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            <span>{t('permits.tier2Title')}</span>
          </div>
          <p className="text-[11px] text-discord-muted">{t('permits.tier2Desc')}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/20 border border-emerald-500/30 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-300 font-extrabold">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>{t('permits.tier3Title')}</span>
          </div>
          <p className="text-[11px] text-discord-muted">{t('permits.tier3Desc')}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/20 border border-cyan-500/30 space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-300 font-extrabold">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>{t('permits.tier4Title')}</span>
          </div>
          <p className="text-[11px] text-discord-muted">{t('permits.tier4Desc')}</p>
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
          <span>{t('permits.coOwnersTab')} ({data?.coOwners?.length ?? 0})</span>
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
          <span>{t('permits.trustedTab')} ({data?.trustedAdmins?.length ?? 0})</span>
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
          <span>{t('permits.customTab')} ({data?.customPermits?.length ?? 0})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CO-OWNERS (TIER 2) */}
      {/* ========================================================================= */}
      {activeTab === 'co_owner' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card hover>
            <CardHeader>
              <CardTitle className="text-purple-300">{t('permits.assignCoOwnerTitle')}</CardTitle>
              <CardDescription>
                {t('permits.assignCoOwnerDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 w-full">
                  <UserInput
                    label={t('permits.targetUserInputLabel')}
                    placeholder={t('permits.targetUserInputPlaceholder')}
                    value={newCoOwnerUserId}
                    onChange={setNewCoOwnerUserId}
                    onVerified={setVerifiedCoOwnerUser}
                    hint=""
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
                  {t('permits.assignCoOwnerTitle')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Co-Owners List */}
          <Card hover>
            <CardHeader>
              <CardTitle>{t('permits.currentCoOwners')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : !data?.coOwners || data.coOwners.length === 0 ? (
                <div className="py-8 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
                  {t('permits.noCoOwners')}
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
                            {t('permits.grantedBy')} <UserDisplay userId={p.createdBy} showAvatar={false} /> • {formatDateTime(p.createdAt)}
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
                        {t('permits.revokeBtn')}
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
              <CardTitle className="text-emerald-300">{t('permits.assignTrustedTitle')}</CardTitle>
              <CardDescription>
                {t('permits.assignTrustedDesc')}
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
                    {t('permits.assignToUser')}
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
                    {t('permits.assignToRole')}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="flex-1 w-full">
                    {trustedTargetType === 'USER' ? (
                      <UserInput
                        label={t('permits.targetUserInputLabel')}
                        placeholder={t('permits.targetUserInputPlaceholder')}
                        value={trustedTargetId}
                        onChange={setTrustedTargetId}
                        onVerified={setVerifiedTrustedUser}
                        hint=""
                      />
                    ) : (
                      <RoleSelect
                        label={t('permits.targetRoleSelectLabel')}
                        placeholder={t('permits.targetRoleSelectPlaceholder')}
                        value={trustedTargetId || null}
                        onChange={(val) => setTrustedTargetId(val || '')}
                        guildId={guildId}
                        hint=""
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
                    {t('permits.addTrustedBtn')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trusted Admins List */}
          <Card hover>
            <CardHeader>
              <CardTitle>{t('permits.currentTrusted')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : !data?.trustedAdmins || data.trustedAdmins.length === 0 ? (
                <div className="py-8 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
                  {t('permits.noTrusted')}
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
                            {t('permits.grantedBy')} <UserDisplay userId={p.createdBy} showAvatar={false} /> • {formatDateTime(p.createdAt)}
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
                        {t('permits.revokeBtn')}
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
              <CardTitle className="text-cyan-300">{t('permits.assignCustomTitle')}</CardTitle>
              <CardDescription>
                {t('permits.assignCustomDesc')}
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
                  {t('permits.assignToUser')}
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
                  {t('permits.assignToRole')}
                </button>
              </div>

              {customTargetType === 'USER' ? (
                <UserInput
                  label={t('permits.targetUserInputLabel')}
                  placeholder={t('permits.targetUserInputPlaceholder')}
                  value={customTargetId}
                  onChange={setCustomTargetId}
                  onVerified={setVerifiedCustomUser}
                  hint=""
                />
              ) : (
                <RoleSelect
                  label={t('permits.targetRoleSelectLabel')}
                  placeholder={t('permits.targetRoleSelectPlaceholder')}
                  value={customTargetId || null}
                  onChange={(val) => setCustomTargetId(val || '')}
                  guildId={guildId}
                  hint=""
                />
              )}

              {/* Bitfield Checkbox Chips Grid */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-discord-muted uppercase tracking-wider block">
                  {t('permits.flagsTitle')} (Bitfield: {selectedFlags} - 0x{selectedFlags.toString(16)})
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
                            {getFlagDesc(f.key, t)}
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
                  {t('permits.saveCustomBtn')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Custom Grants List */}
          <Card hover>
            <CardHeader>
              <CardTitle>{t('permits.currentCustom')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : !data?.customPermits || data.customPermits.length === 0 ? (
                <div className="py-8 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
                  {t('permits.noCustom')}
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
                          {t('permits.revokeBtn')}
                        </Button>
                      </div>

                      {/* Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.06]">
                        <span className="text-discord-muted text-[11px] mr-1">{t('permits.grantedPermissionsLabel')}</span>
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
        title={t('permits.revokeConfirmTitle')}
        description={t('permits.revokeConfirmDesc')}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRevokeTarget(null)}
            >
              {t('common.cancel')}
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
              {t('permits.confirmRevokeBtn')}
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs text-discord-muted">
          <p>
            {t('permits.targetLabel')}: <strong className="text-white font-mono">{revokeTarget?.targetId}</strong> ({revokeTarget?.targetType})
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default PermitPage;
