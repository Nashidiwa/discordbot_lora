import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../shared/db/client.js';
import {
  GameMode,
  WordChainGameStatus,
  ApiResponse,
  SupportedLanguage,
  wordChainWordInputSchema,
  wordChainChannelConfigSchema,
  wordChainRoleConfigSchema,
  wordChainListWordSchema,
} from './wordchain.types.js';
import { WordChainConstants, WordChainEmoji, WordChainRegex } from './wordchain.constants.js';

test('WordChain Domain Constants and Enums', () => {
  // Game modes
  assert.equal(GameMode.NORMAL, 1);
  assert.equal(GameMode.HARD, 2);

  // Status codes
  assert.equal(WordChainGameStatus.VALID, 'VALID');
  assert.equal(WordChainGameStatus.SAME_PLAYER_TWICE, 'SAME_PLAYER_TWICE');
  assert.equal(WordChainGameStatus.WRONG_FIRST_TOKEN, 'WRONG_FIRST_TOKEN');
  assert.equal(WordChainGameStatus.WORD_DOES_NOT_EXIST, 'WORD_DOES_NOT_EXIST');

  // API Responses
  assert.equal(ApiResponse.WORD_EXISTS, 'WORD_EXISTS');
  assert.equal(ApiResponse.WORD_NOT_FOUND, 'WORD_NOT_FOUND');
  assert.equal(ApiResponse.ERROR, 'ERROR');

  // Supported Language
  assert.equal(SupportedLanguage.ENGLISH, 'en');

  // Mathematical & Threshold Constants
  assert.equal(WordChainConstants.MISTAKE_KARMA_PENALTY, -5.0);
  assert.equal(WordChainConstants.RELIABLE_ROLE_KARMA_THRESHOLD, 25.0);
  assert.equal(WordChainConstants.RELIABLE_ROLE_ACCURACY_THRESHOLD, 0.975);
  assert.equal(WordChainConstants.FAILED_ROLE_RECOVERY_INPUTS, 30);
  assert.equal(WordChainConstants.DEAD_END_THRESHOLD[GameMode.NORMAL], 0.005);
  assert.equal(WordChainConstants.DEAD_END_THRESHOLD[GameMode.HARD], 0.05);
  assert.equal(WordChainConstants.SUFFIX_HISTORY_MAXLEN, 5);
  assert.equal(WordChainConstants.WIKTIONARY_TIMEOUT_MS, 5000);
  assert.equal(WordChainConstants.WIKTIONARY_MAX_CONCURRENCY, 5);
  assert.equal(WordChainConstants.WIKTIONARY_MAX_RPS, 10);
  assert.equal(WordChainConstants.NEGATIVE_CACHE_TTL_HOURS, 24);
  assert.equal(WordChainConstants.GUILD_RETENTION_DAYS, 7);
});

test('WordChain Zod Runtime Schemas', () => {
  // Valid words
  assert.equal(wordChainWordInputSchema.parse('apple'), 'apple');
  assert.equal(wordChainWordInputSchema.parse('ice-cream'), 'ice-cream');

  // Invalid words (single letter, numbers, symbols, spaces)
  assert.throws(() => wordChainWordInputSchema.parse('a'));
  assert.throws(() => wordChainWordInputSchema.parse('apple123'));
  assert.throws(() => wordChainWordInputSchema.parse('hello world'));
  assert.throws(() => wordChainWordInputSchema.parse('-startdash'));

  // Regex conformance
  assert.match('lemon', WordChainRegex.EN_REGEX);
  assert.match('pre-wrap', WordChainRegex.EN_REGEX);
  assert.doesNotMatch('123', WordChainRegex.EN_REGEX);

  // Config schema
  const channelConfig = wordChainChannelConfigSchema.parse({
    guildId: '123456789012345678',
    channelId: '987654321098765432',
    gameMode: 1,
  });
  assert.equal(channelConfig.gameMode, GameMode.NORMAL);

  // Role config schema
  const roleConfig = wordChainRoleConfigSchema.parse({
    guildId: '123456789012345678',
    roleId: '876543210987654321',
    roleType: 'RELIABLE',
  });
  assert.equal(roleConfig.roleType, 'RELIABLE');
});

test('WordChain Prisma Database Client Models Availability', async () => {
  // Verify that Prisma Client delegates exist for all 7 Word Chain models
  assert.ok(db.wordChainConfig, 'db.wordChainConfig should exist');
  assert.ok(db.wordChainMember, 'db.wordChainMember should exist');
  assert.ok(db.wordChainUsedWord, 'db.wordChainUsedWord should exist');
  assert.ok(db.wordChainBlacklist, 'db.wordChainBlacklist should exist');
  assert.ok(db.wordChainWhitelist, 'db.wordChainWhitelist should exist');
  assert.ok(db.wordChainWordCache, 'db.wordChainWordCache should exist');
  assert.ok(db.wordChainBannedMember, 'db.wordChainBannedMember should exist');

  // Verify non-destructive queries can execute against the SQLite database
  const configCount = await db.wordChainConfig.count();
  const memberCount = await db.wordChainMember.count();
  const usedWordCount = await db.wordChainUsedWord.count();
  const blacklistCount = await db.wordChainBlacklist.count();
  const whitelistCount = await db.wordChainWhitelist.count();
  const wordCacheCount = await db.wordChainWordCache.count();
  const bannedMemberCount = await db.wordChainBannedMember.count();

  assert.equal(typeof configCount, 'number');
  assert.equal(typeof memberCount, 'number');
  assert.equal(typeof usedWordCount, 'number');
  assert.equal(typeof blacklistCount, 'number');
  assert.equal(typeof whitelistCount, 'number');
  assert.equal(typeof wordCacheCount, 'number');
  assert.equal(typeof bannedMemberCount, 'number');
});

test('WordChainWordCache Composite Primary Key (language_word)', async () => {
  const testWord = 'testcompositeword';
  const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

  try {
    // 1. Create positive record in English
    const enRecord = await db.wordChainWordCache.upsert({
      where: {
        language_word: {
          language: 'en',
          word: testWord,
        },
      },
      create: {
        language: 'en',
        word: testWord,
        isNegative: false,
        expiresAt: null,
      },
      update: {
        isNegative: false,
        expiresAt: null,
      },
    });

    assert.equal(enRecord.language, 'en');
    assert.equal(enRecord.word, testWord);
    assert.equal(enRecord.isNegative, false);
    assert.equal(enRecord.expiresAt, null);

    // 2. Create negative record in French for the same normalized word (no collision)
    const frRecord = await db.wordChainWordCache.upsert({
      where: {
        language_word: {
          language: 'fr',
          word: testWord,
        },
      },
      create: {
        language: 'fr',
        word: testWord,
        isNegative: true,
        expiresAt: expiryDate,
      },
      update: {
        isNegative: true,
        expiresAt: expiryDate,
      },
    });

    assert.equal(frRecord.language, 'fr');
    assert.equal(frRecord.word, testWord);
    assert.equal(frRecord.isNegative, true);
    assert.ok(frRecord.expiresAt !== null);

    // 3. Query individually using the compound selector language_word
    const fetchedEn = await db.wordChainWordCache.findUnique({
      where: {
        language_word: {
          language: 'en',
          word: testWord,
        },
      },
    });
    assert.ok(fetchedEn !== null);
    assert.equal(fetchedEn?.isNegative, false);
    assert.equal(fetchedEn?.expiresAt, null);

    const fetchedFr = await db.wordChainWordCache.findUnique({
      where: {
        language_word: {
          language: 'fr',
          word: testWord,
        },
      },
    });
    assert.ok(fetchedFr !== null);
    assert.equal(fetchedFr?.isNegative, true);
    assert.equal(fetchedFr?.expiresAt?.getTime(), expiryDate.getTime());

    // 4. Verify count of distinct language entries for the word
    const entries = await db.wordChainWordCache.findMany({
      where: { word: testWord },
    });
    assert.equal(entries.length, 2);
  } finally {
    // Clean up test records to preserve database cleanliness
    await db.wordChainWordCache.deleteMany({
      where: { word: testWord },
    });
  }
});
