import crypto from 'node:crypto';
import { AppError } from '../../../core/errors.js';
import { logger } from '../../../core/logger.js';
import { db } from '../../../shared/db/client.js';
import { swarmConfig } from '../swarm.config.js';
import {
  DiscordApiEndpoints,
  SwarmConstants,
  SwarmErrorCode,
} from '../swarm.constants.js';
import {
  type DiscordOAuthTokenResponse,
  DiscordOAuthTokenResponseSchema,
  type OAuthStateData,
} from '../swarm.types.js';

export class SwarmAuthService {
  private static getSecretKey(): string {
    return swarmConfig.DISCORD_TOKEN || 'swarm-default-secret-salt';
  }

  /**
   * Create an HMAC-SHA256 signed state string to protect against CSRF attacks
   */
  public static generateState(userId: string, guildId?: string): string {
    const timestamp = Date.now();
    const payload = JSON.stringify({ userId, guildId, timestamp });
    const signature = crypto
      .createHmac('sha256', this.getSecretKey())
      .update(payload)
      .digest('hex');

    const stateObj: OAuthStateData = {
      userId,
      timestamp,
      guildId,
      signature,
    };

    return Buffer.from(JSON.stringify(stateObj)).toString('base64url');
  }

  /**
   * Verify state string from OAuth2 callback
   */
  public static verifyState(stateStr: string): OAuthStateData {
    try {
      const decodedJson = Buffer.from(stateStr, 'base64url').toString('utf-8');
      const stateObj: unknown = JSON.parse(decodedJson);

      if (
        typeof stateObj !== 'object' ||
        stateObj === null ||
        !('userId' in stateObj) ||
        !('timestamp' in stateObj) ||
        !('signature' in stateObj)
      ) {
        throw new Error('Malformed state structure');
      }

      const parsed = stateObj as OAuthStateData;

      // Verify expiration
      if (Date.now() - parsed.timestamp > SwarmConstants.CSRF_TTL_MS) {
        throw new Error('State has expired');
      }

      // Verify HMAC signature
      const payload = JSON.stringify({
        userId: parsed.userId,
        guildId: parsed.guildId,
        timestamp: parsed.timestamp,
      });

      const expectedSignature = crypto
        .createHmac('sha256', this.getSecretKey())
        .update(payload)
        .digest('hex');

      const sigBuf = Buffer.from(parsed.signature, 'hex');
      const expBuf = Buffer.from(expectedSignature, 'hex');

      if (
        sigBuf.length !== expBuf.length ||
        !crypto.timingSafeEqual(sigBuf, expBuf)
      ) {
        throw new Error('Invalid signature');
      }

      return parsed;
    } catch (error) {
      logger.warn({ error, stateStr }, 'Invalid OAuth2 state received');
      throw new AppError(
        'Invalid or expired OAuth2 state parameter',
        SwarmErrorCode.CSRF_INVALID,
      );
    }
  }

  /**
   * Build full Discord OAuth2 authorization URL
   */
  public static getAuthorizationUrl(userId: string, guildId?: string): string {
    if (!swarmConfig.CLIENT_ID) {
      throw new AppError(
        'CLIENT_ID is not configured',
        SwarmErrorCode.CONFIG_MISSING,
      );
    }

    const state = this.generateState(userId, guildId);
    const params = new URLSearchParams({
      client_id: swarmConfig.CLIENT_ID,
      response_type: 'code',
      redirect_uri: swarmConfig.DISCORD_REDIRECT_URI,
      scope: SwarmConstants.SCOPES.join(' '),
      state,
      prompt: 'consent',
    });

    return `${DiscordApiEndpoints.OAUTH_AUTHORIZE}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  public static async exchangeCodeForToken(
    code: string,
  ): Promise<DiscordOAuthTokenResponse> {
    if (!swarmConfig.CLIENT_ID || !swarmConfig.DISCORD_CLIENT_SECRET) {
      throw new AppError(
        'CLIENT_ID or DISCORD_CLIENT_SECRET is missing',
        SwarmErrorCode.CONFIG_MISSING,
      );
    }

    const body = new URLSearchParams({
      client_id: swarmConfig.CLIENT_ID,
      client_secret: swarmConfig.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: swarmConfig.DISCORD_REDIRECT_URI,
    });

    const response = await fetch(DiscordApiEndpoints.OAUTH_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, errorText },
        'Discord token exchange failed',
      );
      throw new AppError(
        `Failed to exchange OAuth2 code: ${response.statusText}`,
        SwarmErrorCode.DISCORD_API_ERROR,
      );
    }

    const json: unknown = await response.json();
    return DiscordOAuthTokenResponseSchema.parse(json);
  }

  /**
   * Save or update OAuth2 token in database
   */
  public static async saveToken(
    userId: string,
    tokenData: DiscordOAuthTokenResponse,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await db.swarmOAuthToken.upsert({
      where: { userId },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        scope: tokenData.scope,
      },
      create: {
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        scope: tokenData.scope,
      },
    });

    logger.debug({ userId, expiresAt }, 'Saved Swarm OAuth2 token to database');
  }

  /**
   * Refresh expired access token using refresh_token
   */
  public static async refreshAccessToken(
    userId: string,
    refreshToken: string,
  ): Promise<string> {
    if (!swarmConfig.CLIENT_ID || !swarmConfig.DISCORD_CLIENT_SECRET) {
      throw new AppError(
        'CLIENT_ID or DISCORD_CLIENT_SECRET is missing',
        SwarmErrorCode.CONFIG_MISSING,
      );
    }

    const body = new URLSearchParams({
      client_id: swarmConfig.CLIENT_ID,
      client_secret: swarmConfig.DISCORD_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch(DiscordApiEndpoints.OAUTH_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(
        { userId, status: response.status, errorText },
        'Failed to refresh user access token. User may need to re-link.',
      );
      throw new AppError(
        'Token refresh failed. Re-authentication required.',
        SwarmErrorCode.TOKEN_EXPIRED,
      );
    }

    const json: unknown = await response.json();
    const tokenData = DiscordOAuthTokenResponseSchema.parse(json);

    await this.saveToken(userId, tokenData);
    return tokenData.access_token;
  }

  /**
   * Obtain a valid, unexpired access token for a user
   */
  public static async getValidAccessToken(
    userId: string,
  ): Promise<string | null> {
    const tokenRecord = await db.swarmOAuthToken.findUnique({
      where: { userId },
    });

    if (!tokenRecord) {
      return null;
    }

    const isExpiringSoon =
      tokenRecord.expiresAt.getTime() - Date.now() <
      SwarmConstants.TOKEN_REFRESH_THRESHOLD_MS;

    if (!isExpiringSoon) {
      return tokenRecord.accessToken;
    }

    // Refresh token
    try {
      return await this.refreshAccessToken(userId, tokenRecord.refreshToken);
    } catch {
      return null;
    }
  }
}
