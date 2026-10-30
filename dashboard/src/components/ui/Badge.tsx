import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'blurple' | 'green' | 'yellow' | 'red' | 'muted' | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'blurple',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  const variants = {
    blurple:
      'bg-discord-blurple/15 text-discord-blurple border-discord-blurple/30',
    green:
      'bg-discord-green/15 text-discord-green border-discord-green/30',
    yellow:
      'bg-discord-yellow/15 text-discord-yellow border-discord-yellow/30',
    red:
      'bg-discord-red/15 text-discord-red border-discord-red/30',
    muted:
      'bg-[#1e1f22] text-discord-muted border-[#3f4147]',
    purple:
      'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };

  const dotColors = {
    blurple: 'bg-discord-blurple',
    green: 'bg-discord-green',
    yellow: 'bg-discord-yellow',
    red: 'bg-discord-red',
    muted: 'bg-discord-muted',
    purple: 'bg-purple-400',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 rounded-lg gap-1.5 font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center border select-none transition-colors duration-150',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
};
