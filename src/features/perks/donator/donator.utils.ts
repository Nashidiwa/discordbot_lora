import { WeeklyStreakRule } from './donator.constants.js';

/**
 * Donator Perk - Utility Functions
 * Strict adherence to Zero any & immutable time conversions
 */

/**
 * Returns the start of the calendar week (Monday 00:00:00) fixed to Asia/Ho_Chi_Minh (UTC+7).
 * The returned Date object represents the exact UTC timestamp of that moment.
 */
export function getWeekStartUtcPlus7(date: Date = new Date()): Date {
  const offsetMs = WeeklyStreakRule.TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000;
  const shifted = new Date(date.getTime() + offsetMs);

  const day = shifted.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const dayOfMonth = shifted.getUTCDate() - daysSinceMonday;

  const mondayUtcMidnight = Date.UTC(year, month, dayOfMonth, 0, 0, 0, 0);
  return new Date(mondayUtcMidnight - offsetMs);
}

/**
 * Checks whether two dates fall in the same calendar week in Asia/Ho_Chi_Minh (UTC+7).
 */
export function isSameWeekUtcPlus7(date1: Date, date2: Date): boolean {
  return (
    getWeekStartUtcPlus7(date1).getTime() ===
    getWeekStartUtcPlus7(date2).getTime()
  );
}

/**
 * Formats a duration in seconds into a friendly Vietnamese string.
 * Example: 15 ngày 6 giờ 30 phút
 */
export function formatDurationVietnamese(seconds: number): string {
  if (seconds <= 0) {
    return '0 phút';
  }

  const totalSeconds = Math.floor(seconds);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const remSeconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0) parts.push(`${minutes} phút`);

  if (parts.length === 0) {
    if (remSeconds > 0) parts.push(`${remSeconds} giây`);
    else return '0 phút';
  }

  return parts.join(' ');
}

/**
 * Formats a currency amount into standard Vietnamese Dong representation.
 * Example: 200.000đ
 */
export function formatCurrencyVnd(amount: number | bigint): string {
  try {
    return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
  } catch {
    return `${amount.toString()}đ`;
  }
}
