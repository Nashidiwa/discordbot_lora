import type { DatabaseClient } from '../../../shared/db/client.js';
import { db as defaultDb } from '../../../shared/db/client.js';
import {
  GameMode,
  WordChainGameStatus,
  ApiResponse,
  type WordChainConfigRecord,
  type WordChainMemberRecord,
  type MemberStatsSummary,
  type LeaderboardEntry,
  type ProcessTurnInput,
  type TurnExecutionResult,
} from '../types/wordchain.types.js';
import {
  WordChainConstants,
  WordChainEmoji,
  WordChainSpecialCountEmojis,
  WordChainSpecialWordEmojis,
} from '../wordchain.constants.js';
import { WordChainLanguageService } from './wordchain-language.service.js';
import { WordChainKarmaService } from './wordchain-karma.service.js';
import { WordChainDictionaryService } from './wordchain-dictionary.service.js';
import { WordChainRoleService } from './wordchain-role.service.js';

export interface WordChainGameServiceOptions {
  db?: DatabaseClient;
  languageService?: WordChainLanguageService;
  karmaService?: WordChainKarmaService;
  dictionaryService?: WordChainDictionaryService;
  roleService?: WordChainRoleService;
}

/**
 * Core game orchestration engine for Word Chain.
 * Coordinates turn validation, breaking vs non-breaking error classification,
 * atomic database state transitions, in-memory volatile suffix history (DEC-007),
 * and per-guild/per-mode concurrency serialization (CONC-001).
 */
export class WordChainGameService {
  private db: DatabaseClient;
  private languageService: WordChainLanguageService;
  private karmaService: WordChainKarmaService;
  private dictionaryService: WordChainDictionaryService;
  private roleService: WordChainRoleService;

  // In-memory per-guild/mode concurrency mutex queue
  private locks: Map<string, Promise<void>> = new Map();

  // In-memory 5-word history deque per (guildId:userId:gameMode) - DEC-007
  private serverHistories: Map<string, string[]> = new Map();

  // In-memory high-score celebration flag per (guildId:gameMode)
  private usedHighScoreEmoji: Map<string, boolean> = new Map();

  constructor(options: WordChainGameServiceOptions = {}) {
    this.db = options.db ?? defaultDb;
    this.languageService = options.languageService ?? new WordChainLanguageService();
    this.karmaService = options.karmaService ?? new WordChainKarmaService();
    this.dictionaryService = options.dictionaryService ?? new WordChainDictionaryService({ db: this.db });
    this.roleService = options.roleService ?? new WordChainRoleService();
  }

  /**
   * Concurrency serialization lock for a specific guild and game mode.
   * Guarantees strict FIFO execution of incoming turns under high load.
   */
  public async withLock<T>(guildId: string, mode: GameMode, fn: () => Promise<T>): Promise<T> {
    const key = `${guildId}:${mode}`;
    const previous = this.locks.get(key) ?? Promise.resolve();

    let releaseLock: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.locks.set(key, currentLock);

    try {
      await previous.catch(() => {});
      return await fn();
    } finally {
      releaseLock!();
      if (this.locks.get(key) === currentLock) {
        this.locks.delete(key);
      }
    }
  }

  /**
   * Retrieves player volatile suffix history for the specified guild and mode (DEC-007).
   */
  public getHistory(guildId: string, userId: string, mode: GameMode): string[] {
    const key = `${guildId}:${userId}:${mode}`;
    return this.serverHistories.get(key) ?? [];
  }

  /**
   * Appends a valid word to the player's volatile in-memory history deque (maxlen 5).
   */
  public pushHistory(guildId: string, userId: string, mode: GameMode, word: string): void {
    const key = `${guildId}:${userId}:${mode}`;
    const history = this.serverHistories.get(key) ?? [];
    history.push(word);
    if (history.length > WordChainConstants.SUFFIX_HISTORY_MAXLEN) {
      history.shift();
    }
    this.serverHistories.set(key, history);
  }

  /**
   * Resets in-memory volatile histories and celebration flags.
   * Emulates process restart as required by DEC-007.
   */
  public clearHistory(guildId?: string): void {
    if (!guildId) {
      this.serverHistories.clear();
      this.usedHighScoreEmoji.clear();
      return;
    }
    for (const key of this.serverHistories.keys()) {
      if (key.startsWith(`${guildId}:`)) {
        this.serverHistories.delete(key);
      }
    }
    for (const key of this.usedHighScoreEmoji.keys()) {
      if (key.startsWith(`${guildId}:`)) {
        this.usedHighScoreEmoji.delete(key);
      }
    }
  }

  /**
   * Lazy provisioning: Retrieves existing configuration or initializes default row on demand (DEC-005).
   */
  public async getOrCreateConfig(guildId: string): Promise<WordChainConfigRecord> {
    const existing = await this.db.wordChainConfig.findUnique({
      where: { guildId },
    });
    if (existing) {
      return existing;
    }
    return await this.db.wordChainConfig.upsert({
      where: { guildId },
      create: {
        guildId,
        languages: 'en',
      },
      update: {},
    });
  }

  /**
   * Fetches existing configuration or null if not yet provisioned.
   */
  public async getConfig(guildId: string): Promise<WordChainConfigRecord | null> {
    return await this.db.wordChainConfig.findUnique({
      where: { guildId },
    });
  }

  /**
   * Updates configuration settings.
   */
  public async updateConfig(
    guildId: string,
    data: Partial<Omit<WordChainConfigRecord, 'guildId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<WordChainConfigRecord> {
    return await this.db.wordChainConfig.upsert({
      where: { guildId },
      create: {
        guildId,
        ...data,
      },
      update: data,
    });
  }

  /**
   * Resolves the GameMode corresponding to a channel ID.
   */
  public resolveGameMode(channelId: string, config: WordChainConfigRecord): GameMode | null {
    if (config.normalModeChannelId && channelId === config.normalModeChannelId) {
      return GameMode.NORMAL;
    }
    if (config.hardModeChannelId && channelId === config.hardModeChannelId) {
      return GameMode.HARD;
    }
    return null;
  }

  /**
   * Computes the reaction emoji based on current count, high score, and special overrides.
   * Matches model.py:140-165.
   */
  public getReactionEmoji(
    mode: GameMode,
    currentCount: number,
    highScore: number,
    word: string,
    guildId: string,
  ): string {
    const key = `${guildId}:${mode}`;
    const alreadyCelebrated = this.usedHighScoreEmoji.get(key) ?? false;

    if (currentCount >= highScore && highScore > 0) {
      if (!alreadyCelebrated) {
        this.usedHighScoreEmoji.set(key, true);
        return WordChainEmoji.CELEBRATION; // 🎉
      } else {
        const defaultEmoji = WordChainSpecialCountEmojis[currentCount] ?? WordChainEmoji.HIGH_SCORE_TIED; // ☑️
        return WordChainSpecialWordEmojis[word] ?? defaultEmoji;
      }
    } else {
      const defaultEmoji = WordChainSpecialCountEmojis[currentCount] ?? WordChainEmoji.CORRECT; // ✅
      return WordChainSpecialWordEmojis[word] ?? defaultEmoji;
    }
  }

  /**
   * Processes an incoming word submission through the exhaustive 12-stage validation pipeline.
   * Stages V1-V6 execute pre-lock; Stages V7-V12 execute inside the per-guild/mode mutex.
   */
  public async processTurn(input: ProcessTurnInput): Promise<TurnExecutionResult> {
    const raw = input.rawWord ?? '';
    const normalized = this.languageService.normalizeWord(raw);

    // V1: Empty or solitary period guard
    if (raw.trim().length === 0 || raw.trim() === '.') {
      return {
        status: WordChainGameStatus.VALID,
        isValid: false,
        isMistake: false,
        isWarning: false,
        isIgnored: true,
        rawWord: raw,
        normalizedWord: normalized,
        authorId: input.authorId,
        guildId: input.guildId,
      };
    }

    // V2: Banned member guard
    const banned = await this.db.wordChainBannedMember.findUnique({
      where: { userId: input.authorId },
    });
    if (banned) {
      return {
        status: WordChainGameStatus.VALID,
        isValid: false,
        isMistake: false,
        isWarning: false,
        isIgnored: true,
        rawWord: raw,
        normalizedWord: normalized,
        authorId: input.authorId,
        guildId: input.guildId,
      };
    }

    // Retrieve or lazy-provision server config (DEC-005)
    const config = await this.getOrCreateConfig(input.guildId);
    if (config.isBanned) {
      return {
        status: WordChainGameStatus.VALID,
        isValid: false,
        isMistake: false,
        isWarning: false,
        isIgnored: true,
        rawWord: raw,
        normalizedWord: normalized,
        authorId: input.authorId,
        guildId: input.guildId,
      };
    }

    // Resolve game mode
    let mode = input.gameMode;
    if (!mode) {
      mode = this.resolveGameMode(input.channelId, config) ?? undefined;
    }
    if (!mode) {
      return {
        status: WordChainGameStatus.VALID,
        isValid: false,
        isMistake: false,
        isWarning: false,
        isIgnored: true,
        rawWord: raw,
        normalizedWord: normalized,
        authorId: input.authorId,
        guildId: input.guildId,
      };
    }

    // V4: Single-character guard (non-breaking warning)
    if (normalized.length === 1) {
      return {
        status: WordChainGameStatus.SINGLE_LETTER,
        isValid: false,
        isMistake: false,
        isWarning: true,
        isIgnored: false,
        rawWord: raw,
        normalizedWord: normalized,
        authorId: input.authorId,
        guildId: input.guildId,
        gameMode: mode,
        reactionEmoji: WordChainEmoji.WARNING,
        message:
          'Single-letter inputs are no longer accepted.\nThe chain has **not** been broken. Please enter another word.',
      };
    }

    // V5: Regex validation & conversational chat filter
    const isValidFormat = this.languageService.isValidWordFormat(normalized, 'en');
    if (!isValidFormat) {
      if (/\s/.test(raw)) {
        // Casual chat with spaces is silently ignored
        return {
          status: WordChainGameStatus.VALID,
          isValid: false,
          isMistake: false,
          isWarning: false,
          isIgnored: true,
          rawWord: raw,
          normalizedWord: normalized,
          authorId: input.authorId,
          guildId: input.guildId,
          gameMode: mode,
        };
      } else {
        // Single invalid token emits warning without breaking the chain
        return {
          status: WordChainGameStatus.REGEX_MISMATCH,
          isValid: false,
          isMistake: false,
          isWarning: true,
          isIgnored: false,
          rawWord: raw,
          normalizedWord: normalized,
          authorId: input.authorId,
          guildId: input.guildId,
          gameMode: mode,
          reactionEmoji: WordChainEmoji.WARNING,
          message:
            'Your word is not a valid word in any of your configured languages.\nThe chain has **not** been broken. Please enter another word.',
        };
      }
    }

    // V6: Whitelist & Blacklist evaluation
    const [whitelisted, blacklisted] = await Promise.all([
      this.db.wordChainWhitelist.findUnique({
        where: { guildId_word: { guildId: input.guildId, word: normalized } },
      }),
      this.db.wordChainBlacklist.findUnique({
        where: { guildId_word: { guildId: input.guildId, word: normalized } },
      }),
    ]);

    if (blacklisted && !whitelisted) {
      return {
        status: WordChainGameStatus.BLACKLISTED,
        isValid: false,
        isMistake: false,
        isWarning: true,
        isIgnored: false,
        rawWord: raw,
        normalizedWord: normalized,
        authorId: input.authorId,
        guildId: input.guildId,
        gameMode: mode,
        reactionEmoji: WordChainEmoji.WARNING,
        message:
          'This word has been **blacklisted**. Please do not use it.\nThe chain has **not** been broken. Please enter another word.',
      };
    }

    // Critical section: acquire serialization lock for this guild and mode
    return await this.withLock(input.guildId, mode, async () => {
      // Reload fresh state inside lock
      const freshConfig = await this.getOrCreateConfig(input.guildId);
      const currentWord = mode === GameMode.NORMAL ? freshConfig.currentWordNormal : freshConfig.currentWordHard;
      const lastMemberId = mode === GameMode.NORMAL ? freshConfig.lastMemberIdNormal : freshConfig.lastMemberIdHard;

      // V7: Consecutive turn violation (breaking mistake)
      const isSinglePlayer = input.isSinglePlayer ?? false;
      if (!isSinglePlayer && lastMemberId === input.authorId) {
        return await this.handleMistake(
          input.guildId,
          input.authorId,
          mode!,
          WordChainGameStatus.SAME_PLAYER_TWICE,
          normalized,
          raw,
          freshConfig,
        );
      }

      // V8: Starting letter / token prefix mismatch (breaking mistake)
      if (currentWord && !this.languageService.doesWordChain(currentWord, normalized, mode!)) {
        return await this.handleMistake(
          input.guildId,
          input.authorId,
          mode!,
          WordChainGameStatus.WRONG_FIRST_TOKEN,
          normalized,
          raw,
          freshConfig,
        );
      }

      // V9: Dictionary validation (Tier 1/2/3) if not whitelisted
      if (!whitelisted) {
        const apiResponse = await this.dictionaryService.validateWord(normalized, 'en');
        if (apiResponse === ApiResponse.WORD_NOT_FOUND) {
          return await this.handleMistake(
            input.guildId,
            input.authorId,
            mode!,
            WordChainGameStatus.WORD_DOES_NOT_EXIST,
            normalized,
            raw,
            freshConfig,
          );
        }

        if (apiResponse === ApiResponse.ERROR) {
          // Backend or network error: chain preserved, word not counted, no penalty
          return {
            status: WordChainGameStatus.API_ERROR,
            isValid: false,
            isMistake: false,
            isWarning: true,
            isIgnored: false,
            rawWord: raw,
            normalizedWord: normalized,
            authorId: input.authorId,
            guildId: input.guildId,
            gameMode: mode,
            reactionEmoji: WordChainEmoji.WARNING,
            message:
              ':octagonal_sign: There was an issue in the backend.\nThe above entered word is **NOT** being taken into account.',
          };
        }
      }

      // V10: Repetition check in used_words (non-breaking warning)
      const used = await this.db.wordChainUsedWord.findUnique({
        where: {
          guildId_gameMode_word: {
            guildId: input.guildId,
            gameMode: mode!,
            word: normalized,
          },
        },
      });

      if (used) {
        return {
          status: WordChainGameStatus.ALREADY_USED,
          isValid: false,
          isMistake: false,
          isWarning: true,
          isIgnored: false,
          rawWord: raw,
          normalizedWord: normalized,
          authorId: input.authorId,
          guildId: input.guildId,
          gameMode: mode,
          reactionEmoji: WordChainEmoji.WARNING,
          message: `The word *${normalized}* has already been used before.\nThe chain has **not** been broken.\nPlease enter another word.`,
        };
      }

      // V11: Dead-end token check (non-breaking warning)
      const endToken = this.languageService.extractEndToken(normalized, mode!);
      if (this.languageService.isDeadEndToken(endToken, mode!, 'en')) {
        return {
          status: WordChainGameStatus.DEAD_END,
          isValid: false,
          isMistake: false,
          isWarning: true,
          isIgnored: false,
          rawWord: raw,
          normalizedWord: normalized,
          authorId: input.authorId,
          guildId: input.guildId,
          gameMode: mode,
          reactionEmoji: WordChainEmoji.WARNING,
          message:
            'Your word has no or just few words to continue with.\nThe chain has **not** been broken. Please enter another word.\n\n-# If you think this is wrong, please let us know on our support server.',
        };
      }

      // V12: Everything is valid - accept word and commit transaction
      return await this.acceptWord(
        input.guildId,
        input.authorId,
        mode!,
        normalized,
        raw,
        freshConfig,
      );
    });
  }

  /**
   * Accepts a valid word, commits an atomic Prisma transaction, and updates ephemeral state.
   */
  private async acceptWord(
    guildId: string,
    authorId: string,
    mode: GameMode,
    normalizedWord: string,
    rawWord: string,
    config: WordChainConfigRecord,
  ): Promise<TurnExecutionResult> {
    const currentCount = mode === GameMode.NORMAL ? config.currentCountNormal : config.currentCountHard;
    const highScore = mode === GameMode.NORMAL ? config.highScoreNormal : config.highScoreHard;
    const newCount = currentCount + 1;
    const newHighScore = Math.max(highScore, newCount);
    const isNewHighScore = newCount > highScore;

    // Calculate karma
    const history = this.getHistory(guildId, authorId, mode);
    const karmaResult = this.karmaService.calculateTotalKarma(
      normalizedWord,
      history,
      this.languageService,
      mode,
    );

    let failedRoleCleared = false;
    let reliableRoleGranted = false;
    let reliableRoleRevoked = false;

    // Atomic database update across WordChainUsedWord, WordChainMember, and WordChainConfig
    await this.db.$transaction(async (tx) => {
      // 1. Insert into used words
      await tx.wordChainUsedWord.create({
        data: {
          guildId,
          gameMode: mode,
          word: normalizedWord,
        },
      });

      // 2. Fetch member and update score, correct inputs, and karma
      const member = await tx.wordChainMember.findUnique({
        where: { guildId_userId: { guildId, userId: authorId } },
      });
      const currentKarma = member?.karma ?? 0.0;
      const finalKarma = Math.max(0, currentKarma + karmaResult.finalKarma);

      const updatedMember = await tx.wordChainMember.upsert({
        where: { guildId_userId: { guildId, userId: authorId } },
        create: {
          guildId,
          userId: authorId,
          score: 1,
          correctInputs: 1,
          wrongInputs: 0,
          karma: finalKarma,
        },
        update: {
          score: { increment: 1 },
          correctInputs: { increment: 1 },
          karma: finalKarma,
        },
      });

      // Role eligibility transitions
      const wasReliable = member
        ? this.roleService.isEligibleForReliableRole({
            karma: member.karma,
            correctInputs: member.correctInputs,
            wrongInputs: member.wrongInputs,
          })
        : false;
      const isNowReliable = this.roleService.isEligibleForReliableRole({
        karma: updatedMember.karma,
        correctInputs: updatedMember.correctInputs,
        wrongInputs: updatedMember.wrongInputs,
      });
      if (!wasReliable && isNowReliable) reliableRoleGranted = true;
      if (wasReliable && !isNowReliable) reliableRoleRevoked = true;

      // 3. Update server config
      const updateData: Record<string, unknown> = {};
      if (mode === GameMode.NORMAL) {
        updateData.currentWordNormal = normalizedWord;
        updateData.currentCountNormal = newCount;
        updateData.highScoreNormal = newHighScore;
        updateData.lastMemberIdNormal = authorId;
      } else {
        updateData.currentWordHard = normalizedWord;
        updateData.currentCountHard = newCount;
        updateData.highScoreHard = newHighScore;
        updateData.lastMemberIdHard = authorId;
      }

      // Failed role redemption check (cogs/game.py:458-464)
      if (config.failedMemberId === authorId) {
        const redemptionCount = config.correctInputsByFailedMember + 1;
        if (this.roleService.hasClearedFailedRole(redemptionCount)) {
          updateData.failedMemberId = null;
          updateData.correctInputsByFailedMember = 0;
          failedRoleCleared = true;
        } else {
          updateData.correctInputsByFailedMember = redemptionCount;
        }
      }

      await tx.wordChainConfig.update({
        where: { guildId },
        data: updateData,
      });
    });

    // Transaction succeeded: append word to player's volatile in-memory history (DEC-007)
    this.pushHistory(guildId, authorId, mode, normalizedWord);

    // Compute celebration reaction emoji
    const reactionEmoji = this.getReactionEmoji(mode, newCount, newHighScore, normalizedWord, guildId);

    // Milestone announcement (every 100 words)
    const isMilestone = newCount > 0 && newCount % 100 === 0;
    const message = isMilestone ? `${newCount} words! Nice work, keep it up!` : undefined;

    return {
      status: WordChainGameStatus.VALID,
      isValid: true,
      isMistake: false,
      isWarning: false,
      isIgnored: false,
      rawWord,
      normalizedWord,
      authorId,
      guildId,
      gameMode: mode,
      reactionEmoji,
      message,
      currentCount: newCount,
      highScore: newHighScore,
      isNewHighScore,
      isMilestone,
      karmaAwarded: karmaResult.finalKarma,
      roleStateChanged: {
        reliableRoleGranted,
        reliableRoleRevoked,
        failedRoleCleared,
      },
    };
  }

  /**
   * Handles a breaking mistake, resets chain count to 0, penalizes karma by -5.0,
   * purges used words for this guild/mode, and preserves tokens (DISC-005).
   */
  private async handleMistake(
    guildId: string,
    authorId: string,
    mode: GameMode,
    status: WordChainGameStatus,
    normalizedWord: string,
    rawWord: string,
    config: WordChainConfigRecord,
  ): Promise<TurnExecutionResult> {
    const currentCount = mode === GameMode.NORMAL ? config.currentCountNormal : config.currentCountHard;
    const highScore = mode === GameMode.NORMAL ? config.highScoreNormal : config.highScoreHard;
    const currentWord = mode === GameMode.NORMAL ? config.currentWordNormal : config.currentWordHard;
    const requiredToken = currentWord ? currentWord.slice(-mode) : '';

    let message = '';
    if (status === WordChainGameStatus.SAME_PLAYER_TWICE) {
      message =
        `<@${authorId}> messed up the count! *You cannot send two words in a row!*\n` +
        (currentCount > 0 ? `The chain length was ${currentCount} when it was broken. :sob:\n` : '') +
        (currentWord
          ? `Restart with a word starting with **${requiredToken}** and try to beat the current high score of **${highScore}**!`
          : `Restart and try to beat the current high score of **${highScore}**!`);
    } else if (status === WordChainGameStatus.WRONG_FIRST_TOKEN) {
      message =
        `<@${authorId}> messed up the chain! *The word you entered did not begin with the last letter of the previous word* (**${requiredToken}**).\n` +
        (currentCount > 0 ? `The chain length was ${currentCount} when it was broken. :sob:\n` : '') +
        `Restart with a word starting with **${requiredToken}** and try to beat the current high score of **${highScore}**!`;
    } else if (status === WordChainGameStatus.WORD_DOES_NOT_EXIST) {
      if (currentWord) {
        message =
          `<@${authorId}> messed up the chain! *The word you entered does not exist.^*\n` +
          (currentCount > 0 ? `The chain length was ${currentCount} when it was broken. :sob:\n` : '') +
          `Restart with a word starting with **${requiredToken}** and try to beat the current high score of **${highScore}**!\n\n` +
          `-# ^ The bot now supports multiple languages. When a word is invalid, it pertains to the language(s) enabled in this server.\n-# To check enabled languages, use \`/show_languages\`.`;
      } else {
        message =
          `<@${authorId}> messed up the chain! *The word you entered does not exist.*\n` +
          `Restart and try to beat the current high score of **${highScore}**!`;
      }
    }

    let reliableRoleRevoked = false;

    // Atomic transaction: purge used words, penalize member, reset chain count
    await this.db.$transaction(async (tx) => {
      // 1. Purge used words for this specific guild and mode
      await tx.wordChainUsedWord.deleteMany({
        where: {
          guildId,
          gameMode: mode,
        },
      });

      // 2. Penalize member (score - 1, wrong + 1, karma - 5.0)
      const member = await tx.wordChainMember.findUnique({
        where: { guildId_userId: { guildId, userId: authorId } },
      });
      const currentKarma = member?.karma ?? 0.0;
      const finalKarma = Math.max(0, currentKarma + WordChainConstants.MISTAKE_KARMA_PENALTY);

      const updatedMember = await tx.wordChainMember.upsert({
        where: { guildId_userId: { guildId, userId: authorId } },
        create: {
          guildId,
          userId: authorId,
          score: -1,
          correctInputs: 0,
          wrongInputs: 1,
          karma: finalKarma,
        },
        update: {
          score: { decrement: 1 },
          wrongInputs: { increment: 1 },
          karma: finalKarma,
        },
      });

      const wasReliable = member
        ? this.roleService.isEligibleForReliableRole({
            karma: member.karma,
            correctInputs: member.correctInputs,
            wrongInputs: member.wrongInputs,
          })
        : false;
      const isNowReliable = this.roleService.isEligibleForReliableRole({
        karma: updatedMember.karma,
        correctInputs: updatedMember.correctInputs,
        wrongInputs: updatedMember.wrongInputs,
      });
      if (wasReliable && !isNowReliable) reliableRoleRevoked = true;

      // 3. Reset chain count, set failedMemberId, reset failed counter
      // NOTE: currentWord and lastMemberId are PRESERVED! (model.py:121, DISC-005)
      const updateData: Record<string, unknown> = {
        failedMemberId: authorId,
        correctInputsByFailedMember: 0,
      };
      if (mode === GameMode.NORMAL) {
        updateData.currentCountNormal = 0;
      } else {
        updateData.currentCountHard = 0;
      }

      await tx.wordChainConfig.update({
        where: { guildId },
        data: updateData,
      });
    });

    // Reset high score celebration flag
    const key = `${guildId}:${mode}`;
    this.usedHighScoreEmoji.set(key, false);

    return {
      status,
      isValid: false,
      isMistake: true,
      isWarning: false,
      isIgnored: false,
      rawWord,
      normalizedWord,
      authorId,
      guildId,
      gameMode: mode,
      reactionEmoji: WordChainEmoji.MISTAKE,
      message,
      currentCount: 0,
      highScore,
      karmaAwarded: WordChainConstants.MISTAKE_KARMA_PENALTY,
      roleStateChanged: {
        failedRoleGranted: true,
        reliableRoleRevoked,
      },
    };
  }

  /**
   * Fetches player performance statistics and role eligibility for a guild.
   */
  public async getMemberStats(guildId: string, userId: string): Promise<MemberStatsSummary | null> {
    const [member, config] = await Promise.all([
      this.db.wordChainMember.findUnique({
        where: { guildId_userId: { guildId, userId } },
      }),
      this.db.wordChainConfig.findUnique({
        where: { guildId },
      }),
    ]);

    if (!member) {
      return null;
    }

    const total = member.correctInputs + member.wrongInputs;
    const accuracy = total > 0 ? member.correctInputs / total : 0.0;
    const isReliable = this.roleService.isEligibleForReliableRole({
      karma: member.karma,
      correctInputs: member.correctInputs,
      wrongInputs: member.wrongInputs,
    });
    const isFailed = config ? config.failedMemberId === userId : false;

    return {
      userId: member.userId,
      guildId: member.guildId,
      score: member.score,
      correctInputs: member.correctInputs,
      wrongInputs: member.wrongInputs,
      karma: member.karma,
      accuracy,
      isReliable,
      isFailed,
    };
  }

  /**
   * Retrieves guild leaderboard sorted by score and karma descending.
   */
  public async getLeaderboard(guildId: string, limit = 10): Promise<LeaderboardEntry[]> {
    const rows = await this.db.wordChainMember.findMany({
      where: { guildId },
      orderBy: [{ score: 'desc' }, { karma: 'desc' }],
      take: limit,
    });

    return rows.map((row, index) => ({
      rank: index + 1,
      id: row.userId,
      score: row.score,
      karma: row.karma,
      correctInputs: row.correctInputs,
    }));
  }

  /**
   * Resets active chain state and clears used words for a game mode.
   */
  public async resetChain(guildId: string, mode: GameMode): Promise<void> {
    await this.withLock(guildId, mode, async () => {
      await this.db.$transaction(async (tx) => {
        await tx.wordChainUsedWord.deleteMany({
          where: { guildId, gameMode: mode },
        });

        const updateData: Record<string, unknown> = {};
        if (mode === GameMode.NORMAL) {
          updateData.currentCountNormal = 0;
          updateData.currentWordNormal = null;
          updateData.lastMemberIdNormal = null;
        } else {
          updateData.currentCountHard = 0;
          updateData.currentWordHard = null;
          updateData.lastMemberIdHard = null;
        }

        await tx.wordChainConfig.update({
          where: { guildId },
          data: updateData,
        });
      });

      this.usedHighScoreEmoji.set(`${guildId}:${mode}`, false);
    });
  }

  /**
   * Fetches word definitions from English Wiktionary REST API (DICT-002).
   */
  public async fetchDefinition(
    word: string,
    customFetch?: typeof fetch,
  ): Promise<Array<{ partOfSpeech: string; definitions: string[] }> | null> {
    const normalized = this.languageService.normalizeWord(word);
    const fetchFunc = customFetch ?? globalThis.fetch;
    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(normalized)}?redirect=true`;

    try {
      const response = await fetchFunc(url, {
        signal: AbortSignal.timeout(WordChainConstants.WIKTIONARY_TIMEOUT_MS),
        headers: {
          'User-Agent': 'WordChainBot/2.0 (Discord Bot; Linguistic Educational Research)',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as Record<
        string,
        Array<{ partOfSpeech?: string; definitions?: Array<{ definition?: string }> }>
      >;
      const enEntries = data['en'] ?? [];
      const results: Array<{ partOfSpeech: string; definitions: string[] }> = [];

      for (const entry of enEntries) {
        const partOfSpeech = entry.partOfSpeech ?? 'Word';
        const defs = (entry.definitions ?? [])
          .map((d) => (d.definition ?? '').replace(/<[^>]*>/g, '').trim())
          .filter((d) => d.length > 0);

        if (defs.length > 0) {
          results.push({ partOfSpeech, definitions: defs.slice(0, 3) });
        }
      }

      return results.length > 0 ? results : null;
    } catch {
      return null;
    }
  }

  /**
   * GDPR Right to Erasure: Purges all player records for a user across all guilds (DEC-004).
   */
  public async purgeUser(userId: string): Promise<number> {
    const res = await this.db.wordChainMember.deleteMany({
      where: { userId },
    });
    return res.count;
  }

  /**
   * Administrative Purge: Permanently deletes all Word Chain data for a guild (DEC-004).
   */
  public async purgeServer(guildId: string): Promise<void> {
    await this.db.$transaction([
      this.db.wordChainUsedWord.deleteMany({ where: { guildId } }),
      this.db.wordChainMember.deleteMany({ where: { guildId } }),
      this.db.wordChainBlacklist.deleteMany({ where: { guildId } }),
      this.db.wordChainWhitelist.deleteMany({ where: { guildId } }),
      this.db.wordChainConfig.deleteMany({ where: { guildId } }),
    ]);
    this.clearHistory(guildId);
  }

  /**
   * Globally bans or unbans a member from participating in Word Chain (DEC-004).
   */
  public async setMemberBan(userId: string, ban: boolean): Promise<void> {
    if (ban) {
      await this.db.wordChainBannedMember.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    } else {
      await this.db.wordChainBannedMember.deleteMany({
        where: { userId },
      });
    }
  }

  /**
   * Excludes or includes a guild from global high-score leaderboards (DEC-004).
   */
  public async setServerBan(guildId: string, ban: boolean): Promise<void> {
    await this.db.wordChainConfig.upsert({
      where: { guildId },
      create: { guildId, isBanned: ban },
      update: { isBanned: ban },
    });
  }

  /**
   * Daily retention cleaner: Permanently purges guilds departed > 7 days ago (DEC-006).
   */
  public async purgeOverdueGuilds(): Promise<number> {
    const cutoffDate = new Date(Date.now() - WordChainConstants.GUILD_RETENTION_MS);
    const expiredGuilds = await this.db.wordChainConfig.findMany({
      where: {
        leftAt: {
          not: null,
          lte: cutoffDate,
        },
      },
      select: { guildId: true },
    });

    let count = 0;
    for (const { guildId } of expiredGuilds) {
      await this.purgeServer(guildId);
      count++;
    }

    return count;
  }
}

/**
 * Singleton instance of WordChainGameService for Discord command and event routing.
 */
export const wordChainGameService = new WordChainGameService();

