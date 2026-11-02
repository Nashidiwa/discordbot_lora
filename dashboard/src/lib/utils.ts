import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class names with conflict resolution
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format currency VND with standard thousand separators
 */
export function formatVnd(amount: number | string | bigint): string {
  const num = typeof amount === 'bigint' ? Number(amount) : Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format seconds into human readable duration (e.g. "12 ngày 5 giờ", "45 phút" / "12 days 5 hours", "45 mins")
 */
export function formatDurationSeconds(totalSeconds: number, lang?: 'vi' | 'en'): string {
  const currentLang =
    lang ||
    (typeof window !== 'undefined'
      ? (localStorage.getItem('lora_dashboard_locale') as 'vi' | 'en')
      : 'vi') ||
    'vi';
  const isEn = currentLang === 'en';

  if (!totalSeconds || totalSeconds <= 0) return isEn ? '0s' : '0 giây';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${isEn ? (days === 1 ? 'day' : 'days') : 'ngày'}`);
  if (hours > 0) parts.push(`${hours} ${isEn ? (hours === 1 ? 'hour' : 'hours') : 'giờ'}`);
  if (minutes > 0 && days === 0)
    parts.push(`${minutes} ${isEn ? (minutes === 1 ? 'minute' : 'minutes') : 'phút'}`);
  if (seconds > 0 && days === 0 && hours === 0)
    parts.push(`${seconds} ${isEn ? (seconds === 1 ? 'second' : 'seconds') : 'giây'}`);

  return parts.length > 0 ? parts.join(' ') : isEn ? '0s' : '0 giây';
}

/**
 * Format ISO Date string into localized VN / US date format
 */
export function formatDateTime(
  isoString: string | null | undefined,
  lang?: 'vi' | 'en',
): string {
  const currentLang =
    lang ||
    (typeof window !== 'undefined'
      ? (localStorage.getItem('lora_dashboard_locale') as 'vi' | 'en')
      : 'vi') ||
    'vi';
  const isEn = currentLang === 'en';

  if (!isoString) return isEn ? 'N/A' : 'Chưa có';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isEn ? 'Invalid date' : 'Không hợp lệ';
    return new Intl.DateTimeFormat(isEn ? 'en-US' : 'vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return isEn ? 'Invalid date' : 'Không hợp lệ';
  }
}
