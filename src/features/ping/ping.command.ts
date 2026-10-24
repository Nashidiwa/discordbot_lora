import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import type { BotCommand } from '../../core/types/index.js';
import { EmbedColor } from '../../shared/constants/colors.js';
import { pingService } from './ping.service.js';

const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Kiểm tra độ trễ giữa App và các server.');

export const command: BotCommand = {
  data,
  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    await interaction.deferReply();

    const reply = await interaction.fetchReply();
    const metrics = pingService.calculateMetrics(
      interaction.client.ws.ping,
      interaction.createdTimestamp,
      reply.createdTimestamp,
    );

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.PRIMARY)
      .setTitle('🏓 Pong!')
      .addFields(
        {
          name: 'Độ trễ Roundtrip',
          value: `${metrics.roundtripPing}ms`,
          inline: true,
        },
        {
          name: 'Độ trễ WebSocket',
          value: `${metrics.wsPing}ms`,
          inline: true,
        },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
