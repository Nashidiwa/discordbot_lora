import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bomb,
  Clock,
  Edit3,
  Flame,
  Hash,
  Layers,
  Lock,
  Plus,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  Timer,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { apiFetch, landmineApi } from '../api/client';
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
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { RoleSelect } from '../components/ui/RoleSelect';
import { Switch } from '../components/ui/Switch';
import { useToast } from '../components/ui/Toast';
import { UserDisplay } from '../components/ui/UserDisplay';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { cn, formatDurationSeconds } from '../lib/utils';
import type {
  GuildChannelItem,
  GuildRoleItem,
  LandmineModule,
  LandmineScopeType,
  LandmineSortType,
} from '../types';

function decomposeSeconds(seconds: number): {
  value: number;
  unit: 's' | 'm' | 'h' | 'd';
} {
  if (seconds >= 86400 && seconds % 86400 === 0) {
    return { value: seconds / 86400, unit: 'd' };
  }
  if (seconds >= 3600 && seconds % 3600 === 0) {
    return { value: seconds / 3600, unit: 'h' };
  }
  if (seconds >= 60 && seconds % 60 === 0) {
    return { value: seconds / 60, unit: 'm' };
  }
  return { value: seconds, unit: 's' };
}

function toTotalSeconds(val: number, unit: 's' | 'm' | 'h' | 'd'): number {
  switch (unit) {
    case 'd':
      return val * 86400;
    case 'h':
      return val * 3600;
    case 'm':
      return val * 60;
    case 's':
    default:
      return val;
  }
}

export const LandminePage: React.FC = () => {
  const { guildId: paramGuildId } = useParams<{ guildId: string }>();
  const { selectedGuild, guilds } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useI18n();

  const currentGuild =
    (paramGuildId ? guilds.find((g) => g.id === paramGuildId) : null) ||
    selectedGuild;
  const guildId = currentGuild?.id || paramGuildId || '';

  // Tab State
  const [activeTab, setActiveTab] = useState<'modules' | 'leaderboard'>('modules');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<LandmineModule | null>(null);
  const [deleteTargetKey, setDeleteTargetKey] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetKey, setResetTargetKey] = useState<string>('all');

  // Form States - Create
  const [createRate, setCreateRate] = useState<number>(1.0);
  const [createDurationVal, setCreateDurationVal] = useState<number>(60);
  const [createDurationUnit, setCreateDurationUnit] = useState<'s' | 'm' | 'h' | 'd'>('s');
  const [createNote, setCreateNote] = useState<string>('');

  // Form States - Edit
  const [editRate, setEditRate] = useState<number>(1.0);
  const [editDurationVal, setEditDurationVal] = useState<number>(60);
  const [editDurationUnit, setEditDurationUnit] = useState<'s' | 'm' | 'h' | 'd'>('s');
  const [editNote, setEditNote] = useState<string>('');
  const [editChannelScope, setEditChannelScope] = useState<LandmineScopeType>('ALL');
  const [editChannelIds, setEditChannelIds] = useState<string[]>([]);
  const [editRoleScope, setEditRoleScope] = useState<LandmineScopeType>('ALL');
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [editIncludeLeaderboard, setEditIncludeLeaderboard] = useState<boolean>(true);
  const [editAutoDelete, setEditAutoDelete] = useState<boolean>(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string>('');
  const [editFailedMsg, setEditFailedMsg] = useState<string>('');

  // Leaderboard Filter States
  const [lbModule, setLbModule] = useState<string>('server');
  const [lbSort, setLbSort] = useState<LandmineSortType>('count');

  // Fetch Landmine Config & Modules
  const { data: configData } = useQuery({
    queryKey: ['landmine-config', guildId],
    queryFn: () => landmineApi.getConfig(guildId),
    enabled: Boolean(guildId),
  });

  // Fetch Guild Channels & Roles for names/chips
  const { data: channelsData } = useQuery({
    queryKey: ['guild-channels', guildId],
    queryFn: () => apiFetch<{ channels: GuildChannelItem[] }>(`/api/guilds/${guildId}/channels`),
    enabled: Boolean(guildId),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['guild-roles', guildId],
    queryFn: () => apiFetch<{ roles: GuildRoleItem[] }>(`/api/guilds/${guildId}/roles`),
    enabled: Boolean(guildId),
  });

  // Fetch Leaderboard Data
  const { data: lbData, isLoading: isLoadingLb } = useQuery({
    queryKey: ['landmine-leaderboard', guildId, lbModule, lbSort],
    queryFn: () => landmineApi.getLeaderboard(guildId, { module: lbModule, sort: lbSort, limit: 50 }),
    enabled: Boolean(guildId),
  });

  const channelMap = useMemo(() => {
    const map = new Map<string, string>();
    channelsData?.channels?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [channelsData]);

  const roleMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>();
    rolesData?.roles?.forEach((r) => map.set(r.id, { name: r.name, color: r.color }));
    return map;
  }, [rolesData]);

  // Mutations
  const updateConfigMutation = useMutation({
    mutationFn: (forcedLocale: 'auto' | 'vi' | 'en') =>
      landmineApi.updateConfig(guildId, forcedLocale),
    onSuccess: () => {
      toast.success(t('landmine.savedConfigSuccess'), t('landmine.savedConfigSuccess'));
      void queryClient.invalidateQueries({ queryKey: ['landmine-config', guildId] });
    },
    onError: (err: Error) => toast.error(t('common.error'), err.message),
  });

  const toggleModuleMutation = useMutation({
    mutationFn: ({ moduleKey, isEnabled }: { moduleKey: string; isEnabled: boolean }) =>
      landmineApi.toggleModule(guildId, moduleKey, isEnabled),
    onSuccess: (res) => {
      toast.success(t('landmine.toggleModuleSuccess'), `${res.moduleName}: ${res.isEnabled ? t('landmine.activeBadge') : t('landmine.disabledBadge')}`);
      void queryClient.invalidateQueries({ queryKey: ['landmine-config', guildId] });
    },
    onError: (err: Error) => toast.error(t('common.error'), err.message),
  });

  const createModuleMutation = useMutation({
    mutationFn: (payload: { ratePercent: number; durationSeconds: number; note?: string }) =>
      landmineApi.createModule(guildId, payload),
    onSuccess: (res) => {
      toast.success(t('landmine.createModuleSuccess'), `Module ${res.moduleKey}`);
      setIsCreateModalOpen(false);
      setCreateRate(1.0);
      setCreateDurationVal(60);
      setCreateDurationUnit('s');
      setCreateNote('');
      void queryClient.invalidateQueries({ queryKey: ['landmine-config', guildId] });
    },
    onError: (err: Error) => toast.error(t('common.error'), err.message),
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ moduleKey, payload }: { moduleKey: string; payload: Parameters<typeof landmineApi.updateModule>[2] }) =>
      landmineApi.updateModule(guildId, moduleKey, payload),
    onSuccess: (res) => {
      toast.success(t('landmine.savedModuleSuccess'), `Module ${res.moduleKey}`);
      setEditingModule(null);
      void queryClient.invalidateQueries({ queryKey: ['landmine-config', guildId] });
    },
    onError: (err: Error) => toast.error(t('common.error'), err.message),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (moduleKey: string) => landmineApi.deleteModule(guildId, moduleKey),
    onSuccess: (res) => {
      toast.success(t('landmine.deleteModuleSuccess'), `Module ${res.moduleName}`);
      setDeleteTargetKey(null);
      void queryClient.invalidateQueries({ queryKey: ['landmine-config', guildId] });
    },
    onError: (err: Error) => toast.error(t('common.error'), err.message),
  });

  const resetStatsMutation = useMutation({
    mutationFn: (moduleKey: string) => landmineApi.resetStats(guildId, moduleKey),
    onSuccess: (res) => {
      toast.success(t('landmine.resetSuccess'), `Target: ${res.target}`);
      setIsResetModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['landmine-leaderboard', guildId] });
    },
    onError: (err: Error) => toast.error(t('common.error'), err.message),
  });

  // Open Edit Modal Helper
  const handleOpenEdit = (mod: LandmineModule) => {
    setEditingModule(mod);
    setEditRate(mod.ratePercent);
    const decomposed = decomposeSeconds(mod.punishmentDurationSeconds);
    setEditDurationVal(decomposed.value);
    setEditDurationUnit(decomposed.unit);
    setEditNote(mod.note || '');
    setEditChannelScope(mod.channelScopeType);
    setEditChannelIds([...mod.channelIds]);
    setEditRoleScope(mod.roleScopeType);
    setEditRoleIds([...mod.roleIds]);
    setEditIncludeLeaderboard(mod.includeInServerLeaderboard);
    setEditAutoDelete(mod.autoDeleteNotification);
    setEditSuccessMsg(mod.successMessage || '');
    setEditFailedMsg(mod.failedMessage || '');
  };

  const handleSaveEdit = () => {
    if (!editingModule) return;
    const isCustom = !editingModule.isDefault;
    updateModuleMutation.mutate({
      moduleKey: editingModule.moduleKey,
      payload: {
        ...(isCustom && {
          ratePercent: editRate,
          durationSeconds: toTotalSeconds(editDurationVal, editDurationUnit),
        }),
        note: editNote.trim() || null,
        channelScopeType: editChannelScope,
        channelIds: editChannelIds,
        roleScopeType: editRoleScope,
        roleIds: editRoleIds,
        includeInServerLeaderboard: editIncludeLeaderboard,
        autoDeleteNotification: editAutoDelete,
        successMessage: editSuccessMsg.trim() || null,
        failedMessage: editFailedMsg.trim() || null,
      },
    });
  };

  if (!guildId) {
    return (
      <div className="p-8 text-center text-discord-muted glass-panel rounded-3xl border border-white/10">
        {t('common.pleaseSelectServerDesc')}
      </div>
    );
  }

  const modules = configData?.modules || [];
  const forcedLocale = configData?.config?.forcedLocale || 'auto';

  // 10 Fixed Slots: Slot 1 (Foundation), Slot 2 (Advanced), Slots 3-10 (Custom)
  const slots = Array.from({ length: 10 }, (_, i) => {
    const slotNumber = i + 1;
    let foundMod: LandmineModule | undefined;
    if (slotNumber === 1) {
      foundMod = modules.find((m) => m.isDefault && m.moduleKey.toLowerCase() === 'foundation');
    } else if (slotNumber === 2) {
      foundMod = modules.find((m) => m.isDefault && m.moduleKey.toLowerCase() === 'advanced');
    } else {
      foundMod = modules.find((m) => m.moduleKey.toLowerCase() === `m${slotNumber}`);
    }
    return { slotNumber, module: foundMod };
  });

  const activeModulesCount = modules.filter((m) => m.isEnabled).length;
  const lbEntries = lbData?.entries || [];
  const totalExplosionsSum = lbEntries.reduce((sum, item) => sum + item.successCount, 0);
  const totalTimeoutSecondsSum = lbEntries.reduce((sum, item) => sum + item.totalTimeoutSeconds, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Header & General Settings Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 glass-panel rounded-3xl border border-white/10 relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 shrink-0 ring-1 ring-white/20">
            <Bomb className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {t('landmine.title')}
              </h1>
              <Badge variant="purple" size="sm">
                {t('landmine.badge')}
              </Badge>
            </div>
            <p className="text-xs text-discord-muted mt-1 max-w-2xl leading-relaxed">
              {t('landmine.subtitle')}
            </p>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Forced Locale Picker */}
          <div className="flex items-center gap-2 bg-[#12141c] p-1.5 rounded-2xl border border-white/10 shadow-inner">
            <span className="text-[11px] font-semibold text-discord-muted pl-2 pr-1">
              {t('landmine.forcedLocaleLabel')}:
            </span>
            {(['auto', 'vi', 'en'] as const).map((loc) => {
              const isSelected = forcedLocale === loc;
              const labels = {
                auto: t('landmine.localeAuto'),
                vi: t('landmine.localeVi'),
                en: t('landmine.localeEn'),
              };
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => updateConfigMutation.mutate(loc)}
                  disabled={updateConfigMutation.isPending}
                  className={cn(
                    'px-2.5 py-1 rounded-xl text-xs font-bold transition-all',
                    isSelected
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                      : 'text-discord-muted hover:text-white hover:bg-white/5',
                  )}
                >
                  {labels[loc]}
                </button>
              );
            })}
          </div>

          {/* Reset Leaderboard Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsResetModalOpen(true)}
            className="text-discord-red hover:bg-discord-red/10 border border-discord-red/20 font-bold gap-1.5 text-xs rounded-xl"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('landmine.resetLeaderboardBtn')}
          </Button>
        </div>
      </div>

      {/* 2. KPI Bento Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card hover className="bg-[#12141c]/90 border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-discord-muted">
                {t('landmine.kpiActiveModules')}
              </p>
              <div className="text-2xl font-extrabold text-white mt-1">
                {activeModulesCount} <span className="text-xs text-discord-muted font-normal">/ 10</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card hover className="bg-[#12141c]/90 border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-discord-muted">
                {t('landmine.kpiTotalExplosions')}
              </p>
              <div className="text-2xl font-extrabold text-orange-400 mt-1">
                {totalExplosionsSum.toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card hover className="bg-[#12141c]/90 border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-discord-muted">
                {t('landmine.kpiTotalTimeout')}
              </p>
              <div className="text-lg font-extrabold text-red-400 mt-1 truncate">
                {formatDurationSeconds(totalTimeoutSecondsSum)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <Timer className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Navigation Tabs */}
      <div className="flex border-b border-white/10 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('modules')}
          className={cn(
            'flex items-center gap-2 pb-3 text-sm font-extrabold transition-all border-b-2 -mb-px',
            activeTab === 'modules'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-discord-muted hover:text-white',
          )}
        >
          <Bomb className="w-4 h-4" />
          <span>{t('landmine.tabModules')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={cn(
            'flex items-center gap-2 pb-3 text-sm font-extrabold transition-all border-b-2 -mb-px',
            activeTab === 'leaderboard'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-discord-muted hover:text-white',
          )}
        >
          <Trophy className="w-4 h-4" />
          <span>{t('landmine.tabLeaderboard')}</span>
        </button>
      </div>

      {/* TAB 1: MODULES GRID (10 SLOTS) */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{t('landmine.slotsListTitle')}</span>
              </h2>
              <p className="text-xs text-discord-muted">
                {t('landmine.slotsListDesc')}
              </p>
            </div>
            {modules.length < 10 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-500 text-black font-extrabold gap-1.5 shadow-md shadow-amber-500/20 rounded-xl"
              >
                <Plus className="w-4 h-4" />
                {t('landmine.createModuleBtn')}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {slots.map(({ slotNumber, module: mod }) => {
              if (mod) {
                const isM1 = mod.isDefault && mod.moduleKey.toLowerCase() === 'foundation';
                const isM2 = mod.isDefault && mod.moduleKey.toLowerCase() === 'advanced';
                const isCustom = !mod.isDefault;

                return (
                  <Card
                    key={mod.id}
                    hover
                    className={cn(
                      'border transition-all duration-200 relative overflow-hidden bg-[#151722]/90 flex flex-col justify-between',
                      mod.isEnabled ? 'border-amber-500/30' : 'border-white/[0.08] opacity-80',
                    )}
                  >
                    {/* Top status & identification */}
                    <CardHeader className="p-4 pb-2 border-b border-white/5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-white">
                            {isM1 ? 'M1' : isM2 ? 'M2' : mod.moduleKey.toUpperCase()}
                          </span>
                          {isM1 && (
                            <Badge variant="blurple" size="sm">
                              {t('landmine.moduleDefaultBadge')}
                            </Badge>
                          )}
                          {isM2 && (
                            <Badge variant="purple" size="sm">
                              {t('landmine.moduleDynamicBadge')}
                            </Badge>
                          )}
                          {isCustom && (
                            <Badge variant="yellow" size="sm">
                              {t('landmine.moduleCustomBadge')}
                            </Badge>
                          )}
                        </div>

                        {/* Switch Enable / Disable */}
                        <div className="flex items-center gap-2">
                          <span className={cn('text-[11px] font-bold', mod.isEnabled ? 'text-emerald-400' : 'text-discord-muted')}>
                            {mod.isEnabled ? t('landmine.activeBadge') : t('landmine.disabledBadge')}
                          </span>
                          <Switch
                            checked={mod.isEnabled}
                            onChange={(checked) =>
                              toggleModuleMutation.mutate({
                                moduleKey: mod.moduleKey,
                                isEnabled: checked,
                              })
                            }
                            disabled={toggleModuleMutation.isPending}
                          />
                        </div>
                      </div>

                      {mod.note && (
                        <p className="text-[11px] text-discord-muted italic mt-1.5 truncate" title={mod.note}>
                          "{mod.note}"
                        </p>
                      )}
                    </CardHeader>

                    {/* Middle stats & rules */}
                    <CardContent className="p-4 space-y-3 flex-1">
                      {/* Rate & Timeout specifications */}
                      {isM1 && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                            <span className="text-[10px] text-discord-muted uppercase font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3 text-discord-muted" />
                              {t('landmine.rateLabel')}
                            </span>
                            <p className="text-amber-400 font-extrabold text-sm">0.8%</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                            <span className="text-[10px] text-discord-muted uppercase font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3 text-discord-muted" />
                              {t('landmine.timeoutLabel')}
                            </span>
                            <p className="text-red-400 font-extrabold text-sm">60s (1m)</p>
                          </div>
                        </div>
                      )}

                      {isM2 && (
                        <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs space-y-1">
                          <div className="flex items-center justify-between text-purple-300 font-bold">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                              {t('landmine.dynamicAlgorithmName')}
                            </span>
                          </div>
                          <p className="text-[11px] text-discord-muted leading-relaxed">
                            {t('landmine.dynamicAlgorithmTooltip')}
                          </p>
                        </div>
                      )}

                      {isCustom && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                            <span className="text-[10px] text-discord-muted uppercase font-bold">
                              {t('landmine.rateLabel')}
                            </span>
                            <p className="text-amber-400 font-extrabold text-sm">{mod.ratePercent}%</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                            <span className="text-[10px] text-discord-muted uppercase font-bold">
                              {t('landmine.timeoutLabel')}
                            </span>
                            <p className="text-red-400 font-extrabold text-sm">
                              {formatDurationSeconds(mod.punishmentDurationSeconds)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Scopes summary chips */}
                      <div className="space-y-1.5 pt-1 text-[11px]">
                        <div className="flex items-center justify-between text-discord-muted">
                          <span className="flex items-center gap-1">
                            <Hash className="w-3.5 h-3.5 text-discord-muted" />
                            {t('landmine.scopeChannelsLabel')}:
                          </span>
                          <span className="font-semibold text-white">
                            {mod.channelScopeType === 'ALL'
                              ? t('landmine.scopeAll')
                              : `${mod.channelScopeType} (${t('landmine.channelsCount', { count: mod.channelIds.length })})`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-discord-muted">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-discord-muted" />
                            {t('landmine.scopeRolesLabel')}:
                          </span>
                          <span className="font-semibold text-white">
                            {mod.roleScopeType === 'ALL'
                              ? t('landmine.scopeAll')
                              : `${mod.roleScopeType} (${t('landmine.rolesCount', { count: mod.roleIds.length })})`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-discord-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-discord-muted" />
                            {t('landmine.autoDeleteLabel')}:
                          </span>
                          <span className={cn('font-semibold', mod.autoDeleteNotification ? 'text-amber-400' : 'text-discord-muted')}>
                            {mod.autoDeleteNotification ? '15s' : 'Off'}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    {/* Bottom Action Footer */}
                    <div className="p-3 bg-black/20 border-t border-white/5 flex items-center justify-between gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEdit(mod)}
                        className="text-xs font-bold gap-1.5 flex-1 rounded-xl"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {t('landmine.editScopeBtn')}
                      </Button>

                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => setDeleteTargetKey(mod.moduleKey)}
                          className="p-2 rounded-xl text-discord-muted hover:text-red-400 hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20"
                          title={t('landmine.deleteModuleBtn')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </Card>
                );
              }

              // Empty Slot Card
              return (
                <div
                  key={`empty-${slotNumber}`}
                  className="rounded-2xl border-2 border-dashed border-white/10 hover:border-amber-500/40 p-6 flex flex-col items-center justify-center text-center gap-3 bg-black/20 hover:bg-amber-500/[0.02] transition-all group min-h-[220px]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-discord-muted group-hover:text-amber-400 group-hover:border-amber-500/30 transition">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-discord-muted group-hover:text-white transition">
                      {t('landmine.slotEmptyBadge')} (M{slotNumber})
                    </h3>
                    <p className="text-[11px] text-discord-muted mt-0.5 max-w-[200px]">
                      {t('landmine.slotEmptyDesc')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreateModalOpen(true);
                    }}
                    className="text-xs font-bold text-amber-400 hover:bg-amber-500/10 border border-amber-500/30 rounded-xl"
                  >
                    {t('landmine.createModuleBtn')}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LEADERBOARD LIVE VIEW */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          <Card hover className="bg-[#12141c]/90 border-white/10">
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  {t('landmine.tabLeaderboard')}
                </CardTitle>
                <CardDescription className="text-xs text-discord-muted mt-0.5">
                  {t('landmine.leaderboardDesc')}
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Module scope dropdown */}
                <select
                  value={lbModule}
                  onChange={(e) => setLbModule(e.target.value)}
                  className="bg-[#1a1c26] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="server">{t('landmine.filterModuleAll')}</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.moduleKey}>
                      {t('landmine.filterModuleSingle', { key: m.isDefault ? (m.moduleKey === 'foundation' ? 'M1' : 'M2') : m.moduleKey.toUpperCase() })}
                    </option>
                  ))}
                </select>

                {/* Sort toggle */}
                <div className="flex bg-[#1a1c26] p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setLbSort('count')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg font-bold transition-all',
                      lbSort === 'count'
                        ? 'bg-amber-500 text-black shadow-sm shadow-amber-500/25'
                        : 'text-discord-muted hover:text-white',
                    )}
                  >
                    {t('landmine.sortByCount')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLbSort('duration')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg font-bold transition-all',
                      lbSort === 'duration'
                        ? 'bg-amber-500 text-black shadow-sm shadow-amber-500/25'
                        : 'text-discord-muted hover:text-white',
                    )}
                  >
                    {t('landmine.sortByDuration')}
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoadingLb ? (
                <div className="p-12 text-center text-xs text-discord-muted animate-pulse">
                  {t('landmine.loadingLeaderboard')}
                </div>
              ) : lbEntries.length === 0 ? (
                <div className="p-12 text-center text-xs text-discord-muted">
                  {t('landmine.noLbEntries')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-discord-muted text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-3 px-4 w-16 text-center">{t('landmine.lbColRank')}</th>
                        <th className="py-3 px-4">{t('landmine.lbColUser')}</th>
                        <th className="py-3 px-4 text-center">{t('landmine.lbColSteps')}</th>
                        <th className="py-3 px-4 text-center">{t('landmine.lbColSuccess')}</th>
                        <th className="py-3 px-4 text-center">{t('landmine.lbColFailed')}</th>
                        <th className="py-3 px-4 text-right">{t('landmine.lbColDuration')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {lbEntries.map((entry, index) => {
                        const rank = index + 1;
                        const isTop1 = rank === 1;
                        const isTop2 = rank === 2;
                        const isTop3 = rank === 3;

                        return (
                          <tr
                            key={entry.userId}
                            className={cn(
                              'hover:bg-white/[0.03] transition-colors',
                              isTop1 && 'bg-amber-500/[0.05]',
                            )}
                          >
                            <td className="py-3.5 px-4 text-center font-bold">
                              {isTop1 ? (
                                <span className="text-base" title="Top 1">🥇</span>
                              ) : isTop2 ? (
                                <span className="text-base" title="Top 2">🥈</span>
                              ) : isTop3 ? (
                                <span className="text-base" title="Top 3">🥉</span>
                              ) : (
                                <span className="text-discord-muted font-mono">#{rank}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-white">
                              <UserDisplay userId={entry.userId} />
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-white font-mono">
                              {entry.totalSteps.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-orange-400 font-mono">
                              {entry.successCount.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-cyan-400 font-mono">
                              {entry.failedCount > 0 ? (
                                <span className="inline-flex items-center gap-1">
                                  <Shield className="w-3.5 h-3.5 fill-current" />
                                  {entry.failedCount}
                                </span>
                              ) : (
                                <span className="text-discord-muted">0</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-red-400 font-mono">
                              {formatDurationSeconds(entry.totalTimeoutSeconds)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* CREATE MODULE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-white">
            <Plus className="w-5 h-5 text-amber-400" />
            <span>{t('landmine.createModuleTitle')}</span>
          </div>
        }
        description={t('landmine.createModuleDesc')}
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={createModuleMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                createModuleMutation.mutate({
                  ratePercent: createRate,
                  durationSeconds: toTotalSeconds(createDurationVal, createDurationUnit),
                  note: createNote.trim() || undefined,
                });
              }}
              isLoading={createModuleMutation.isPending}
              className="bg-amber-600 hover:bg-amber-500 text-black font-extrabold rounded-xl"
            >
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pt-1">
          {/* Rate Percent */}
          <div>
            <Input
              label={t('landmine.rateLabel')}
              type="number"
              step={0.01}
              min={0.01}
              max={100}
              value={createRate}
              onChange={(e) => setCreateRate(Number(e.target.value))}
              hint={t('landmine.rateHint')}
            />
          </div>

          {/* Timeout Duration */}
          <div>
            <label className="text-xs font-bold text-discord-muted uppercase tracking-wider block mb-1.5">
              {t('landmine.timeoutLabel')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={createDurationVal}
                onChange={(e) => setCreateDurationVal(Number(e.target.value))}
                className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
              <select
                value={createDurationUnit}
                onChange={(e) => setCreateDurationUnit(e.target.value as 's' | 'm' | 'h' | 'd')}
                className="bg-[#1e1f22] border border-[#3f4147] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 shrink-0"
              >
                <option value="s">{t('landmine.timeoutUnitSeconds')}</option>
                <option value="m">{t('landmine.timeoutUnitMinutes')}</option>
                <option value="h">{t('landmine.timeoutUnitHours')}</option>
                <option value="d">{t('landmine.timeoutUnitDays')}</option>
              </select>
            </div>
            <p className="text-[11px] text-discord-muted mt-1">{t('landmine.timeoutHint')}</p>
          </div>

          {/* Admin Note */}
          <div>
            <Input
              label={t('landmine.noteLabel')}
              placeholder={t('landmine.notePlaceholder')}
              value={createNote}
              onChange={(e) => setCreateNote(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* EDIT MODULE MODAL */}
      <Modal
        isOpen={Boolean(editingModule)}
        onClose={() => setEditingModule(null)}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-2 text-white">
            <Edit3 className="w-5 h-5 text-amber-400" />
            <span>
              {t('landmine.editModuleTitle', {
                key: editingModule?.isDefault
                  ? editingModule.moduleKey === 'foundation'
                    ? 'M1 (Foundation)'
                    : 'M2 (Advanced)'
                  : editingModule?.moduleKey.toUpperCase() || '',
              })}
            </span>
          </div>
        }
        description={t('landmine.editModuleDesc')}
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingModule(null)}
              disabled={updateModuleMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveEdit}
              isLoading={updateModuleMutation.isPending}
              className="bg-amber-600 hover:bg-amber-500 text-black font-extrabold rounded-xl"
            >
              {t('landmine.saveModuleBtn')}
            </Button>
          </>
        }
      >
        {editingModule && (
          <div className="space-y-4 pt-1 max-h-[68vh] overflow-y-auto pr-1">
            {/* If M1 or M2: notice locking rate & duration */}
            {editingModule.isDefault ? (
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-300 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-purple-400" />
                <span>
                  {t('landmine.defaultModuleNotice', {
                    algorithm: editingModule.moduleKey === 'foundation' ? '0.8% - 60s' : 'Dynamic Chaos Lottery',
                  })}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rate */}
                <Input
                  label={t('landmine.rateLabel')}
                  type="number"
                  step={0.01}
                  min={0.01}
                  max={100}
                  value={editRate}
                  onChange={(e) => setEditRate(Number(e.target.value))}
                  hint={t('landmine.rateHint')}
                />

                {/* Duration */}
                <div>
                  <label className="text-xs font-bold text-discord-muted uppercase tracking-wider block mb-1.5">
                    {t('landmine.timeoutLabel')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={editDurationVal}
                      onChange={(e) => setEditDurationVal(Number(e.target.value))}
                      className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                    <select
                      value={editDurationUnit}
                      onChange={(e) => setEditDurationUnit(e.target.value as 's' | 'm' | 'h' | 'd')}
                      className="bg-[#1e1f22] border border-[#3f4147] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 shrink-0"
                    >
                      <option value="s">{t('landmine.timeoutUnitSeconds')}</option>
                      <option value="m">{t('landmine.timeoutUnitMinutes')}</option>
                      <option value="h">{t('landmine.timeoutUnitHours')}</option>
                      <option value="d">{t('landmine.timeoutUnitDays')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Note */}
            <Input
              label={t('landmine.noteLabel')}
              placeholder={t('landmine.notePlaceholder')}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
            />

            {/* Channel Scope Selector */}
            <div className="p-3.5 rounded-xl bg-black/20 border border-white/10 space-y-3">
              <label className="text-xs font-bold text-white block">
                {t('landmine.scopeChannelsLabel')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['ALL', 'WHITELIST', 'BLACKLIST'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setEditChannelScope(mode)}
                    className={cn(
                      'py-1.5 px-2 rounded-xl text-xs font-bold transition border',
                      editChannelScope === mode
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-black/30 border-white/10 text-discord-muted hover:text-white',
                    )}
                  >
                    {mode === 'ALL'
                      ? t('landmine.scopeAll')
                      : mode === 'WHITELIST'
                        ? t('landmine.scopeWhitelist')
                        : t('landmine.scopeBlacklist')}
                  </button>
                ))}
              </div>

              {editChannelScope !== 'ALL' && (
                <div className="space-y-2 pt-2">
                  <ChannelSelect
                    guildId={guildId}
                    value={null}
                    onChange={(selectedId) => {
                      if (selectedId && !editChannelIds.includes(selectedId)) {
                        setEditChannelIds([...editChannelIds, selectedId]);
                      }
                    }}
                    placeholder={t('landmine.addChannelPlaceholder')}
                  />

                  {/* Channel Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editChannelIds.map((cid) => (
                      <span
                        key={cid}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-white"
                      >
                        <Hash className="w-3 h-3 text-discord-muted" />
                        <span>{channelMap.get(cid) || cid}</span>
                        <button
                          type="button"
                          onClick={() => setEditChannelIds(editChannelIds.filter((id) => id !== cid))}
                          className="p-0.5 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Role Scope Selector */}
            <div className="p-3.5 rounded-xl bg-black/20 border border-white/10 space-y-3">
              <label className="text-xs font-bold text-white block">
                {t('landmine.scopeRolesLabel')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['ALL', 'WHITELIST', 'BLACKLIST'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setEditRoleScope(mode)}
                    className={cn(
                      'py-1.5 px-2 rounded-xl text-xs font-bold transition border',
                      editRoleScope === mode
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-black/30 border-white/10 text-discord-muted hover:text-white',
                    )}
                  >
                    {mode === 'ALL'
                      ? t('landmine.scopeAll')
                      : mode === 'WHITELIST'
                        ? t('landmine.scopeWhitelist')
                        : t('landmine.scopeBlacklist')}
                  </button>
                ))}
              </div>

              {editRoleScope !== 'ALL' && (
                <div className="space-y-2 pt-2">
                  <RoleSelect
                    guildId={guildId}
                    value={null}
                    onChange={(selectedId) => {
                      if (selectedId && !editRoleIds.includes(selectedId)) {
                        setEditRoleIds([...editRoleIds, selectedId]);
                      }
                    }}
                    placeholder={t('landmine.addRolePlaceholder')}
                  />

                  {/* Role Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editRoleIds.map((rid) => {
                      const roleMeta = roleMap.get(rid);
                      return (
                        <span
                          key={rid}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-white"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: roleMeta?.color || '#99aab5' }}
                          />
                          <span>{roleMeta?.name || rid}</span>
                          <button
                            type="button"
                            onClick={() => setEditRoleIds(editRoleIds.filter((id) => id !== rid))}
                            className="p-0.5 hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Toggles: Leaderboard inclusion & Auto-delete */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-black/20 border border-white/10 cursor-pointer select-none">
                <Switch
                  checked={editIncludeLeaderboard}
                  onChange={setEditIncludeLeaderboard}
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    {t('landmine.includeLeaderboardLabel')}
                  </span>
                  <span className="text-[11px] text-discord-muted">
                    {t('landmine.includeLeaderboardDesc')}
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-black/20 border border-white/10 cursor-pointer select-none">
                <Switch
                  checked={editAutoDelete}
                  onChange={setEditAutoDelete}
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    {t('landmine.autoDeleteLabel')}
                  </span>
                  <span className="text-[11px] text-discord-muted">
                    {t('landmine.autoDeleteDesc')}
                  </span>
                </div>
              </label>
            </div>

            {/* Custom Messages Template */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-discord-muted uppercase tracking-wider">
                    {t('landmine.successMsgLabel')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditSuccessMsg((prev) => `${prev} {user}`)}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300"
                  >
                    {t('landmine.insertPlaceholderBtn')}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={editSuccessMsg}
                  onChange={(e) => setEditSuccessMsg(e.target.value)}
                  placeholder={t('landmine.successMsgPlaceholder')}
                  className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-xl px-3 py-2 text-xs text-white placeholder:text-discord-muted focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-discord-muted uppercase tracking-wider">
                    {t('landmine.failedMsgLabel')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditFailedMsg((prev) => `${prev} {user}`)}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300"
                  >
                    {t('landmine.insertPlaceholderBtn')}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={editFailedMsg}
                  onChange={(e) => setEditFailedMsg(e.target.value)}
                  placeholder={t('landmine.failedMsgPlaceholder')}
                  className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-xl px-3 py-2 text-xs text-white placeholder:text-discord-muted focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE MODULE MODAL */}
      <Modal
        isOpen={Boolean(deleteTargetKey)}
        onClose={() => setDeleteTargetKey(null)}
        title={
          <div className="flex items-center gap-2 text-discord-red">
            <AlertTriangle className="w-5 h-5 text-discord-red" />
            <span>{t('landmine.deleteConfirmTitle')}</span>
          </div>
        }
        description={t('landmine.deleteConfirmDesc')}
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTargetKey(null)}
              disabled={deleteModuleMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteTargetKey) {
                  deleteModuleMutation.mutate(deleteTargetKey);
                }
              }}
              isLoading={deleteModuleMutation.isPending}
              className="bg-discord-red font-bold text-white rounded-xl"
            >
              {t('landmine.deleteModuleBtn')}
            </Button>
          </>
        }
      >
        <div className="p-3.5 rounded-xl bg-discord-red/10 border border-discord-red/30 text-xs text-discord-red space-y-1">
          <p className="font-bold">{t('common.operationIrreversible')}</p>
          <p className="text-white/80">
            {t('landmine.deleteTargetDesc', { key: deleteTargetKey?.toUpperCase() || '' })}
          </p>
        </div>
      </Modal>

      {/* RESET LEADERBOARD STATS MODAL */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-discord-red">
            <ShieldAlert className="w-5 h-5 text-discord-red" />
            <span>{t('landmine.resetModalTitle')}</span>
          </div>
        }
        description={t('landmine.resetModalDesc')}
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsResetModalOpen(false)}
              disabled={resetStatsMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => resetStatsMutation.mutate(resetTargetKey)}
              isLoading={resetStatsMutation.isPending}
              className="bg-discord-red font-bold text-white rounded-xl"
            >
              {t('landmine.confirmResetBtn')}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pt-1">
          <div>
            <label className="text-xs font-bold text-discord-muted uppercase tracking-wider block mb-1.5">
              {t('landmine.resetTargetScopeLabel')}
            </label>
            <select
              value={resetTargetKey}
              onChange={(e) => setResetTargetKey(e.target.value)}
              className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-discord-red"
            >
              <option value="all">{t('landmine.resetScopeAll')}</option>
              {modules.map((m) => (
                <option key={m.id} value={m.moduleKey}>
                  Module {m.isDefault ? (m.moduleKey === 'foundation' ? 'M1 (Foundation)' : 'M2 (Advanced)') : m.moduleKey.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-discord-red/10 border border-discord-red/30 text-xs text-discord-red space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {t('common.operationIrreversible')}
            </p>
            <p className="text-white/80">
              {t('landmine.resetWarningDesc')}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LandminePage;
