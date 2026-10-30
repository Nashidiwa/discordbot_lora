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
import { cn, formatDateTime } from '../lib/utils';
import type {
  DiscordUserInfo,
  SwarmGlobalOverviewData,
  SwarmMemberMetadata,
} from '../types';

export const GlobalSwarmPage: React.FC = () => {
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
        queryKey: ['swarm-global-overview'],
      });
    },
    onError: (err: Error) => toast.error('Lỗi gán cấp bậc', err.message),
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
        'Ủy quyền thành công!',
        `Đã cấp quyền Delegated Operator cho người dùng ${newOperatorId}.`,
      );
      setNewOperatorId('');
      void queryClient.invalidateQueries({
        queryKey: ['swarm-global-overview'],
      });
    },
    onError: (err: Error) => toast.error('Lỗi ủy quyền Operator', err.message),
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
        'Đã gỡ bỏ quyền Delegated Operator thành công.',
      );
      void queryClient.invalidateQueries({
        queryKey: ['swarm-global-overview'],
      });
    },
    onError: (err: Error) =>
      toast.error('Lỗi thu hồi quyền Operator', err.message),
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

  if (!canAccessGlobal) {
    return (
      <div className="p-8 text-center text-discord-muted glass-panel rounded-3xl border border-white/10 space-y-3">
        <Shield className="w-10 h-10 text-discord-red mx-auto" />
        <h3 className="text-base font-bold text-white">Truy Cập Bị Giới Hạn</h3>
        <p className="text-xs text-discord-muted max-w-md mx-auto">
          Bảng điều khiển The Swarm Cấp Ứng Dụng chỉ dành riêng cho Bot Owner hoặc
          Delegated Operator được ủy quyền.
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
                <Globe className="w-6 h-6" />
              </span>
              The Swarm Toàn Cầu (Global)
            </h1>

            <Badge variant="purple" size="sm">
              Application Scope
            </Badge>

            {isBotOwner ? (
              <Badge variant="yellow" size="sm">
                Bot Owner
              </Badge>
            ) : (
              <Badge variant="blurple" size="sm">
                Delegated Operator
              </Badge>
            )}
          </div>

          <p className="text-xs text-discord-muted mt-1 max-w-2xl">
            Quản trị mạng lưới vai trò liên kết Discord OAuth2 cấp Ứng Dụng. Dữ
            liệu <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">swarm_level</code>{' '}
            có hiệu lực toàn cầu trên mọi máy chủ bot có mặt.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyVerificationUrl}
            className="gap-2 text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
          >
            <Copy className="w-3.5 h-3.5" />
            Sao chép Verification URL
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
            Gán Cấp Bậc Toàn Cầu
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
                Thành Viên Liên Kết Toàn Cầu
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
                Người Vận Hành (Operators)
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
                Server Đã Bật Thông Báo
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
                Phân Bổ Danh Hiệu Toàn Mạng Lưới (The Swarm I → VIII)
              </CardTitle>
              <CardDescription>
                Tổng số thành viên sở hữu từng cấp độ trên toàn bộ hệ thống bot.
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

        {/* Cột 2: Danh Sách Máy Chủ Đã Bật Kênh Thông Báo */}
        <div className="lg:col-span-5 space-y-4">
          <Card hover>
            <CardHeader>
              <CardTitle>
                <Server className="w-5 h-5 text-indigo-400 inline-block mr-2" />
                Máy Chủ Cấu Hình Thông Báo
              </CardTitle>
              <CardDescription>
                Các máy chủ đã cấu hình kênh phát thông báo chúc mừng thăng cấp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-36 w-full" />
              ) : !data?.guildConfigs || data.guildConfigs.length === 0 ? (
                <div className="py-6 text-center text-xs text-discord-muted bg-black/20 rounded-2xl border border-white/5">
                  Chưa có máy chủ nào thiết lập kênh thông báo.
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
                          Tắt
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
                Quản Lý Người Vận Hành (Delegated Operators)
              </CardTitle>
              {isBotOwner ? (
                <Badge variant="yellow" size="sm">
                  Bot Owner
                </Badge>
              ) : (
                <Badge variant="purple" size="sm">
                  Operator Scope
                </Badge>
              )}
            </div>
            <CardDescription>
              Những nhân sự được ủy quyền gán hoặc thu hồi cấp bậc The Swarm trên toàn bộ hệ thống bot.
            </CardDescription>
          </div>

          {/* Ô Thêm Operator chỉ hiển thị nếu là Bot Owner */}
          {isBotOwner && (
            <div className="flex items-center gap-2 max-w-sm w-full">
              <div className="flex-1">
                <UserInput
                  placeholder="Nhập User ID để tra cứu..."
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
                Ủy Quyền
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {!data?.operators || data.operators.length === 0 ? (
            <div className="py-6 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
              Chưa có Delegated Operator nào được chỉ định. Hiện tại chỉ có duy nhất Bot Owner có thẩm quyền điều chỉnh cấp độ.
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
                      Bổ nhiệm bởi{' '}
                      <UserDisplay userId={op.addedBy} showAvatar={false} /> •{' '}
                      {formatDateTime(op.createdAt)}
                    </div>
                  </div>

                  {isBotOwner && (
                    <button
                      type="button"
                      title="Thu hồi quyền Operator"
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
                Toàn Bộ Thành Viên The Swarm ({allMembers.length})
              </CardTitle>
              <Badge variant="purple" size="sm">
                Xếp từ Bậc 8 → 0
              </Badge>
            </div>
            <CardDescription>
              Nhật ký gán và thu hồi cấp độ The Swarm trên toàn bộ hệ thống ứng dụng.
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-discord-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo User ID, Level..."
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
              Chưa có thành viên nào được cấp quyền hoặc khớp với bộ lọc tìm kiếm.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-discord-text">
                <thead className="bg-[#11131a] text-discord-muted uppercase text-[10px] font-extrabold tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4">User ID</th>
                    <th className="py-3.5 px-4">Cấp Bậc Toàn Cầu</th>
                    <th className="py-3.5 px-4">Người Cập Nhật</th>
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
                          Điều Chỉnh
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
        title="Gán Cấp Bậc The Swarm Cấp Ứng Dụng"
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
    </div>
  );
};

export default GlobalSwarmPage;
