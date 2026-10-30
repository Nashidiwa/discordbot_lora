import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  Headphones,
  Radio,
  RefreshCw,
  Wifi,
  Zap,
} from 'lucide-react';
import { apiFetch } from '../api/client';
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
import { Switch } from '../components/ui/Switch';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { cn, formatDateTime } from '../lib/utils';
import type { VoiceStatus } from '../types';

export const VoiceKeeperPage: React.FC = () => {
  const { guildId: paramGuildId } = useParams<{ guildId: string }>();
  const { selectedGuild, guilds } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const currentGuild =
    (paramGuildId ? guilds.find((g) => g.id === paramGuildId) : null) ||
    selectedGuild;
  const guildId = currentGuild?.id || paramGuildId;

  const [channelId, setChannelId] = useState<string>('');
  const [selfDeaf, setSelfDeaf] = useState<boolean>(true);
  const [selfMute, setSelfMute] = useState<boolean>(true);
  const [autoReconnect, setAutoReconnect] = useState<boolean>(true);
  const [isStopModalOpen, setIsStopModalOpen] = useState<boolean>(false);

  // Lấy trạng thái Voice Keeper
  const { data: statusData, isLoading: loadingStatus } = useQuery({
    queryKey: ['voice-keeper', guildId],
    queryFn: () =>
      apiFetch<{ status: VoiceStatus }>(`/api/guilds/${guildId}/voice-keeper`),
    enabled: Boolean(guildId),
  });

  // Đồng bộ form với cấu hình hiện tại khi nạp xong
  useEffect(() => {
    if (statusData?.status) {
      if (statusData.status.channelId) {
        setChannelId(statusData.status.channelId);
      }
      setSelfDeaf(statusData.status.selfDeaf);
      setSelfMute(statusData.status.selfMute);
      setAutoReconnect(statusData.status.autoReconnect);
    }
  }, [statusData]);

  // Lắng nghe SSE
  useEffect(() => {
    if (!guildId) return;

    const eventSource = new EventSource(`/api/sse/guilds/${guildId}`, {
      withCredentials: true,
    });

    eventSource.addEventListener('voice:status', () => {
      void queryClient.invalidateQueries({ queryKey: ['voice-keeper', guildId] });
    });

    return () => {
      eventSource.close();
    };
  }, [guildId, queryClient]);

  // Mutations
  const setMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/guilds/${guildId}/voice-keeper/set`, {
        method: 'POST',
        body: JSON.stringify({ channelId, selfDeaf, selfMute, autoReconnect }),
      }),
    onSuccess: () => {
      toast.success(
        'Đã cập nhật Voice Keeper',
        'Bot đã nhận chỉ thị kết nối và áp dụng cấu hình giữ kênh 24/7.',
      );
      void queryClient.invalidateQueries({ queryKey: ['voice-keeper', guildId] });
    },
    onError: (err: Error) => {
      toast.error('Lỗi thiết lập Voice Keeper', err.message);
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/guilds/${guildId}/voice-keeper/reconnect`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast.info(
        'Kích hoạt Reconnect',
        'Hệ thống đang ngắt và tái lập kết nối thoại sạch mới.',
      );
      void queryClient.invalidateQueries({ queryKey: ['voice-keeper', guildId] });
    },
    onError: (err: Error) => {
      toast.error('Lỗi khi reconnect', err.message);
    },
  });

  const stopMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/guilds/${guildId}/voice-keeper/stop`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast.warning(
        'Đã dừng Voice Keeper',
        'Bot đã rời kênh thoại và tắt cơ chế auto-reconnect.',
      );
      setIsStopModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['voice-keeper', guildId] });
    },
    onError: (err: Error) => {
      toast.error('Lỗi khi dừng Voice Keeper', err.message);
    },
  });

  if (!guildId) {
    return (
      <div className="p-8 text-center text-discord-muted glass-panel rounded-3xl border border-white/10">
        Vui lòng chọn một Server từ thanh điều hướng phía trên để quản lý Voice Keeper.
      </div>
    );
  }

  const currentStatus = statusData?.status?.status || 'IDLE';

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-extrabold text-xs border border-emerald-500/30 shadow-lg shadow-emerald-500/15">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ĐANG HOẠT ĐỘNG (READY)
          </span>
        );
      case 'CONNECTING':
      case 'RECONNECTING':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-300 font-extrabold text-xs border border-yellow-500/30">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ĐANG PHỤC HỒI KẾT NỐI
          </span>
        );
      case 'DISCONNECTED':
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 text-red-400 font-extrabold text-xs border border-red-500/30">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            MẤT TÍN HIỆU
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-discord-muted font-bold text-xs border border-white/10">
            CHƯA KÍCH HOẠT
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-5xl select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 text-[#0c0d12] flex items-center justify-center font-black shadow-lg shadow-cyan-500/25">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Voice Keeper 24/7
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Audio Engine
                </span>
              </h1>
              <p className="text-xs text-discord-muted mt-0.5">
                Duy trì kết nối thoại liên tục 24/7 với Watchdog phục hồi 3 tầng và Circuit Breaker.
              </p>
            </div>
          </div>
        </div>

        <div>{loadingStatus ? <Skeleton className="h-8 w-36" /> : getStatusBadge()}</div>
      </div>

      {/* Cyber Soundboard Hero Card with 12-Bar Equalizer */}
      <Card hover className="p-6 sm:p-8 relative overflow-hidden">
        {/* Glow ambient background */}
        {currentStatus === 'READY' && (
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Status & 12-Bar Equalizer (col-span-7) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Radio className="w-7 h-7" />
                </div>
                {currentStatus === 'READY' && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#12141c] animate-ping" />
                )}
              </div>

              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-cyan-400 block">
                  Phòng thoại được gán
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {statusData?.status?.channelName || 'Chưa thiết lập phòng thoại'}
                </h3>
                <p className="text-xs text-discord-muted font-mono mt-0.5">
                  ID: {statusData?.status?.channelId || 'N/A'}
                </p>
              </div>
            </div>

            {/* 12-Bar Audio Equalizer */}
            <div className="p-4 rounded-2xl bg-[#0c0d12]/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-discord-muted font-medium flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Luồng âm thanh thời gian thực (Audio Stream):
                </span>
                <span className="font-mono text-cyan-400 text-[11px] font-bold">
                  {currentStatus === 'READY' ? '48kHz Stereo' : 'Offline'}
                </span>
              </div>

              {/* Equalizer Bars Container */}
              <div className="flex items-end justify-between h-9 px-2 pt-1 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'w-full max-w-[12px] rounded-full transition-all duration-300',
                      currentStatus === 'READY'
                        ? `bg-gradient-to-t from-cyan-500 to-emerald-400 animate-eq-${idx}`
                        : 'h-1 bg-white/10',
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Telemetry HUD Grid (col-span-5) */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#0c0d12]/90 border border-white/10 text-xs">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[10px] text-discord-muted uppercase font-bold flex items-center gap-1">
                <Wifi className="w-3 h-3 text-cyan-400" />
                Độ trễ Voice
              </span>
              <span className="text-base font-extrabold text-white block">
                {statusData?.status?.ping ? `${statusData.status.ping} ms` : 'N/A'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[10px] text-discord-muted uppercase font-bold flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-yellow-400" />
                Watchdog Retry
              </span>
              <span className="text-base font-extrabold text-white block">
                {statusData?.status?.reconnectAttempts ?? 0} lần
              </span>
            </div>

            <div className="col-span-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[10px] text-discord-muted uppercase font-bold block">
                Phiên kết nối gần nhất
              </span>
              <span className="text-xs font-semibold text-white block truncate">
                {formatDateTime(statusData?.status?.lastConnectedAt)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Settings Card */}
      <Card hover>
        <CardHeader>
          <CardTitle>
            <Zap className="w-5 h-5 text-cyan-400" />
            Cấu Hình Kênh Thoại & Tối Ưu Băng Thông
          </CardTitle>
          <CardDescription>
            Tùy biến chế độ tiết kiệm tài nguyên mạng và thuật toán tự phục hồi kết nối.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Channel Selector with ChannelSelect Component */}
          <ChannelSelect
            label="Chọn Kênh Cố Định (Voice / Stage Channel)"
            placeholder="Chọn kênh thoại cần giữ 24/7..."
            value={channelId || null}
            onChange={(val) => setChannelId(val || '')}
            guildId={guildId}
            channelTypes={['VOICE', 'STAGE']}
            hint="Chỉ định kênh thoại bot sẽ kết nối và duy trì tự động phục hồi 24/7."
          />

          {/* 3 Switches */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Switch
              checked={selfDeaf}
              onChange={setSelfDeaf}
              label="Self-Deaf (Điếc)"
              description="Tắt nhận âm thanh để tiết kiệm tối đa băng thông đường truyền."
            />
            <Switch
              checked={selfMute}
              onChange={setSelfMute}
              label="Self-Mute (Câm)"
              description="Tắt micro bot nhằm đảm bảo tính bảo mật riêng tư cho phòng thoại."
            />
            <Switch
              checked={autoReconnect}
              onChange={setAutoReconnect}
              label="Auto-Reconnect"
              description="Kích hoạt cơ chế Circuit Breaker tự kết nối lại khi bot gặp sự cố rớt mạng."
            />
          </div>

          {/* Action Hub */}
          <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-white/[0.06]">
            <Button
              variant="primary"
              size="md"
              onClick={() => setMutation.mutate()}
              isLoading={setMutation.isPending}
              disabled={!channelId || setMutation.isPending}
              className="text-xs font-bold bg-gradient-to-r from-cyan-500 to-emerald-400 text-[#0c0d12] hover:opacity-90 border-0"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Lưu & Khởi Động Giữ Kênh
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => reconnectMutation.mutate()}
              isLoading={reconnectMutation.isPending}
              className="text-xs font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Buộc Reconnect Ngay
            </Button>

            <Button
              variant="destructive"
              size="md"
              onClick={() => setIsStopModalOpen(true)}
              disabled={stopMutation.isPending}
              className="text-xs font-bold ml-auto"
            >
              Dừng Giữ Kênh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isStopModalOpen}
        onClose={() => setIsStopModalOpen(false)}
        title="Xác nhận dừng giữ kênh 24/7"
        description="Thao tác này sẽ ngắt kết nối bot khỏi phòng thoại ngay lập tức và vô hiệu hóa tính năng auto-reconnect cho máy chủ này."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsStopModalOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={stopMutation.isPending}
              onClick={() => stopMutation.mutate()}
            >
              Đồng ý Dừng
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-discord-muted">
          <p>
            Máy chủ đang lưu cấu hình: <strong className="text-white">{statusData?.status?.channelName || channelId}</strong>
          </p>
          <p>
            Bạn có thể bật lại tính năng bất kỳ lúc nào bằng cách chọn lại kênh và nhấn <strong className="text-white">Lưu & Khởi Động Giữ Kênh</strong>.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default VoiceKeeperPage;
