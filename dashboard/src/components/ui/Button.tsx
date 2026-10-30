import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-discord-blurple/50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none cursor-pointer';

    const variants = {
      primary:
        'bg-discord-blurple text-white hover:bg-[#4752c4] shadow-sm shadow-discord-blurple/20',
      secondary:
        'bg-[#2b2d31] hover:bg-[#35373c] text-white border border-[#3f4147]',
      destructive:
        'bg-discord-red/10 text-discord-red hover:bg-discord-red/20 border border-discord-red/30 focus-visible:ring-discord-red/50',
      outline:
        'bg-transparent border border-[#3f4147] text-discord-text hover:bg-[#313338] hover:text-white',
      ghost:
        'bg-transparent text-discord-muted hover:text-white hover:bg-[#313338]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
      md: 'h-10 px-4 text-sm rounded-xl gap-2',
      lg: 'h-12 px-6 text-base rounded-xl gap-2.5',
      icon: 'h-10 w-10 p-0 rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
