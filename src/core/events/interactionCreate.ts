import { EmbedBuilder, Events, type Interaction } from 'discord.js';
import { EmbedColor } from '../../shared/constants/colors.js';
import type { ExtendedClient } from '../client.js';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import type { BotEvent } from '../types/index.js';

export const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  once: false,
  execute: async (interaction: Interaction) => {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const extendedClient = interaction.client as ExtendedClient;
      const command = extendedClient.commands.get(interaction.commandName);

      if (!command) {
        logger.warn(
          { commandName: interaction.commandName },
          'Command not found in collection',
        );

        const notFoundEmbed = new EmbedBuilder()
          .setColor(EmbedColor.ERROR)
          .setTitle('Lỗi')
          .setDescription('Lệnh không tồn tại hoặc đã bị gỡ bỏ.')
          .setTimestamp();

        try {
          if (interaction.deferred) {
            await interaction.editReply({ embeds: [notFoundEmbed] });
          } else if (interaction.replied) {
            await interaction.followUp({
              embeds: [notFoundEmbed],
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              embeds: [notFoundEmbed],
              ephemeral: true,
            });
          }
        } catch (replyErr: unknown) {
          logger.error(
            { err: replyErr, commandName: interaction.commandName },
            'Failed to reply to unknown command interaction',
          );
        }
        return;
      }

      try {
        await command.execute(interaction);
      } catch (err: unknown) {
        const isOperational = err instanceof AppError && err.isOperational;
        let title = 'Lỗi hệ thống';
        let description =
          'Đã xảy ra lỗi hệ thống không mong muốn khi thực thi lệnh. Vui lòng thử lại sau.';

        if (isOperational) {
          logger.warn(
            {
              code: err.code,
              message: err.message,
              commandName: interaction.commandName,
              userId: interaction.user.id,
            },
            'Operational command error',
          );
          title = 'Thông báo';
          description = err.message;
        } else {
          logger.error(
            {
              err,
              commandName: interaction.commandName,
              userId: interaction.user.id,
              guildId: interaction.guildId,
            },
            'Unhandled command execution error',
          );
        }

        const errorEmbed = new EmbedBuilder()
          .setColor(EmbedColor.ERROR)
          .setTitle(title)
          .setDescription(description)
          .setTimestamp();

        try {
          if (interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
          } else if (interaction.replied) {
            await interaction.followUp({
              embeds: [errorEmbed],
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              embeds: [errorEmbed],
              ephemeral: true,
            });
          }
        } catch (replyErr: unknown) {
          logger.error(
            { err: replyErr, commandName: interaction.commandName },
            'Failed to send error response to interaction',
          );
        }
      }
      return;
    }

    // 2. Handle Autocomplete Interactions
    if (interaction.isAutocomplete()) {
      const extendedClient = interaction.client as ExtendedClient;
      const command = extendedClient.commands.get(interaction.commandName);

      if (command?.autocomplete) {
        try {
          await command.autocomplete(interaction);
        } catch (err: unknown) {
          logger.error(
            { err, commandName: interaction.commandName },
            'Unhandled error in autocomplete handler',
          );
        }
      }
    }
  },
};

export default event;
