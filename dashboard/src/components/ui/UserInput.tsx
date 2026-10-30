import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, User, XCircle } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { cn } from '../../lib/utils';
import type { DiscordUserInfo } from '../../types';

export interface UserInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onVerified?: (user: DiscordUserInfo | null) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}

export const UserInput: React.FC<UserInputProps> = ({
  label = 'Discord User ID',
  value,
  onChange,
  onVerified,
  placeholder = 'Ví dụ: 123456789012345678',
  hint,
}) => {
  const [debouncedId, setDebouncedId] = useState(value);

  // Debounce 400ms để tránh spam API
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedId(value.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [value]);

  const isValidFormat = /^\d{17,20}$/.test(debouncedId);

  const { data, isLoading, isError } = useQuery<{ user: DiscordUserInfo }>({
    queryKey: ['discord-user-lookup', debouncedId],
    queryFn: () => apiFetch<{ user: DiscordUserInfo }>(`/api/users/${debouncedId}`),
    enabled: isValidFormat,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const verifiedUser = data?.user ?? null;

  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;

  useEffect(() => {
    onVerifiedRef.current?.(verifiedUser);
  }, [verifiedUser]);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label className="block text-xs font-semibold text-discord-muted">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full bg-[#1e1f22] border rounded-xl px-4 py-2.5 text-sm text-discord-text font-mono placeholder:font-sans placeholder:text-[#6d6f78]',
            'outline-none transition-[border-color,box-shadow] duration-200 ease-out pr-10',
            verifiedUser
              ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
              : isError && isValidFormat
                ? 'border-discord-red focus:border-discord-red focus:ring-2 focus:ring-discord-red/20'
                : 'border-[#3f4147] hover:border-[#4e5058] focus:border-discord-blurple focus:ring-2 focus:ring-discord-blurple/25',
          )}
        />

        <div className="absolute right-3 flex items-center pointer-events-none">
          {isLoading && isValidFormat ? (
            <Loader2 className="w-4 h-4 text-discord-blurple animate-spin" />
          ) : verifiedUser ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : isError && isValidFormat ? (
            <XCircle className="w-4 h-4 text-discord-red" />
          ) : null}
        </div>
      </div>

      {/* Identity Preview Box */}
      {verifiedUser ? (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3 animate-in fade-in-50 duration-150">
          {verifiedUser.avatar ? (
            <img
              src={verifiedUser.avatar}
              alt={verifiedUser.username}
              className="w-8 h-8 rounded-full border border-emerald-400/30 object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
          )}

          <div className="overflow-hidden leading-tight">
            <span className="font-bold text-white text-xs block truncate">
              {verifiedUser.globalName || verifiedUser.username}{' '}
              <span className="font-normal text-emerald-300 font-mono">
                (@{verifiedUser.username})
              </span>
            </span>
            <span className="text-[10px] text-discord-muted font-mono">
              ID: {verifiedUser.id}
            </span>
          </div>
        </div>
      ) : isError && isValidFormat ? (
        <p className="text-xs text-discord-red font-medium flex items-center gap-1.5">
          <span>✕ Không tìm thấy tài khoản Discord có ID này.</span>
        </p>
      ) : hint ? (
        <p className="text-xs text-discord-muted">{hint}</p>
      ) : null}
    </div>
  );
};

export default UserInput;
