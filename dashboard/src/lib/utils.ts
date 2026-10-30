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
 * Format seconds into human readable duration (e.g. "12 ngày 5 giờ", "45 phút")
 */
export function formatDurationSeconds(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0 giây';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0 && days === 0) parts.push(`${minutes} phút`);
  if (seconds > 0 && days === 0 && hours === 0) parts.push(`${seconds} giây`);

  return parts.length > 0 ? parts.join(' ') : '0 giây';
}

/**
 * Format ISO Date string into localized VN date format
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Chưa có';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Không hợp lệ';
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return 'Không hợp lệ';
  }
}
