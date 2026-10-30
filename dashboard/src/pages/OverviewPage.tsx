import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen,
  Gift,
  Layers,
  Radio,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

export const OverviewPage: React.FC = () => {
  const { guildId: paramGuildId } = useParams<{ guildId: string }>();
  const { selectedGuild, guilds } = useAuth();
  const navigate = useNavigate();

  const currentGuild =
    (paramGuildId ? guilds.find((g) => g.id === paramGuildId) : null) ||
    selectedGuild;
  const guildId = currentGuild?.id || paramGuildId || '';

  return (
    <div className="space-y-8 select-none max-w-6xl">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Bảng Điều Khiển Máy Chủ
            </h1>
            <Badge variant="blurple" size="md">
              Guild Space
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-discord-muted">
            Quản lý vận hành và cấu hình các phân hệ dịch vụ cho:{' '}
            <strong className="text-white">
              {currentGuild?.name || 'Chưa chọn máy chủ'}
            </strong>
          </p>
        </div>

        {currentGuild && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-discord-muted">Thẩm quyền của bạn:</span>
            <Badge variant="green" size="md" dot>
              {currentGuild.roleTier}
            </Badge>
          </div>
        )}
      </div>

      {/* Guild Identity Spotlight Card */}
      {currentGuild ? (
        <Card hover className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-discord-blurple/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-5 relative z-10">
            {currentGuild.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png?size=128`}
                alt={currentGuild.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl object-cover ring-2 ring-discord-blurple/50 shadow-2xl shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-discord-blurple/20 text-discord-blurple font-black text-2xl flex items-center justify-center shadow-xl shrink-0">
                {currentGuild.name.charAt(0)}
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {currentGuild.name}
                </h3>
                <Badge variant="blurple" size="sm">ID: {currentGuild.id}</Badge>
              </div>
              <p className="text-xs text-discord-muted flex items-center gap-3">
                <span>
                  Thẩm quyền:{' '}
                  <strong className="text-emerald-400">
                    {currentGuild.roleTier}
                  </strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {currentGuild.memberCount} thành viên
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate(`/dashboard/guilds/${guildId}/permits`)}
              className="flex-1 md:flex-none text-xs font-bold"
            >
              Phân quyền Permit
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(`/dashboard/guilds/${guildId}/perks`)}
              className="flex-1 md:flex-none text-xs font-bold"
            >
              Quản lý Perks
            </Button>
          </div>
        </Card>
      ) : (
        <div className="p-8 text-center glass-panel rounded-3xl text-discord-muted text-sm border border-white/10">
          Vui lòng chọn một máy chủ từ thanh điều hướng phía trên để truy cập bảng điều khiển.
        </div>
      )}

      {/* 5 Core Feature Modules Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-discord-muted flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-discord-blurple" />
            <span>Phân hệ tính năng của máy chủ</span>
          </h2>
          <span className="text-xs text-discord-muted">5 phân hệ khả dụng</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Module 1: Permit RBAC */}
          <Card hover className="flex flex-col justify-between group">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30 shadow-lg shadow-purple-500/20">
                  <Shield className="w-6 h-6" />
                </div>
                <Badge variant="muted" size="sm">4 Tầng RBAC</Badge>
              </div>
              <CardTitle className="text-purple-300">Phân quyền (Permit)</CardTitle>
              <CardDescription>
                Hệ thống phân quyền ủy thác 4 tầng độc lập chuẩn Wickbot (Co-Owner, Trusted Admin, Custom Bitfield Grants).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/guilds/${guildId}/permits`)}
                className="w-full text-xs font-semibold hover:border-purple-400/80 hover:text-purple-300 transition"
              >
                Phân quyền Permit
              </Button>
            </CardContent>
          </Card>

          {/* Module 2: Perks Management */}
          <Card hover className="flex flex-col justify-between group">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-500/20">
                  <Gift className="w-6 h-6" />
                </div>
                <Badge variant="muted" size="sm">Booster & Donator</Badge>
              </div>
              <CardTitle className="text-amber-300">Quản lý Đặc quyền</CardTitle>
              <CardDescription>
                Hệ thống Custom Role Gradient 2 màu cho Server Booster và mô hình Quỹ Thời Gian Donator Time-Bank.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/guilds/${guildId}/perks`)}
                className="w-full text-xs font-semibold hover:border-amber-400/80 hover:text-amber-300 transition"
              >
                Quản trị Đặc quyền
              </Button>
            </CardContent>
          </Card>

          {/* Module 3: Voice Keeper */}
          <Card hover className="flex flex-col justify-between group">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
                  <Radio className="w-6 h-6" />
                </div>
                <Badge variant="muted" size="sm">24/7 Engine</Badge>
              </div>
              <CardTitle className="text-cyan-300">Voice Keeper 24/7</CardTitle>
              <CardDescription>
                Duy trì bot trong phòng thoại liên tục với bộ giải mã âm thanh Equalizer và Watchdog tự phục hồi kết nối 3 tầng.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/guilds/${guildId}/voice-keeper`)}
                className="w-full text-xs font-semibold hover:border-cyan-400/80 hover:text-cyan-300 transition"
              >
                Cấu hình Voice Keeper
              </Button>
            </CardContent>
          </Card>

          {/* Module 4: Wordchain Game */}
          <Card hover className="flex flex-col justify-between group">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                  <BookOpen className="w-6 h-6" />
                </div>
                <Badge variant="muted" size="sm">2 Chế Độ Chơi</Badge>
              </div>
              <CardTitle className="text-emerald-300">Wordchain Engine</CardTitle>
              <CardDescription>
                Theo dõi Live HUD nối từ 2 chế độ (Thường & Khó), thiết lập phòng chơi và Bảng Vàng Karma thành viên.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/guilds/${guildId}/wordchain`)}
                className="w-full text-xs font-semibold hover:border-emerald-400/80 hover:text-emerald-300 transition"
              >
                Vào Wordchain Game
              </Button>
            </CardContent>
          </Card>

          {/* Module 5: The Swarm Linked Roles */}
          <Card hover className="flex flex-col justify-between group">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/20">
                  <Layers className="w-6 h-6" />
                </div>
                <Badge variant="muted" size="sm">8 Linked Roles</Badge>
              </div>
              <CardTitle className="text-indigo-300">The Swarm Linked</CardTitle>
              <CardDescription>
                Xem danh sách thành viên trong server đã kết nối 8 bậc danh hiệu The Swarm qua Discord OAuth2.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/guilds/${guildId}/swarm`)}
                className="w-full text-xs font-semibold hover:border-indigo-400/80 hover:text-indigo-300 transition"
              >
                Quản trị The Swarm
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default OverviewPage;
