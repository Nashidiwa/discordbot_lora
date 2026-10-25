import { EmbedBuilder } from 'discord.js';
import { EmbedColor } from '../constants/colors.js';

export function createBaseEmbed(options?: {
  color?: EmbedColor;
  title?: string;
  description?: string;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(options?.color ?? EmbedColor.PRIMARY)
    .setFooter({ text: 'Lora' })
    .setTimestamp();

  if (options?.title) {
    embed.setTitle(options.title);
  }

  if (options?.description) {
    embed.setDescription(options.description);
  }

  return embed;
}

export function createSuccessEmbed(
  description: string,
  title = 'Thành công',
): EmbedBuilder {
  return createBaseEmbed({
    color: EmbedColor.SUCCESS,
    title,
    description,
  });
}

export function createErrorEmbed(
  description: string,
  title = 'Lỗi',
): EmbedBuilder {
  return createBaseEmbed({
    color: EmbedColor.ERROR,
    title,
    description,
  });
}

export function createWarningEmbed(
  description: string,
  title = 'Cảnh báo',
): EmbedBuilder {
  return createBaseEmbed({
    color: EmbedColor.WARNING,
    title,
    description,
  });
}
