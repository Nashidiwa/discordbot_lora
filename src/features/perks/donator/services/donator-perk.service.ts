import type {
  DonatorAccount,
  DonatorPerkConfig,
  DonatorTransaction,
} from '@prisma/client';
import {
  type Guild,
  type GuildMember,
  PermissionFlagsBits,
  type Role,
} from 'discord.js';
import type { ExtendedClient } from '../../../../core/client.js';
import { AppError } from '../../../../core/errors.js';
import { logger } from '../../../../core/logger.js';
import { EmbedColor } from '../../../../shared/constants/colors.js';
import { db } from '../../../../shared/db/client.js';
import {
  createBaseEmbed,
  createSuccessEmbed,
  createWarningEmbed,
} from '../../../../shared/utils/embed.util.js';
import {
  DonatorActionType,
  DonatorBenchmark,
  DonatorBurnRate,
  DonatorErrorCode,
  StreakBonusTiers,
  VolumeBonusTiers,
  WeeklyStreakRule,
} from '../donator.constants.js';
import type {
  DonationCalculationResult,
  DonatorAccountStatus,
  LazyEvaluationResult,
} from '../donator.types.js';
import {
  formatCurrencyVnd,
  formatDurationVietnamese,
  getWeekStartUtcPlus7,
} from '../donator.utils.js';

export interface AddDonationParams {
  guildId: string;
  userId: string;
  amountVnd: number;
  note?: string;
  createdBy: string;
  guild: Guild;
}

export interface AdjustCreditParams {
  guildId: string;
  userId: string;
  seconds: number;
  reason?: string;
  createdBy: string;
}

export interface SetStreakParams {
  guildId: string;
  userId: string;
  streak: number;
  createdBy: string;
}

export class DonatorPerkService {
  /**
   * Retrieves existing configuration for a guild or initializes default record.
   */
  public async getOrCreateConfig(guildId: string): Promise<DonatorPerkConfig> {
    return db.donatorPerkConfig.upsert({
      where: { guildId },
      update: {},
      create: {
        guildId,
        isEnabled: false,
        baseBenchmarkVnd: DonatorBenchmark.DEFAULT_BENCHMARK_AMOUNT_VND,
        baseBenchmarkDays: DonatorBenchmark.DEFAULT_BENCHMARK_DAYS,
        weeklyMinVnd: WeeklyStreakRule.DEFAULT_WEEKLY_MIN_AMOUNT_VND,
        idleBurnRate: DonatorBurnRate.STORED,
      },
    });
  }

  /**
   * Calculates credit seconds and applicable multipliers for a donation.
   * Multiplies before dividing to prevent floating precision loss.
   */
  public calculateDonation(
    amountVnd: number,
    currentStreak: number,
    config: DonatorPerkConfig,
  ): DonationCalculationResult {
    if (amountVnd <= 0) {
      throw new AppError(
        'Số tiền ủng hộ phải lớn hơn 0.',
        DonatorErrorCode.INVALID_AMOUNT,
        true,
      );
    }

    // Multiply before divide: Math.floor((amountVnd * benchmarkDays * 86400) / benchmarkAmountVnd)
    const baseCreditSeconds = Math.floor(
      (amountVnd * config.baseBenchmarkDays * DonatorBenchmark.SECONDS_PER_DAY) /
        config.baseBenchmarkVnd,
    );

    // Volume bonus tier matching (sorted descending)
    const volumeTier = VolumeBonusTiers.find((tier) => amountVnd >= tier.minAmount);
    const bonusVolumePercent = volumeTier ? volumeTier.percent : 0;

    // Streak bonus tier matching (sorted descending)
    const streakTier = StreakBonusTiers.find((tier) => currentStreak >= tier.minStreak);
    const bonusStreakPercent = streakTier ? streakTier.percent : 0;

    const totalMultiplier = 1 + (bonusVolumePercent + bonusStreakPercent) / 100;
    const creditSecondsAdded = Math.round(baseCreditSeconds * totalMultiplier);

    return {
      baseCreditSeconds,
      bonusVolumePercent,
      bonusStreakPercent,
      totalMultiplier,
      creditSecondsAdded,
      newStreak: currentStreak,
      isStreakIncremented: false,
    };
  }

  /**
   * Lazy evaluation engine:
   * Computes consumed credit based on elapsed time and current burn rate.
   * Only commits update to database if commit is explicitly set to true.
   */
  public async evaluateAccountCredit(
    account: DonatorAccount,
    config: DonatorPerkConfig,
    now: Date = new Date(),
    commit = false,
  ): Promise<LazyEvaluationResult> {
    let burnRate: DonatorBurnRate = DonatorBurnRate.FROZEN;
    if (!config.isEnabled) {
      burnRate = DonatorBurnRate.FROZEN;
    } else if (account.isEquipped) {
      burnRate = DonatorBurnRate.EQUIPPED;
    } else {
      burnRate = config.idleBurnRate as DonatorBurnRate;
    }

    const deltaSeconds = Math.max(
      0,
      (now.getTime() - account.lastDeductedAt.getTime()) / 1000,
    );
    const consumedSeconds = deltaSeconds * burnRate;
    const newCreditSeconds = Math.max(
      0,
      account.creditSeconds - consumedSeconds,
    );
    const isDepleted = newCreditSeconds <= 0;

    if (commit) {
      await db.donatorAccount.update({
        where: { id: account.id },
        data: {
          creditSeconds: newCreditSeconds,
          lastDeductedAt: now,
        },
      });
    }

    return {
      previousCreditSeconds: account.creditSeconds,
      newCreditSeconds,
      consumedSeconds,
      deltaSeconds,
      burnRate,
      isDepleted,
      evaluatedAt: now,
    };
  }

  /**
   * Safe read-only calculation of member's balance and state in memory.
   * ABSOLUTELY NO database update or insert is executed.
   */
  public async getAccountStatus(
    guildId: string,
    userId: string,
  ): Promise<DonatorAccountStatus | null> {
    const account = await db.donatorAccount.findUnique({
      where: {
        guildId_userId: { guildId, userId },
      },
    });

    if (!account) {
      return null;
    }

    const config = (await db.donatorPerkConfig.findUnique({
      where: { guildId },
    })) ?? {
      guildId,
      isEnabled: false,
      donatorRoleId: null,
      notificationChannelId: null,
      baseBenchmarkVnd: DonatorBenchmark.DEFAULT_BENCHMARK_AMOUNT_VND,
      baseBenchmarkDays: DonatorBenchmark.DEFAULT_BENCHMARK_DAYS,
      weeklyMinVnd: WeeklyStreakRule.DEFAULT_WEEKLY_MIN_AMOUNT_VND,
      idleBurnRate: DonatorBurnRate.STORED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // In-memory lazy evaluation without DB write
    const evalResult = await this.evaluateAccountCredit(
      account,
      config,
      new Date(),
      false,
    );

    const remainingDays = Math.floor(
      evalResult.newCreditSeconds / DonatorBenchmark.SECONDS_PER_DAY,
    );
    const remainingHours = Math.floor(
      (evalResult.newCreditSeconds % DonatorBenchmark.SECONDS_PER_DAY) / 3600,
    );

    let estimatedDepletionDate: Date | null = null;
    if (evalResult.newCreditSeconds > 0 && evalResult.burnRate > 0) {
      const realSecondsRemaining =
        evalResult.newCreditSeconds / evalResult.burnRate;
      estimatedDepletionDate = new Date(
        evalResult.evaluatedAt.getTime() + realSecondsRemaining * 1000,
      );
    }

    return {
      guildId,
      userId,
      creditSeconds: evalResult.newCreditSeconds,
      remainingDays,
      remainingHours,
      isEquipped: account.isEquipped,
      currentBurnRate: evalResult.burnRate,
      streak: account.streak,
      currentWeekTotalVnd: account.currentWeekTotalVnd,
      totalDonatedVnd: account.totalDonated,
      estimatedDepletionDate,
      lastDeductedAt: account.lastDeductedAt,
      isEnabled: config.isEnabled,
    };
  }

  /**
   * Adds a new donation record:
   * - Settles existing credit consumption.
   * - Evaluates calendar week boundaries in UTC+7 and soft resets if new week.
   * - Increments weekly streak when minimum threshold is met.
   * - Adds new credit seconds and equips role automatically.
   * - Sends thank you DM with fallback to notification channel.
   */
  public async addDonation(params: AddDonationParams): Promise<{
    account: DonatorAccount;
    transaction: DonatorTransaction;
    calculation: DonationCalculationResult;
  }> {
    const config = await this.getOrCreateConfig(params.guildId);
    if (!config.isEnabled) {
      throw new AppError(
        'Tính năng Donator hiện đang tắt. Vui lòng bật tính năng trước khi ghi nhận ủng hộ.',
        DonatorErrorCode.FEATURE_DISABLED,
        true,
      );
    }

    if (!config.donatorRoleId) {
      throw new AppError(
        'Role Donator chưa được cấu hình. Vui lòng cấu hình Role trước.',
        DonatorErrorCode.ROLE_NOT_CONFIGURED,
        true,
      );
    }

    const now = new Date();
    const currentWeekStart = getWeekStartUtcPlus7(now);

    let account = await db.donatorAccount.findUnique({
      where: {
        guildId_userId: { guildId: params.guildId, userId: params.userId },
      },
    });

    if (!account) {
      account = await db.donatorAccount.create({
        data: {
          guildId: params.guildId,
          userId: params.userId,
          creditSeconds: 0,
          isEquipped: true,
          streak: 0,
          currentWeekTotalVnd: 0,
          totalDonated: 0n,
          lastDeductedAt: now,
          lastActiveWeekStart: currentWeekStart,
        },
      });
    } else {
      // Commit pending credit deduction
      await this.evaluateAccountCredit(account, config, now, true);
      account = (await db.donatorAccount.findUnique({
        where: { id: account.id },
      }))!;
    }

    // Week cycle & streak evaluation
    const isNewWeek =
      !account.lastActiveWeekStart ||
      account.lastActiveWeekStart.getTime() < currentWeekStart.getTime();

    let effectiveStreak = account.streak;
    let currentWeekTotalVnd = account.currentWeekTotalVnd;

    if (isNewWeek) {
      // Soft decay check if previous week didn't meet minimum and wasn't yet decayed
      if (
        account.streak > 0 &&
        account.currentWeekTotalVnd < config.weeklyMinVnd
      ) {
        effectiveStreak = Math.max(0, account.streak - 1);
      }
      currentWeekTotalVnd = 0;
    }

    const newWeekTotalVnd = currentWeekTotalVnd + params.amountVnd;
    let newStreak = effectiveStreak;
    let isStreakIncremented = false;

    const alreadyIncrementedThisWeek =
      !isNewWeek && account.currentWeekTotalVnd >= config.weeklyMinVnd;

    if (!alreadyIncrementedThisWeek && newWeekTotalVnd >= config.weeklyMinVnd) {
      newStreak = Math.min(effectiveStreak + 1, WeeklyStreakRule.MAX_STREAK);
      isStreakIncremented = true;
    }

    // Credit calculation using the resolved streak
    const calculation = this.calculateDonation(
      params.amountVnd,
      newStreak,
      config,
    );
    calculation.newStreak = newStreak;
    calculation.isStreakIncremented = isStreakIncremented;

    // Database updates
    const updatedAccount = await db.donatorAccount.update({
      where: { id: account.id },
      data: {
        creditSeconds: { increment: calculation.creditSecondsAdded },
        isEquipped: true,
        streak: newStreak,
        currentWeekTotalVnd: newWeekTotalVnd,
        totalDonated: { increment: BigInt(params.amountVnd) },
        lastActiveWeekStart: currentWeekStart,
        lastDeductedAt: now,
      },
    });

    const transaction = await db.donatorTransaction.create({
      data: {
        guildId: params.guildId,
        userId: params.userId,
        amountVnd: params.amountVnd,
        bonusVolumePercent: calculation.bonusVolumePercent,
        bonusStreakPercent: calculation.bonusStreakPercent,
        creditSecondsAdded: calculation.creditSecondsAdded,
        actionType: DonatorActionType.DONATION,
        note: params.note ?? null,
        createdBy: params.createdBy,
      },
    });

    // Discord role assignment with Role Hierarchy Guard
    const member = await params.guild.members
      .fetch(params.userId)
      .catch(() => null);

    if (member && config.donatorRoleId) {
      const role =
        params.guild.roles.cache.get(config.donatorRoleId) ??
        (await params.guild.roles.fetch(config.donatorRoleId).catch(() => null));

      if (role && !member.roles.cache.has(role.id)) {
        const me =
          params.guild.members.me ??
          (await params.guild.members.fetchMe().catch(() => null));

        if (me && role.comparePositionTo(me.roles.highest) >= 0) {
          logger.warn(
            { guildId: params.guildId, userId: params.userId, roleId: role.id },
            'Cannot assign Donator role: Bot role is lower than Donator role in hierarchy',
          );
        } else {
          await member.roles
            .add(
              role,
              `Lora Perks: Donation received (${formatCurrencyVnd(params.amountVnd)})`,
            )
            .catch((err: unknown) => {
              logger.warn(
                { err, guildId: params.guildId, userId: params.userId },
                'Failed to assign Donator role on Discord',
              );
            });
        }
      }
    }

    // Direct Message notification with fallback to notification channel
    if (member) {
      await this.sendDonationNotification(
        member,
        params.guild,
        config,
        params.amountVnd,
        calculation,
        updatedAccount,
      );
    }

    return {
      account: updatedAccount,
      transaction,
      calculation,
    };
  }

  /**
   * Equips the Donator role:
   * Settles credit, adds role on Discord, and sets burn rate to 1.0x.
   */
  public async equipRole(
    guildId: string,
    userId: string,
    guild: Guild,
  ): Promise<DonatorAccount> {
    const config = await this.getOrCreateConfig(guildId);
    if (!config.isEnabled) {
      throw new AppError(
        'Tính năng Donator hiện đang tắt trên server này.',
        DonatorErrorCode.FEATURE_DISABLED,
        true,
      );
    }

    if (!config.donatorRoleId) {
      throw new AppError(
        'Role Donator chưa được cấu hình trên server này.',
        DonatorErrorCode.ROLE_NOT_CONFIGURED,
        true,
      );
    }

    const account = await db.donatorAccount.findUnique({
      where: { guildId_userId: { guildId, userId } },
    });

    if (!account) {
      throw new AppError(
        'Bạn chưa có thông tin tài khoản Donator.',
        DonatorErrorCode.ACCOUNT_NOT_FOUND,
        true,
      );
    }

    if (account.isEquipped) {
      throw new AppError(
        'Bạn đã trang bị Role Donator rồi.',
        DonatorErrorCode.ALREADY_EQUIPPED,
        true,
      );
    }

    // Commit pending deduction before switching burn rate
    const evalResult = await this.evaluateAccountCredit(
      account,
      config,
      new Date(),
      true,
    );

    if (evalResult.newCreditSeconds <= 0) {
      throw new AppError(
        'Thời gian credit của bạn đã hết. Vui lòng ủng hộ thêm để kích hoạt lại role.',
        DonatorErrorCode.INSUFFICIENT_CREDIT,
        true,
      );
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      throw new AppError(
        'Không tìm thấy thành viên trong server.',
        'MEMBER_NOT_FOUND',
        true,
      );
    }

    const role =
      guild.roles.cache.get(config.donatorRoleId) ??
      (await guild.roles.fetch(config.donatorRoleId).catch(() => null));

    if (!role) {
      throw new AppError(
        'Không tìm thấy Role Donator trên server.',
        DonatorErrorCode.ROLE_NOT_CONFIGURED,
        true,
      );
    }

    const me =
      guild.members.me ?? (await guild.members.fetchMe().catch(() => null));

    if (
      me &&
      role.comparePositionTo(me.roles.highest) >= 0
    ) {
      throw new AppError(
        'Role của bot thấp hơn Role Donator, không thể gán role. Vui lòng liên hệ Server Administrator.',
        DonatorErrorCode.ROLE_HIERARCHY_ERROR,
        true,
      );
    }

    await member.roles.add(
      role,
      'Lora Perks: Equipping Donator role (activating 1.0x burn rate)',
    );

    return db.donatorAccount.update({
      where: { id: account.id },
      data: { isEquipped: true },
    });
  }

  /**
   * Unequips the Donator role into the savings vault:
   * Settles credit, removes role on Discord, and reduces burn rate to 0.2x.
   */
  public async unequipRole(
    guildId: string,
    userId: string,
    guild: Guild,
  ): Promise<DonatorAccount> {
    const config = await this.getOrCreateConfig(guildId);
    const account = await db.donatorAccount.findUnique({
      where: { guildId_userId: { guildId, userId } },
    });

    if (!account) {
      throw new AppError(
        'Bạn chưa có thông tin tài khoản Donator.',
        DonatorErrorCode.ACCOUNT_NOT_FOUND,
        true,
      );
    }

    if (!account.isEquipped) {
      throw new AppError(
        'Role Donator của bạn hiện đang được cất trong kho rồi.',
        DonatorErrorCode.ALREADY_UNEQUIPPED,
        true,
      );
    }

    // Settle credit at 1.0x rate before switching to vault 0.2x
    await this.evaluateAccountCredit(account, config, new Date(), true);

    if (config.donatorRoleId) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) {
        const role =
          guild.roles.cache.get(config.donatorRoleId) ??
          (await guild.roles.fetch(config.donatorRoleId).catch(() => null));

        if (role && member.roles.cache.has(role.id)) {
          await member.roles
            .remove(
              role,
              'Lora Perks: Unequipping Donator role (activating vault 0.2x burn rate)',
            )
            .catch((err: unknown) => {
              logger.warn(
                { err, guildId, userId },
                'Failed to remove role from member during unequip',
              );
            });
        }
      }
    }

    return db.donatorAccount.update({
      where: { id: account.id },
      data: { isEquipped: false },
    });
  }

  /**
   * Adjusts credit seconds manually by an administrator.
   */
  public async adjustCredit(
    params: AdjustCreditParams,
  ): Promise<DonatorAccount> {
    const config = await this.getOrCreateConfig(params.guildId);
    let account = await db.donatorAccount.findUnique({
      where: {
        guildId_userId: { guildId: params.guildId, userId: params.userId },
      },
    });

    if (!account) {
      throw new AppError(
        'Không tìm thấy tài khoản Donator để điều chỉnh.',
        DonatorErrorCode.ACCOUNT_NOT_FOUND,
        true,
      );
    }

    // Commit current consumption
    await this.evaluateAccountCredit(account, config, new Date(), true);
    account = (await db.donatorAccount.findUnique({
      where: { id: account.id },
    }))!;

    const newCreditSeconds = Math.max(0, account.creditSeconds + params.seconds);
    const actionType =
      params.seconds >= 0
        ? DonatorActionType.ADJUST_ADD
        : DonatorActionType.ADJUST_DEDUCT;

    const updatedAccount = await db.donatorAccount.update({
      where: { id: account.id },
      data: { creditSeconds: newCreditSeconds },
    });

    await db.donatorTransaction.create({
      data: {
        guildId: params.guildId,
        userId: params.userId,
        amountVnd: 0,
        bonusVolumePercent: 0,
        bonusStreakPercent: 0,
        creditSecondsAdded: params.seconds,
        actionType,
        note: params.reason ?? null,
        createdBy: params.createdBy,
      },
    });

    return updatedAccount;
  }

  /**
   * Updates user streak tier manually by an administrator.
   */
  public async setStreak(params: SetStreakParams): Promise<DonatorAccount> {
    const account = await db.donatorAccount.findUnique({
      where: {
        guildId_userId: { guildId: params.guildId, userId: params.userId },
      },
    });

    if (!account) {
      throw new AppError(
        'Không tìm thấy tài khoản Donator.',
        DonatorErrorCode.ACCOUNT_NOT_FOUND,
        true,
      );
    }

    const updatedAccount = await db.donatorAccount.update({
      where: { id: account.id },
      data: { streak: params.streak },
    });

    await db.donatorTransaction.create({
      data: {
        guildId: params.guildId,
        userId: params.userId,
        amountVnd: 0,
        bonusVolumePercent: 0,
        bonusStreakPercent: 0,
        creditSecondsAdded: 0,
        actionType: DonatorActionType.SET_STREAK,
        note: `Admin set streak to ${params.streak}`,
        createdBy: params.createdBy,
      },
    });

    return updatedAccount;
  }

  /**
   * Toggles the Donator Perk system on or off for a guild:
   * When turned off:
   * - Settles credit consumption up to now.
   * - Freezes time consumption (0.0x).
   * - Temporarily removes role from members.
   * When turned on:
   * - Re-checks role configuration.
   * - Resets lastDeductedAt to now to prevent back-billing during maintenance.
   */
  public async togglePerk(
    guildId: string,
    isEnabled: boolean,
    guild: Guild,
  ): Promise<DonatorPerkConfig> {
    const config = await this.getOrCreateConfig(guildId);

    if (isEnabled) {
      if (!config.donatorRoleId) {
        throw new AppError(
          'Vui lòng cấu hình Role Donator bằng /perk donator config set_role trước khi bật tính năng.',
          DonatorErrorCode.ROLE_NOT_CONFIGURED,
          true,
        );
      }

      // Reset lastDeductedAt to current timestamp for all accounts in guild
      await db.donatorAccount.updateMany({
        where: { guildId },
        data: { lastDeductedAt: new Date() },
      });

      // Restore role to equipped accounts with remaining credit
      const accounts = await db.donatorAccount.findMany({
        where: { guildId, isEquipped: true, creditSeconds: { gt: 0 } },
      });

      const role =
        guild.roles.cache.get(config.donatorRoleId) ??
        (await guild.roles.fetch(config.donatorRoleId).catch(() => null));

      if (role) {
        const me =
          guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
        const canAssign = !me || role.comparePositionTo(me.roles.highest) < 0;

        if (!canAssign) {
          logger.warn(
            { guildId, roleId: role.id },
            'Cannot re-grant Donator role on toggle on: Bot role is lower than Donator role',
          );
        } else {
          for (const acc of accounts) {
            const member = await guild.members
              .fetch(acc.userId)
              .catch(() => null);
            if (member && !member.roles.cache.has(role.id)) {
              await member.roles
                .add(role, 'Lora Perks: Perk system reactivated')
                .catch((err: unknown) => {
                  logger.warn(
                    { err, guildId, userId: acc.userId },
                    'Failed to re-grant role upon toggle on',
                  );
                });
            }
          }
        }
      }

      return db.donatorPerkConfig.update({
        where: { guildId },
        data: { isEnabled: true },
      });
    }

    // Disabling: Commit deductions to freeze time accurately
    const accounts = await db.donatorAccount.findMany({
      where: { guildId },
    });

    for (const acc of accounts) {
      await this.evaluateAccountCredit(acc, config, new Date(), true);
    }

    // Temporarily remove role from all equipped members
    if (config.donatorRoleId) {
      const role =
        guild.roles.cache.get(config.donatorRoleId) ??
        (await guild.roles.fetch(config.donatorRoleId).catch(() => null));

      if (role) {
        for (const acc of accounts) {
          if (!acc.isEquipped) continue;
          const member = await guild.members
            .fetch(acc.userId)
            .catch(() => null);
          if (member && member.roles.cache.has(role.id)) {
            await member.roles
              .remove(
                role,
                'Lora Perks: Donator perk temporarily disabled by Administrator',
              )
              .catch((err: unknown) => {
                logger.warn(
                  { err, guildId, userId: acc.userId },
                  'Failed to remove role on perk disable',
                );
              });
          }
        }
      }
    }

    return db.donatorPerkConfig.update({
      where: { guildId },
      data: { isEnabled: false },
    });
  }

  /**
   * Configures the designated Donator Role with role hierarchy check.
   */
  public async setRole(
    guildId: string,
    role: Role,
    guild: Guild,
  ): Promise<DonatorPerkConfig> {
    const me =
      guild.members.me ?? (await guild.members.fetchMe().catch(() => null));

    if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      throw new AppError(
        'Bot không có quyền Manage Roles để thao tác role này.',
        DonatorErrorCode.ROLE_HIERARCHY_ERROR,
        true,
      );
    }

    if (role.managed) {
      throw new AppError(
        'Không thể sử dụng role do Discord hoặc ứng dụng khác quản lý.',
        DonatorErrorCode.ROLE_NOT_CONFIGURED,
        true,
      );
    }

    if (role.comparePositionTo(me.roles.highest) >= 0) {
      throw new AppError(
        'Role của Bot phải cao hơn Role Donator. Vui lòng kiểm tra lại Server Settings.',
        DonatorErrorCode.ROLE_HIERARCHY_ERROR,
        true,
      );
    }

    return db.donatorPerkConfig.upsert({
      where: { guildId },
      update: { donatorRoleId: role.id },
      create: {
        guildId,
        donatorRoleId: role.id,
      },
    });
  }

  /**
   * Configures or clears public notification channel.
   */
  public async setNotificationChannel(
    guildId: string,
    channelId: string | null,
  ): Promise<DonatorPerkConfig> {
    return db.donatorPerkConfig.upsert({
      where: { guildId },
      update: { notificationChannelId: channelId },
      create: {
        guildId,
        notificationChannelId: channelId,
      },
    });
  }

  /**
   * Cleans up accounts whose credit balance has completely depleted:
   * - Strips role on Discord.
   * - Marks isEquipped = false.
   * - Sends DM notification (with fallback to notification channel on 50007).
   */
  public async cleanupDepletedAccounts(
    client: ExtendedClient,
  ): Promise<number> {
    const configs = await db.donatorPerkConfig.findMany({
      where: { isEnabled: true, donatorRoleId: { not: null } },
    });

    let revokedCount = 0;
    const now = new Date();

    for (const config of configs) {
      if (!config.donatorRoleId) continue;

      const guild =
        client.guilds.cache.get(config.guildId) ??
        (await client.guilds.fetch(config.guildId).catch(() => null));

      if (!guild) continue;

      const equippedAccounts = await db.donatorAccount.findMany({
        where: {
          guildId: config.guildId,
          isEquipped: true,
        },
      });

      for (const account of equippedAccounts) {
        // Calculate remaining balance
        const evaluation = await this.evaluateAccountCredit(
          account,
          config,
          now,
          false,
        );

        if (evaluation.newCreditSeconds <= 0) {
          try {
            // Commit depleted state to DB
            await db.donatorAccount.update({
              where: { id: account.id },
              data: {
                creditSeconds: 0,
                isEquipped: false,
                lastDeductedAt: now,
              },
            });

            // Create transaction log
            await db.donatorTransaction.create({
              data: {
                guildId: account.guildId,
                userId: account.userId,
                amountVnd: 0,
                bonusVolumePercent: 0,
                bonusStreakPercent: 0,
                creditSecondsAdded: 0,
                actionType: DonatorActionType.AUTO_REVOKE,
                note: 'Tự động thu hồi role do cạn quỹ thời gian credit',
                createdBy: 'SYSTEM_CRON',
              },
            });

            // Remove role from member
            const member = await guild.members
              .fetch(account.userId)
              .catch(() => null);

            if (member) {
              if (config.donatorRoleId) {
                const role =
                  guild.roles.cache.get(config.donatorRoleId) ??
                  (await guild.roles
                    .fetch(config.donatorRoleId)
                    .catch(() => null));

                if (role && member.roles.cache.has(role.id)) {
                  await member.roles
                    .remove(
                      role,
                      'Lora Perks: Donator credit balance reached 0 seconds',
                    )
                    .catch((err: unknown) => {
                      logger.warn(
                        { err, userId: account.userId, guildId: account.guildId },
                        'Failed to remove role on credit depletion',
                      );
                    });
                }
              }

              // Send expiration notification
              await this.sendDepletionNotification(
                member,
                guild,
                config,
                account,
              );
            }

            revokedCount++;
            logger.info(
              {
                guildId: account.guildId,
                userId: account.userId,
              },
              'Revoked depleted Donator role',
            );
          } catch (err: unknown) {
            logger.error(
              {
                err,
                userId: account.userId,
                accountId: account.id,
                guildId: account.guildId,
              },
              'Error processing depleted account',
            );
          }
        }
      }
    }

    return revokedCount;
  }

  /**
   * Weekly streak soft decay job:
   * Runs at 00:00 Monday (UTC+7).
   * For accounts with streak > 0:
   * If currentWeekTotalVnd < weeklyMinVnd -> streak = max(0, streak - 1).
   * Resets currentWeekTotalVnd = 0 and updates lastActiveWeekStart to the new week.
   */
  public async processWeeklyDecay(): Promise<{
    processedCount: number;
    decayedCount: number;
  }> {
    const accounts = await db.donatorAccount.findMany({
      where: {
        streak: { gt: 0 },
      },
    });

    const currentWeekStart = getWeekStartUtcPlus7(new Date());
    let processedCount = 0;
    let decayedCount = 0;

    for (const account of accounts) {
      try {
        // Skip accounts that have already rolled over into the current week
        if (
          account.lastActiveWeekStart &&
          account.lastActiveWeekStart.getTime() >= currentWeekStart.getTime()
        ) {
          continue;
        }

        const config = await this.getOrCreateConfig(account.guildId);
        let newStreak = account.streak;

        if (account.currentWeekTotalVnd < config.weeklyMinVnd) {
          newStreak = Math.max(0, account.streak - 1);
          decayedCount++;
          logger.info(
            {
              guildId: account.guildId,
              userId: account.userId,
              previousStreak: account.streak,
              newStreak,
              lastWeekTotalVnd: account.currentWeekTotalVnd,
            },
            'Applied weekly streak soft decay',
          );
        }

        await db.donatorAccount.update({
          where: { id: account.id },
          data: {
            streak: newStreak,
            currentWeekTotalVnd: 0,
            lastActiveWeekStart: currentWeekStart,
          },
        });

        processedCount++;
      } catch (err: unknown) {
        logger.error(
          {
            err,
            userId: account.userId,
            accountId: account.id,
            guildId: account.guildId,
          },
          'Error processing weekly decay for account',
        );
      }
    }

    return { processedCount, decayedCount };
  }

  /**
   * Sends thank-you DM for donation, or falls back to notification channel if DM is blocked.
   */
  private async sendDonationNotification(
    member: GuildMember,
    guild: Guild,
    config: DonatorPerkConfig,
    amountVnd: number,
    calculation: DonationCalculationResult,
    account: DonatorAccount,
  ): Promise<void> {
    const embed = createSuccessEmbed(
      `Cảm ơn bạn đã ủng hộ server **${guild.name}**!\nKhoản đóng góp của bạn đã được chuyển vào Donator Credit.`,
      '💖 Ghi nhận Ủng Hộ Thành Công',
    )
      .addFields(
        {
          name: '💵 Số tiền ủng hộ',
          value: `**${formatCurrencyVnd(amountVnd)}**`,
          inline: true,
        },
        {
          name: '⏱️ Thời gian cộng thêm',
          value: `**+${formatDurationVietnamese(calculation.creditSecondsAdded)}**`,
          inline: true,
        },
        {
          name: '🎁 Thưởng áp dụng',
          value: `Volume: **+${calculation.bonusVolumePercent}%** | Streak: **+${calculation.bonusStreakPercent}%**`,
          inline: false,
        },
        {
          name: '🔥 Chuỗi ủng hộ tuần',
          value: `**${account.streak} tuần liên tiếp** ${calculation.isStreakIncremented ? '*(+1 tuần mới.)*' : ''}`,
          inline: true,
        },
        {
          name: '🛡️ Trạng thái Role',
          value: 'Đang trang bị *(Hệ số tiêu hao 1.0x)*',
          inline: true,
        },
        {
          name: '⏳ Tổng quỹ thời gian hiện tại',
          value: `**${formatDurationVietnamese(account.creditSeconds)}**`,
          inline: false,
        },
      )
      .setFooter({
        text: 'Gợi ý: Bạn có thể dùng /perk donator unequip để tạm gỡ role khi vắng mặt (hệ số tiêu hao 0.2x).',
      });

    try {
      await member.send({ embeds: [embed] });
    } catch (err: unknown) {
      const errorCode =
        typeof err === 'object' && err !== null && 'code' in err
          ? Number((err as { code: unknown }).code)
          : null;
      const isDmBlocked = errorCode === 50007;

      if (isDmBlocked) {
        logger.warn(
          { err, userId: member.id, guildId: guild.id },
          'User has DMs closed (50007). Emitting fallback notification to channel.',
        );
        if (config.notificationChannelId) {
          await this.sendFallbackChannelNotification(
            guild,
            config.notificationChannelId,
            `💖 Cảm ơn <@${member.id}> đã ủng hộ **${formatCurrencyVnd(amountVnd)}**! Đặc quyền Donator đã được kích hoạt trên tài khoản của bạn. *(App không thể DM bạn nên thông báo được gửi đến đây thay thế)*`,
          );
        }
      } else {
        logger.error(
          { err, userId: member.id, guildId: guild.id },
          'Failed to send donation DM',
        );
      }
    }
  }

  /**
   * Sends depletion notification via DM, or falls back to notification channel if DM is blocked.
   */
  private async sendDepletionNotification(
    member: GuildMember,
    guild: Guild,
    config: DonatorPerkConfig,
    account: DonatorAccount,
  ): Promise<void> {
    const embed = createWarningEmbed(
      `Donator Credit của bạn tại server **${guild.name}** đã hết. Cảm ơn bạn đã ủng hộ, role Donator tạm thời được thu hồi.`,
      '⏳ Quỹ Thời Gian Donator Đã Hết',
    )
      .addFields({
        name: '🔥 Bảo lưu Streak',
        value: `Streak hiện tại của bạn là **${account.streak} tuần**. Để bảo lưu streak và tiếp tục nhận các mức bonus cao nhất, bạn chỉ cần ủng hộ tối thiểu **${formatCurrencyVnd(config.weeklyMinVnd)}** trước 00:00 Thứ Hai tới.`,
      })
      .setFooter({
        text: 'Dùng /perk donator info để thông tin chi tiết.',
      });

    try {
      await member.send({ embeds: [embed] });
    } catch (err: unknown) {
      const errorCode =
        typeof err === 'object' && err !== null && 'code' in err
          ? Number((err as { code: unknown }).code)
          : null;
      const isDmBlocked = errorCode === 50007;

      if (isDmBlocked) {
        logger.warn(
          { err, userId: member.id, guildId: guild.id },
          'User has DMs closed (50007) during expiration. Emitting fallback notification.',
        );
        if (config.notificationChannelId) {
          await this.sendFallbackChannelNotification(
            guild,
            config.notificationChannelId,
            `⏳ Donator Credit của <@${member.id}> đã hết. Cảm ơn bạn đã ủng hộ, role Donator đã tạm thời được thu hồi.`,
          );
        }
      } else {
        logger.error(
          { err, userId: member.id, guildId: guild.id },
          'Failed to send expiration DM',
        );
      }
    }
  }

  /**
   * Safe helper to post a message into the configured notification channel.
   */
  private async sendFallbackChannelNotification(
    guild: Guild,
    channelId: string,
    content: string,
  ): Promise<void> {
    try {
      const channel =
        guild.channels.cache.get(channelId) ??
        (await guild.channels.fetch(channelId).catch(() => null));

      if (channel && channel.isTextBased() && 'send' in channel) {
        const embed = createBaseEmbed({
          color: EmbedColor.PRIMARY,
          description: content,
        });
        await channel.send({ embeds: [embed] });
      }
    } catch (err: unknown) {
      logger.warn(
        { err, guildId: guild.id, channelId },
        'Failed to deliver fallback channel notification',
      );
    }
  }

  /**
   * Retrieves the latest donation transaction for a user on a guild.
   * Pure read-only query.
   */
  public async getLastDonation(
    guildId: string,
    userId: string,
  ): Promise<DonatorTransaction | null> {
    return db.donatorTransaction.findFirst({
      where: {
        guildId,
        userId,
        actionType: DonatorActionType.DONATION,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Handles member leaving guild:
   * Settle pending credit at 1.0x burn rate, then auto-unequip into vault (0.2x).
   */
  public async handleMemberLeave(
    guildId: string,
    userId: string,
  ): Promise<void> {
    const account = await db.donatorAccount.findUnique({
      where: { guildId_userId: { guildId, userId } },
    });

    if (!account || !account.isEquipped) {
      return;
    }

    const config = await this.getOrCreateConfig(guildId);

    // Settle credit at current 1.0x rate before switching to vault
    await this.evaluateAccountCredit(account, config, new Date(), true);

    await db.donatorAccount.update({
      where: { id: account.id },
      data: { isEquipped: false },
    });

    logger.info(
      { guildId, userId },
      'Member left guild: Auto-unequipped Donator role to savings vault (0.2x burn rate)',
    );
  }
}

export const donatorPerkService = new DonatorPerkService();
