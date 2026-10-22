import { z } from 'zod';

/**
 * Game Mode representation:
 * 1 = Normal Mode (1-character chaining)
 * 2 = Hard Mode (2-character chaining)
 */
export const GameMode = {
  NORMAL: 1,
  HARD: 2,
} as const;

export type GameMode = (typeof GameMode)[keyof typeof GameMode];

/**
 * Game validation status codes.
 * Differentiates between breaking mistakes and non-breaking warnings.
 */
export const WordChainGameStatus = {
  VALID: 'VALID',
  // Breaking Mistakes (-5.0 karma, chain reset to 0, used_words wiped)
  SAME_PLAYER_TWICE: 'SAME_PLAYER_TWICE',
  WRONG_FIRST_TOKEN: 'WRONG_FIRST_TOKEN',
  WORD_DOES_NOT_EXIST: 'WORD_DOES_NOT_EXIST',
  // Non-breaking Warnings (turn preserved, warning reaction, no penalty)
  SINGLE_LETTER: 'SINGLE_LETTER',
  REGEX_MISMATCH: 'REGEX_MISMATCH',
  BLACKLISTED: 'BLACKLISTED',
  ALREADY_USED: 'ALREADY_USED',
  DEAD_END: 'DEAD_END',
  API_ERROR: 'API_ERROR',
} as const;

export type WordChainGameStatus =
  (typeof WordChainGameStatus)[keyof typeof WordChainGameStatus];

/**
 * Dictionary API lookup outcomes.
 */
export const ApiResponse = {
  WORD_EXISTS: 'WORD_EXISTS',
  WORD_NOT_FOUND: 'WORD_NOT_FOUND',
  ERROR: 'ERROR',
} as const;

export type ApiResponse = (typeof ApiResponse)[keyof typeof ApiResponse];

/**
 * Supported language codes (Phase 1: English only per DEC-001).
 */
export const SupportedLanguage = {
  ENGLISH: 'en',
} as const;

export type SupportedLanguage =
  (typeof SupportedLanguage)[keyof typeof SupportedLanguage];

// ==========================================
// PRISMA RECORD INTERFACES
// ==========================================

export interface WordChainConfigRecord {
  guildId: string;
  normalModeChannelId: string | null;
  hardModeChannelId: string | null;
  reliableRoleId: string | null;
  failedRoleId: string | null;
  failedMemberId: string | null;
  correctInputsByFailedMember: number;
  languages: string;
  isBanned: boolean;
  leftAt: Date | null;
  currentWordNormal: string | null;
  currentCountNormal: number;
  highScoreNormal: number;
  lastMemberIdNormal: string | null;
  currentWordHard: string | null;
  currentCountHard: number;
  highScoreHard: number;
  lastMemberIdHard: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WordChainMemberRecord {
  id: string;
  guildId: string;
  userId: string;
  score: number;
  correctInputs: number;
  wrongInputs: number;
  karma: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WordChainUsedWordRecord {
  id: string;
  guildId: string;
  gameMode: number;
  word: string;
  createdAt: Date;
}

export interface WordChainBlacklistRecord {
  id: string;
  guildId: string;
  word: string;
  createdAt: Date;
}

export interface WordChainWhitelistRecord {
  id: string;
  guildId: string;
  word: string;
  createdAt: Date;
}

export interface WordChainWordCacheRecord {
  word: string;
  language: string;
  isNegative: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface WordChainBannedMemberRecord {
  userId: string;
  createdAt: Date;
}

// ==========================================
// DOMAIN LOGIC INTERFACES
// ==========================================

export interface ChainValidationResult {
  status: WordChainGameStatus;
  isValid: boolean;
  isMistake: boolean;
  word: string;
  authorId: string;
  errorMessage?: string;
}

export interface BaseKarmaInput {
  startTokenScore: number;
  endTokenScore: number;
}

export interface SuffixDecayInput {
  recentSuffixCount: number;
}

export interface TurnKarmaResult {
  baseKarma: number;
  decayMultiplier: number;
  finalKarma: number;
  isPenalized: boolean;
}

export interface MemberStatsSummary {
  userId: string;
  guildId: string;
  score: number;
  correctInputs: number;
  wrongInputs: number;
  karma: number;
  accuracy: number;
  isReliable: boolean;
  isFailed: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  score: number;
  karma: number;
  correctInputs?: number;
}

export interface ProcessTurnInput {
  guildId: string;
  channelId: string;
  authorId: string;
  rawWord: string;
  gameMode?: GameMode;
  isSinglePlayer?: boolean;
}

export interface TurnExecutionResult {
  status: WordChainGameStatus;
  isValid: boolean;
  isMistake: boolean;
  isWarning: boolean;
  isIgnored: boolean;
  rawWord: string;
  normalizedWord: string;
  authorId: string;
  guildId: string;
  gameMode?: GameMode;
  reactionEmoji?: string;
  message?: string;
  currentCount?: number;
  highScore?: number;
  isNewHighScore?: boolean;
  isMilestone?: boolean;
  karmaAwarded?: number;
  roleStateChanged?: {
    reliableRoleGranted?: boolean;
    reliableRoleRevoked?: boolean;
    failedRoleGranted?: boolean;
    failedRoleCleared?: boolean;
  };
}

// ==========================================
// ZOD RUNTIME VALIDATION SCHEMAS
// ==========================================

export const wordChainWordInputSchema = z
  .string()
  .trim()
  .min(2, 'Word must be at least 2 characters long')
  .max(100, 'Word must not exceed 100 characters')
  .regex(/^[a-z]([-]|[a-z])*[a-z]$/i, 'Word contains invalid characters');

export const wordChainChannelConfigSchema = z.object({
  guildId: z.string().min(1, 'Guild ID is required'),
  channelId: z.string().min(1, 'Channel ID is required'),
  gameMode: z.union([z.literal(GameMode.NORMAL), z.literal(GameMode.HARD)]),
});

export const wordChainRoleConfigSchema = z.object({
  guildId: z.string().min(1, 'Guild ID is required'),
  roleId: z.string().min(1, 'Role ID is required'),
  roleType: z.union([z.literal('RELIABLE'), z.literal('FAILED')]),
});

export const wordChainListWordSchema = z.object({
  guildId: z.string().min(1, 'Guild ID is required'),
  word: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Word must be at least 2 characters long')
    .max(100, 'Word must not exceed 100 characters')
    .regex(/^[a-z]([-]|[a-z])*[a-z]$/, 'Word contains invalid characters'),
});
