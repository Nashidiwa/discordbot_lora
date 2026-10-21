/**
 * Donator Perks - Constants Definition
 * Adheres strictly to Zero any & Object as const pattern
 */

export const DonatorBurnRate = {
  EQUIPPED: 1.0,
  STORED: 0.2,
  FROZEN: 0.0,
} as const;

export type DonatorBurnRate = (typeof DonatorBurnRate)[keyof typeof DonatorBurnRate];

export const DonatorBenchmark = {
  DEFAULT_BENCHMARK_AMOUNT_VND: 200_000,
  DEFAULT_BENCHMARK_DAYS: 30,
  SECONDS_PER_DAY: 86_400,
  BASE_RATE_SECONDS_PER_VND: 12.96,
} as const;

export const WeeklyStreakRule = {
  DEFAULT_WEEKLY_MIN_AMOUNT_VND: 50_000,
  MAX_STREAK: 100,
  MAX_BONUS_STREAK_TIER: 4,
  TIMEZONE: 'Asia/Ho_Chi_Minh',
  TIMEZONE_OFFSET_HOURS: 7,
} as const;

/**
 * Volume bonus tiers (applied per single donation)
 * Sorted descending by minAmount for matching logic
 */
export const VolumeBonusTiers = [
  { minAmount: 500_000, percent: 35 },
  { minAmount: 200_000, percent: 20 },
  { minAmount: 50_000, percent: 10 },
  { minAmount: 0, percent: 0 },
] as const;

export type VolumeBonusTier = (typeof VolumeBonusTiers)[number];

/**
 * Streak bonus tiers (applied according to user's current streak)
 * Sorted descending by minStreak for matching logic
 */
export const StreakBonusTiers = [
  { minStreak: 4, percent: 20 },
  { minStreak: 3, percent: 10 },
  { minStreak: 2, percent: 5 },
  { minStreak: 0, percent: 0 },
] as const;

export type StreakBonusTier = (typeof StreakBonusTiers)[number];

export const DonatorActionType = {
  DONATION: 'DONATION',
  ADJUST_ADD: 'ADJUST_ADD',
  ADJUST_DEDUCT: 'ADJUST_DEDUCT',
  SET_STREAK: 'SET_STREAK',
  AUTO_REVOKE: 'AUTO_REVOKE',
} as const;

export type DonatorActionType = (typeof DonatorActionType)[keyof typeof DonatorActionType];

export const DonatorSubcommand = {
  INFO: 'info',
  STATUS: 'status',
  EQUIP: 'equip',
  UNEQUIP: 'unequip',
  ADD: 'add',
  ADJUST: 'adjust',
  SET_STREAK: 'set_streak',
  CONFIG: 'config',
  TOGGLE: 'toggle',
} as const;

export type DonatorSubcommand = (typeof DonatorSubcommand)[keyof typeof DonatorSubcommand];

export const DonatorConfigSubcommand = {
  VIEW: 'view',
  SET_ROLE: 'set_role',
  SET_CHANNEL: 'set_channel',
} as const;

export type DonatorConfigSubcommand =
  (typeof DonatorConfigSubcommand)[keyof typeof DonatorConfigSubcommand];

export const DonatorErrorCode = {
  CONFIG_NOT_FOUND: 'DONATOR_CONFIG_NOT_FOUND',
  FEATURE_DISABLED: 'DONATOR_FEATURE_DISABLED',
  ROLE_NOT_CONFIGURED: 'DONATOR_ROLE_NOT_CONFIGURED',
  INSUFFICIENT_CREDIT: 'DONATOR_INSUFFICIENT_CREDIT',
  ALREADY_EQUIPPED: 'DONATOR_ALREADY_EQUIPPED',
  ALREADY_UNEQUIPPED: 'DONATOR_ALREADY_UNEQUIPPED',
  ROLE_HIERARCHY_ERROR: 'DONATOR_ROLE_HIERARCHY_ERROR',
  ACCOUNT_NOT_FOUND: 'DONATOR_ACCOUNT_NOT_FOUND',
  INVALID_AMOUNT: 'DONATOR_INVALID_AMOUNT',
  PERMISSION_DENIED: 'DONATOR_PERMISSION_DENIED',
} as const;

export type DonatorErrorCode = (typeof DonatorErrorCode)[keyof typeof DonatorErrorCode];
