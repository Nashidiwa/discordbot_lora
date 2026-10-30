import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Flame,
  Globe,
  Hash,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trophy,
  Zap,
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
import { RoleSelect } from '../components/ui/RoleSelect';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { UserDisplay } from '../components/ui/UserDisplay';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import type { WordChainOverviewData } from '../types';

export const WordchainPage: React.FC = () => {
  const { guildId: paramGuildId } = useParams<{ guildId: string }>();
  const { selectedGuild, guilds } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const currentGuild =
    (paramGuildId ? guilds.find((g) => g.id === paramGuildId) : null) ||
    selectedGuild;
  const guildId = currentGuild?.id || paramGuildId;

  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<
    'karma' | 'score'
  >('karma');
  const [memberSearch, setMemberSearch] = useState<string>('');

  // Form states cấu hình
  const [normalChannelId, setNormalChannelId] = useState<string>('');
  const [hardChannelId, setHardChannelId] = useState<string>('');
  const [reliableRoleId, setReliableRoleId] = useState<string>('');
  const [failedRoleId, setFailedRoleId] = useState<string>('');
  const [hasInitConfig, setHasInitConfig] = useState<boolean>(false);

  // Modal Reset Session
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetTargetMode, setResetTargetMode] = useState<
    'normal' | 'hard' | 'all'
  >('all');

  // Fetch dữ liệu Wordchain (polling 5s cho live game stats)
  const { data, isLoading } = useQuery<WordChainOverviewData>({
    queryKey: ['wordchain-overview', guildId],
    queryFn: () =>
      apiFetch<WordChainOverviewData>(`/api/guilds/${guildId}/wordchain`),
    enabled: Boolean(guildId),
    refetchInterval: 5000,
  });

  // Đồng bộ form khi có dữ liệu nạp
  useEffect(() => {
    if (data?.config && !hasInitConfig) {
      setNormalChannelId(data.config.normalModeChannelId || '');
      setHardChannelId(data.config.hardModeChannelId || '');
      setReliableRoleId(data.config.reliableRoleId || '');
      setFailedRoleId(data.config.failedRoleId || '');
      setHasInitConfig(true);
    }
  }, [data?.config, hasInitConfig]);

  // Mutation cập nhật cấu hình
  const updateConfigMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/guilds/${guildId}/wordchain/config`, {
        method: 'PUT',
        body: JSON.stringify({
          normalModeChannelId: normalChannelId.trim() || null,
          hardModeChannelId: hardChannelId.trim() || null,
          reliableRoleId: reliableRoleId.trim() || null,
          failedRoleId: failedRoleId.trim() || null,
          languages: 'en',
        }),
      }),
    onSuccess: () => {
      toast.success(
        'Đã lưu cấu hình Wordchain',
        'Kênh chơi và vai trò giám sát đã được cập nhật.',
      );
      void queryClient.invalidateQueries({
        queryKey: ['wordchain-overview', guildId],
      });
    },
    onError: (err: Error) => toast.error('Lỗi lưu cấu hình', err.message),
  });

  // Mutation Reset chuỗi ván chơi
  const resetMutation = useMutation<{ message?: string }>({
    mutationFn: () =>
      apiFetch<{ message?: string }>(
        `/api/guilds/${guildId}/wordchain/reset`,
        {
          method: 'POST',
          body: JSON.stringify({ mode: resetTargetMode }),
        },
      ),
    onSuccess: (res) => {
      toast.success(
        'Reset ván chơi thành công',
        res.message || 'Chuỗi nối từ đã được đưa về trạng thái khởi đầu.',
      );
      setIsResetModalOpen(false);
      void queryClient.invalidateQueries({
        queryKey: ['wordchain-overview', guildId],
      });
    },
    onError: (err: Error) => toast.error('Lỗi reset ván chơi', err.message),
  });

  if (!guildId) {
    return (
      <div className="p-8 text-center text-discord-muted glass-panel rounded-3xl border border-white/10">
        Vui lòng chọn một Server từ thanh điều hướng phía trên để quản trị Wordchain.
      </div>
    );
  }

  const normalSession = data?.sessions.normal;
  const hardSession = data?.sessions.hard;

  // Filter members for leaderboard
  const rawList =
    activeLeaderboardTab === 'karma'
      ? data?.topKarma || []
      : data?.topScores || [];

  const filteredMembers = rawList.filter((m) =>
    m.userId.toLowerCase().includes(memberSearch.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <BookOpen className="w-6 h-6" />
            </span>
            Wordchain Game & Karma Engine
          </h1>
          <p className="text-xs text-discord-muted mt-1 max-w-2xl">
            Trò chơi nối từ thời gian thực với bộ thẩm định từ điển 3 tầng, hệ số điểm Karma hợp tác chống spam hậu tố (DEC-007) và kiểm soát vai trò Reliable / Failed (DEC-008).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setResetTargetMode('all');
              setIsResetModalOpen(true);
            }}
            className="gap-2 text-xs border-red-500/30 hover:border-red-500 font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Ván Chơi Kẹt
          </Button>
        </div>
      </div>

      {/* Live Game HUD - 2 Chế Độ Chơi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Normal Mode HUD */}
        <Card hover className="relative overflow-hidden border-emerald-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-emerald-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Chế Độ Thường (1 Ký Tự)
              </CardTitle>
              <CardDescription>
                Nối tiếp ký tự cuối cùng của từ liền trước.
              </CardDescription>
            </div>
            <Badge variant="green" size="sm">
              Normal
            </Badge>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-bold text-discord-muted uppercase tracking-wider mb-1">
                    Từ Đang Chờ Nối Tiếp
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-300 tracking-wider">
                    {normalSession?.currentWord ? (
                      `"${normalSession.currentWord}"`
                    ) : (
                      <span className="text-discord-muted text-base italic">
                        (Chưa có từ nào - Bắt đầu bằng bất kỳ từ nào)
                      </span>
                    )}
                  </div>
                  {normalSession?.lastMemberId && (
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-discord-muted mt-2">
                      <span>Người vừa nối:</span>
                      <UserDisplay userId={normalSession.lastMemberId} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[10px] text-discord-muted block">
                      Chuỗi Hiện Tại
                    </span>
                    <span className="text-lg font-black text-white">
                      {normalSession?.currentCount ?? 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[10px] text-discord-muted block">
                      Kỷ Lục Cao Nhất
                    </span>
                    <span className="text-lg font-black text-amber-400 flex items-center justify-center gap-1">
                      <Trophy className="w-3.5 h-3.5 inline" />
                      {normalSession?.highScore ?? 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[10px] text-discord-muted block">
                      Từ Đã Sử Dụng
                    </span>
                    <span className="text-lg font-black text-emerald-400">
                      {normalSession?.usedWordsCount ?? 0}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Hard Mode HUD */}
        <Card hover className="relative overflow-hidden border-purple-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-purple-400 flex items-center gap-2">
                <Flame className="w-4 h-4 text-purple-400" />
                Chế Độ Nâng Cao (2 Ký Tự)
              </CardTitle>
              <CardDescription>
                Nối tiếp 2 ký tự cuối cùng của từ liền trước (Hard Mode).
              </CardDescription>
            </div>
            <Badge variant="purple" size="sm">
              Hard
            </Badge>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-bold text-discord-muted uppercase tracking-wider mb-1">
                    Từ Đang Chờ Nối Tiếp (2 Token)
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-purple-300 tracking-wider">
                    {hardSession?.currentWord ? (
                      `"${hardSession.currentWord}"`
                    ) : (
                      <span className="text-discord-muted text-base italic">
                        (Chưa có từ nào - Bắt đầu bằng bất kỳ từ nào)
                      </span>
                    )}
                  </div>
                  {hardSession?.lastMemberId && (
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-discord-muted mt-2">
                      <span>Người vừa nối:</span>
                      <UserDisplay userId={hardSession.lastMemberId} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[10px] text-discord-muted block">
                      Chuỗi Hiện Tại
                    </span>
                    <span className="text-lg font-black text-white">
                      {hardSession?.currentCount ?? 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[10px] text-discord-muted block">
                      Kỷ Lục Cao Nhất
                    </span>
                    <span className="text-lg font-black text-amber-400 flex items-center justify-center gap-1">
                      <Trophy className="w-3.5 h-3.5 inline" />
                      {hardSession?.highScore ?? 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[10px] text-discord-muted block">
                      Từ Đã Sử Dụng
                    </span>
                    <span className="text-lg font-black text-purple-400">
                      {hardSession?.usedWordsCount ?? 0}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cấu Hình Kênh Chơi & Vai Trò Thưởng/Phạt */}
      <Card hover>
        <CardHeader>
          <CardTitle>
            <Hash className="w-5 h-5 text-emerald-400 inline-block mr-2" />
            Thiết Lập Kênh Chơi & Phân Vai Trò
          </CardTitle>
          <CardDescription>
            Chỉ định phòng chơi chuyên biệt và cấp tự động vai trò danh dự Reliable hoặc cảnh báo Failed.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChannelSelect
              label="Kênh Chơi Chế Độ Thường (Normal)"
              placeholder="Chọn kênh Normal Mode..."
              value={normalChannelId || null}
              onChange={(val) => setNormalChannelId(val || '')}
              guildId={guildId}
              channelTypes={['TEXT']}
              hint="Kênh văn bản dành cho Normal Mode (nối 1 ký tự)."
            />

            <ChannelSelect
              label="Kênh Chơi Chế Độ Khó (Hard)"
              placeholder="Chọn kênh Hard Mode..."
              value={hardChannelId || null}
              onChange={(val) => setHardChannelId(val || '')}
              guildId={guildId}
              channelTypes={['TEXT']}
              hint="Kênh văn bản dành cho Hard Mode (nối 2 ký tự)."
            />

            <RoleSelect
              label="Vai Trò Thành Viên Uy Tín (Reliable Role)"
              placeholder="Chọn vai trò Reliable..."
              value={reliableRoleId || null}
              onChange={(val) => setReliableRoleId(val || '')}
              guildId={guildId}
              hint="Tự động trao khi đạt chuỗi đóng góp chuẩn xác cao (DEC-008)."
            />

            <RoleSelect
              label="Vai Trò Cảnh Báo Phá Chuỗi (Failed Role)"
              placeholder="Chọn vai trò Failed..."
              value={failedRoleId || null}
              onChange={(val) => setFailedRoleId(val || '')}
              guildId={guildId}
              hint="Tự động gán cho thành viên vừa phá chuỗi ván chơi."
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span className="text-discord-muted">
                Ngôn ngữ từ điển đang áp dụng:
              </span>
              <Badge variant="blurple" size="sm">
                English (en) - Leipzig Wortschatz
              </Badge>
            </div>
            <span className="text-[11px] text-discord-muted">
              Chuẩn 3 tầng Lexicon: RAM → DB Cache → Wiktionary Fallback
            </span>
          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => updateConfigMutation.mutate()}
              isLoading={updateConfigMutation.isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              <Save className="w-4 h-4" />
              Lưu Cấu Hình Wordchain
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bảng Xếp Hạng Karma & Thành Tích Cá Nhân */}
      <Card hover>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>
              <Trophy className="w-5 h-5 text-amber-400 inline-block mr-2" />
              Bảng Xếp Hạng & Chỉ Số Karma Thành Viên
            </CardTitle>
            <CardDescription>
              Theo dõi độ uy tín (Karma) và tổng điểm thành tích đóng góp cho máy chủ.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab switch */}
            <div className="flex bg-[#11131a] p-1 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveLeaderboardTab('karma')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5',
                  activeLeaderboardTab === 'karma'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-discord-muted hover:text-white',
                )}
              >
                <Award className="w-3.5 h-3.5" />
                Độ Uy Tín (Karma)
              </button>
              <button
                type="button"
                onClick={() => setActiveLeaderboardTab('score')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5',
                  activeLeaderboardTab === 'score'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-discord-muted hover:text-white',
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                Tổng Điểm (Score)
              </button>
            </div>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-discord-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm User ID..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full bg-[#1e2029] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-discord-muted focus:outline-none focus:border-emerald-500/60 transition"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : filteredMembers.length === 0 ? (
            <div className="py-8 text-center text-discord-muted text-xs bg-black/20 rounded-2xl border border-white/5">
              Chưa có dữ liệu thành viên tham gia Wordchain nào.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-discord-text">
                <thead className="bg-[#11131a] text-discord-muted uppercase text-[10px] font-extrabold tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4">Thứ Hạng</th>
                    <th className="py-3.5 px-4">User ID</th>
                    <th className="py-3.5 px-4">Điểm Karma</th>
                    <th className="py-3.5 px-4">Tổng Điểm</th>
                    <th className="py-3.5 px-4">Từ Hợp Lệ</th>
                    <th className="py-3.5 px-4">Lỗi Phá Chuỗi</th>
                    <th className="py-3.5 px-4">Tỷ Lệ Chuẩn Xác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredMembers.map((member, index) => {
                    const totalInputs =
                      member.correctInputs + member.wrongInputs;
                    const accuracy =
                      totalInputs > 0
                        ? Math.round(
                            (member.correctInputs / totalInputs) * 100,
                          )
                        : 0;

                    return (
                      <tr
                        key={member.userId}
                        className="hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="py-3.5 px-4 font-bold">
                          {index === 0 ? (
                            <span className="text-amber-400 flex items-center gap-1 font-black">
                              🥇 #1
                            </span>
                          ) : index === 1 ? (
                            <span className="text-slate-300 flex items-center gap-1 font-black">
                              🥈 #2
                            </span>
                          ) : index === 2 ? (
                            <span className="text-amber-600 flex items-center gap-1 font-black">
                              🥉 #3
                            </span>
                          ) : (
                            <span className="text-discord-muted">
                              #{index + 1}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-white">
                          <UserDisplay userId={member.userId} />
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'font-black font-mono px-2 py-0.5 rounded-lg border text-xs',
                              member.karma >= 0
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400',
                            )}
                          >
                            {member.karma > 0 ? `+${member.karma.toFixed(1)}` : member.karma.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-400 font-mono">
                          {member.score.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-emerald-400">
                          {member.correctInputs} từ
                        </td>
                        <td className="py-3.5 px-4 font-medium text-red-400">
                          {member.wrongInputs} lần
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  accuracy >= 80
                                    ? 'bg-emerald-400'
                                    : accuracy >= 50
                                      ? 'bg-amber-400'
                                      : 'bg-red-400',
                                )}
                                style={{ width: `${accuracy}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-discord-muted">
                              {accuracy}%
                            </span>
                          </div>
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

      {/* Modal: Xác Nhận Reset Ván Chơi */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Xác Nhận Reset Ván Chơi Nối Từ"
        description="Đưa chuỗi nối từ về 0 và dọn dẹp bộ nhớ các từ đã sử dụng."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsResetModalOpen(false)}
            >
              Hủy Bỏ
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
              className="font-bold"
            >
              Xác Nhận Reset
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <p className="leading-relaxed">
              Hành động này sẽ xóa toàn bộ danh sách các từ đã được người chơi nối trong ván hiện tại, đồng thời đưa số đếm chuỗi về 0 để mở khóa ván mới. Điểm Karma và Score cá nhân của người chơi sẽ được bảo toàn nguyên vẹn.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-discord-text uppercase tracking-wider">
              Chọn Chế Độ Cần Reset
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setResetTargetMode('normal')}
                className={cn(
                  'p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1',
                  resetTargetMode === 'normal'
                    ? 'border-emerald-500 bg-emerald-500/20 text-white'
                    : 'border-white/10 bg-black/30 text-discord-muted hover:border-white/30',
                )}
              >
                <span>Chế Độ Thường</span>
                <span className="text-[10px] font-normal">(1 Ký Tự)</span>
              </button>

              <button
                type="button"
                onClick={() => setResetTargetMode('hard')}
                className={cn(
                  'p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1',
                  resetTargetMode === 'hard'
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-white/10 bg-black/30 text-discord-muted hover:border-white/30',
                )}
              >
                <span>Chế Độ Khó</span>
                <span className="text-[10px] font-normal">(2 Ký Tự)</span>
              </button>

              <button
                type="button"
                onClick={() => setResetTargetMode('all')}
                className={cn(
                  'p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1',
                  resetTargetMode === 'all'
                    ? 'border-red-500 bg-red-500/20 text-white'
                    : 'border-white/10 bg-black/30 text-discord-muted hover:border-white/30',
                )}
              >
                <span>Cả 2 Chế Độ</span>
                <span className="text-[10px] font-normal">(Toàn Bộ)</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WordchainPage;
