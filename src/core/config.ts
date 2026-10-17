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
