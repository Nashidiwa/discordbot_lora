import { GameMode, type TurnKarmaResult } from '../types/wordchain.types.js';
import { WordChainConstants } from '../wordchain.constants.js';
import type { WordChainLanguageService } from './wordchain-language.service.js';

/**
 * Service managing karma mathematics, non-linear difficulty adaptation,
 * collaborative handoff bias, and exponential suffix repetition decay.
 * Faithfully reproduces reference implementation from karma.py.
 */
export class WordChainKarmaService {
  /**
   * Adapts raw token score using non-linear square-root curve plus baseline rise:
   * f(s) = s^0.5 + 0.025
   */
  public scoreAdaptation(
    score: number,
    exponent = 0.5,
    rise = WordChainConstants.BASE_KARMA_OFFSET,
  ): number {
    return Math.pow(score, exponent) + rise;
  }

  /**
   * Calculates suffix repetition decay factor:
   * delta(n) = 2 * e^(-n * dropRate) - 1
   * Yields a factor between +1.0 (no repetition) and -1.0 (heavy repetition).
   */
  public calculateDecay(
    n: number,
    dropRate = WordChainConstants.SUFFIX_DECAY_EXPONENT,
  ): number {
    return (2 * Math.exp(-n * dropRate)) - 1;
  }

  /**
   * Calculates base karma based on starting token difficulty and ending token handoff:
   * - firstCharKarma = (f(s1) - 1) * -1 (inverted: difficult start token yields positive karma)
   * - lastCharKarma = f(s2) - 1 (difficult end token yields negative karma, easy yields positive)
   * - Base karma = max(0, firstCharKarma) + (lastCharKarma * 0.7)
   */
  public calculateBaseKarma(
    startTokenScore: number,
    endTokenScore: number,
    lastCharBias = WordChainConstants.BASE_KARMA_K2_WEIGHT,
  ): number {
    const firstScore = this.scoreAdaptation(startTokenScore);
    const lastScore = this.scoreAdaptation(endTokenScore);

    const firstCharKarma = (firstScore - 1) * -1;
    const lastCharKarma = lastScore - 1;

    // No karma loss if first char is common (player cannot choose start token)
    const normalizedFirstKarma = firstCharKarma > 0 ? firstCharKarma : 0;
    return normalizedFirstKarma + (lastCharKarma * lastCharBias);
  }

  /**
   * Calculates suffix repetition score from the recent word history:
   * w_i = 2 * (L - i) / L for i in 0..L-1 (where index 0 is the most recent word).
   * n = sum(w_i for words with matching ending token).
   */
  public calculateSuffixHistoryScore(
    currentEndToken: string,
    lastWords: string[],
    mode: GameMode,
  ): number {
    const len = lastWords.length;
    if (len === 0) {
      return 0.0;
    }

    let n = 0.0;
    for (let index = 0; index < len; index++) {
      const pastWord = lastWords[index];
      if (pastWord && pastWord.slice(-mode).toLowerCase() === currentEndToken.toLowerCase()) {
        const weight = (2 * (len - index)) / len;
        n += weight;
      }
    }
    return n;
  }

  /**
   * Computes the total karma change for a valid turn given the active word and guild history.
   * In accordance with reference karma.py:98:
   * If baseKarma > 0: return decay * baseKarma
   * If baseKarma <= 0: return baseKarma (decay is not applied to already-negative base karma)
   */
  public calculateTotalKarma(
    word: string,
    lastWords: string[],
    languageService: WordChainLanguageService,
    mode: GameMode,
  ): TurnKarmaResult {
    const startToken = languageService.extractStartToken(word, mode);
    const endToken = languageService.extractEndToken(word, mode);

    const s1 = languageService.getTokenScore(startToken, mode);
    const s2 = languageService.getTokenScore(endToken, mode);

    const baseKarma = this.calculateBaseKarma(s1, s2);
    const n = this.calculateSuffixHistoryScore(endToken, lastWords, mode);
    const decay = this.calculateDecay(n);

    const finalKarma = baseKarma > 0 ? decay * baseKarma : baseKarma;

    return {
      baseKarma,
      decayMultiplier: decay,
      finalKarma,
      isPenalized: false,
    };
  }
}
