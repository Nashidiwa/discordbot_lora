import type { ChatInputCommandInteraction } from 'discord.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { createBaseEmbed } from '../../../shared/utils/embed.util.js';
import { getUserLocale } from '../../../shared/utils/i18n.util.js';
import { AlgorithmType, ScopeType } from '../landmine.constants.js';
import { landmineLocale } from '../landmine.locale.js';
import {
  getModuleDisplayName,
  landmineService,
} from '../services/landmine.service.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const guildId = interaction.guildId!;
  const locale = await getUserLocale({
    locale: interaction.locale,
    guildId,
  });
  const t = landmineLocale[locale];

  const modules = await landmineService.getModules(guildId);

  const title = t.LIST_TITLE.replace(
    '{server}',
    interaction.guild?.name ?? 'Guild',
  );
  const description = t.LIST_DESC.replace('{count}', String(modules.length));

  const embed = createBaseEmbed({
    title,
    description,
  });

  for (const m of modules) {
    const statusText = m.isEnabled
      ? `🟢 **${t.STATUS_ENABLED}**`
      : `🔴 **${t.STATUS_DISABLED}**`;
    const keyDisplay = getModuleDisplayName(m.moduleKey);

    let rateDisplay = '';
    if (m.algorithmType === AlgorithmType.STATIC) {
      const ratePercent = (m.staticRate * 100)
        .toFixed(2)
        .replace(/\.00$/, '');
      const duration = landmineService.formatDurationSeconds(
        m.punishmentDurationSeconds,
        locale,
      );
      rateDisplay =
        locale === 'en'
          ? `Rate: **${ratePercent}%** | Punishment: **${duration}**`
          : `Tỉ lệ: **${ratePercent}%** | Phạt: **${duration}**`;
    } else {
      rateDisplay = t.LIST_DYNAMIC_ALGO;
    }

    const channelCount = landmineService.parseJsonArray(m.channelIds).length;
    const roleCount = landmineService.parseJsonArray(m.roleIds).length;

    let channelScope = `${t.LIST_CHANNEL_PREFIX}: ${t.LIST_ALL}`;
    if (m.channelScopeType === ScopeType.WHITELIST) {
      channelScope = `${t.LIST_CHANNEL_PREFIX}: ${t.SCOPE_WHITELIST} (${channelCount})`;
    } else if (m.channelScopeType === ScopeType.BLACKLIST) {
      channelScope = `${t.LIST_CHANNEL_PREFIX}: ${t.SCOPE_BLACKLIST} (${channelCount})`;
    }

    let roleScope = `${t.LIST_ROLE_PREFIX}: ${t.LIST_ALL}`;
    if (m.roleScopeType === ScopeType.WHITELIST) {
      roleScope = `${t.LIST_ROLE_PREFIX}: ${t.SCOPE_WHITELIST} (${roleCount})`;
    } else if (m.roleScopeType === ScopeType.BLACKLIST) {
      roleScope = `${t.LIST_ROLE_PREFIX}: ${t.SCOPE_BLACKLIST} (${roleCount})`;
    }

    const autoDel = m.autoDeleteNotification
      ? t.LIST_AUTODEL_ON
      : t.LIST_AUTODEL_OFF;
    const lb = m.includeInServerLeaderboard ? t.LIST_LB_ON : t.LIST_LB_OFF;

    embed.addFields({
      name: `${statusText} • \`${keyDisplay}\`${m.note ? ` - ${m.note}` : ''}`,
      value: `• ${rateDisplay}\n• ${channelScope} | ${roleScope}\n• ${autoDel} | ${lb}`,
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
