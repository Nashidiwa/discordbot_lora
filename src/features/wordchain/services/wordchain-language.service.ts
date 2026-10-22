import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameMode, type SupportedLanguage } from '../types/wordchain.types.js';
import { WordChainConstants, WordChainRegex } from '../wordchain.constants.js';

/**
 * Service managing linguistic tokenization, regex validation, word chaining rules,
 * and token frequency score lookups with reference-equivalent fallbacks.
 */
export class WordChainLanguageService {
  private tokenScores: Map<string, Map<GameMode, Map<string, number>>> = new Map();

  constructor(customAssetsDir?: string) {
    this.loadTokenScores(customAssetsDir);
  }

  /**
   * Normalizes word string to canonical lowercase NFC representation with whitespace trimmed.
   */
  public normalizeWord(word: string): string {
    return word.normalize('NFC').toLowerCase().trim();
  }

  /**
   * Validates if a word satisfies the structural regex constraints for the language.
   * Rejects single-character tokens, spaces, digits, punctuation, and leading/trailing hyphens.
   */
  public isValidWordFormat(word: string, _lang: SupportedLanguage = 'en'): boolean {
    const normalized = this.normalizeWord(word);
    if (normalized.length < 2) {
      return false;
    }
    return WordChainRegex.EN_REGEX.test(normalized);
  }

  /**
   * Extracts the beginning token of the word based on GameMode (1 char for Normal, 2 for Hard).
   */
  public extractStartToken(word: string, mode: GameMode): string {
    const normalized = this.normalizeWord(word);
    return normalized.slice(0, mode);
  }

  /**
   * Extracts the ending token of the word based on GameMode (1 char for Normal, 2 for Hard).
   */
  public extractEndToken(word: string, mode: GameMode): string {
    const normalized = this.normalizeWord(word);
    return normalized.slice(-mode);
  }

  /**
   * Checks whether nextWord legally continues the chain from prevWord according to the GameMode.
   */
  public doesWordChain(prevWord: string, nextWord: string, mode: GameMode): boolean {
    const requiredToken = this.extractEndToken(prevWord, mode);
    const actualToken = this.extractStartToken(nextWord, mode);
    return requiredToken === actualToken;
  }

  /**
   * Retrieves the frequency score for a given token.
   * If assets are missing or token is unrecorded, returns DEFAULT_TOKEN_SCORE (1.0).
   */
  public getTokenScore(token: string, mode: GameMode, lang: SupportedLanguage = 'en'): number {
    const normalizedToken = this.normalizeWord(token);
    const langMap = this.tokenScores.get(lang);
    if (!langMap) {
      return WordChainConstants.DEFAULT_TOKEN_SCORE;
    }
    const modeMap = langMap.get(mode);
    if (!modeMap || !modeMap.has(normalizedToken)) {
      return WordChainConstants.DEFAULT_TOKEN_SCORE;
    }
    return modeMap.get(normalizedToken)!;
  }

  /**
   * Determines whether an ending token is a dead-end (score below language threshold).
   * Note: Under 1.0 fallback, dead-end checking never triggers (1.0 >= 0.005 and 1.0 >= 0.05).
   */
  public isDeadEndToken(token: string, mode: GameMode, lang: SupportedLanguage = 'en'): boolean {
    const score = this.getTokenScore(token, mode, lang);
    const threshold = WordChainConstants.DEAD_END_THRESHOLD[mode];
    return score < threshold;
  }

  /**
   * Allows injecting custom token scores for testing purposes.
   */
  public setCustomTokenScores(
    lang: SupportedLanguage,
    mode: GameMode,
    scores: Record<string, number>,
  ): void {
    if (!this.tokenScores.has(lang)) {
      this.tokenScores.set(lang, new Map());
    }
    const langMap = this.tokenScores.get(lang)!;
    const modeMap = new Map<string, number>();
    for (const [k, v] of Object.entries(scores)) {
      modeMap.set(k.toLowerCase(), v);
    }
    langMap.set(mode, modeMap);
  }

  /**
   * Attempts to load token scores from disk if precomputed assets exist.
   */
  private loadTokenScores(customAssetsDir?: string): void {
    let assetsDir = customAssetsDir;
    if (!assetsDir) {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      assetsDir = path.join(currentDir, '..', 'assets');
    }

    const enScoreFile = path.join(assetsDir, 'scores_en.json');
    if (fs.existsSync(enScoreFile)) {
      try {
        const raw = fs.readFileSync(enScoreFile, 'utf-8');
        const data = JSON.parse(raw) as Record<string, Record<string, number>>;
        const enMap = new Map<GameMode, Map<string, number>>();

        if (data['1']) {
          const normalMap = new Map<string, number>();
          for (const [token, score] of Object.entries(data['1'])) {
            normalMap.set(token.toLowerCase(), score);
          }
          enMap.set(GameMode.NORMAL, normalMap);
        }

        if (data['2']) {
          const hardMap = new Map<string, number>();
          for (const [token, score] of Object.entries(data['2'])) {
            hardMap.set(token.toLowerCase(), score);
          }
          enMap.set(GameMode.HARD, hardMap);
        }

        this.tokenScores.set('en', enMap);
      } catch {
        // Fallback gracefully on parsing errors
      }
    }
  }
}
