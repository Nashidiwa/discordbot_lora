import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  CLIENT_ID: z.string().min(1, 'CLIENT_ID is required'),
  DEV_GUILD_ID: z.string().min(1, 'DEV_GUILD_ID is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().default(3000),

  // Web Dashboard & OAuth2 credentials
  DISCORD_CLIENT_SECRET: z.string().optional(),
  BOT_OWNER_ID: z.string().optional(),
  MASTER_API_KEY: z.string().optional(),
  COOKIE_SECRET: z.string().optional(),
  DISCORD_REDIRECT_URI: z.string().optional(),
  DISCORD_DASHBOARD_REDIRECT_URI: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  process.stderr.write(
    `[FATAL] Invalid environment configuration:\n${JSON.stringify(
      parsed.error.format(),
      null,
      2,
    )}\n`,
  );
  process.exit(1);
}

export type Config = z.infer<typeof envSchema>;
export const config: Config = parsed.data;
