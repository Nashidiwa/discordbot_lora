import { db } from '../db/client.js';

export type SupportedLocale = 'vi' | 'en';
export const DEFAULT_LOCALE: SupportedLocale = 'vi';

export function resolveDiscordLocale(
  discordLocale?: string | null,
): SupportedLocale {
  if (!discordLocale) return DEFAULT_LOCALE;
  if (discordLocale === 'en-US' || discordLocale === 'en-GB') {
    return 'en';
  }
  return DEFAULT_LOCALE;
}

export async function getUserLocale(
  context: { locale?: string | null; guildId?: string | null },
  dbClient = db,
): Promise<SupportedLocale> {
  if (context.guildId) {
    try {
      const setting = await dbClient.guildSetting.findUnique({
        where: { guildId: context.guildId },
      });
      if (setting && (setting.locale === 'vi' || setting.locale === 'en')) {
        return setting.locale;
      }
    } catch {
      // Safe fallback if database is locked or inaccessible
    }
  }
  return resolveDiscordLocale(context.locale);
}

export function t<T extends Record<SupportedLocale, Record<string, string>>>(
  dictionary: T,
  key: keyof T['vi'],
  locale: SupportedLocale,
): string {
  const table = dictionary[locale] ?? dictionary[DEFAULT_LOCALE];
  return (
    table[key as string] ??
    dictionary[DEFAULT_LOCALE][key as string] ??
    (key as string)
  );
}
