export interface User {
  userId: string;
  username: string;
  avatar: string | null;
  isBotOwner: boolean;
  isMasterKey: boolean;
}

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  isOwner: boolean;
  roleTier: string;
  permissions: number;
}

export interface VoiceChannel {
  id: string;
  name: string;
  type: 'VOICE' | 'STAGE';
}

export interface GuildChannelItem {
  id: string;
  name: string;
  type: 'TEXT' | 'ANNOUNCEMENT' | 'VOICE' | 'STAGE';
  position: number;
  parentId: string | null;
  parentName: string | null;
  parentPosition: number;
}

export interface GuildRoleItem {
  id: string;
  name: string;
  color: string | null;
  position: number;
  isManaged: boolean;
}

export interface DiscordUserInfo {
  id: string;
  username: string;
  globalName: string;
  avatar: string | null;
  isBot?: boolean;
}

export interface VoiceStatus {
  guildId: string;
  channelId: string | null;
  channelName: string | null;
  status: 'READY' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED' | 'SUSPENDED' | 'IDLE';
  autoReconnect: boolean;
  selfDeaf: boolean;
  selfMute: boolean;
  reconnectAttempts: number;
  lastConnectedAt: string | null;
  ping: number | null;
}

export interface BoosterConfig {
  guildId: string;
  gracePeriodDays: number;
  anchorRoleId: string | null;
  notificationChannelId: string | null;
  auditLogChannelId: string | null;
}

export interface CustomRolePerk {
  id: string;
  guildId: string;
  userId: string;
  boostCount: number;
  roleId: string | null;
  roleName: string | null;
  roleColor: string | null;
  roleColor2: string | null;
  status: string;
  isEquipped: boolean;
  gracePeriodExpiresAt: string | null;
  createdAt: string;
}

export interface DonatorConfig {
  guildId: string;
  isEnabled: boolean;
  donatorRoleId: string | null;
  notificationChannelId: string | null;
  baseBenchmarkVnd: number;
  baseBenchmarkDays: number;
  weeklyMinVnd: number;
  idleBurnRate: number;
}

export interface DonatorAccount {
  id: string;
  guildId: string;
  userId: string;
  creditSeconds: number;
  isEquipped: boolean;
  streak: number;
  currentWeekTotalVnd: number;
  totalDonated: string;
  lastDeductedAt: string;
}

export interface DonatorTransaction {
  id: string;
  guildId: string;
  userId: string;
  amountVnd: number;
  creditSecondsAdded: number;
  actionType: string;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

export interface PermitAssignment {
  id: string;
  guildId: string;
  targetType: 'USER' | 'ROLE';
  targetId: string;
  tier: 'CO_OWNER' | 'TRUSTED_ADMIN' | 'CUSTOM';
  permissions: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PermitOverview {
  ownerId: string | null;
  config: {
    guildId: string;
    trustedAdminFlags: number;
  };
  coOwners: PermitAssignment[];
  trustedAdmins: PermitAssignment[];
  customPermits: PermitAssignment[];
}

export interface SystemOverview {
  system: {
    uptime: number;
    nodeVersion: string;
    ping: number;
    memory: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
  };
  stats: {
    totalGuilds: number;
    totalMembers: number;
    activeVoiceKeeperConfigs: number;
    activeBoosterPerks: number;
    totalDonators: number;
  };
}

// ==========================================
// THE SWARM LINKED ROLES (FEAT-03)
// ==========================================

export interface SwarmGuildConfig {
  guildId: string;
  notificationChannelId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SwarmOperator {
  userId: string;
  addedBy: string;
  createdAt: string;
}

export interface SwarmMemberMetadata {
  userId: string;
  swarmLevel: number;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SwarmRoleTier {
  level: number;
  name: string;
}

export interface SwarmServerMember {
  userId: string;
  swarmLevel: number;
  updatedAt: string;
  updatedBy?: string;
  username?: string;
  avatar?: string | null;
}

export interface SwarmServerOverviewData {
  config: SwarmGuildConfig | null;
  operators?: SwarmOperator[];
  serverMembers: SwarmServerMember[];
  stats: {
    totalLinked: number;
    totalOperators?: number;
    rolesCount: number;
    levelDistribution: Record<number, number>;
  };
  roles: SwarmRoleTier[];
  callerPermissions: {
    isOperator: boolean;
    isBotOwner: boolean;
    canEditConfig: boolean;
    canManageMembers: boolean;
  };
}

// Backward-compatible alias
export type SwarmOverviewData = SwarmServerOverviewData;

export interface SwarmGlobalGuildConfig {
  guildId: string;
  guildName: string;
  notificationChannelId: string | null;
}

export interface SwarmGlobalOverviewData {
  stats: {
    totalLinked: number;
    totalOperators: number;
    rolesCount: number;
    levelDistribution: Record<number, number>;
    configuredGuildsCount: number;
  };
  operators: SwarmOperator[];
  allMembers: SwarmMemberMetadata[];
  guildConfigs: SwarmGlobalGuildConfig[];
  roles: SwarmRoleTier[];
  isBotOwner: boolean;
}

export interface SwarmAuthStatus {
  authenticated: boolean;
  isOperator: boolean;
  isBotOwner: boolean;
  userId: string | null;
}

// ==========================================
// WORD CHAIN GAME & KARMA ENGINE (FEAT-05)
// ==========================================

export interface WordChainConfig {
  guildId: string;
  normalModeChannelId: string | null;
  hardModeChannelId: string | null;
  reliableRoleId: string | null;
  failedRoleId: string | null;
  failedMemberId: string | null;
  correctInputsByFailedMember: number;
  languages: string;
  isBanned: boolean;
  currentWordNormal: string | null;
  currentCountNormal: number;
  highScoreNormal: number;
  lastMemberIdNormal: string | null;
  currentWordHard: string | null;
  currentCountHard: number;
  highScoreHard: number;
  lastMemberIdHard: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WordChainMemberSummary {
  id: string;
  guildId: string;
  userId: string;
  score: number;
  correctInputs: number;
  wrongInputs: number;
  karma: number;
  createdAt: string;
  updatedAt: string;
}

export interface WordChainSessionState {
  currentWord: string | null;
  currentCount: number;
  highScore: number;
  lastMemberId: string | null;
  usedWordsCount: number;
}

export interface WordChainOverviewData {
  config: WordChainConfig | null;
  sessions: {
    normal: WordChainSessionState;
    hard: WordChainSessionState;
  };
  topKarma: WordChainMemberSummary[];
  topScores: WordChainMemberSummary[];
  stats: {
    totalMembers: number;
    totalUsedWords: number;
  };
}
