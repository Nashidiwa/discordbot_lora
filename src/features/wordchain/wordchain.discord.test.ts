import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../shared/db/client.js';
import {
  GameMode,
  WordChainGameStatus,
  ApiResponse,
} from './types/wordchain.types.js';
import { WordChainConstants, WordChainEmoji } from './wordchain.constants.js';
import { wordChainGameService, WordChainGameService } from './services/wordchain-game.service.js';
import { wordChainLocale, tWordChain } from './wordchain.locale.js';
import cleanupJob from './jobs/wordchain-cleanup.job.js';
import messageEvent from './events/wordchain-message.event.js';
import editEvent from './events/wordchain-edit.event.js';
import deleteEvent from './events/wordchain-delete.event.js';
import guildJoinEvent from './events/wordchain-guild-join.event.js';
import guildLeaveEvent from './events/wordchain-guild-leave.event.js';
import readyEvent from './events/wordchain-ready.event.js';
import interactionEvent, { HELP_TOPICS, buildHelpSelectMenu } from './events/wordchain-interaction.event.js';

let testDiscordCounter = 0;
function createTestGuildId(prefix = 'test_discord'): string {
  testDiscordCounter++;
  return `${prefix}_${Date.now()}_${testDiscordCounter}`;
}

async function cleanupGuild(guildId: string): Promise<void> {
  await db.$transaction([
    db.wordChainUsedWord.deleteMany({ where: { guildId } }),
    db.wordChainMember.deleteMany({ where: { guildId } }),
    db.wordChainBlacklist.deleteMany({ where: { guildId } }),
    db.wordChainWhitelist.deleteMany({ where: { guildId } }),
    db.wordChainConfig.deleteMany({ where: { guildId } }),
  ]);
}

// =========================================================================
// TEST SUITE 1: GATEWAY MESSAGE EVENTS & ANTI-CHEAT CALLOUTS
// =========================================================================
test('WordChain Discord Events: MessageCreate turn processing and reactions', async () => {
  const guildId = createTestGuildId('msg_event');
  const normalChannelId = 'normal-chan-101';
  const authorId = 'player-user-201';

  try {
    // 1. Provision game config with normal channel
    await db.wordChainConfig.create({
      data: {
        guildId,
        normalModeChannelId: normalChannelId,
        languages: 'en',
      },
    });

    const reactedEmojis: string[] = [];
    const sentMessages: string[] = [];

    // Mock Message object
    const mockMessage = {
      guildId,
      channelId: normalChannelId,
      content: 'apple',
      author: { id: authorId, bot: false },
      guild: { id: guildId },
      react: async (emoji: string) => {
        reactedEmojis.push(emoji);
        return {} as unknown;
      },
      reply: async (payload: { content: string }) => {
        sentMessages.push(payload.content);
        return {} as unknown;
      },
    };

    // Execute message event
    await messageEvent.execute(mockMessage as never);

    // Verify word accepted and reaction added
    assert.ok(reactedEmojis.length > 0);
    assert.ok(
      reactedEmojis.includes(WordChainEmoji.CELEBRATION) ||
        reactedEmojis.includes(WordChainEmoji.CORRECT),
    );

    // Verify database state updated
    const configAfter = await db.wordChainConfig.findUnique({ where: { guildId } });
    assert.equal(configAfter?.currentWordNormal, 'apple');
    assert.equal(configAfter?.currentCountNormal, 1);
    assert.equal(configAfter?.lastMemberIdNormal, authorId);
  } finally {
    await cleanupGuild(guildId);
  }
});

test('WordChain Discord Events: MessageUpdate and MessageDelete anti-cheat callouts', async () => {
  const guildId = createTestGuildId('anticheat');
  const normalChannelId = 'normal-chan-202';
  const authorId = 'player-user-302';

  try {
    await db.wordChainConfig.create({
      data: {
        guildId,
        normalModeChannelId: normalChannelId,
        currentWordNormal: 'tiger',
        currentCountNormal: 5,
        lastMemberIdNormal: authorId,
      },
    });

    const sentChannelMessages: string[] = [];
    const mockChannel = {
      send: async (msg: string) => {
        sentChannelMessages.push(msg);
        return {} as unknown;
      },
    };

    // 1. MessageEdit event callout
    const mockBeforeEdit = {
      guildId,
      channelId: normalChannelId,
      content: 'tiger',
      author: { id: authorId, bot: false },
      guild: { id: guildId },
      reactions: { cache: { size: 1 } },
    };
    const mockAfterEdit = {
      guildId,
      channelId: normalChannelId,
      content: 'lion', // edited word!
      author: { id: authorId, bot: false },
      guild: { id: guildId },
      channel: mockChannel,
      reactions: { cache: { size: 1 } },
    };

    await editEvent.execute(mockBeforeEdit as never, mockAfterEdit as never);
    assert.equal(sentChannelMessages.length, 1);
    assert.ok(sentChannelMessages[0]?.includes('edited their word'));
    assert.ok(sentChannelMessages[0]?.includes('tiger'));

    // 2. MessageDelete event callout
    const mockDeletedMessage = {
      guildId,
      channelId: normalChannelId,
      content: 'tiger',
      author: { id: authorId, bot: false },
      guild: { id: guildId },
      channel: mockChannel,
      reactions: { cache: { size: 1 } },
    };

    await deleteEvent.execute(mockDeletedMessage as never);
    assert.equal(sentChannelMessages.length, 2);
    assert.ok(sentChannelMessages[1]?.includes('deleted their word'));
    assert.ok(sentChannelMessages[1]?.includes('tiger'));
  } finally {
    await cleanupGuild(guildId);
  }
});

// =========================================================================
// TEST SUITE 2: GUILD LIFECYCLE & RETENTION GRACE PERIOD (DEC-006)
// =========================================================================
test('WordChain Lifecycle: Guild leave sets leftAt, rejoin clears leftAt within 7 days', async () => {
  const guildId = createTestGuildId('lifecycle');

  try {
    // 1. Existing participating guild
    await db.wordChainConfig.create({
      data: {
        guildId,
        normalModeChannelId: 'chan-abc',
        currentCountNormal: 12,
        highScoreNormal: 50,
      },
    });

    // 2. Bot kicked/leaves guild -> GuildDelete sets leftAt
    await guildLeaveEvent.execute({ id: guildId } as never);
    const configLeft = await db.wordChainConfig.findUnique({ where: { guildId } });
    assert.ok(configLeft?.leftAt !== null);

    // 3. Bot reinvited within 7 days -> GuildCreate clears leftAt
    await guildJoinEvent.execute({ id: guildId } as never);
    const configRejoined = await db.wordChainConfig.findUnique({ where: { guildId } });
    assert.equal(configRejoined?.leftAt, null);
    assert.equal(configRejoined?.highScoreNormal, 50); // Data fully preserved!
  } finally {
    await cleanupGuild(guildId);
  }
});

test('WordChain Lifecycle: Scheduled cleanup job purges guilds after 7-day grace period', async () => {
  const overdueGuildId = createTestGuildId('overdue');
  const recentGuildId = createTestGuildId('recent');
  const activeGuildId = createTestGuildId('active');

  try {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    // 1. Overdue guild (> 7 days)
    await db.wordChainConfig.create({
      data: { guildId: overdueGuildId, leftAt: eightDaysAgo },
    });
    await db.wordChainMember.create({
      data: { guildId: overdueGuildId, userId: 'u1', score: 100 },
    });

    // 2. Recently left guild (< 7 days)
    await db.wordChainConfig.create({
      data: { guildId: recentGuildId, leftAt: twoDaysAgo },
    });

    // 3. Active guild (leftAt == null)
    await db.wordChainConfig.create({
      data: { guildId: activeGuildId, leftAt: null },
    });

    // Run cleanup job
    const purgedCount = await wordChainGameService.purgeOverdueGuilds();
    assert.ok(purgedCount >= 1);

    // Verify overdue guild completely wiped
    const overdueConfig = await db.wordChainConfig.findUnique({ where: { guildId: overdueGuildId } });
    const overdueMembers = await db.wordChainMember.findMany({ where: { guildId: overdueGuildId } });
    assert.equal(overdueConfig, null);
    assert.equal(overdueMembers.length, 0);

    // Verify recent and active guilds preserved
    const recentConfig = await db.wordChainConfig.findUnique({ where: { guildId: recentGuildId } });
    const activeConfig = await db.wordChainConfig.findUnique({ where: { guildId: activeGuildId } });
    assert.ok(recentConfig !== null);
    assert.ok(activeConfig !== null);
  } finally {
    await cleanupGuild(overdueGuildId);
    await cleanupGuild(recentGuildId);
    await cleanupGuild(activeGuildId);
  }
});

// =========================================================================
// TEST SUITE 3: BOOT REJOIN INSPECTION & SUPPRESSION INVARIANT
// =========================================================================
test('WordChain Ready Event: Greeting suppression when channel matches last word & member', async () => {
  const guildId = createTestGuildId('ready_sup');
  const channelId = 'ready-chan-303';
  const lastMemberId = 'member-ready-404';

  try {
    await db.wordChainConfig.create({
      data: {
        guildId,
        normalModeChannelId: channelId,
        currentWordNormal: 'puzzle',
        currentCountNormal: 8,
        lastMemberIdNormal: lastMemberId,
      },
    });

    let sentRecovery = false;
    const mockChannel = {
      isTextBased: () => true,
      messages: {
        fetch: async () => ({
          first: () => ({
            content: 'puzzle',
            author: { id: lastMemberId },
          }),
        }),
      },
      send: async () => {
        sentRecovery = true;
      },
    };

    const mockClient = {
      guilds: {
        cache: {
          get: (id: string) =>
            id === guildId
              ? {
                  channels: {
                    cache: {
                      get: (cid: string) => (cid === channelId ? mockChannel : null),
                    },
                  },
                }
              : null,
        },
      },
    };

    // Execute ClientReady
    await readyEvent.execute(mockClient as never);

    // Suppression Invariant: Channel is in sync, recovery greeting must be suppressed!
    assert.equal(sentRecovery, false);
  } finally {
    await cleanupGuild(guildId);
  }
});

// =========================================================================
// TEST SUITE 4: INTERACTION EVENT (AUTOCOMPLETE & HELP MENU)
// =========================================================================
test('WordChain Interaction Event: Autocomplete for blacklist, whitelist, and languages', async () => {
  const guildId = createTestGuildId('autocomplete');

  try {
    await db.wordChainBlacklist.create({ data: { guildId, word: 'abandon' } });
    await db.wordChainBlacklist.create({ data: { guildId, word: 'ability' } });
    await db.wordChainWhitelist.create({ data: { guildId, word: 'xenon' } });

    // 1. Blacklist autocomplete
    let respondedData: Array<{ name: string; value: string }> = [];
    const mockBlacklistAutocomplete = {
      isStringSelectMenu: () => false,
      isAutocomplete: () => true,
      commandName: 'wordchain-manage',
      guildId,
      options: {
        getFocused: () => ({ name: 'word', value: 'ab' }),
        getSubcommandGroup: () => 'blacklist',
        getSubcommand: () => 'remove',
      },
      respond: async (data: Array<{ name: string; value: string }>) => {
        respondedData = data;
      },
    };

    await interactionEvent.execute(mockBlacklistAutocomplete as never);
    assert.equal(respondedData.length, 2);
    assert.equal(respondedData[0]?.value, 'abandon');
    assert.equal(respondedData[1]?.value, 'ability');

    // 2. Whitelist autocomplete
    const mockWhitelistAutocomplete = {
      isStringSelectMenu: () => false,
      isAutocomplete: () => true,
      commandName: 'wordchain-manage',
      guildId,
      options: {
        getFocused: () => ({ name: 'word', value: 'xe' }),
        getSubcommandGroup: () => 'whitelist',
        getSubcommand: () => 'remove',
      },
      respond: async (data: Array<{ name: string; value: string }>) => {
        respondedData = data;
      },
    };

    await interactionEvent.execute(mockWhitelistAutocomplete as never);
    assert.equal(respondedData.length, 1);
    assert.equal(respondedData[0]?.value, 'xenon');

    // 3. Language autocomplete
    const mockLangAutocomplete = {
      isStringSelectMenu: () => false,
      isAutocomplete: () => true,
      commandName: 'wordchain-manage',
      guildId,
      options: {
        getFocused: () => ({ name: 'language_code', value: 'e' }),
      },
      respond: async (data: Array<{ name: string; value: string }>) => {
        respondedData = data;
      },
    };

    await interactionEvent.execute(mockLangAutocomplete as never);
    assert.equal(respondedData.length, 1);
    assert.equal(respondedData[0]?.value, 'en');
  } finally {
    await cleanupGuild(guildId);
  }
});

test('WordChain Interaction Event: Help Select Menu dropdown switching & invoker guard', async () => {
  const invokerId = 'original-invoker-123';
  const strangerId = 'other-user-999';

  // 1. Stranger rejection
  let repliedStranger = false;
  const mockStrangerInteraction = {
    isStringSelectMenu: () => true,
    isAutocomplete: () => false,
    customId: `wordchain:help:${invokerId}`,
    user: { id: strangerId },
    locale: 'en',
    reply: async () => {
      repliedStranger = true;
    },
  };

  await interactionEvent.execute(mockStrangerInteraction as never);
  assert.equal(repliedStranger, true);

  // 2. Invoker topic selection update
  let updatedEmbedTitle = '';
  const mockInvokerInteraction = {
    isStringSelectMenu: () => true,
    isAutocomplete: () => false,
    customId: `wordchain:help:${invokerId}`,
    user: { id: invokerId },
    values: ['karma_system'],
    locale: 'en',
    update: async (payload: { embeds: Array<{ data: { title: string } }> }) => {
      updatedEmbedTitle = payload.embeds[0]?.data.title ?? '';
    },
  };

  await interactionEvent.execute(mockInvokerInteraction as never);
  assert.equal(updatedEmbedTitle, HELP_TOPICS['karma_system']?.title);
});

// =========================================================================
// TEST SUITE 5: ADMINISTRATIVE OPERATIONS & GDPR PURGES (DEC-004)
// =========================================================================
test('WordChain Administrative Service: GDPR User Purge across all guilds', async () => {
  const targetUser = 'gdpr_target_user_777';
  const guild1 = createTestGuildId('gdpr_1');
  const guild2 = createTestGuildId('gdpr_2');

  try {
    await db.wordChainMember.create({
      data: { guildId: guild1, userId: targetUser, score: 50 },
    });
    await db.wordChainMember.create({
      data: { guildId: guild2, userId: targetUser, score: 100 },
    });
    await db.wordChainMember.create({
      data: { guildId: guild1, userId: 'other_user', score: 20 },
    });

    // GDPR Right to Erasure
    const deletedCount = await wordChainGameService.purgeUser(targetUser);
    assert.equal(deletedCount, 2);

    const remainingRows = await db.wordChainMember.findMany({ where: { userId: targetUser } });
    assert.equal(remainingRows.length, 0);

    const otherUserRows = await db.wordChainMember.findMany({ where: { userId: 'other_user' } });
    assert.equal(otherUserRows.length, 1);
  } finally {
    await cleanupGuild(guild1);
    await cleanupGuild(guild2);
  }
});

test('WordChain Administrative Service: Server Purge, Member Ban, and Server Ban', async () => {
  const guildId = createTestGuildId('admin_ops');
  const userId = 'banned_player_888';

  try {
    // 1. Member Ban
    await wordChainGameService.setMemberBan(userId, true);
    let bannedRecord = await db.wordChainBannedMember.findUnique({ where: { userId } });
    assert.ok(bannedRecord !== null);

    await wordChainGameService.setMemberBan(userId, false);
    bannedRecord = await db.wordChainBannedMember.findUnique({ where: { userId } });
    assert.equal(bannedRecord, null);

    // 2. Server Ban
    await wordChainGameService.setServerBan(guildId, true);
    let config = await db.wordChainConfig.findUnique({ where: { guildId } });
    assert.equal(config?.isBanned, true);

    // 3. Server Purge
    await db.wordChainUsedWord.create({ data: { guildId, word: 'hello', gameMode: GameMode.NORMAL } });
    await db.wordChainBlacklist.create({ data: { guildId, word: 'badword' } });

    await wordChainGameService.purgeServer(guildId);
    config = await db.wordChainConfig.findUnique({ where: { guildId } });
    const usedWords = await db.wordChainUsedWord.findMany({ where: { guildId } });
    const blacklist = await db.wordChainBlacklist.findMany({ where: { guildId } });

    assert.equal(config, null);
    assert.equal(usedWords.length, 0);
    assert.equal(blacklist.length, 0);
  } finally {
    await cleanupGuild(guildId);
  }
});

// =========================================================================
// TEST SUITE 6: WIKTIONARY DEFINITION FETCHING
// =========================================================================
test('WordChain Dictionary: fetchDefinition Wikimedia REST API parser and fallback', async () => {
  const mockFetch: typeof fetch = async (input) => {
    const url = input.toString();
    if (url.includes('sun')) {
      return new Response(
        JSON.stringify({
          en: [
            {
              partOfSpeech: 'Noun',
              definitions: [{ definition: 'The star around which the Earth revolves.' }],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
  };

  // Test valid response parsing with deterministic mock
  const defs = await wordChainGameService.fetchDefinition('sun', mockFetch);
  assert.ok(defs !== null);
  assert.ok(defs.length > 0);
  assert.equal(defs[0]?.partOfSpeech, 'Noun');
  assert.ok(defs[0]?.definitions.includes('The star around which the Earth revolves.'));

  // Non-existent or nonsense word returns null
  const missingDefs = await wordChainGameService.fetchDefinition('zyxwvutsrqponmlkjihgfedcba', mockFetch);
  assert.equal(missingDefs, null);
});

// =========================================================================
// TEST SUITE 7: ASSET INTEGRITY & FREQUENCY MATHEMATICS
// =========================================================================
test('WordChain Assets: scores_en.json and dictionary_en_common.json integrity', async () => {
  const scoresEn = await import('./assets/scores_en.json', { with: { type: 'json' } });
  const commonDict = await import('./assets/dictionary_en_common.json', { with: { type: 'json' } });

  // 1. Frequency scores schema
  assert.ok(scoresEn.default['1'] !== undefined, 'Mode 1 scores present');
  assert.ok(scoresEn.default['2'] !== undefined, 'Mode 2 scores present');
  assert.ok(typeof scoresEn.default['1']['e'] === 'number');
  assert.ok(typeof scoresEn.default['2']['th'] === 'number');

  // Mathematical invariant: average of all defined tokens in corpus is within reasonable bound of 1.0
  const normalScores = Object.values(scoresEn.default['1']) as number[];
  const avgScore = normalScores.reduce((acc, v) => acc + v, 0) / normalScores.length;
  assert.ok(avgScore > 0.5 && avgScore < 2.0, `Average token score ${avgScore} should approximate 1.0`);

  // 2. Common dictionary schema
  assert.ok(Array.isArray(commonDict.default));
  assert.ok(
    commonDict.default.length > 40000,
    'Common dictionary has sufficient baseline words (> 40K entries from SCOWL size 60)',
  );
  assert.ok(commonDict.default.includes('apple'));
  assert.ok(commonDict.default.includes('banana'));
});

// =========================================================================
// TEST SUITE 8: /WORDCHAIN CHECK WITH GUILD WHITELIST & BLACKLIST
// =========================================================================
interface TestEmbedPayload {
  embeds?: Array<{ data: { title?: string; description?: string } }>;
}

test('WordChain Command: /wordchain check evaluates guild whitelist and blacklist', async () => {
  const guildId = createTestGuildId('cmd_check');
  const { execute: checkExecute } = await import('./subcommands/check.sub.js');

  try {
    await db.wordChainWhitelist.create({ data: { guildId, word: 'supercalifragilistic' } });
    await db.wordChainBlacklist.create({ data: { guildId, word: 'apple' } });

    // 1. Whitelisted custom word passes check
    let repliedPayload: TestEmbedPayload = {};
    const mockWhitelistCheck = {
      deferred: false,
      replied: false,
      deferReply: async () => {},
      guildId,
      locale: 'en-US',
      options: { getString: (name: string) => (name === 'word' ? 'supercalifragilistic' : null) },
      editReply: async (payload: TestEmbedPayload) => {
        repliedPayload = payload;
      },
    };

    await checkExecute(mockWhitelistCheck as never);
    assert.ok(repliedPayload.embeds !== undefined && repliedPayload.embeds.length > 0);
    const validTitle = repliedPayload.embeds[0]?.data.title;
    assert.ok(validTitle === 'Word is Valid' || validTitle === 'Từ Hợp Lệ');

    // 2. Blacklisted common word fails check
    let blacklistReply: TestEmbedPayload = {};
    const mockBlacklistCheck = {
      deferred: false,
      replied: false,
      deferReply: async () => {},
      guildId,
      locale: 'en-US',
      options: { getString: (name: string) => (name === 'word' ? 'apple' : null) },
      editReply: async (payload: TestEmbedPayload) => {
        blacklistReply = payload;
      },
    };

    await checkExecute(mockBlacklistCheck as never);
    assert.ok(blacklistReply.embeds !== undefined && blacklistReply.embeds.length > 0);
    const invalidTitle = blacklistReply.embeds[0]?.data.title;
    assert.ok(invalidTitle === 'Word is Invalid' || invalidTitle === 'Từ Không Hợp Lệ');
  } finally {
    await cleanupGuild(guildId);
  }
});

// =========================================================================
// TEST SUITE 9: /WORDCHAIN-MANAGE ADMIN AUTHORIZATION BOUNDARY
// =========================================================================
test('WordChain Command: /wordchain-manage admin blocks non-owner from global actions', async () => {
  const guildId = createTestGuildId('cmd_admin');
  const otherGuildId = createTestGuildId('target_other');
  const { execute: adminExecute } = await import('./subcommands/admin-manage.sub.js');

  try {
    // 1. Non-owner attempting purge-user is rejected
    let replyReject: TestEmbedPayload = {};
    const mockNonOwnerInteraction = {
      deferred: false,
      replied: false,
      deferReply: async () => {},
      guildId,
      user: { id: 'regular_guild_admin_999' },
      memberPermissions: { has: () => true }, // Guild Admin
      client: { application: { owner: { id: 'real_bot_owner_111' } } },
      locale: 'en-US',
      options: {
        getSubcommand: () => 'purge-user',
        getString: (name: string) => (name === 'user_id' ? 'target_user' : null),
        getBoolean: () => null,
      },
      editReply: async (payload: TestEmbedPayload) => {
        replyReject = payload;
      },
    };

    await adminExecute(mockNonOwnerInteraction as never);
    assert.ok(replyReject.embeds !== undefined && replyReject.embeds.length > 0);
    const desc1 = replyReject.embeds[0]?.data.description ?? '';
    assert.ok(desc1.toLowerCase().includes('administrator') || desc1.includes('Bot Owner'));

    // 2. Non-owner attempting cross-guild purge-server is rejected
    let crossGuildReject: TestEmbedPayload = {};
    const mockCrossGuildInteraction = {
      deferred: false,
      replied: false,
      deferReply: async () => {},
      guildId,
      user: { id: 'regular_guild_admin_999' },
      memberPermissions: { has: () => true },
      client: { application: { owner: { id: 'real_bot_owner_111' } } },
      locale: 'en-US',
      options: {
        getSubcommand: () => 'purge-server',
        getString: (name: string) => (name === 'guild_id' ? otherGuildId : null),
        getBoolean: () => null,
      },
      editReply: async (payload: TestEmbedPayload) => {
        crossGuildReject = payload;
      },
    };

    await adminExecute(mockCrossGuildInteraction as never);
    assert.ok(crossGuildReject.embeds !== undefined && crossGuildReject.embeds.length > 0);
    const desc2 = crossGuildReject.embeds[0]?.data.description ?? '';
    assert.ok(desc2.toLowerCase().includes('administrator') || desc2.includes('Bot Owner'));
  } finally {
    await cleanupGuild(guildId);
    await cleanupGuild(otherGuildId);
  }
});
