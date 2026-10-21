import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const swarmConfigSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  CLIENT_ID: z.string().min(1, 'CLIENT_ID is required'),
  DISCORD_CLIENT_SECRET: z.string().optional().default(''),
  DISCORD_REDIRECT_URI: z
    .string()
    .url()
    .optional()
    .default(`http://localhost:${process.env.PORT || '3000'}/auth/discord/callback`),
  BOT_OWNER_ID: z.string().optional().default(''),
});

const parsed = swarmConfigSchema.safeParse(process.env);

if (!parsed.success) {
  process.stderr.write(
    `[WARN] Swarm Configuration Warning: Some environment variables may be missing:\n${JSON.stringify(
      parsed.error.format(),
      null,
      2,
    )}\n`,
  );
}

export const swarmConfig = parsed.success
  ? parsed.data
  : {
      DISCORD_TOKEN: process.env.DISCORD_TOKEN ?? '',
      CLIENT_ID: process.env.CLIENT_ID ?? '',
      DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET ?? '',
      DISCORD_REDIRECT_URI:
        process.env.DISCORD_REDIRECT_URI ??
        `http://localhost:${process.env.PORT || '3000'}/auth/discord/callback`,
      BOT_OWNER_ID: process.env.BOT_OWNER_ID ?? '',
    };
