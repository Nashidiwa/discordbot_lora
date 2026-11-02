import type {
  AlgorithmType,
  LeaderboardSortType,
  ScopeType,
} from './landmine.constants.js';

export interface ActiveModuleRuntime {
  id: string;
  guildId: string;
  moduleKey: string;
  isDefault: boolean;
  isEnabled: boolean;
  note: string | null;
  algorithmType: AlgorithmType;
  staticRate: number;
  punishmentDurationSeconds: number;
  channelScopeType: ScopeType;
  channelIds: string[];
  roleScopeType: ScopeType;
  roleIds: string[];
  includeInServerLeaderboard: boolean;
  autoDeleteNotification: boolean;
  successMessage: string | null;
  failedMessage: string | null;
}

export interface RollEvaluationResult {
  triggered: boolean;
  module: ActiveModuleRuntime;
  durationMs: number;
  tier?: number;
  rm?: number;
  pm?: number;
  baseRatePercent?: number;
  effectiveRatePercent?: number;
}

export interface CreateModuleInput {
  ratePercent: number; // e.g. 1.5 for 1.5%
  durationSeconds: number;
  note?: string;
}

export interface EditModuleInput {
  note?: string | null;
  ratePercent?: number;
  durationSeconds?: number;
  channelScopeType?: ScopeType;
  roleScopeType?: ScopeType;
  includeInServerLeaderboard?: boolean;
  autoDeleteNotification?: boolean;
  successMessage?: string | null;
  failedMessage?: string | null;
}

export interface LeaderboardEntry {
  userId: string;
  totalSteps: number;
  successCount: number;
  failedCount: number;
  totalTimeoutSeconds: number;
}

export interface LeaderboardResult {
  scope: 'server' | string;
  sortBy: LeaderboardSortType;
  entries: LeaderboardEntry[];
}
