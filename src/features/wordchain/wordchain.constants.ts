import { GameMode } from './types/wordchain.types.js';

/**
 * Domain constants, thresholds, and operational limits for Word Chain.
 * Reflects Python ground truth and approved determinations DEC-001 through DEC-008.
 */
export const WordChainConstants = {
  // Gameplay penalties & rewards (cogs/game.py:326, karma.py:52-66)
  MISTAKE_KARMA_PENALTY: -5.0,
  BASE_KARMA_OFFSET: 0.025,
  BASE_KARMA_K2_WEIGHT: 0.7,
  SUFFIX_DECAY_EXPONENT: 0.33,

  // Reliable & Failed Role thresholds (cogs/common.py:270, cogs/game.py:291)
  RELIABLE_ROLE_KARMA_THRESHOLD: 25.0,
  RELIABLE_ROLE_ACCURACY_THRESHOLD: 0.975,
  FAILED_ROLE_RECOVERY_INPUTS: 30,

  // Dead-end token thresholds (cogs/game.py:382)
  DEAD_END_THRESHOLD: {
    [GameMode.NORMAL]: 0.005,
    [GameMode.HARD]: 0.05,
  } as const,

  // Token frequency fallback (language.py:73-77)
  DEFAULT_TOKEN_SCORE: 1.0,

  // Suffix repetition deque length per active guild (cogs/game.py:server_last_words)
  SUFFIX_HISTORY_MAXLEN: 5,

  // Wiktionary External API & Traffic Controls (DEC-003 Option 3)
  WIKTIONARY_TIMEOUT_MS: 5_000,
  WIKTIONARY_MAX_CONCURRENCY: 5,
  WIKTIONARY_MAX_RPS: 10,
  HTTP_429_DEFAULT_RETRY_AFTER_SEC: 15,

  // Cache TTLs (DEC-003)
  NEGATIVE_CACHE_TTL_HOURS: 24,
  NEGATIVE_CACHE_TTL_MS: 24 * 60 * 60 * 1000,

  // Guild lifecycle retention (DEC-006)
  GUILD_RETENTION_DAYS: 7,
  GUILD_RETENTION_MS: 7 * 24 * 60 * 60 * 1000,
  CLEANUP_CRON: '0 0 * * *',
} as const;

/**
 * Game reaction and feedback emoji constants.
 */
export const WordChainEmoji = {
  CORRECT: '✅',
  MISTAKE: '❌',
  WARNING: '⚠️',
  OCTAGONAL_SIGN: '🛑',
  CELEBRATION: '🎉',
  HIGH_SCORE_TIED: '☑️',
} as const;

/**
 * Special milestones mapped to reaction emojis (reference: model.py:144-148).
 */
export const WordChainSpecialCountEmojis: Record<number, string> = {
  100: '💯',
  69: '😏',
  666: '👹',
} as const;

/**
 * Country and special regional names mapped to flag emojis (reference: consts.py:77-304).
 */
export const WordChainSpecialWordEmojis: Record<string, string> = {
  vietnam: '🇻🇳',
  japan: '🇯🇵',
  germany: '🇩🇪',
  france: '🇫🇷',
  italy: '🇮🇹',
  spain: '🇪🇸',
  canada: '🇨🇦',
  brazil: '🇧🇷',
  china: '🇨🇳',
  russia: '🇷🇺',
  india: '🇮🇳',
  mexico: '🇲🇽',
  turkey: '🦃',
  australia: '🇦🇺',
  austria: '🇦🇹',
  belgium: '🇧🇪',
  denmark: '🇩🇰',
  finland: '🇫🇮',
  greece: '🇬🇷',
  iceland: '🇮🇸',
  netherlands: '🇳🇱',
  norway: '🇳🇴',
  poland: '🇵🇱',
  portugal: '🇵🇹',
  sweden: '🇸🇪',
  switzerland: '🇨🇭',
  ukraine: '🇺🇦',
  uk: '🇬🇧',
  usa: '🇺🇸',
} as const;

/**
 * Regular expressions for token and word validation.
 */
export const WordChainRegex = {
  EN_REGEX: /^[a-z]([-]|[a-z])*[a-z]$/,
} as const;
