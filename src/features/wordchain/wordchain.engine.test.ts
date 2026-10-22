import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../shared/db/client.js';
import {
  GameMode,
  WordChainGameStatus,
  ApiResponse,
  type ProcessTurnInput,
} from './types/wordchain.types.js';
import { WordChainConstants, WordChainEmoji } from './wordchain.constants.js';
import { WordChainLanguageService } from './services/wordchain-language.service.js';
import { WordChainKarmaService } from './services/wordchain-karma.service.js';
import { WordChainRoleService } from './services/wordchain-role.service.js';
import { WordChainDictionaryService } from './services/wordchain-dictionary.service.js';
import { WordChainGameService } from './services/wordchain-game.service.js';

// Unique guild generator for test isolation
let testGuildCounter = 0;
function createTestGuildId(prefix = 'test_engine'): string {
  testGuildCounter++;
  return `${prefix}_${Date.now()}_${testGuildCounter}`;
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
// TEST SUITE 1: PRE-LOCK GATE CHECKS (V1 - V6)
// =========================================================================
test('WordChainGameService: Pre-lock gate checks (Empty, Dot, Banned Member, Single-letter, Spaces)', async () => {
  const guildId = createTestGuildId('gate');
  const service = new WordChainGameService({ db });

  try {
    // 1. Empty and solitary dot inputs are ignored
    const resEmpty = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-1',
      rawWord: '',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(resEmpty.isIgnored, true);

    const resDot = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-1',
      rawWord: ' . ',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(resDot.isIgnored, true);

    // 2. Globally banned member is silently ignored
    const bannedUserId = 'banned-user-999';
    await db.wordChainBannedMember.create({ data: { userId: bannedUserId } });
    try {
      const resBanned = await service.processTurn({
        guildId,
        channelId: 'chan-1',
        authorId: bannedUserId,
        rawWord: 'apple',
        gameMode: GameMode.NORMAL,
      });
      assert.equal(resBanned.isIgnored, true);
    } finally {
      await db.wordChainBannedMember.delete({ where: { userId: bannedUserId } });
    }

    // 3. Single-character guard (V4) -> Warning, chain preserved
    const resSingle = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-1',
      rawWord: 'a',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(resSingle.status, WordChainGameStatus.SINGLE_LETTER);
    assert.equal(resSingle.isWarning, true);
    assert.equal(resSingle.isMistake, false);
    assert.equal(resSingle.reactionEmoji, WordChainEmoji.WARNING);

    // 4. Conversational chat with whitespace (V5) -> Silently ignored
    const resChat = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-1',
      rawWord: 'good morning friends',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(resChat.isIgnored, true);

    // 5. Single invalid token without whitespace (V5) -> Warning, chain preserved
    const resInvalidFormat = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-1',
      rawWord: 'apple123',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(resInvalidFormat.status, WordChainGameStatus.REGEX_MISMATCH);
    assert.equal(resInvalidFormat.isWarning, true);
    assert.equal(resInvalidFormat.isMistake, false);
    assert.equal(resInvalidFormat.reactionEmoji, WordChainEmoji.WARNING);
  } finally {
    await cleanupGuild(guildId);
  }
});

test('WordChainGameService: Blacklist and Whitelist precedence', async () => {
  const guildId = createTestGuildId('blackwhite');
  const service = new WordChainGameService({ db });

  try {
    // Add 'forbidden' to blacklist
    await db.wordChainBlacklist.create({
      data: { guildId, word: 'forbidden' },
    });

    // 1. Blacklisted word emits warning without breaking the chain
    const resBlacklist = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-1',
      rawWord: 'forbidden',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(resBlacklist.status, WordChainGameStatus.BLACKLISTED);
    assert.equal(resBlacklist.isWarning, true);
    assert.equal(resBlacklist.isMistake, false);

    // 2. Add 'forbidden' to whitelist -> Whitelist overrides blacklist
    await db.wordChainWhitelist.create({
      data: { guildId, word: 'forbidden' },
    });

    const resWhitelist = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-1',
      rawWord: 'forbidden',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(resWhitelist.status, WordChainGameStatus.VALID);
    assert.equal(resWhitelist.isValid, true);
  } finally {
    await cleanupGuild(guildId);
  }
});

// =========================================================================
// TEST SUITE 2: BREAKING MISTAKES & CHAIN INVARIANTS (V7, V8, V9a)
// =========================================================================
test('WordChainGameService: Consecutive turn mistake (SAME_PLAYER_TWICE) in multiplayer vs singleplayer', async () => {
  const guildId = createTestGuildId('turn');
  const dictService = new WordChainDictionaryService({ db });
  dictService.addWordsToLocalLexicon(['apple', 'elephant', 'tiger']);
  const service = new WordChainGameService({ db, dictionaryService: dictService });

  try {
    // 1. Player 1 sends 'apple' -> Accepted
    const turn1 = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-1',
      rawWord: 'apple',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(turn1.isValid, true);
    assert.equal(turn1.currentCount, 1);

    // 2. Player 1 sends 'elephant' immediately -> SAME_PLAYER_TWICE mistake!
    const turn2 = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-1',
      rawWord: 'elephant',
      gameMode: GameMode.NORMAL,
      isSinglePlayer: false,
    });
    assert.equal(turn2.status, WordChainGameStatus.SAME_PLAYER_TWICE);
    assert.equal(turn2.isMistake, true);
    assert.equal(turn2.currentCount, 0); // Chain count reset
    assert.equal(turn2.reactionEmoji, WordChainEmoji.MISTAKE);

    // Verify token preservation: currentWord remains 'apple'! (DISC-005)
    const configAfterMistake = await service.getConfig(guildId);
    assert.equal(configAfterMistake?.currentWordNormal, 'apple');
    assert.equal(configAfterMistake?.lastMemberIdNormal, 'user-1'); // Preserved
    assert.equal(configAfterMistake?.failedMemberId, 'user-1');

    // Verify used_words wiped
    const usedWordsCount = await db.wordChainUsedWord.count({
      where: { guildId, gameMode: GameMode.NORMAL },
    });
    assert.equal(usedWordsCount, 0);

    // Verify member penalized: score = 0 (was 1, now -1), wrong = 1, karma clamped
    const member1 = await db.wordChainMember.findUnique({
      where: { guildId_userId: { guildId, userId: 'user-1' } },
    });
    assert.equal(member1?.score, 0);
    assert.equal(member1?.wrongInputs, 1);
    assert.equal(member1?.karma, 0); // Clamped at 0

    // 3. In single player mode, same player consecutive turns are allowed
    const turn3 = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-single',
      rawWord: 'elephant',
      gameMode: GameMode.NORMAL,
      isSinglePlayer: true,
    });
    assert.equal(turn3.isValid, true);

    const turn4 = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-single',
      rawWord: 'tiger',
      gameMode: GameMode.NORMAL,
      isSinglePlayer: true,
    });
    assert.equal(turn4.isValid, true);
  } finally {
    await cleanupGuild(guildId);
  }
});

test('WordChainGameService: Starting token mismatch (WRONG_FIRST_TOKEN) for Normal and Hard modes', async () => {
  const guildId = createTestGuildId('token_mismatch');
  const dictService = new WordChainDictionaryService({ db });
  dictService.addWordsToLocalLexicon(['apple', 'tiger', 'lemon', 'onward', 'noble']);
  const service = new WordChainGameService({ db, dictionaryService: dictService });

  try {
    // Normal mode (1-letter match): 'apple' ends in 'e'
    await service.processTurn({
      guildId,
      channelId: 'chan-normal',
      authorId: 'user-1',
      rawWord: 'apple',
      gameMode: GameMode.NORMAL,
    });

    // Player 2 submits 'tiger' (starts with 't' instead of 'e') -> WRONG_FIRST_TOKEN
    const mistakeNormal = await service.processTurn({
      guildId,
      channelId: 'chan-normal',
      authorId: 'user-2',
      rawWord: 'tiger',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(mistakeNormal.status, WordChainGameStatus.WRONG_FIRST_TOKEN);
    assert.equal(mistakeNormal.isMistake, true);
    assert.equal(mistakeNormal.currentCount, 0);

    // Hard mode (2-letter match): 'lemon' ends in 'on'
    await service.processTurn({
      guildId,
      channelId: 'chan-hard',
      authorId: 'user-1',
      rawWord: 'lemon',
      gameMode: GameMode.HARD,
    });

    // Player 2 submits 'noble' (starts with 'no', not 'on') -> WRONG_FIRST_TOKEN
    const mistakeHard = await service.processTurn({
      guildId,
      channelId: 'chan-hard',
      authorId: 'user-2',
      rawWord: 'noble',
      gameMode: GameMode.HARD,
    });
    assert.equal(mistakeHard.status, WordChainGameStatus.WRONG_FIRST_TOKEN);
    assert.equal(mistakeHard.isMistake, true);
    assert.equal(mistakeHard.currentCount, 0);

    // Valid continuation in Hard mode with 'onward' (starts with 'on')
    const validHard = await service.processTurn({
      guildId,
      channelId: 'chan-hard',
      authorId: 'user-2',
      rawWord: 'onward',
      gameMode: GameMode.HARD,
    });
    assert.equal(validHard.isValid, true);
    assert.equal(validHard.currentCount, 1);
  } finally {
    await cleanupGuild(guildId);
  }
});

test('WordChainGameService: Non-existent word (WORD_DOES_NOT_EXIST) vs Backend Error (API_ERROR)', async () => {
  const guildId = createTestGuildId('dict_outcomes');

  // Custom mock dictionary service
  let simulateApiError = false;
  const mockFetch: typeof fetch = async (_url) => {
    if (simulateApiError) {
      throw new Error('Connection timeout');
    }
    return new Response(JSON.stringify({ query: { pages: [{ title: 'mock', missing: true }] } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const dictService = new WordChainDictionaryService({ db, customFetch: mockFetch });
  dictService.addWordsToLocalLexicon(['apple']);
  const service = new WordChainGameService({ db, dictionaryService: dictService });

  try {
    // Valid opening word
    await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-1',
      rawWord: 'apple',
      gameMode: GameMode.NORMAL,
    });

    // 1. Non-existent word -> Breaking mistake WORD_DOES_NOT_EXIST
    const mistakeTurn = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-2',
      rawWord: 'elephantnotreal',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(mistakeTurn.status, WordChainGameStatus.WORD_DOES_NOT_EXIST);
    assert.equal(mistakeTurn.isMistake, true);
    assert.equal(mistakeTurn.currentCount, 0);

    // 2. Simulate API Network Outage -> Warning API_ERROR (chain NOT broken, word not accepted)
    // Use a word starting with 'e' that is not in Tier 1 common lexicon so it reaches the API
    simulateApiError = true;
    const errorTurn = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-3',
      rawWord: 'ephemeralunfound',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(errorTurn.status, WordChainGameStatus.API_ERROR);
    assert.equal(errorTurn.isWarning, true);
    assert.equal(errorTurn.isMistake, false);
    assert.equal(errorTurn.reactionEmoji, WordChainEmoji.WARNING);
  } finally {
    await cleanupGuild(guildId);
  }
});

// =========================================================================
// TEST SUITE 3: NON-BREAKING WARNINGS (V10, V11) & ISOLATION
// =========================================================================
test('WordChainGameService: Word repetition (ALREADY_USED) and per-guild/mode isolation', async () => {
  const guildIdA = createTestGuildId('iso_a');
  const guildIdB = createTestGuildId('iso_b');

  const dictService = new WordChainDictionaryService({ db });
  dictService.addWordsToLocalLexicon(['apple', 'elephant', 'tiger']);
  const service = new WordChainGameService({ db, dictionaryService: dictService });

  try {
    // Guild A Normal Mode: user-1 plays 'apple', user-2 plays 'elephant', user-1 plays 'tea'
    dictService.addWordsToLocalLexicon(['apple', 'elephant', 'tea']);
    await service.processTurn({
      guildId: guildIdA,
      channelId: 'chan-normal',
      authorId: 'user-1',
      rawWord: 'apple',
      gameMode: GameMode.NORMAL,
    });
    await service.processTurn({
      guildId: guildIdA,
      channelId: 'chan-normal',
      authorId: 'user-2',
      rawWord: 'elephant',
      gameMode: GameMode.NORMAL,
    });
    await service.processTurn({
      guildId: guildIdA,
      channelId: 'chan-normal',
      authorId: 'user-1',
      rawWord: 'tea',
      gameMode: GameMode.NORMAL,
    });

    // Player 2 plays 'apple' (starts with 'a', matching 'tea'[-1]) -> ALREADY_USED warning
    const repeatTurn = await service.processTurn({
      guildId: guildIdA,
      channelId: 'chan-normal',
      authorId: 'user-2',
      rawWord: 'apple',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(repeatTurn.status, WordChainGameStatus.ALREADY_USED);
    assert.equal(repeatTurn.isWarning, true);
    assert.equal(repeatTurn.isMistake, false);

    // Guild A Hard Mode isolation: 'apple' can be played in Hard Mode because gameMode is separate
    const hardTurn = await service.processTurn({
      guildId: guildIdA,
      channelId: 'chan-hard',
      authorId: 'user-1',
      rawWord: 'apple',
      gameMode: GameMode.HARD,
    });
    assert.equal(hardTurn.isValid, true);

    // Guild B isolation: 'apple' can be played in Guild B because guildId is separate
    const guildBTurn = await service.processTurn({
      guildId: guildIdB,
      channelId: 'chan-normal',
      authorId: 'user-1',
      rawWord: 'apple',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(guildBTurn.isValid, true);
  } finally {
    await cleanupGuild(guildIdA);
    await cleanupGuild(guildIdB);
  }
});

test('WordChainGameService: Dead-end token check (DEAD_END)', async () => {
  const guildId = createTestGuildId('deadend');
  const langService = new WordChainLanguageService();

  // Inject a dead-end token score: 'x' has score 0.001 (< 0.005 threshold)
  langService.setCustomTokenScores('en', GameMode.NORMAL, {
    x: 0.001,
  });

  const dictService = new WordChainDictionaryService({ db });
  dictService.addWordsToLocalLexicon(['complex']);
  const service = new WordChainGameService({
    db,
    languageService: langService,
    dictionaryService: dictService,
  });

  try {
    // Word 'complex' ends with 'x' (dead end) -> DEAD_END warning, chain NOT broken
    const turn = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-1',
      rawWord: 'complex',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(turn.status, WordChainGameStatus.DEAD_END);
    assert.equal(turn.isWarning, true);
    assert.equal(turn.isMistake, false);
    assert.equal(turn.reactionEmoji, WordChainEmoji.WARNING);
  } finally {
    await cleanupGuild(guildId);
  }
});

// =========================================================================
// TEST SUITE 4: SUCCESS OUTCOMES, SCORING, KARMA, & REACTION EMOJIS
// =========================================================================
test('WordChainGameService: Successful progression, dynamic celebration emojis, and milestones', async () => {
  const guildId = createTestGuildId('progression');
  const dictService = new WordChainDictionaryService({ db });
  dictService.addWordsToLocalLexicon(['apple', 'elephant', 'tiger', 'vietnam', 'japan']);
  const service = new WordChainGameService({ db, dictionaryService: dictService });

  try {
    // 1. First valid word -> New high score celebrated with 🎉
    const turn1 = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-1',
      rawWord: 'apple',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(turn1.isValid, true);
    assert.equal(turn1.currentCount, 1);
    assert.equal(turn1.highScore, 1);
    assert.equal(turn1.isNewHighScore, true);
    assert.equal(turn1.reactionEmoji, '🎉');

    // 2. Second valid word -> High score tied/exceeded in same run
    const turn2 = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-2',
      rawWord: 'elephant',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(turn2.isValid, true);
    assert.equal(turn2.currentCount, 2);
    assert.equal(turn2.highScore, 2);

    // 3. Special Country word override -> vietnam returns 🇻🇳
    // To chain legally from 'elephant' (ends with 't'), let's simulate setting config currentWord
    await db.wordChainConfig.update({
      where: { guildId },
      data: { currentWordNormal: 'kiev', lastMemberIdNormal: 'user-1' }, // ends with 'v'
    });

    const turnCountry = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-2',
      rawWord: 'vietnam',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(turnCountry.isValid, true);
    assert.equal(turnCountry.reactionEmoji, '🇻🇳');

    // 4. Milestone 100 words announcement
    await db.wordChainConfig.update({
      where: { guildId },
      data: {
        currentCountNormal: 99,
        currentWordNormal: 'lemon',
        lastMemberIdNormal: 'user-1',
      },
    });
    dictService.addWordsToLocalLexicon(['night']);

    const turn100 = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-2',
      rawWord: 'night',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(turn100.currentCount, 100);
    assert.equal(turn100.isMilestone, true);
    assert.match(turn100.message ?? '', /100 words! Nice work/);
    assert.equal(turn100.reactionEmoji, '💯');
  } finally {
    await cleanupGuild(guildId);
  }
});

// =========================================================================
// TEST SUITE 5: IN-MEMORY VOLATILE HISTORY & DEC-007 REBOOT
// =========================================================================
test('WordChainGameService: In-memory history decay and process reboot reset (DEC-007)', async () => {
  const guildId = createTestGuildId('history_reboot');
  const dictService = new WordChainDictionaryService({ db });
  dictService.addWordsToLocalLexicon(['birds', 'cats', 'dogs', 'frogs', 'horses']);
  const service = new WordChainGameService({ db, dictionaryService: dictService });

  try {
    // Single player sending words all ending in 's'
    const words = ['birds', 'cats', 'dogs', 'frogs', 'horses'];
    const karmas: number[] = [];

    for (const w of words) {
      // Artificially reset currentWord in DB to allow any chaining
      await db.wordChainConfig.upsert({
        where: { guildId },
        create: { guildId, currentWordNormal: null },
        update: { currentWordNormal: null, lastMemberIdNormal: null },
      });

      const res = await service.processTurn({
        guildId,
        channelId: 'chan-1',
        authorId: 'user-spammer',
        rawWord: w,
        gameMode: GameMode.NORMAL,
        isSinglePlayer: true,
      });
      karmas.push(res.karmaAwarded ?? 0);
    }

    // With 5 consecutive 's' suffixes, decay reduces karma significantly
    const firstKarma = karmas[0] ?? 0;
    const lastKarma = karmas[karmas.length - 1] ?? 0;
    assert.ok(lastKarma < firstKarma, `Expected last karma (${lastKarma}) to be less than first karma (${firstKarma})`);

    // Verify history length is 5
    const hist = service.getHistory(guildId, 'user-spammer', GameMode.NORMAL);
    assert.equal(hist.length, 5);

    // Emulate process reboot via clearHistory()
    service.clearHistory(guildId);
    assert.equal(service.getHistory(guildId, 'user-spammer', GameMode.NORMAL).length, 0);

    // Reset chain state in DB to allow words to be played again cleanly
    await service.resetChain(guildId, GameMode.NORMAL);

    const afterRebootTurn = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-spammer',
      rawWord: 'birds',
      gameMode: GameMode.NORMAL,
      isSinglePlayer: true,
    });

    assert.equal(afterRebootTurn.isValid, true);
    assert.equal(afterRebootTurn.karmaAwarded, firstKarma);
  } finally {
    await cleanupGuild(guildId);
  }
});

// =========================================================================
// TEST SUITE 6: FAILED ROLE REDEMPTION (30 CORRECT INPUTS)
// =========================================================================
test('WordChainGameService: Failed role redemption after 30 correct inputs', async () => {
  const guildId = createTestGuildId('failed_role');
  const dictService = new WordChainDictionaryService({ db });
  dictService.addWordsToLocalLexicon(['apple', 'elephant', 'tiger']);
  const service = new WordChainGameService({ db, dictionaryService: dictService });

  try {
    // 1. Initial mistake -> sets failedMemberId
    await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-shamed',
      rawWord: 'apple',
      gameMode: GameMode.NORMAL,
    });
    // Double turn causes mistake
    await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-shamed',
      rawWord: 'elephant',
      gameMode: GameMode.NORMAL,
      isSinglePlayer: false,
    });

    const config1 = await service.getConfig(guildId);
    assert.equal(config1?.failedMemberId, 'user-shamed');
    assert.equal(config1?.correctInputsByFailedMember, 0);

    // 2. Simulate 29 correct inputs from failed member
    await db.wordChainConfig.update({
      where: { guildId },
      data: {
        correctInputsByFailedMember: 29,
        currentWordNormal: 'tiger', // ends with 'r'
        lastMemberIdNormal: 'other-user',
      },
    });
    dictService.addWordsToLocalLexicon(['rabbit']);

    // 3. 30th correct input triggers redemption!
    const turn30 = await service.processTurn({
      guildId,
      channelId: 'chan-1',
      authorId: 'user-shamed',
      rawWord: 'rabbit',
      gameMode: GameMode.NORMAL,
    });
    assert.equal(turn30.isValid, true);
    assert.equal(turn30.roleStateChanged?.failedRoleCleared, true);

    const configCleared = await service.getConfig(guildId);
    assert.equal(configCleared?.failedMemberId, null);
    assert.equal(configCleared?.correctInputsByFailedMember, 0);
  } finally {
    await cleanupGuild(guildId);
  }
});

// =========================================================================
// TEST SUITE 7: TRANSACTION ATOMICITY & ROLLBACKS
// =========================================================================
test('WordChainGameService: Atomic transaction rollback on database failure', async () => {
  const guildId = createTestGuildId('rollback');
  const dictService = new WordChainDictionaryService({ db });
  dictService.addWordsToLocalLexicon(['apple']);

  // Create a proxy DB client whose $transaction rejects
  let failTransaction = false;
  const mockDb = new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === '$transaction') {
        return async (...args: unknown[]) => {
          if (failTransaction) {
            throw new Error('Simulated SQLite Lock / Disk Error');
          }
          const txFn = Reflect.get(target, '$transaction', receiver) as (...a: unknown[]) => Promise<unknown>;
          return await txFn.apply(target, args);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  const service = new WordChainGameService({ db: mockDb as typeof db, dictionaryService: dictService });

  try {
    failTransaction = true;

    await assert.rejects(
      async () => {
        await service.processTurn({
          guildId,
          channelId: 'chan-1',
          authorId: 'user-1',
          rawWord: 'apple',
          gameMode: GameMode.NORMAL,
        });
      },
      /Simulated SQLite Lock \/ Disk Error/,
    );

    // Verify no records inserted
    const count = await db.wordChainUsedWord.count({ where: { guildId } });
    assert.equal(count, 0);

    // Verify in-memory history was NOT updated due to transaction rollback
    const history = service.getHistory(guildId, 'user-1', GameMode.NORMAL);
    assert.equal(history.length, 0);
  } finally {
    await cleanupGuild(guildId);
  }
});

// =========================================================================
// TEST SUITE 8: CONCURRENCY MUTEX & RACE CONDITION GUARDS (CONC-001)
// =========================================================================
test('WordChainGameService: Concurrent turns serialized in strict FIFO order', async () => {
  const guildId = createTestGuildId('concurrency');
  const service = new WordChainGameService({ db });

  try {
    const executionOrder: number[] = [];

    // Launch 5 concurrent calls under withLock
    const tasks = [1, 2, 3, 4, 5].map((id) =>
      service.withLock(guildId, GameMode.NORMAL, async () => {
        // Artificially simulate varying async delay
        await new Promise((resolve) => setTimeout(resolve, 20 - id * 3));
        executionOrder.push(id);
      }),
    );

    await Promise.all(tasks);

    // Must be serialized strictly 1, 2, 3, 4, 5 in call order
    assert.deepEqual(executionOrder, [1, 2, 3, 4, 5]);
  } finally {
    await cleanupGuild(guildId);
  }
});

test('WordChainGameService: Mutex lock release on error prevents deadlocks', async () => {
  const guildId = createTestGuildId('deadlock_guard');
  const service = new WordChainGameService({ db });

  try {
    // Turn 1 throws an intentional exception
    await assert.rejects(
      async () => {
        await service.withLock(guildId, GameMode.NORMAL, async () => {
          throw new Error('Turn 1 crashed');
        });
      },
      /Turn 1 crashed/,
    );

    // Turn 2 must proceed cleanly without hanging or being deadlocked
    let turn2Executed = false;
    await service.withLock(guildId, GameMode.NORMAL, async () => {
      turn2Executed = true;
    });

    assert.equal(turn2Executed, true);
  } finally {
    await cleanupGuild(guildId);
  }
});
