import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Coins,
  Crown,
  Diamond,
  Download,
  FileSpreadsheet,
  Flame,
  Gift,
  History,
  PlusCircle,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import { apiFetch } from '../api/client';
import {
  DiscordChatSimulator,
  normalizeHexColor,
} from '../components/perks/DiscordChatSimulator';
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
import { Skeleton } from '../components/ui/Skeleton';
import { Switch } from '../components/ui/Switch';
import { useToast } from '../components/ui/Toast';
import { UserDisplay } from '../components/ui/UserDisplay';
import { UserInput } from '../components/ui/UserInput';
import { useAuth } from '../context/AuthContext';
import {
  cn,
  formatDateTime,
  formatDurationSeconds,
  formatVnd,
} from '../lib/utils';
import type {
  BoosterConfig,
  CustomRolePerk,
  DiscordUserInfo,
  DonatorAccount,
  DonatorConfig,
  DonatorTransaction,
} from '../types';

export const PerksPage: React.FC = () => {
  const { guildId: paramGuildId } = useParams<{ guildId: string }>();
  const { selectedGuild, guilds } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const currentGuild =
    (paramGuildId ? guilds.find((g) => g.id === paramGuildId) : null) ||
    selectedGuild;
  const guildId = currentGuild?.id || paramGuildId;

  const [activeTab, setActiveTab] = useState<'booster' | 'donator'>('booster');

  // Form states cho Booster
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(21);
  const [anchorRoleId, setAnchorRoleId] = useState<string>('');
  const [notificationChannelId, setNotificationChannelId] =
    useState<string>('');
  const [auditLogChannelId, setAuditLogChannelId] = useState<string>('');
  const [boosterSearch, setBoosterSearch] = useState<string>('');
  const [selectedRoleForPreview, setSelectedRoleForPreview] =
    useState<CustomRolePerk | null>(null);

  // Form states cho Donator
  const [isDonatorEnabled, setIsDonatorEnabled] = useState<boolean>(false);
  const [baseBenchmarkVnd, setBaseBenchmarkVnd] = useState<number>(200000);
  const [baseBenchmarkDays, setBaseBenchmarkDays] = useState<number>(30);
  const [weeklyMinVnd, setWeeklyMinVnd] = useState<number>(50000);
  const [idleBurnRate, setIdleBurnRate] = useState<number>(0.2);
  const [donatorSearch, setDonatorSearch] = useState<string>('');

  // States bộ lọc lịch sử giao dịch & xuất báo cáo CSV
  const [txSearch, setTxSearch] = useState<string>('');
  const [txStartDate, setTxStartDate] = useState<string>('');
  const [txEndDate, setTxEndDate] = useState<string>('');

  // Form states cho Top-up modal
  const [isTopupModalOpen, setIsTopupModalOpen] = useState<boolean>(false);
  const [topupUserId, setTopupUserId] = useState<string>('');
  const [verifiedTopupUser, setVerifiedTopupUser] =
    useState<DiscordUserInfo | null>(null);
  const [topupAmountVnd, setTopupAmountVnd] = useState<number>(50000);
  const [topupNote, setTopupNote] = useState<string>('');

  // Lấy tổng quan Perks
  const { data, isLoading } = useQuery({
    queryKey: ['perks-overview', guildId],
    queryFn: () =>
      apiFetch<{
        booster: {
          config: BoosterConfig | null;
          customRoles: CustomRolePerk[];
        };
        donator: {
          config: DonatorConfig | null;
          accounts: DonatorAccount[];
        };
      }>(`/api/guilds/${guildId}/perks/overview`),
    enabled: Boolean(guildId),
  });

  // Lấy lịch sử giao dịch Donator
  const { data: txData, isLoading: loadingTx } = useQuery({
    queryKey: ['donator-transactions', guildId],
    queryFn: () =>
      apiFetch<{ transactions: DonatorTransaction[] }>(
        `/api/guilds/${guildId}/perks/donator/transactions`,
      ),
    enabled: Boolean(guildId && activeTab === 'donator'),
  });

  // Đồng bộ state khi data nạp xong
  useEffect(() => {
    if (data?.booster.config) {
      setGracePeriodDays(data.booster.config.gracePeriodDays);
      setAnchorRoleId(data.booster.config.anchorRoleId || '');
      setNotificationChannelId(
        data.booster.config.notificationChannelId || '',
      );
      setAuditLogChannelId(data.booster.config.auditLogChannelId || '');
    }
    if (data?.booster.customRoles && data.booster.customRoles.length > 0) {
      setSelectedRoleForPreview((prev) => prev ?? data.booster.customRoles[0]);
    }
    if (data?.donator.config) {
      setIsDonatorEnabled(data.donator.config.isEnabled);
      setBaseBenchmarkVnd(data.donator.config.baseBenchmarkVnd);
      setBaseBenchmarkDays(data.donator.config.baseBenchmarkDays);
      setWeeklyMinVnd(data.donator.config.weeklyMinVnd);
      setIdleBurnRate(data.donator.config.idleBurnRate);
    }
  }, [data]);

  // Mutations
  const updateBoosterMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/guilds/${guildId}/perks/booster/config`, {
        method: 'PUT',
        body: JSON.stringify({
          gracePeriodDays,
          anchorRoleId: anchorRoleId || null,
          notificationChannelId: notificationChannelId || null,
          auditLogChannelId: auditLogChannelId || null,
        }),
      }),
    onSuccess: () => {
      toast.success(
        'Đã cập nhật Server Booster',
        'Cấu hình thời gian ân hạn và kênh thông báo đã được lưu.',
      );
      void queryClient.invalidateQueries({
        queryKey: ['perks-overview', guildId],
      });
    },
    onError: (err: Error) => toast.error('Lỗi cấu hình Booster', err.message),
  });

  const updateDonatorMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/guilds/${guildId}/perks/donator/config`, {
        method: 'PUT',
        body: JSON.stringify({
          isEnabled: isDonatorEnabled,
          baseBenchmarkVnd,
          baseBenchmarkDays,
          weeklyMinVnd,
          idleBurnRate,
        }),
      }),
    onSuccess: () => {
      toast.success(
        'Đã cập nhật Donator Time-Bank',
        'Tỷ giá nạp giờ và thông số đốt quỹ cất kho đã được cập nhật.',
      );
      void queryClient.invalidateQueries({
        queryKey: ['perks-overview', guildId],
      });
    },
    onError: (err: Error) => toast.error('Lỗi cấu hình Donator', err.message),
  });

  const topupMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/guilds/${guildId}/perks/donator/topup`, {
        method: 'POST',
        body: JSON.stringify({
          userId: topupUserId,
          amountVnd: topupAmountVnd,
          note: topupNote || null,
        }),
      }),
    onSuccess: () => {
      toast.success(
        'Nạp giờ thành công!',
        `Đã cộng thêm giờ vào quỹ của thành viên ${topupUserId}.`,
      );
      setIsTopupModalOpen(false);
      setTopupUserId('');
      setTopupNote('');
      void queryClient.invalidateQueries({
        queryKey: ['perks-overview', guildId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['donator-transactions', guildId],
      });
    },
    onError: (err: Error) => toast.error('Nạp giờ thất bại', err.message),
  });

  if (!guildId) {
    return (
      <div className="p-8 text-center text-discord-muted glass-panel rounded-3xl border border-white/10">
        Vui lòng chọn một Server từ thanh điều hướng phía trên để quản lý Đặc quyền.
      </div>
    );
  }

  // Filtered Booster Roles
  const customRoles = data?.booster.customRoles || [];
  const filteredRoles = customRoles.filter(
    (r) =>
      r.userId.includes(boosterSearch) ||
      (r.roleName && r.roleName.toLowerCase().includes(boosterSearch.toLowerCase())),
  );

  // Filtered Donators
  const donatorAccounts = data?.donator.accounts || [];
  const filteredDonators = donatorAccounts.filter((d) =>
    d.userId.includes(donatorSearch),
  );

  // Filtered Donator Transactions
  const rawTransactions = txData?.transactions || [];
  const filteredTransactions = rawTransactions.filter((tx) => {
    if (txStartDate) {
      const startTime = new Date(`${txStartDate}T00:00:00`).getTime();
      const txTime = new Date(tx.createdAt).getTime();
      if (txTime < startTime) return false;
    }
    if (txEndDate) {
      const endTime = new Date(`${txEndDate}T23:59:59`).getTime();
      const txTime = new Date(tx.createdAt).getTime();
      if (txTime > endTime) return false;
    }
    if (txSearch.trim()) {
      const q = txSearch.trim().toLowerCase();
      const matchUserId = tx.userId.toLowerCase().includes(q);
      const matchNote = tx.note?.toLowerCase().includes(q) ?? false;
      const matchAction = tx.actionType.toLowerCase().includes(q);
      if (!matchUserId && !matchNote && !matchAction) return false;
    }
    return true;
  });

  // Xuất báo cáo CSV với UTF-8 BOM
  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) {
      toast.error(
        'Không có dữ liệu',
        'Không tìm thấy giao dịch nào thỏa mãn bộ lọc hiện tại để xuất.',
      );
      return;
    }

    const headers = [
      'Mã Giao Dịch',
      'Thời Gian',
      'User ID',
      'Số Tiền Nạp (VND)',
      'Thời Gian Quy Đổi (Giây)',
      'Thời Gian Quy Đổi (Định Dạng)',
      'Loại Tác Vụ',
      'Người Thực Hiện',
      'Ghi Chú',
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredTransactions.map((tx) => [
      escapeCsv(tx.id),
      escapeCsv(formatDateTime(tx.createdAt)),
      escapeCsv(tx.userId),
      escapeCsv(tx.amountVnd),
      escapeCsv(tx.creditSecondsAdded),
      escapeCsv(formatDurationSeconds(tx.creditSecondsAdded)),
      escapeCsv(tx.actionType),
      escapeCsv(tx.createdBy),
      escapeCsv(tx.note || ''),
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute(
      'download',
      `donator_report_${guildId || 'guild'}_${dateStr}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(
      'Xuất báo cáo thành công!',
      `Đã tải file CSV chứa ${filteredTransactions.length} bản ghi giao dịch.`,
    );
  };

  // Donator Rank Badge Helper
  const getDonatorRankBadge = (streak: number) => {
    if (streak >= 8) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-yellow-300 font-extrabold text-[11px] border border-yellow-500/40 shadow-sm shadow-yellow-500/20">
          <Crown className="w-3.5 h-3.5 text-yellow-400 fill-current" />
          Crown ({streak}w)
        </span>
      );
    }
    if (streak >= 4) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[11px] border border-cyan-500/40">
          <Diamond className="w-3.5 h-3.5 text-cyan-400 fill-current" />
          Diamond ({streak}w)
        </span>
      );
    }
    if (streak >= 1) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 font-bold text-[11px] border border-orange-500/40">
          <Flame className="w-3.5 h-3.5 text-orange-500 fill-current" />
          Streak ({streak}w)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 text-discord-muted font-medium text-[11px] border border-white/10">
        Supporter
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-[#0c0d12] flex items-center justify-center font-black shadow-lg shadow-amber-500/25">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Quản Lý Đặc Quyền
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Perks Engine
                </span>
              </h1>
              <p className="text-xs text-discord-muted mt-0.5">
                Tự động hóa Custom Role Gradient 2 màu và mô hình Quỹ Thời Gian Donator Time-Bank.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center p-1 rounded-2xl bg-[#161820] border border-white/10">
          <button
            onClick={() => setActiveTab('booster')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200',
              activeTab === 'booster'
                ? 'bg-discord-blurple text-white shadow-lg shadow-discord-blurple/30'
                : 'text-discord-muted hover:text-white',
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span>Server Booster</span>
          </button>
          <button
            onClick={() => setActiveTab('donator')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200',
              activeTab === 'donator'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-discord-muted hover:text-white',
            )}
          >
            <Coins className="w-4 h-4" />
            <span>Donator Time-Bank</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SERVER BOOSTER PERKS (FEAT-01) */}
      {/* ========================================================================= */}
      {activeTab === 'booster' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Top Row: Live Simulator Hero Banner */}
          <DiscordChatSimulator
            activeRole={selectedRoleForPreview}
            className="border-white/[0.12] shadow-2xl"
          />

          {/* Booster Config Card */}
          <Card hover>
            <CardHeader>
              <CardTitle>
                <Zap className="w-5 h-5 text-discord-blurple" />
                Cấu Hình Quy Trình Server Booster
              </CardTitle>
              <CardDescription>
                Thiết lập thời gian ân hạn giữ role sau khi unboost và các kênh thông báo tự động.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Thời gian Ân hạn (Grace Period - Ngày)"
                  type="number"
                  min={1}
                  max={60}
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                  hint="Số ngày thành viên được giữ custom role sau khi ngừng boost server."
                />

                <RoleSelect
                  label="Role Neo Vị Trí (Anchor Role)"
                  placeholder="Chọn role neo vị trí custom role..."
                  value={anchorRoleId || null}
                  onChange={(val) => setAnchorRoleId(val || '')}
                  guildId={guildId}
                  hint="Custom role sinh ra sẽ được xếp ngay dưới role này."
                />

                <ChannelSelect
                  label="Kênh Thông Báo Booster"
                  placeholder="Chọn kênh gửi thông báo..."
                  value={notificationChannelId || null}
                  onChange={(val) => setNotificationChannelId(val || '')}
                  guildId={guildId}
                  channelTypes={['TEXT', 'ANNOUNCEMENT']}
                  hint="Kênh gửi tin nhắn chúc mừng boost hoặc thông báo hết hạn."
                />

                <ChannelSelect
                  label="Kênh Nhật Ký (Audit Log)"
                  placeholder="Chọn kênh ghi log..."
                  value={auditLogChannelId || null}
                  onChange={(val) => setAuditLogChannelId(val || '')}
                  guildId={guildId}
                  channelTypes={['TEXT', 'ANNOUNCEMENT']}
                  hint="Kênh ghi lại lịch sử tạo, sửa và thu hồi role booster."
                />
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => updateBoosterMutation.mutate()}
                  isLoading={updateBoosterMutation.isPending}
                  className="text-xs font-bold"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Lưu Cấu Hình Booster
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Booster Custom Roles Table & Responsive Cards */}
          <Card hover>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>
                    Danh Sách Custom Role Thành Viên ({customRoles.length})
                  </CardTitle>
                  <CardDescription>
                    Nhấp vào bất kỳ role nào trong bảng dưới để xem mô phỏng trực tiếp trên Discord Chat Simulator phía trên.
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-discord-muted absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Tìm theo User ID hoặc Tên Role..."
                    value={boosterSearch}
                    onChange={(e) => setBoosterSearch(e.target.value)}
                    className="w-full bg-[#0c0d12]/80 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-discord-muted focus:outline-none focus:border-discord-blurple"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="py-12 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
                  Chưa có thành viên nào tạo Custom Role Booster.
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full text-left text-xs text-discord-text">
                      <thead className="bg-[#11131a] text-discord-muted uppercase text-[10px] font-extrabold tracking-wider border-b border-white/10">
                        <tr>
                          <th className="py-3.5 px-4">Thành Viên</th>
                          <th className="py-3.5 px-4">Tên Role & Gradient Phối Màu</th>
                          <th className="py-3.5 px-4 text-center">Số Boosts</th>
                          <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                          <th className="py-3.5 px-4">Hạn Ân Hạn</th>
                          <th className="py-3.5 px-4 text-center">Xem Simulator</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {filteredRoles.map((role) => {
                          const hasGradient = Boolean(role.roleColor && role.roleColor2);
                          const isSelected = selectedRoleForPreview?.id === role.id;
                          const color1 = normalizeHexColor(role.roleColor, '#f47fff');
                          const color2 = role.roleColor2 ? normalizeHexColor(role.roleColor2) : color1;
                          const gradientStyle = hasGradient
                            ? {
                                background: `linear-gradient(135deg, ${color1}, ${color2})`,
                              }
                            : { backgroundColor: color1 };

                          return (
                            <tr
                              key={role.id}
                              onClick={() => setSelectedRoleForPreview(role)}
                              className={cn(
                                'transition-colors cursor-pointer',
                                isSelected
                                  ? 'bg-discord-blurple/15 border-l-4 border-discord-blurple'
                                  : 'hover:bg-white/[0.03]',
                              )}
                            >
                              <td className="py-3.5 px-4 font-mono font-medium text-white">
                                <UserDisplay userId={role.userId} />
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  {/* Color Preview Pill */}
                                  <span
                                    className="w-5 h-5 rounded-full ring-2 ring-white/20 shrink-0 shadow-md"
                                    style={gradientStyle}
                                  />
                                  <span
                                    className={cn(
                                      'font-bold text-sm',
                                      hasGradient && 'discord-gradient-text',
                                    )}
                                    style={
                                      hasGradient
                                        ? {
                                            background: `linear-gradient(90deg, ${color1}, ${color2})`,
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            display: 'inline-block',
                                          }
                                        : { color: color1 }
                                    }
                                  >
                                    {role.roleName || 'Unnamed Role'}
                                  </span>
                                  {hasGradient && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-purple-500/20 text-purple-300 font-extrabold border border-purple-500/30">
                                      Gradient 2-Color
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-500/15 text-pink-400 font-bold text-xs border border-pink-500/30">
                                  🚀 {role.boostCount}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {role.status === 'ACTIVE' ? (
                                  <Badge variant="green" size="sm" dot>Active</Badge>
                                ) : role.status === 'GRACE_PERIOD' ? (
                                  <Badge variant="yellow" size="sm">Grace</Badge>
                                ) : (
                                  <Badge variant="red" size="sm">Revoked</Badge>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-discord-muted">
                                {role.gracePeriodExpiresAt ? (
                                  <span className="text-yellow-400 font-medium">
                                    {formatDateTime(role.gracePeriodExpiresAt)}
                                  </span>
                                ) : (
                                  <span className="text-discord-muted">-</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <Button
                                  variant={isSelected ? 'primary' : 'outline'}
                                  size="sm"
                                  className="h-7 text-[11px]"
                                >
                                  {isSelected ? 'Đang Xem' : 'Xem Thử'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card Stack */}
                  <div className="md:hidden space-y-3">
                    {filteredRoles.map((role) => {
                      const hasGradient = Boolean(role.roleColor && role.roleColor2);
                      const color1 = normalizeHexColor(role.roleColor, '#f47fff');
                      const color2 = role.roleColor2 ? normalizeHexColor(role.roleColor2) : color1;
                      return (
                        <div
                          key={role.id}
                          onClick={() => setSelectedRoleForPreview(role)}
                          className={cn(
                            'p-4 rounded-2xl border transition-all text-xs space-y-3',
                            selectedRoleForPreview?.id === role.id
                              ? 'bg-discord-blurple/15 border-discord-blurple'
                              : 'bg-black/30 border-white/10',
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                'font-bold text-sm',
                                hasGradient && 'discord-gradient-text',
                              )}
                              style={
                                hasGradient
                                  ? {
                                      background: `linear-gradient(90deg, ${color1}, ${color2})`,
                                      WebkitBackgroundClip: 'text',
                                      WebkitTextFillColor: 'transparent',
                                      display: 'inline-block',
                                    }
                                  : { color: color1 }
                              }
                            >
                              {role.roleName || 'Unnamed Role'}
                            </span>
                            <span className="text-pink-400 font-bold text-xs">
                              🚀 {role.boostCount} boost
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-discord-muted text-[11px]">
                            <UserDisplay userId={role.userId} showAvatar={false} />
                            <span className="text-discord-blurple font-bold">Chạm để xem Preview</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DONATOR TIME-BANK (FEAT-02) */}
      {/* ========================================================================= */}
      {activeTab === 'donator' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Donator Config Card */}
          <Card hover>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-amber-400 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    Cấu Hình Quỹ Thời Gian Donator (Time-Bank)
                  </CardTitle>
                  <CardDescription>
                    Điều chỉnh tỷ giá quy đổi VND sang thời gian, định mức tuần và tốc độ đốt khi cất kho.
                  </CardDescription>
                </div>
                <Badge variant={isDonatorEnabled ? 'green' : 'red'} size="md" dot>
                  {isDonatorEnabled ? 'Đang Hoạt Động' : 'Đóng Băng (0.0x)'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <Switch
                checked={isDonatorEnabled}
                onChange={setIsDonatorEnabled}
                label="Kích hoạt Phân hệ Donator Time-Bank"
                description="Khi tắt, thời gian của toàn bộ thành viên sẽ được đóng băng 0.0x bảo vệ tối đa quyền lợi."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="Định mức Tiêu chuẩn (VND)"
                  type="number"
                  step={10000}
                  value={baseBenchmarkVnd}
                  onChange={(e) => setBaseBenchmarkVnd(Number(e.target.value))}
                  hint={`Hiển thị: ${formatVnd(baseBenchmarkVnd)}`}
                />

                <Input
                  label="Số ngày quy đổi tương ứng"
                  type="number"
                  min={1}
                  value={baseBenchmarkDays}
                  onChange={(e) => setBaseBenchmarkDays(Number(e.target.value))}
                  hint={`= ${(baseBenchmarkVnd / baseBenchmarkDays).toFixed(0)} đ/ngày`}
                />

                <Input
                  label="Định mức giữ chuỗi tuần (Weekly Min)"
                  type="number"
                  step={10000}
                  value={weeklyMinVnd}
                  onChange={(e) => setWeeklyMinVnd(Number(e.target.value))}
                  hint={`= ${formatVnd(weeklyMinVnd)}/tuần`}
                />

                <Input
                  label="Tốc độ đốt khi cất kho (Idle Burn Rate)"
                  type="number"
                  step={0.05}
                  min={0.1}
                  max={1.0}
                  value={idleBurnRate}
                  onChange={(e) => setIdleBurnRate(Number(e.target.value))}
                  hint="0.2x nghĩa là thời gian trôi chậm gấp 5 lần khi cất kho."
                />
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => updateDonatorMutation.mutate()}
                  isLoading={updateDonatorMutation.isPending}
                  className="text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:opacity-90 border-0"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Lưu Cấu Hình Donator
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Donator Accounts List & Top-up Trigger */}
          <Card hover>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Quỹ Thời Gian Thành Viên ({donatorAccounts.length})</CardTitle>
                  <CardDescription>
                    Hệ thống cấp bậc danh dự Donator theo chuỗi tuần (Crown 👑, Diamond 💎, Flame 🔥).
                  </CardDescription>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-discord-muted absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Tìm theo User ID..."
                      value={donatorSearch}
                      onChange={(e) => setDonatorSearch(e.target.value)}
                      className="w-full bg-[#0c0d12]/80 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-discord-muted focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setTopupUserId('');
                      setIsTopupModalOpen(true);
                    }}
                    className="text-xs font-bold shrink-0 bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:opacity-90 border-0"
                  >
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    Nạp Giờ
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : filteredDonators.length === 0 ? (
                <div className="py-12 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
                  Chưa có thành viên nào trong danh sách Quỹ Donator.
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full text-left text-xs text-discord-text">
                      <thead className="bg-[#11131a] text-discord-muted text-xs font-semibold border-b border-white/10">
                        <tr>
                          <th className="py-3.5 px-4">Thành Viên (User ID)</th>
                          <th className="py-3.5 px-4">Quỹ Thời Gian Còn Lại</th>
                          <th className="py-3.5 px-4 text-center">Trạng Thái Đeo</th>
                          <th className="py-3.5 px-4 text-center">Hạng & Chuỗi Tuần</th>
                          <th className="py-3.5 px-4 text-right">Tổng Đã Đóng Góp</th>
                          <th className="py-3.5 px-4 text-center">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {filteredDonators.map((account) => (
                          <tr key={account.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="py-3.5 px-4 font-mono font-medium text-white">
                              <UserDisplay userId={account.userId} />
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-extrabold text-emerald-400 text-sm flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                                {formatDurationSeconds(account.creditSeconds)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {account.isEquipped ? (
                                <Badge variant="green" size="sm" dot>
                                  Đang Đeo (1.0x)
                                </Badge>
                              ) : (
                                <Badge variant="muted" size="sm">
                                  Cất Kho ({idleBurnRate}x)
                                </Badge>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {getDonatorRankBadge(account.streak)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-amber-300">
                              {formatVnd(account.totalDonated)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setTopupUserId(account.userId);
                                  setIsTopupModalOpen(true);
                                }}
                                className="text-xs h-7 px-2.5 hover:border-amber-400"
                              >
                                Nạp Thêm
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card Stack View */}
                  <div className="md:hidden space-y-3">
                    {filteredDonators.map((account) => (
                      <div
                        key={account.id}
                        className="p-4 rounded-2xl bg-[#1e2029]/80 border border-white/10 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <UserDisplay userId={account.userId} />
                          {getDonatorRankBadge(account.streak)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs">
                          <div>
                            <span className="text-discord-muted block text-[11px]">Quỹ thời gian</span>
                            <span className="font-extrabold text-emerald-400 text-xs flex items-center gap-1 mt-0.5">
                              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              {formatDurationSeconds(account.creditSeconds)}
                            </span>
                          </div>
                          <div>
                            <span className="text-discord-muted block text-[11px]">Tổng đóng góp</span>
                            <span className="font-bold text-amber-300 text-xs block mt-0.5">
                              {formatVnd(account.totalDonated)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                          {account.isEquipped ? (
                            <Badge variant="green" size="sm" dot>
                              Đang Đeo (1.0x)
                            </Badge>
                          ) : (
                            <Badge variant="muted" size="sm">
                              Cất Kho ({idleBurnRate}x)
                            </Badge>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTopupUserId(account.userId);
                              setIsTopupModalOpen(true);
                            }}
                            className="text-xs h-7 px-3 hover:border-amber-400"
                          >
                            Nạp Thêm
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Donator Transactions History */}
          <Card hover>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>
                  <History className="w-5 h-5 text-amber-400 inline-block mr-2" />
                  Lịch Sử Giao Dịch Gần Đây
                </CardTitle>
                <CardDescription>
                  Nhật ký nạp tiền, điều chỉnh và khấu trừ thời gian của thành viên.
                </CardDescription>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportCsv}
                disabled={loadingTx || filteredTransactions.length === 0}
                className="gap-2 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:border-amber-400 transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <Download className="w-3.5 h-3.5" />
                Xuất Báo Cáo CSV ({filteredTransactions.length})
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Toolbar Lọc Giao Dịch */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-2xl bg-black/30 border border-white/5">
                <div className="sm:col-span-5 relative">
                  <Search className="w-4 h-4 text-discord-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Tìm theo User ID, loại tác vụ, ghi chú..."
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    className="w-full bg-[#1e2029] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-discord-muted focus:outline-none focus:border-amber-500/60 transition"
                  />
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="date"
                    title="Từ ngày"
                    value={txStartDate}
                    onChange={(e) => setTxStartDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-[#1e2029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 transition"
                  />
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="date"
                    title="Đến ngày"
                    value={txEndDate}
                    onChange={(e) => setTxEndDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-[#1e2029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 transition"
                  />
                </div>

                <div className="sm:col-span-1 flex items-center justify-end">
                  {(txSearch || txStartDate || txEndDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setTxSearch('');
                        setTxStartDate('');
                        setTxEndDate('');
                      }}
                      title="Xóa bộ lọc"
                      className="p-2 rounded-xl text-discord-muted hover:text-white hover:bg-white/10 transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {loadingTx ? (
                <Skeleton className="h-20 w-full" />
              ) : rawTransactions.length === 0 ? (
                <div className="py-8 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
                  Chưa có giao dịch Donator nào phát sinh.
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-8 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
                  Không tìm thấy giao dịch nào phù hợp với điều kiện tìm kiếm/ngày đã chọn.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-left text-xs text-discord-text">
                    <thead className="bg-[#11131a] text-discord-muted uppercase text-[10px] font-extrabold tracking-wider border-b border-white/10">
                      <tr>
                        <th className="py-3.5 px-4">Thời Gian</th>
                        <th className="py-3.5 px-4">User ID</th>
                        <th className="py-3.5 px-4">Số Tiền Nạp</th>
                        <th className="py-3.5 px-4">Thời Gian Quy Đổi</th>
                        <th className="py-3.5 px-4">Loại Tác Vụ</th>
                        <th className="py-3.5 px-4">Ghi Chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3.5 px-4 text-discord-muted whitespace-nowrap">
                            {formatDateTime(tx.createdAt)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-white">
                            <UserDisplay userId={tx.userId} />
                          </td>
                          <td className="py-3.5 px-4 font-bold text-amber-400">
                            {formatVnd(tx.amountVnd)}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-emerald-400">
                            +{formatDurationSeconds(tx.creditSecondsAdded)}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="yellow" size="sm">
                              {tx.actionType}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-discord-muted italic">
                            {tx.note || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TOP-UP DONATOR TIME */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isTopupModalOpen}
        onClose={() => setIsTopupModalOpen(false)}
        title="Nạp Giờ Quỹ Donator"
        description="Quy đổi trực tiếp số tiền ủng hộ VND thành thời gian vào tài khoản thành viên."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTopupModalOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={topupMutation.isPending}
              disabled={
                !topupUserId ||
                !verifiedTopupUser ||
                topupAmountVnd <= 0 ||
                topupMutation.isPending
              }
              onClick={() => topupMutation.mutate()}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:opacity-90 border-0 font-bold"
            >
              Xác Nhận Nạp
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <UserInput
            label="Thành Viên Nhận Quỹ"
            placeholder="Nhập Discord User ID để tra cứu..."
            value={topupUserId}
            onChange={setTopupUserId}
            onVerified={setVerifiedTopupUser}
            hint="Tài khoản sẽ được tự động tra cứu và xác thực trực tiếp qua Discord Gateway."
          />

          <div className="space-y-2">
            <Input
              label="Số Tiền Ủng Hộ (VND)"
              type="number"
              step={10000}
              value={topupAmountVnd}
              onChange={(e) => setTopupAmountVnd(Number(e.target.value))}
              hint={`Số tiền hiển thị: ${formatVnd(topupAmountVnd)}`}
            />

            {/* Quick Amount Buttons */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {[50000, 100000, 200000, 500000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopupAmountVnd(amt)}
                  className="px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 hover:border-amber-400 text-xs font-medium text-white transition"
                >
                  {formatVnd(amt)}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Ghi chú giao dịch (Tùy chọn)"
            placeholder="Ví dụ: Chuyển khoản qua MoMo, ủng hộ server..."
            value={topupNote}
            onChange={(e) => setTopupNote(e.target.value)}
          />

          {/* Quick estimation formula preview */}
          {baseBenchmarkVnd > 0 && topupAmountVnd > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
              <span className="text-amber-400 font-bold block">Dự kiến thời gian cộng:</span>
              <p className="text-white font-medium">
                ≈ {formatDurationSeconds(Math.floor((topupAmountVnd / baseBenchmarkVnd) * baseBenchmarkDays * 86400))} (tính theo tỷ lệ định mức cơ sở)
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PerksPage;
