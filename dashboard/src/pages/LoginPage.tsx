import React from 'react';
import { CheckCircle2, Radio, Shield, Sparkles } from 'lucide-react';
import { AmbientBackground } from '../components/layout/AmbientBackground';
import { Button } from '../components/ui/Button';

export const LoginPage: React.FC = () => {
  const handleLogin = () => {
    window.location.href = '/api/auth/discord';
  };

  const features = [
    {
      icon: <Shield className="w-5 h-5 text-discord-blurple shrink-0" />,
      title: 'Phân quyền Custom Permit',
      desc: 'Ủy quyền độc lập chuẩn Wickbot, không phụ thuộc Discord admin roles.',
    },
    {
      icon: <Radio className="w-5 h-5 text-emerald-400 shrink-0" />,
      title: 'Voice Keeper 24/7 Trực quan',
      desc: 'Duy trì kết nối thoại liên tục với Equalizer âm thanh và tự phục hồi 3 tầng.',
    },
    {
      icon: <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />,
      title: 'Đặc quyền Perks & Quỹ Thời Gian',
      desc: 'Tự động hóa Custom Role Gradient 2 màu và Donator Time-Bank.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#08090d] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Dynamic Ambient Background Engine */}
      <AmbientBackground />

      {/* Main Glass Card */}
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 text-center space-y-8 border-white/10">
        {/* Bot Logo & Title */}
        <div className="space-y-4">
          <div className="relative inline-block">
            <img
              src="/lora_icon_badge.png"
              alt="Lora Engine"
              className="w-20 h-20 rounded-3xl object-contain mx-auto shadow-2xl shadow-discord-blurple/40 ring-4 ring-white/10"
            />
            <span
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 border-4 border-[#0c0d12] flex items-center justify-center"
              title="Hệ thống Online"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              Lora Control Panel
            </h1>
            <p className="text-xs sm:text-sm text-discord-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
              Bảng điều khiển quản trị trực quan thế hệ mới dành cho Quản trị viên và Chủ máy chủ Discord.
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="space-y-3 text-left">
          {features.map((f, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#0c0d12]/70 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                {f.icon}
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs sm:text-sm font-bold text-white truncate">
                  {f.title}
                </div>
                <div className="text-[11px] sm:text-xs text-discord-muted leading-relaxed">
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Login Button */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={handleLogin}
            size="lg"
            className="w-full h-14 rounded-2xl text-base font-extrabold shadow-xl shadow-discord-blurple/30 flex items-center justify-center gap-3 bg-gradient-to-r from-discord-blurple to-[#4752c4] hover:opacity-95 border-0"
          >
            <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z" />
            </svg>
            <span>Đăng nhập với Discord</span>
          </Button>

          <p className="text-[11px] text-discord-muted flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Xác thực an toàn qua Discord OAuth2. Không lưu trữ thông tin mật khẩu.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
