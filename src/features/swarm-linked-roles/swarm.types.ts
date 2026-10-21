import { z } from 'zod';

export const DiscordOAuthTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
});

export type DiscordOAuthTokenResponse = z.infer<
  typeof DiscordOAuthTokenResponseSchema
>;

export const DiscordUserResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  discriminator: z.string(),
  global_name: z.string().nullable().optional(),
});

export type DiscordUserResponse = z.infer<typeof DiscordUserResponseSchema>;

export const DiscordRoleConnectionResponseSchema = z.object({
  platform_name: z.string().nullable().optional(),
  platform_username: z.string().nullable().optional(),
  metadata: z.record(z.union([z.string(), z.number()])),
});

export type DiscordRoleConnectionResponse = z.infer<
  typeof DiscordRoleConnectionResponseSchema
>;

export const OAuthStateDataSchema = z.object({
  userId: z.string(),
  timestamp: z.number(),
  guildId: z.string().optional(),
  signature: z.string(),
});

export type OAuthStateData = z.infer<typeof OAuthStateDataSchema>;

export interface SwarmMemberStatus {
  userId: string;
  swarmLevel: number;
  roleName: string | null;
  isLinked: boolean;
  tokenExpiresAt: Date | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}
