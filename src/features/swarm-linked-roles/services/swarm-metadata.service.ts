import { AppError } from '../../../core/errors.js';
import { logger } from '../../../core/logger.js';
import { db } from '../../../shared/db/client.js';
import { swarmConfig } from '../swarm.config.js';
import {
  DiscordApiEndpoints,
  SwarmConstants,
  SwarmErrorCode,
  SwarmRoleNames,
} from '../swarm.constants.js';
import {
  DiscordRoleConnectionResponseSchema,
  type SwarmMemberStatus,
} from '../swarm.types.js';
import { SwarmAuthService } from './swarm-auth.service.js';

export class SwarmMetadataService {
  /**
   * Push metadata update to Discord REST API on behalf of the user
   */
  public static async pushUserMetadata(
    userId: string,
    level: number,
    platformUsername?: string,
  ): Promise<boolean> {
    const accessToken = await SwarmAuthService.getValidAccessToken(userId);
    if (!accessToken) {
      logger.debug(
        { userId },
        'Cannot push metadata: User has not linked Discord OAuth2',
      );
      return false;
    }

    if (!swarmConfig.CLIENT_ID) {
      throw new AppError(
        'CLIENT_ID is not configured',
        SwarmErrorCode.CONFIG_MISSING,
      );
    }

    const payload = {
      platform_name: SwarmConstants.PLATFORM_NAME,
      platform_username: platformUsername ?? undefined,
      metadata: {
        [SwarmConstants.METADATA_KEY]: level,
      },
    };

    const url = DiscordApiEndpoints.USER_ROLE_CONNECTION(swarmConfig.CLIENT_ID);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { userId, status: response.status, errorText },
        'Failed to push user role connection metadata to Discord',
      );

      // If user revoked token or token is invalid
      if (response.status === 401) {
        await db.swarmOAuthToken
          .delete({ where: { userId } })
          .catch(() => undefined);
        return false;
      }

      throw new AppError(
        `Discord API error pushing metadata: ${response.statusText}`,
        SwarmErrorCode.DISCORD_API_ERROR,
      );
    }

    const json: unknown = await response.json();
    DiscordRoleConnectionResponseSchema.parse(json);

    logger.info(
      { userId, level },
      'Successfully pushed Swarm metadata to Discord',
    );
    return true;
  }

  /**
   * Set user's Swarm level in DB and push to Discord
   */
  public static async setUserLevel(
    userId: string,
    level: number,
    updatedBy: string,
    platformUsername?: string,
  ): Promise<{ level: number; synced: boolean }> {
    if (
      level < SwarmConstants.LEVEL_RANGE.MIN ||
      level > SwarmConstants.LEVEL_RANGE.MAX
    ) {
      throw new AppError(
        `Level must be between ${SwarmConstants.LEVEL_RANGE.MIN} and ${SwarmConstants.LEVEL_RANGE.MAX}`,
        SwarmErrorCode.INVALID_LEVEL,
      );
    }

    await db.swarmMemberMetadata.upsert({
      where: { userId },
      update: {
        swarmLevel: level,
        updatedBy,
      },
      create: {
        userId,
        swarmLevel: level,
        updatedBy,
      },
    });

    const synced = await this.pushUserMetadata(
      userId,
      level,
      platformUsername,
    );
    return { level, synced };
  }

  /**
   * Revoke user's Swarm level (set to 0) in DB and push to Discord
   */
  public static async removeUserLevel(
    userId: string,
    updatedBy: string,
    platformUsername?: string,
  ): Promise<{ level: number; synced: boolean }> {
    await db.swarmMemberMetadata.upsert({
      where: { userId },
      update: {
        swarmLevel: 0,
        updatedBy,
      },
      create: {
        userId,
        swarmLevel: 0,
        updatedBy,
      },
    });

    const synced = await this.pushUserMetadata(userId, 0, platformUsername);
    return { level: 0, synced };
  }

  /**
   * Get user's current status and OAuth connection info
   */
  public static async getUserStatus(
    userId: string,
  ): Promise<SwarmMemberStatus> {
    const [metadata, tokenRecord] = await Promise.all([
      db.swarmMemberMetadata.findUnique({ where: { userId } }),
      db.swarmOAuthToken.findUnique({ where: { userId } }),
    ]);

    const level = metadata?.swarmLevel ?? 0;
    const roleName =
      level >= 1 && level <= 8 ? SwarmRoleNames[level - 1] ?? null : null;

    return {
      userId,
      swarmLevel: level,
      roleName,
      isLinked: !!tokenRecord,
      tokenExpiresAt: tokenRecord?.expiresAt ?? null,
      updatedAt: metadata?.updatedAt ?? null,
      updatedBy: metadata?.updatedBy ?? null,
    };
  }

  /**
   * Register Swarm Level Metadata Schema on Discord REST API (Application Level)
   */
  public static async registerApplicationMetadataSchema(): Promise<void> {
    if (!swarmConfig.CLIENT_ID || !swarmConfig.DISCORD_TOKEN) {
      throw new AppError(
        'CLIENT_ID or DISCORD_TOKEN is missing',
        SwarmErrorCode.CONFIG_MISSING,
      );
    }

    const url = DiscordApiEndpoints.APPLICATION_ROLE_CONNECTIONS(
      swarmConfig.CLIENT_ID,
    );

    const schemaDefinition = [
      {
        key: SwarmConstants.METADATA_KEY,
        name: 'Swarm Level',
        name_localizations: {
          vi: 'Cấp độ Swarm',
        },
        description: 'Cấp độ thành viên The Swarm (1 - 8)',
        description_localizations: {
          vi: 'Cấp độ thành viên The Swarm (1 - 8)',
          'en-US': 'The Swarm member rank (1 - 8)',
        },
        type: 3, // INTEGER_EQUAL
      },
    ];

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${swarmConfig.DISCORD_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(schemaDefinition),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, errorText },
        'Failed to register Application Role Connection Metadata Schema',
      );
      throw new AppError(
        `Failed to register metadata schema: ${response.statusText}`,
        SwarmErrorCode.DISCORD_API_ERROR,
      );
    }

    logger.info(
      'Successfully registered Application Role Connection Metadata Schema on Discord',
    );
  }
}
