import React from 'react';
import {
  LogOut,
  Menu,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GuildSwitcher } from './GuildSwitcher';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-[#10121a]/85 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors shadow-2xl">
      {/* Left: Mobile Menu + Bot Brand + Guild Switcher */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-discord-muted hover:text-white hover:bg-[#313338] transition"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <img
            src="/lora_icon_badge.png"
            alt="Lora Engine"
            className="w-9 h-9 rounded-xl object-contain shadow-md shadow-discord-blurple/25 shrink-0"
          />
          <div className="hidden sm:block">
            <h1 className="font-bold text-base leading-none text-white flex items-center gap-1.5">
              Lora
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-discord-blurple/20 text-discord-blurple font-semibold border border-discord-blurple/30">
                v0.8.5
              </span>
            </h1>
            <p className="text-[10px] text-discord-muted leading-tight mt-0.5">App Engine</p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-6 w-px bg-[#3f4147]" />

        {/* Custom Guild Switcher */}
        <GuildSwitcher />
      </div>

      {/* Right: User Section */}
      <div className="flex items-center gap-3">
        {user?.isBotOwner && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-discord-yellow/15 border border-discord-yellow/30 text-discord-yellow text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Bot Owner</span>
          </div>
        )}

        {/* User Card & Logout */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-[#3f4147]">
          {user?.avatar ? (
            <img
              src={`https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png?size=64`}
              alt={user.username}
              className="w-8 h-8 rounded-full ring-2 ring-discord-blurple/40 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-discord-blurple/20 flex items-center justify-center font-bold text-xs text-discord-blurple">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-white leading-tight">
              {user?.username}
            </div>
            <div className="text-[10px] text-discord-muted leading-tight">
              {user?.isBotOwner ? 'Super Admin' : 'Manager'}
            </div>
          </div>

          <button
            onClick={() => void logout()}
            className="p-2 text-discord-muted hover:text-discord-red hover:bg-[#313338] rounded-xl transition ml-1"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
