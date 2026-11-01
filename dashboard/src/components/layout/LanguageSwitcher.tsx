import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/utils';

export const LanguageSwitcher: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 p-0.5 rounded-xl bg-[#1c1e24] border border-white/10 text-xs shadow-inner select-none',
        className,
      )}
      role="group"
      aria-label="Tùy chọn ngôn ngữ / Language selector"
    >
      <div className="pl-1.5 pr-0.5 text-discord-muted">
        <Globe className="w-3.5 h-3.5" />
      </div>

      <button
        type="button"
        onClick={() => setLocale('vi')}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-[11px] transition-all duration-150',
          locale === 'vi'
            ? 'bg-discord-blurple text-white shadow-sm shadow-discord-blurple/30'
            : 'text-discord-muted hover:text-white',
        )}
        title="Tiếng Việt (Mặc định)"
      >
        <span className="font-extrabold">VI</span>
      </button>

      <button
        type="button"
        onClick={() => setLocale('en')}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-[11px] transition-all duration-150',
          locale === 'en'
            ? 'bg-discord-blurple text-white shadow-sm shadow-discord-blurple/30'
            : 'text-discord-muted hover:text-white',
        )}
        title="English"
      >
        <span className="font-extrabold">EN</span>
      </button>
    </div>
  );
};
