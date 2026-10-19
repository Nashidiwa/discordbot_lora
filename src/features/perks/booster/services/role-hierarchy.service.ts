import {
  type ColorResolvable,
  type Guild,
  type GuildMember,
  PermissionFlagsBits,
  resolveColor,
  type Role,
} from 'discord.js';
import { AppError } from '../../../../core/errors.js';
import { logger } from '../../../../core/logger.js';
import { perksLocale } from '../../common/perks.locale.js';

export class RoleHierarchyService {
  public canManageRole(guild: Guild, targetRole: Role): boolean {
    const me = guild.members.me;
    if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return false;
    }

    if (targetRole.managed) {
      return false;
    }

    return me.roles.highest.position > targetRole.position;
  }

  public calculateTargetPosition(
    guild: Guild,
    anchorRoleId?: string | null,
  ): number {
    const me = guild.members.me;
    const botHighest = me?.roles.highest.position ?? 1;

    if (anchorRoleId) {
      const anchorRole = guild.roles.cache.get(anchorRoleId);
      if (anchorRole && anchorRole.position > 1) {
        // Can only position below bot's highest role
        const maxAllowed = Math.max(1, botHighest - 1);
        return Math.min(Math.max(1, anchorRole.position - 1), maxAllowed);
      }
    }

    return Math.max(1, botHighest - 1);
  }

  public isValidHexColor(hex: string): boolean {
    return /^#?[0-9a-fA-F]{6}$/.test(hex.trim());
  }

  public parseHexColor(hex: string): ColorResolvable {
    const cleanHex = hex.trim().startsWith('#')
      ? hex.trim()
      : `#${hex.trim()}`;
    return resolveColor(cleanHex as `#${string}`);
  }

  public async createBoosterRole(
    guild: Guild,
    member: GuildMember,
    name: string,
    colorHex?: string,
    anchorRoleId?: string | null,
  ): Promise<Role> {
    if (guild.roles.cache.size >= 250) {
      throw new AppError(
        perksLocale.vi.ROLE_LIMIT_REACHED,
        'ROLE_LIMIT_REACHED',
        true,
      );
    }

    const me = guild.members.me;
    if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      throw new AppError(
        perksLocale.vi.BOT_HIERARCHY_ERROR,
        'BOT_HIERARCHY_ERROR',
        true,
      );
    }

    let parsedColor: ColorResolvable | undefined;
    if (colorHex) {
      if (!this.isValidHexColor(colorHex)) {
        throw new AppError(
          perksLocale.vi.INVALID_COLOR_HEX,
          'INVALID_COLOR_HEX',
          true,
        );
      }
      parsedColor = this.parseHexColor(colorHex);
    }

    const role = await guild.roles.create({
      name,
      colors: parsedColor ? { primaryColor: parsedColor } : undefined,
      reason: `Lora Perks: Booster Custom Role created for ${member.user.tag}`,
    });

    try {
      const targetPos = this.calculateTargetPosition(guild, anchorRoleId);
      await role.setPosition(targetPos);
    } catch (err: unknown) {
      logger.warn(
        { err, roleId: role.id, guildId: guild.id },
        'Failed to adjust role position',
      );
    }

    await member.roles.add(
      role,
      'Lora Perks: Assigning booster custom role to member',
    );

    return role;
  }

  public async deleteBoosterRole(
    guild: Guild,
    roleId: string,
    reason?: string,
  ): Promise<boolean> {
    try {
      const role =
        guild.roles.cache.get(roleId) ??
        (await guild.roles.fetch(roleId).catch(() => null));

      if (!role) {
        return false;
      }

      if (!this.canManageRole(guild, role)) {
        logger.warn(
          { roleId, guildId: guild.id },
          'Cannot delete booster role due to role hierarchy constraints',
        );
        return false;
      }

      await role.delete(reason ?? 'Lora Perks: Booster custom role removed');
      return true;
    } catch (err: unknown) {
      logger.error(
        { err, roleId, guildId: guild.id },
        'Error deleting booster role',
      );
      return false;
    }
  }
}

export const roleHierarchyService = new RoleHierarchyService();
