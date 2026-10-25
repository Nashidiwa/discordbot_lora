import type {
  BoosterPerkConfig,
  CustomRolePerk,
} from '@prisma/client';
import {
  type Guild,
  GuildFeature,
  type GuildMember,
} from 'discord.js';
import type { ExtendedClient } from '../../../../core/client.js';
import { AppError } from '../../../../core/errors.js';
import { logger } from '../../../../core/logger.js';
import { db } from '../../../../shared/db/client.js';
import { perksLocale } from '../../common/perks.locale.js';
import {
  type ConfigCustomRoleResult,
  type CustomRoleConfigOptions,
  PerkStatus,
  PerkType,
} from '../../common/perks.types.js';
import { roleHierarchyService } from './role-hierarchy.service.js';

export interface ClaimResult {
  status: 'CLAIM_NEW' | 'REEQUIPPED' | 'ALREADY_EQUIPPED';
  roleId: string;
  roleName?: string | null;
}

export class BoosterPerkService {
  public async getOrCreateConfig(guildId: string): Promise<BoosterPerkConfig> {
    return db.boosterPerkConfig.upsert({
      where: { guildId },
      update: {},
      create: {
        guildId,
        gracePeriodDays: 21,
      },
    });
  }

  public async getPerk(
    guildId: string,
    userId: string,
  ): Promise<CustomRolePerk | null> {
    return db.customRolePerk.findUnique({
      where: {
        guildId_userId_perkType: {
          guildId,
          userId,
          perkType: PerkType.SERVER_BOOSTER,
        },
      },
    });
  }

  public async claimCustomRole(
    guild: Guild,
    member: GuildMember,
  ): Promise<ClaimResult> {
    const perk = await this.getPerk(guild.id, member.id);
    const isBooster = Boolean(
      member.premiumSince || (perk && perk.boostCount > 0),
    );

    if (!isBooster) {
      throw new AppError(
        perksLocale.vi.NOT_A_BOOSTER,
        'NOT_A_BOOSTER',
        true,
      );
    }

    if (!perk) {
      const config = await this.getOrCreateConfig(guild.id);
      const roleName = member.displayName;

      const role = await roleHierarchyService.createBoosterRole(
        guild,
        member,
        roleName,
        undefined,
        config.anchorRoleId,
      );

      await db.customRolePerk.create({
        data: {
          guildId: guild.id,
          userId: member.id,
          perkType: PerkType.SERVER_BOOSTER,
          roleId: role.id,
          roleName: role.name,
          status: PerkStatus.ACTIVE,
          isEquipped: true,
          boostCount: 1,
        },
      });

      return {
        status: 'CLAIM_NEW',
        roleId: role.id,
        roleName: role.name,
      };
    }

    // Role perk already exists in DB
    if (perk.roleId) {
      const existingRole =
        guild.roles.cache.get(perk.roleId) ??
        (await guild.roles.fetch(perk.roleId).catch(() => null));

      if (existingRole) {
        if (perk.isEquipped && member.roles.cache.has(existingRole.id)) {
          return {
            status: 'ALREADY_EQUIPPED',
            roleId: existingRole.id,
            roleName: existingRole.name,
          };
        }

        // Role exists but member does not have it equipped
        await member.roles.add(
          existingRole,
          'Lora Perks: Re-equipping booster custom role',
        );

        await db.customRolePerk.update({
          where: { id: perk.id },
          data: {
            isEquipped: true,
            status: PerkStatus.ACTIVE,
            gracePeriodExpiresAt: null,
          },
        });

        return {
          status: 'REEQUIPPED',
          roleId: existingRole.id,
          roleName: existingRole.name,
        };
      }
    }

    // Role record exists in DB but role was deleted in Discord -> recreate
    const config = await this.getOrCreateConfig(guild.id);
    const newRole = await roleHierarchyService.createBoosterRole(
      guild,
      member,
      perk.roleName ?? member.displayName,
      perk.roleColor ?? undefined,
      config.anchorRoleId,
    );

    await db.customRolePerk.update({
      where: { id: perk.id },
      data: {
        roleId: newRole.id,
        roleName: newRole.name,
        status: PerkStatus.ACTIVE,
        isEquipped: true,
        gracePeriodExpiresAt: null,
      },
    });

    return {
      status: 'CLAIM_NEW',
      roleId: newRole.id,
      roleName: newRole.name,
    };
  }

  public async unclaimCustomRole(
    guild: Guild,
    member: GuildMember,
  ): Promise<{ roleId: string }> {
    const perk = await this.getPerk(guild.id, member.id);
    if (!perk || !perk.roleId) {
      throw new AppError(
        perksLocale.vi.PERK_NOT_CLAIMED,
        'PERK_NOT_CLAIMED',
        true,
      );
    }

    if (member.roles.cache.has(perk.roleId)) {
      await member.roles.remove(
        perk.roleId,
        'Lora Perks: Member unequipped custom role',
      );
    }

    await db.customRolePerk.update({
      where: { id: perk.id },
      data: { isEquipped: false },
    });

    return { roleId: perk.roleId };
  }

  public async configCustomRole(
    guild: Guild,
    member: GuildMember,
    options: CustomRoleConfigOptions,
  ): Promise<ConfigCustomRoleResult> {
    const perk = await this.getPerk(guild.id, member.id);
    if (!perk || !perk.roleId) {
      throw new AppError(
        perksLocale.vi.PERK_NOT_CLAIMED,
        'PERK_NOT_CLAIMED',
        true,
      );
    }

    if (
      options.color1 &&
      !roleHierarchyService.isValidHexColor(options.color1)
    ) {
      throw new AppError(
        perksLocale.vi.INVALID_COLOR_HEX,
        'INVALID_COLOR_HEX',
        true,
      );
    }

    if (
      options.color2 &&
      !roleHierarchyService.isValidHexColor(options.color2)
    ) {
      throw new AppError(
        perksLocale.vi.INVALID_COLOR_HEX,
        'INVALID_COLOR_HEX',
        true,
      );
    }

    // 1. Kiểm tra điều kiện Gradient 2 màu
    if (options.color2) {
      if (perk.boostCount < 2) {
        throw new AppError(
          perksLocale.vi.SINGLE_BOOSTER_REJECT,
          'SINGLE_BOOSTER_REJECT',
          true,
        );
      }

      if (!options.color1 && !perk.roleColor) {
        throw new AppError(
          perksLocale.vi.MISSING_PRIMARY_COLOR,
          'MISSING_PRIMARY_COLOR',
          true,
        );
      }

      const hasEnhancedColors = guild.features.includes(
        GuildFeature.EnhancedRoleColors,
      );
      if (!hasEnhancedColors) {
        throw new AppError(
          perksLocale.vi.SERVER_LACKS_ENHANCED_ROLE_COLORS,
          'SERVER_LACKS_ENHANCED_ROLE_COLORS',
          true,
        );
      }
    }

    // 2. Tìm và kiểm tra quyền quản lý Role trên Discord
    const role =
      guild.roles.cache.get(perk.roleId) ??
      (await guild.roles.fetch(perk.roleId).catch(() => null));

    if (!role) {
      throw new AppError(
        perksLocale.vi.NO_ROLE_FOUND,
        'NO_ROLE_FOUND',
        true,
      );
    }

    if (!roleHierarchyService.canManageRole(guild, role)) {
      throw new AppError(
        perksLocale.vi.BOT_HIERARCHY_ERROR,
        'BOT_HIERARCHY_ERROR',
        true,
      );
    }

    // 3. Chuẩn bị payload theo cấu trúc colors mới của Discord.js 14.27+
    const editPayload: {
      name?: string;
      colors?: {
        primaryColor: ReturnType<typeof roleHierarchyService.parseHexColor>;
        secondaryColor?: ReturnType<typeof roleHierarchyService.parseHexColor>;
      };
    } = {};

    if (options.name) {
      editPayload.name = options.name;
    }

    const primaryHex = options.color1 ?? (options.color2 ? perk.roleColor : undefined);

    if (options.color2 && primaryHex) {
      editPayload.colors = {
        primaryColor: roleHierarchyService.parseHexColor(primaryHex),
        secondaryColor: roleHierarchyService.parseHexColor(options.color2),
      };
    } else if (options.color1) {
      editPayload.colors = {
        primaryColor: roleHierarchyService.parseHexColor(options.color1),
      };
    }

    if (Object.keys(editPayload).length > 0) {
      await role.edit(editPayload);
    }

    // 4. Đồng bộ Database
    const updatedPerk = await db.customRolePerk.update({
      where: { id: perk.id },
      data: {
        roleName: options.name ?? perk.roleName,
        ...(options.color2 && primaryHex
          ? { roleColor: primaryHex, roleColor2: options.color2 }
          : options.color1
            ? { roleColor: options.color1, roleColor2: null }
            : {}),
      },
    });

    return {
      roleName: updatedPerk.roleName,
      roleColor: updatedPerk.roleColor,
      roleColor2: updatedPerk.roleColor2,
    };
  }

  public async handleUnboost(guildId: string, userId: string): Promise<void> {
    const perk = await this.getPerk(guildId, userId);
    if (!perk || perk.status !== PerkStatus.ACTIVE) {
      return;
    }

    const config = await this.getOrCreateConfig(guildId);
    const expiresAt = new Date(
      Date.now() + config.gracePeriodDays * 86_400_000,
    );

    await db.customRolePerk.update({
      where: { id: perk.id },
      data: {
        boostCount: 0,
        roleColor2: null,
        status: PerkStatus.GRACE_PERIOD,
        gracePeriodExpiresAt: expiresAt,
      },
    });

    logger.info(
      { guildId, userId, expiresAt },
      'Booster entered grace period',
    );
  }

  public async handleReboost(guildId: string, userId: string): Promise<void> {
    const perk = await this.getPerk(guildId, userId);
    if (!perk || perk.status !== PerkStatus.GRACE_PERIOD) {
      return;
    }

    await db.customRolePerk.update({
      where: { id: perk.id },
      data: {
        status: PerkStatus.ACTIVE,
        gracePeriodExpiresAt: null,
      },
    });

    logger.info({ guildId, userId }, 'Booster re-boosted, grace period cleared');
  }

  public async incrementBoostCount(
    guildId: string,
    userId: string,
  ): Promise<void> {
    await db.customRolePerk.upsert({
      where: {
        guildId_userId_perkType: {
          guildId,
          userId,
          perkType: PerkType.SERVER_BOOSTER,
        },
      },
      update: {
        boostCount: { increment: 1 },
      },
      create: {
        guildId,
        userId,
        perkType: PerkType.SERVER_BOOSTER,
        boostCount: 1,
      },
    });
  }

  public async setBoostCount(
    guildId: string,
    userId: string,
    count: number,
  ): Promise<CustomRolePerk> {
    return db.customRolePerk.upsert({
      where: {
        guildId_userId_perkType: {
          guildId,
          userId,
          perkType: PerkType.SERVER_BOOSTER,
        },
      },
      update: {
        boostCount: count,
        ...(count >= 1
          ? {
              status: PerkStatus.ACTIVE,
              gracePeriodExpiresAt: null,
            }
          : {
              roleColor2: null,
              status: PerkStatus.REVOKED,
              gracePeriodExpiresAt: null,
            }),
      },
      create: {
        guildId,
        userId,
        perkType: PerkType.SERVER_BOOSTER,
        boostCount: count,
        status: count >= 1 ? PerkStatus.ACTIVE : PerkStatus.REVOKED,
      },
    });
  }

  public async setBoostCountStandardGrace(
    guildId: string,
    userId: string,
  ): Promise<CustomRolePerk> {
    const config = await this.getOrCreateConfig(guildId);
    const expiresAt = new Date(
      Date.now() + config.gracePeriodDays * 86_400_000,
    );

    return db.customRolePerk.update({
      where: {
        guildId_userId_perkType: {
          guildId,
          userId,
          perkType: PerkType.SERVER_BOOSTER,
        },
      },
      data: {
        boostCount: 0,
        roleColor2: null,
        status: PerkStatus.GRACE_PERIOD,
        gracePeriodExpiresAt: expiresAt,
      },
    });
  }

  public async setBoostCountInstantRevoke(
    guild: Guild,
    userId: string,
  ): Promise<CustomRolePerk> {
    const perk = await this.getPerk(guild.id, userId);
    if (perk && perk.roleId) {
      await roleHierarchyService.deleteBoosterRole(
        guild,
        perk.roleId,
        'Lora Perks: Admin manually revoked booster role immediately',
      );
    }

    return db.customRolePerk.update({
      where: {
        guildId_userId_perkType: {
          guildId: guild.id,
          userId,
          perkType: PerkType.SERVER_BOOSTER,
        },
      },
      data: {
        boostCount: 0,
        roleColor2: null,
        status: PerkStatus.REVOKED,
        isEquipped: false,
        gracePeriodExpiresAt: null,
      },
    });
  }

  public async cleanupExpiredGracePeriods(
    client: ExtendedClient,
  ): Promise<number> {
    const expiredPerks = await db.customRolePerk.findMany({
      where: {
        status: PerkStatus.GRACE_PERIOD,
        gracePeriodExpiresAt: {
          lte: new Date(),
        },
      },
    });

    let cleanedCount = 0;

    for (const perk of expiredPerks) {
      try {
        const guild =
          client.guilds.cache.get(perk.guildId) ??
          (await client.guilds.fetch(perk.guildId).catch(() => null));

        if (guild && perk.roleId) {
          await roleHierarchyService.deleteBoosterRole(
            guild,
            perk.roleId,
            'Lora Perks: Grace period expired for non-booster',
          );
        }

        await db.customRolePerk.update({
          where: { id: perk.id },
          data: {
            status: PerkStatus.REVOKED,
            isEquipped: false,
            boostCount: 0,
            roleColor2: null,
          },
        });

        cleanedCount++;
        logger.info(
          { guildId: perk.guildId, userId: perk.userId },
          'Revoked expired booster custom role',
        );
      } catch (err: unknown) {
        logger.error(
          { err, perkId: perk.id, guildId: perk.guildId },
          'Error cleaning up expired perk',
        );
      }
    }

    return cleanedCount;
  }
}

export const boosterPerkService = new BoosterPerkService();
