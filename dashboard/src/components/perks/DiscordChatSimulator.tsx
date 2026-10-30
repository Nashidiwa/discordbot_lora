import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { CustomRolePerk } from '../../types';

interface DiscordChatSimulatorProps {
  activeRole: CustomRolePerk | null;
  className?: string;
}

export function normalizeHexColor(
  color: string | number | null | undefined,
  fallback = '#f47fff',
): string {
  if (!color) return fallback;
  const str = String(color).trim();
  if (str.startsWith('#')) return str;
  // Số nguyên màu Discord (ví dụ 16711680)
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    return `#${num.toString(16).padStart(6, '0')}`;
  }
  // Chuỗi hex 3-8 ký tự thiếu dấu # (ví dụ ff007f)
  if (/^[0-9a-fA-F]{3,8}$/.test(str)) {
    return `#${str}`;
  }
  return str;
}

export const DiscordChatSimulator: React.FC<DiscordChatSimulatorProps> = ({
  activeRole,
  className,
}) => {
  const hasGradient = Boolean(activeRole?.roleColor && activeRole?.roleColor2);
  const color1 = normalizeHexColor(activeRole?.roleColor, '#f47fff');
  const color2 = activeRole?.roleColor2
    ? normalizeHexColor(activeRole.roleColor2)
    : color1;

  const roleName = activeRole?.roleName || 'Legendary Booster';
  const roleStyle: React.CSSProperties = hasGradient
    ? {
        background: `linear-gradient(90deg, ${color1}, ${color2})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        display: 'inline-block',
      }
    : {
        color: color1,
      };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      className={cn(
        'rounded-3xl glass-panel p-5 shadow-2xl relative overflow-hidden select-none glass-card-hover',
        className,
      )}
    >
      <div className="card-spotlight-border" aria-hidden="true" />
      <div className="card-spotlight-glow" aria-hidden="true" />

      {/* Simulation Header Badge */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-discord-green" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-discord-muted">
            Discord Native Chat Simulator (Live Preview)
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-[10px] text-pink-300 font-semibold">
          <Sparkles className="w-3 h-3 text-pink-400" />
          <span>EnhancedRoleColors Engine</span>
        </div>
      </div>

      {/* Simulated Discord Message Row */}
      <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#2b2d31]/50 transition-colors group">
        {/* Avatar với màu nền đồng bộ vai trò */}
        <div className="relative shrink-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-base shadow-md ring-2 ring-white/10"
            style={{
              background: hasGradient
                ? `linear-gradient(135deg, ${color1}, ${color2})`
                : color1,
            }}
          >
            {roleName.charAt(0).toUpperCase()}
          </div>
          {/* Nitro Booster Gem Icon overlay */}
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1e1f22] border-2 border-[#313338] flex items-center justify-center text-[10px]"
            title="Server Booster"
          >
            🚀
          </div>
        </div>

        {/* Message Content */}
        <div className="space-y-1.5 min-w-0 flex-1">
          {/* Header row: Username + Role Badge + Time */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'text-sm font-bold tracking-tight hover:underline cursor-pointer transition-all duration-300',
                hasGradient && 'discord-gradient-text drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]',
              )}
              style={roleStyle}
            >
              {roleName}
            </span>

            {/* Custom Role Badge Pill */}
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border"
              style={{
                backgroundColor: `${color1}18`,
                borderColor: `${color1}40`,
                color: hasGradient ? '#ffffff' : color1,
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: hasGradient
                    ? `linear-gradient(135deg, ${color1}, ${color2})`
                    : color1,
                }}
              />
              {roleName}
            </span>

            {/* Booster Badge Pill */}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-pink-500/15 text-pink-400 text-[10px] font-extrabold uppercase tracking-wider border border-pink-500/30">
              Booster
            </span>

            <span className="text-[11px] text-[#949ba4] font-medium">
              Hôm nay lúc 14:32
            </span>
          </div>

          {/* Chat Message Text */}
          <div className="text-xs sm:text-sm text-[#dbdee1] leading-relaxed">
            Vừa kích hoạt Custom Role 2 màu cực cháy trên máy chủ! Mọi người thấy phối màu này thế nào? ✨
          </div>

          {/* Color Gradient Chip / Swatch Inspector */}
          <div className="mt-3 p-3 rounded-xl bg-[#2b2d31]/80 border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-lg shadow-inner ring-1 ring-white/20 shrink-0"
                style={{
                  background: hasGradient
                    ? `linear-gradient(135deg, ${color1}, ${color2})`
                    : color1,
                }}
              />
              <div>
                <span className="text-[10px] text-discord-muted uppercase font-bold block">
                  Phối màu hiển thị:
                </span>
                <span className="font-mono text-white text-xs font-semibold flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block border border-white/20 shrink-0"
                    style={{ backgroundColor: color1 }}
                  />
                  <span>{color1}</span>
                  {hasGradient && (
                    <>
                      <span className="text-discord-muted">➔</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block border border-white/20 shrink-0"
                        style={{ backgroundColor: color2 }}
                      />
                      <span>{color2}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-sans font-bold">
                        Gradient 2-Color
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-1 rounded-md bg-[#1e1f22] border border-white/10 text-discord-muted">
                Boosts: <strong className="text-white">{activeRole?.boostCount ?? 1}</strong>
              </span>
              <span className="text-[10px] px-2 py-1 rounded-md bg-discord-green/15 text-discord-green border border-discord-green/30 font-bold">
                {activeRole?.status || 'ACTIVE'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordChatSimulator;
