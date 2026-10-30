import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { User } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { cn } from '../../lib/utils';
import type { DiscordUserInfo } from '../../types';

export interface UserDisplayProps {
  userId: string;
  fallbackUsername?: string;
  showAvatar?: boolean;
  className?: string;
}

export const UserDisplay: React.FC<UserDisplayProps> = ({
  userId,
  fallbackUsername,
  showAvatar = true,
  className,
}) => {
  const isValidFormat = /^\d{17,20}$/.test(userId);

  const { data, isLoading } = useQuery<{ user: DiscordUserInfo }>({
    queryKey: ['discord-user-display', userId],
    queryFn: () => apiFetch<{ user: DiscordUserInfo }>(`/api/users/${userId}`),
    enabled: isValidFormat,
    staleTime: 10 * 60 * 1000, // Cache 10 phút
    retry: false,
  });

  if (isLoading && isValidFormat && !fallbackUsername) {
    return (
      <div className={cn('inline-flex items-center gap-2 animate-pulse', className)}>
        {showAvatar && <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />}
        <div className="h-4 w-24 rounded bg-white/10" />
      </div>
    );
  }

  const user = data?.user;
  const displayName = user
    ? user.globalName || user.username
    : fallbackUsername || null;

  return (
    <div className={cn('inline-flex items-center gap-2 max-w-full', className)}>
      {showAvatar && (
        <div className="shrink-0">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={displayName || userId}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-discord-blurple/20 text-discord-blurple flex items-center justify-center text-[10px]">
              <User className="w-3 h-3" />
            </div>
          )}
        </div>
      )}

      <div className="truncate flex items-baseline gap-1.5 font-medium">
        {displayName ? (
          <>
            <span className="text-white font-semibold truncate hover:text-discord-blurple transition-colors">
              {displayName}
            </span>
            <span className="text-discord-muted font-mono text-[11px] shrink-0">
              ({userId})
            </span>
          </>
        ) : (
          <span className="font-mono text-white text-xs">{userId}</span>
        )}
      </div>
    </div>
  );
};

export default UserDisplay;
