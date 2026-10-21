/**
 * Swarm Linked Roles - Constants
 * Strictly follows Zero any & Object as const pattern
 */

export const SwarmConstants = {
  METADATA_KEY: 'swarm_level',
  PLATFORM_NAME: 'Lora Swarm',
  LEVEL_RANGE: {
    MIN: 1,
    MAX: 8,
  },
  SCOPES: ['identify', 'role_connections.write'] as const,
  CSRF_TTL_MS: 10 * 60 * 1000, // 10 minutes
  TOKEN_REFRESH_THRESHOLD_MS: 5 * 60 * 1000, // 5 minutes before expiration
} as const;

export const SwarmRoleNames = [
  'The Swarm I',
  'The Swarm II',
  'The Swarm III',
  'The Swarm IV',
  'The Swarm V',
  'The Swarm VI',
  'The Swarm VII',
  'The Swarm VIII',
] as const;

export type SwarmRoleName = (typeof SwarmRoleNames)[number];

export const DiscordApiEndpoints = {
  OAUTH_AUTHORIZE: 'https://discord.com/oauth2/authorize',
  OAUTH_TOKEN: 'https://discord.com/api/v10/oauth2/token',
  USER_ME: 'https://discord.com/api/v10/users/@me',
  USER_ROLE_CONNECTION: (clientId: string) =>
    `https://discord.com/api/v10/users/@me/applications/${clientId}/role-connection`,
  APPLICATION_ROLE_CONNECTIONS: (clientId: string) =>
    `https://discord.com/api/v10/applications/${clientId}/role-connections/metadata`,
} as const;

export const SwarmErrorCode = {
  UNAUTHORIZED_OWNER: 'SWARM_UNAUTHORIZED_OWNER',
  UNAUTHORIZED_OPERATOR: 'SWARM_UNAUTHORIZED_OPERATOR',
  INVALID_LEVEL: 'SWARM_INVALID_LEVEL',
  USER_NOT_LINKED: 'SWARM_USER_NOT_LINKED',
  TOKEN_EXPIRED: 'SWARM_TOKEN_EXPIRED',
  DISCORD_API_ERROR: 'SWARM_DISCORD_API_ERROR',
  CSRF_INVALID: 'SWARM_CSRF_INVALID',
  CONFIG_MISSING: 'SWARM_CONFIG_MISSING',
} as const;

export type SwarmErrorCode = (typeof SwarmErrorCode)[keyof typeof SwarmErrorCode];
