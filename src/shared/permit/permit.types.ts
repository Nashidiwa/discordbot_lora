import type {
  PermitFlagKey,
  PermitTargetType,
  PermitTier,
} from './permit.constants.js';

export interface PermitAssignmentDTO {
  id: string;
  guildId: string;
  targetType: PermitTargetType;
  targetId: string;
  tier: PermitTier;
  permissions: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuildPermitConfigDTO {
  guildId: string;
  trustedAdminFlags: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuildPermitOverview {
  config: GuildPermitConfigDTO;
  coOwners: PermitAssignmentDTO[];
  trustedAdmins: PermitAssignmentDTO[];
  customPermits: PermitAssignmentDTO[];
}

export interface PermitResolvedResult {
  userId: string;
  guildId: string;
  tier: PermitTier | 'BOT_OWNER' | 'SERVER_OWNER' | 'MEMBER';
  effectivePermissions: number;
  isBotOwner: boolean;
  isServerOwner: boolean;
  isCoOwner: boolean;
  isTrustedAdmin: boolean;
  hasPermission: (flag: number) => boolean;
}

export interface AssignPermitInput {
  guildId: string;
  targetType: PermitTargetType;
  targetId: string;
  tier: PermitTier;
  permissions?: number;
  createdBy: string;
}
