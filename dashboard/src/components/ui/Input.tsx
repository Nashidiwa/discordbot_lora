import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-discord-muted"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-discord-muted">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-[#1e1f22] border rounded-xl px-4 py-2.5 text-sm text-discord-text placeholder:text-[#6d6f78]',
              'outline-none transition-[border-color,box-shadow] duration-200 ease-out',
              'border-[#3f4147] hover:border-[#4e5058] focus:border-discord-blurple focus:ring-2 focus:ring-discord-blurple/25',
              leftIcon ? 'pl-10' : '',
              rightIcon ? 'pr-10' : '',
              error && 'border-discord-red focus:border-discord-red focus:ring-discord-red/25',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-discord-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-discord-red font-medium">{error}</p>
        ) : hint ? (
          <p className="text-xs text-discord-muted">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
