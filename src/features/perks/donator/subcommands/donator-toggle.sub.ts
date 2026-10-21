import {
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { AppError } from '../../../../core/errors.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import {
  createSuccessEmbed,
  createWarningEmbed,
} from '../../../../shared/utils/embed.util.js';
import { getUserLocale } from '../../../../shared/utils/i18n.util.js';
import { DonatorErrorCode } from '../donator.constants.js';
import { donatorLocale } from '../donator.locale.js';
import { toggleDonatorSchema } from '../donator.types.js';
import { donatorPerkService } from '../services/donator-perk.service.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const locale = await getUserLocale({
    locale: interaction.locale,
    guildId: interaction.guildId,
  });
  const t = donatorLocale[locale];

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    throw new AppError(
      t.ADMIN_ONLY,
      DonatorErrorCode.PERMISSION_DENIED,
      true,
    );
  }

  const state = interaction.options.getBoolean('state', true);

  const parseResult = toggleDonatorSchema.safeParse({ state });
  if (!parseResult.success) {
    const errorMsg =
      parseResult.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ.';
    throw new AppError(errorMsg, 'VALIDATION_ERROR', true);
  }

  const validated = parseResult.data;

  const config = await donatorPerkService.togglePerk(
    interaction.guildId!,
    validated.state,
    interaction.guild!,
  );

  if (validated.state) {
    const roleMention = config.donatorRoleId
      ? `<@&${config.donatorRoleId}>`
      : 'Donator';
    const embed = createSuccessEmbed(
      t.TOGGLE_ON_SUCCESS_DESC.replace('{role}', roleMention),
      t.TOGGLE_ON_SUCCESS_TITLE,
    );
    await interaction.editReply({ embeds: [embed] });
  } else {
    const embed = createWarningEmbed(
      t.TOGGLE_OFF_SUCCESS_DESC,
      t.TOGGLE_OFF_SUCCESS_TITLE,
    );
    await interaction.editReply({ embeds: [embed] });
  }
};

export default execute;
