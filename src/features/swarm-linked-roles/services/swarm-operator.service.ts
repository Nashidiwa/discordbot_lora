import { type Client, Team, User } from 'discord.js';
import { AppError } from '../../../core/errors.js';
import { logger } from '../../../core/logger.js';
import { db } from '../../../shared/db/client.js';
import { swarmConfig } from '../swarm.config.js';
import { SwarmErrorCode } from '../swarm.constants.js';

export class SwarmOperatorService {
  /**
   * Determine if a user is the Bot Owner
   */
  public static async isBotOwner(
    client: Client,
    userId: string,
  ): Promise<boolean> {
    if (swarmConfig.BOT_OWNER_ID && swarmConfig.BOT_OWNER_ID === userId) {
      return true;
    }

    try {
      if (client.application && !client.application.owner) {
        await client.application.fetch();
      }

      const owner = client.application?.owner;
      if (!owner) return false;

      if (owner instanceof User) {
        return owner.id === userId;
      }

      if (owner instanceof Team) {
        return (
          owner.ownerId === userId ||
          owner.members.has(userId)
        );
      }

      return false;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to fetch application owner');
      return false;
    }
  }

  /**
   * Determine if a user is an Operator or Owner
   */
  public static async isOperator(
    client: Client,
    userId: string,
  ): Promise<boolean> {
    const isOwner = await this.isBotOwner(client, userId);
    if (isOwner) return true;

    const operator = await db.swarmOperator.findUnique({
      where: { userId },
    });

    return !!operator;
  }

  /**
   * Add a new operator (Restricted to Owner)
   */
  public static async addOperator(
    client: Client,
    requesterId: string,
    targetUserId: string,
  ): Promise<void> {
    const isOwner = await this.isBotOwner(client, requesterId);
    if (!isOwner) {
      throw new AppError(
        'Only Bot Owner can add operators',
        SwarmErrorCode.UNAUTHORIZED_OWNER,
      );
    }

    const existing = await db.swarmOperator.findUnique({
      where: { userId: targetUserId },
    });

    if (existing) {
      throw new AppError(
        'User is already an operator',
        'SWARM_OPERATOR_ALREADY_EXISTS',
      );
    }

    await db.swarmOperator.create({
      data: {
        userId: targetUserId,
        addedBy: requesterId,
      },
    });

    logger.info(
      { requesterId, targetUserId },
      'Added new Swarm Delegated Operator',
    );
  }

  /**
   * Remove an operator (Restricted to Owner)
   */
  public static async removeOperator(
    client: Client,
    requesterId: string,
    targetUserId: string,
  ): Promise<void> {
    const isOwner = await this.isBotOwner(client, requesterId);
    if (!isOwner) {
      throw new AppError(
        'Only Bot Owner can remove operators',
        SwarmErrorCode.UNAUTHORIZED_OWNER,
      );
    }

    const existing = await db.swarmOperator.findUnique({
      where: { userId: targetUserId },
    });

    if (!existing) {
      throw new AppError('User is not an operator', 'SWARM_OPERATOR_NOT_FOUND');
    }

    await db.swarmOperator.delete({
      where: { userId: targetUserId },
    });

    logger.info(
      { requesterId, targetUserId },
      'Removed Swarm Delegated Operator',
    );
  }

  /**
   * Get list of all operators
   */
  public static async getOperators(): Promise<
    Array<{ userId: string; addedBy: string; createdAt: Date }>
  > {
    return db.swarmOperator.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
