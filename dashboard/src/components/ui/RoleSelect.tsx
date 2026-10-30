import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Search, X } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { cn } from '../../lib/utils';
import type { GuildRoleItem } from '../../types';

export interface RoleSelectProps {
  label?: string;
  value: string | null | undefined;
  onChange: (roleId: string | null) => void;
  guildId?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

export const RoleSelect: React.FC<RoleSelectProps> = ({
  label,
  value,
  onChange,
  guildId,
  placeholder = 'Chọn một vai trò...',
  hint,
  error,
  allowClear = true,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    placement: 'bottom' | 'top';
  }>({
    left: 0,
    width: 0,
    placement: 'bottom',
  });

  const { data, isLoading } = useQuery<{ roles: GuildRoleItem[] }>({
    queryKey: ['guild-roles', guildId],
    queryFn: () =>
      apiFetch<{ roles: GuildRoleItem[] }>(`/api/guilds/${guildId}/roles`),
    enabled: Boolean(guildId),
    staleTime: 60 * 1000,
  });

  const roles = data?.roles || [];

  const filteredRoles = roles.filter((role) => {
    if (search.trim()) {
      return role.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const selectedRole = roles.find((r) => r.id === value);

  // Tính toán vị trí portal dropdown theo trigger button (kẹp toạ độ an toàn trên mobile)
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuEstimatedHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove =
      spaceBelow < menuEstimatedHeight && rect.top > menuEstimatedHeight;

    const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 16);
    const clampedLeft = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));

    if (placeAbove) {
      setCoords({
        bottom: window.innerHeight - rect.top + 6,
        left: clampedLeft,
        width,
        placement: 'top',
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        left: clampedLeft,
        width,
        placement: 'bottom',
      });
    }
  };

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        updatePosition();
        setIsOpen(true);
      }
    } else if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => {
        updatePosition();
      };
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="w-full space-y-1.5 text-left relative">
      {label && (
        <label className="block text-xs font-semibold text-discord-muted">
          {label}
        </label>
      )}

      {/* Main Input Display */}
      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full bg-[#1e1f22] border rounded-xl px-3.5 py-2 text-sm cursor-pointer select-none flex items-center justify-between',
          'outline-none transition-[border-color,box-shadow] duration-200 ease-out',
          isOpen
            ? 'border-discord-blurple ring-2 ring-discord-blurple/25'
            : 'border-[#3f4147] hover:border-[#4e5058] focus-visible:border-discord-blurple focus-visible:ring-2 focus-visible:ring-discord-blurple/25',
          error && 'border-discord-red ring-discord-red/25',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selectedRole ? (
            <>
              <span
                className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                style={{
                  backgroundColor: selectedRole.color || '#99aab5',
                }}
              />
              <span
                className="font-medium truncate text-white"
                style={{
                  color:
                    selectedRole.color && selectedRole.color !== '#000000'
                      ? selectedRole.color
                      : '#ffffff',
                }}
              >
                {selectedRole.name}
              </span>
            </>
          ) : value ? (
            <span className="font-mono text-xs text-discord-muted truncate">
              ID: {value}
            </span>
          ) : (
            <span className="text-discord-muted text-xs">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {allowClear && (selectedRole || value) && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="p-1 text-discord-muted hover:text-white rounded-lg transition"
              title="Bỏ chọn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-discord-muted transition-transform duration-200',
              isOpen && 'rotate-180 text-white',
            )}
          />
        </div>
      </div>

      {/* Portal Dropdown Menu: Nổi lên toàn màn hình, không bị overflow-hidden của Card cắt & không nhấp nháy từ (0, 0) */}
      {isOpen &&
        coords.width > 0 &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              ...(coords.placement === 'top'
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className={cn(
              'bg-[#18191c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl animate-in fade-in-50 zoom-in-95 duration-100',
              coords.placement === 'top' ? 'origin-bottom' : 'origin-top',
            )}
          >
            {/* Search Box */}
            <div className="p-2 border-b border-white/5 relative">
              <Search className="w-3.5 h-3.5 text-discord-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm kiếm vai trò..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#232428] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-discord-muted outline-none focus:border-discord-blurple/60"
                autoFocus
              />
            </div>

            {/* Roles List */}
            <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
              {isLoading ? (
                <div className="p-4 text-center text-xs text-discord-muted">
                  Đang tải danh sách vai trò...
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="p-4 text-center text-xs text-discord-muted">
                  Không tìm thấy vai trò nào phù hợp.
                </div>
              ) : (
                filteredRoles.map((role) => {
                  const isSelected = role.id === value;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        onChange(role.id);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition',
                        isSelected
                          ? 'bg-discord-blurple text-white font-bold'
                          : 'text-discord-text hover:bg-white/5',
                      )}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                          style={{
                            backgroundColor: role.color || '#99aab5',
                          }}
                        />
                        <span
                          className="truncate"
                          style={
                            !isSelected && role.color && role.color !== '#000000'
                              ? { color: role.color }
                              : undefined
                          }
                        >
                          {role.name}
                        </span>
                      </div>

                      {role.isManaged && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-discord-muted ml-2">
                          Bot
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}

      {error ? (
        <p className="text-xs text-discord-red font-medium">{error}</p>
      ) : hint ? (
        <p className="text-xs text-discord-muted">{hint}</p>
      ) : null}
    </div>
  );
};

export default RoleSelect;
