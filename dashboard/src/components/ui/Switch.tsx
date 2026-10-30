import React from 'react';
import { cn } from '../../lib/utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}) => {
  return (
    <div
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className={cn(
        'flex items-center justify-between gap-4 p-3.5 rounded-xl border transition-all duration-150 select-none',
        disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:bg-[#2e3035]',
        checked
          ? 'bg-discord-blurple/10 border-discord-blurple/40'
          : 'bg-[#1e1f22]/60 border-[#3f4147]',
        className,
      )}
    >
      {(label || description) && (
        <div className="space-y-0.5 text-left">
          {label && (
            <div className="text-sm font-semibold text-discord-text leading-snug">
              {label}
            </div>
          )}
          {description && (
            <div className="text-xs text-discord-muted leading-relaxed">
              {description}
            </div>
          )}
        </div>
      )}

      {/* Pill Toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-discord-blurple/50',
          checked ? 'bg-discord-blurple' : 'bg-[#4e5058]',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
};
