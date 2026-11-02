export const AlgorithmType = {
  STATIC: 'STATIC',
  DYNAMIC_CHAOS: 'DYNAMIC_CHAOS',
} as const;

export type AlgorithmType =
  (typeof AlgorithmType)[keyof typeof AlgorithmType];

export const ScopeType = {
  ALL: 'ALL',
  WHITELIST: 'WHITELIST',
  BLACKLIST: 'BLACKLIST',
} as const;

export type ScopeType = (typeof ScopeType)[keyof typeof ScopeType];

export const DefaultModuleKey = {
  FOUNDATION: 'foundation',
  ADVANCED: 'advanced',
} as const;

export type DefaultModuleKey =
  (typeof DefaultModuleKey)[keyof typeof DefaultModuleKey];

export const LeaderboardSortType = {
  COUNT: 'count',
  DURATION: 'duration',
} as const;

export type LeaderboardSortType =
  (typeof LeaderboardSortType)[keyof typeof LeaderboardSortType];

export const LandmineLimits = {
  MAX_CUSTOM_MODULES: 10,
  AUTO_DELETE_DELAY_MS: 15_000, // 15 seconds
  MIN_RATE: 0.0001, // 0.01%
  MAX_RATE: 1.0, // 100%
  MIN_PUNISHMENT_SECONDS: 5, // 5s
  MAX_PUNISHMENT_SECONDS: 28 * 24 * 3600, // 28 days (Discord maximum timeout)
  // An toàn clock-skew: trừ hao 60s để tránh Discord API từ chối do lệch đồng hồ
  MAX_DISCORD_TIMEOUT_MS: (28 * 24 * 3600 - 60) * 1000,
} as const;

export const LandmineVisuals = {
  // Built-in high quality explosion GIF
  EXPLOSION_GIF_URL:
    'https://media.giphy.com/media/oe33xf3B50fsc/giphy.gif',
} as const;
