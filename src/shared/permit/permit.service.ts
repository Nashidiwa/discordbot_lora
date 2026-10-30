import { AppError } from '../../core/errors.js';
import { logger } from '../../core/logger.js';
import { db } from '../db/client.js';
import {
  ALL_PERMIT_FLAGS,
  DEFAULT_TRUSTED_ADMIN_FLAGS,
  PermitFlag,
  PermitTargetType,
  PermitTier,
} from './permit.constants.js';
import type {
  AssignPermitInput,
  GuildPermitConfigDTO,
  GuildPermitOverview,
  PermitAssignmentDTO,
  PermitResolvedResult,
} from './permit.types.js';

export class PermitService {
  /**
   * Lấy cấu hình Permit của Guild (tự động tạo mặc định nếu chưa tồn tại)
   */
  public static async getGuildConfig(
    guildId: string,
  ): Promise<GuildPermitConfigDTO> {
    const config = await db.guildPermitConfig.upsert({
      where: { guildId },
      update: {},
      create: {
        guildId,
        trustedAdminFlags: DEFAULT_TRUSTED_ADMIN_FLAGS,
      },
    });

    return {
      guildId: config.guildId,
      trustedAdminFlags: config.trustedAdminFlags,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Cập nhật cờ quyền mặc định cho Trusted Admin trong Guild
   */
  public static async updateTrustedAdminFlags(
    guildId: string,
    flags: number,
  ): Promise<GuildPermitConfigDTO> {
    const config = await db.guildPermitConfig.upsert({
      where: { guildId },
      update: { trustedAdminFlags: flags },
      create: {
        guildId,
        trustedAdminFlags: flags,
      },
    });

    logger.info(
      { guildId, flags },
      'Updated trusted admin default flags for guild',
    );

    return {
      guildId: config.guildId,
      trustedAdminFlags: config.trustedAdminFlags,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Lấy danh sách toàn bộ phân quyền Permit của Guild
   */
  public static async getGuildAssignments(
    guildId: string,
  ): Promise<PermitAssignmentDTO[]> {
    const records = await db.guildPermitAssignment.findMany({
      where: { guildId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((r) => ({
      id: r.id,
      guildId: r.guildId,
      targetType: r.targetType as PermitTargetType,
      targetId: r.targetId,
      tier: r.tier as PermitTier,
      permissions: r.permissions,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Lấy tổng quan phân quyền Permit (Config + Nhóm Co-Owner, Trusted Admin, Custom)
   */
  public static async getGuildPermitOverview(
    guildId: string,
  ): Promise<GuildPermitOverview> {
    const [config, assignments] = await Promise.all([
      this.getGuildConfig(guildId),
      this.getGuildAssignments(guildId),
    ]);

    const coOwners: PermitAssignmentDTO[] = [];
    const trustedAdmins: PermitAssignmentDTO[] = [];
    const customPermits: PermitAssignmentDTO[] = [];

    for (const item of assignments) {
      if (item.tier === PermitTier.CO_OWNER) {
        coOwners.push(item);
      } else if (item.tier === PermitTier.TRUSTED_ADMIN) {
        trustedAdmins.push(item);
      } else {
        customPermits.push(item);
      }
    }

    return {
      config,
      coOwners,
      trustedAdmins,
      customPermits,
    };
  }

  /**
   * Cấp phát hoặc cập nhật phân quyền Permit cho User/Role
   */
  public static async assignPermit(
    input: AssignPermitInput,
  ): Promise<PermitAssignmentDTO> {
    // Co-Owner chỉ áp dụng cho cá nhân User
    if (
      input.tier === PermitTier.CO_OWNER &&
      input.targetType !== PermitTargetType.USER
    ) {
      throw new AppError(
        'Co-Owner tier can only be assigned to individual users, not roles.',
        'INVALID_PERMIT_TARGET',
      );
    }

    let effectiveFlags = input.permissions ?? 0;
    if (input.tier === PermitTier.CO_OWNER) {
      effectiveFlags = ALL_PERMIT_FLAGS;
    } else if (input.tier === PermitTier.TRUSTED_ADMIN && !input.permissions) {
      const config = await this.getGuildConfig(input.guildId);
      effectiveFlags = config.trustedAdminFlags;
    }

    const record = await db.guildPermitAssignment.upsert({
      where: {
        guildId_targetType_targetId: {
          guildId: input.guildId,
          targetType: input.targetType,
          targetId: input.targetId,
        },
      },
      update: {
        tier: input.tier,
        permissions: effectiveFlags,
        createdBy: input.createdBy,
      },
      create: {
        guildId: input.guildId,
        targetType: input.targetType,
        targetId: input.targetId,
        tier: input.tier,
        permissions: effectiveFlags,
        createdBy: input.createdBy,
      },
    });

    logger.info(
      {
        guildId: input.guildId,
        targetType: input.targetType,
        targetId: input.targetId,
        tier: input.tier,
        permissions: effectiveFlags,
      },
      'Permit assigned successfully',
    );

    return {
      id: record.id,
      guildId: record.guildId,
      targetType: record.targetType as PermitTargetType,
      targetId: record.targetId,
      tier: record.tier as PermitTier,
      permissions: record.permissions,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Thu hồi phân quyền Permit của một User hoặc Role trong Guild
   */
  public static async revokePermit(
    guildId: string,
    targetType: PermitTargetType,
    targetId: string,
  ): Promise<boolean> {
    try {
      await db.guildPermitAssignment.delete({
        where: {
          guildId_targetType_targetId: {
            guildId,
            targetType,
            targetId,
          },
        },
      });

      logger.info(
        { guildId, targetType, targetId },
        'Permit revoked successfully',
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Đánh giá và phân giải quyền hạn thực tế của một Thành viên (Member) trong Guild
   */
  public static async resolveMemberPermissions(params: {
    guildId: string;
    userId: string;
    memberRoleIds: string[];
    serverOwnerId?: string | null;
    botOwnerId?: string | null;
  }): Promise<PermitResolvedResult> {
    const { guildId, userId, memberRoleIds, serverOwnerId } = params;
    const botOwnerId = params.botOwnerId ?? process.env.BOT_OWNER_ID ?? '';

    const isBotOwner = Boolean(botOwnerId && userId === botOwnerId);
    if (isBotOwner) {
      return {
        userId,
        guildId,
        tier: 'BOT_OWNER',
        effectivePermissions: ALL_PERMIT_FLAGS,
        isBotOwner: true,
        isServerOwner: false,
        isCoOwner: false,
        isTrustedAdmin: false,
        hasPermission: () => true,
      };
    }

    const isServerOwner = Boolean(serverOwnerId && userId === serverOwnerId);
    if (isServerOwner) {
      return {
        userId,
        guildId,
        tier: 'SERVER_OWNER',
        effectivePermissions: ALL_PERMIT_FLAGS,
        isBotOwner: false,
        isServerOwner: true,
        isCoOwner: false,
        isTrustedAdmin: false,
        hasPermission: () => true,
      };
    }

    // Tra cứu các permit áp dụng cho user hoặc các role của user
    const assignments = await db.guildPermitAssignment.findMany({
      where: {
        guildId,
        OR: [
          { targetType: PermitTargetType.USER, targetId: userId },
          {
            targetType: PermitTargetType.ROLE,
            targetId: { in: memberRoleIds },
          },
        ],
      },
    });

    // 1. Kiểm tra Co-Owner (User-level)
    const isCoOwner = assignments.some(
      (a) =>
        a.targetType === PermitTargetType.USER &&
        a.tier === PermitTier.CO_OWNER,
    );
    if (isCoOwner) {
      return {
        userId,
        guildId,
        tier: PermitTier.CO_OWNER,
        effectivePermissions: ALL_PERMIT_FLAGS,
        isBotOwner: false,
        isServerOwner: false,
        isCoOwner: true,
        isTrustedAdmin: false,
        hasPermission: () => true,
      };
    }

    // 2. Kiểm tra Trusted Admin
    const isTrustedAdmin = assignments.some(
      (a) => a.tier === PermitTier.TRUSTED_ADMIN,
    );

    let effectivePermissions = 0;
    if (isTrustedAdmin) {
      const config = await this.getGuildConfig(guildId);
      effectivePermissions |= config.trustedAdminFlags;
    }

    // 3. Gộp các cờ quyền từ Custom Grants
    for (const a of assignments) {
      if (a.tier === PermitTier.CUSTOM) {
        effectivePermissions |= a.permissions;
      }
    }

    const determinedTier = isTrustedAdmin
      ? PermitTier.TRUSTED_ADMIN
      : effectivePermissions > 0
        ? PermitTier.CUSTOM
        : 'MEMBER';

    return {
      userId,
      guildId,
      tier: determinedTier,
      effectivePermissions,
      isBotOwner: false,
      isServerOwner: false,
      isCoOwner: false,
      isTrustedAdmin,
      hasPermission: (flag: number) => (effectivePermissions & flag) === flag,
    };
  }

  /**
   * Kiểm tra nhanh quyền hạn của thành viên
   */
  public static async hasPermission(
    params: {
      guildId: string;
      userId: string;
      memberRoleIds: string[];
      serverOwnerId?: string | null;
      botOwnerId?: string | null;
    },
    requiredFlag: number,
  ): Promise<boolean> {
    const resolved = await this.resolveMemberPermissions(params);
    return resolved.hasPermission(requiredFlag);
  }
}
