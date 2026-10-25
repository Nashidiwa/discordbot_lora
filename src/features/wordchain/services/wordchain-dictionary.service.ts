import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatabaseClient } from '../../../shared/db/client.js';
import { db as defaultDb } from '../../../shared/db/client.js';
import { ApiResponse, type SupportedLanguage } from '../types/wordchain.types.js';
import { WordChainConstants, WordChainRegex } from '../wordchain.constants.js';

export interface DictionaryServiceOptions {
  db?: DatabaseClient;
  customAssetsDir?: string;
  customFetch?: typeof fetch;
}

export interface CheckWordContext {
  whitelist?: Set<string>;
  blacklist?: Set<string>;
}

interface MediaWikiQueryResponse {
  query?: {
    pages?: Array<{
      title: string;
      missing?: boolean;
    }>;
    prefixsearch?: Array<{
      title: string;
    }>;
  };
  error?: {
    code: string;
    info: string;
  };
}

/**
 * Three-tier Dictionary Service implementing DEC-003:
 * - Tier 1: Local Lexicon in-memory Set (instant < 1ms hit)
 * - Tier 2: SQLite database cache with permanent positive & 24h negative caching
 * - Tier 3: MediaWiki Action API fallback with SingleFlight, concurrency pool, rate limiter, and circuit breaker
 */
export class WordChainDictionaryService {
  private db: DatabaseClient;
  private localLexicon: Set<string> = new Set();
  private inFlightRequests: Map<string, Promise<ApiResponse>> = new Map();
  private fetchFn: typeof fetch;

  // Traffic controls
  private activeConcurrency = 0;
  private concurrencyQueue: Array<() => void> = [];
  private requestTimestamps: number[] = [];
  private circuitBreakerUntil = 0;

  constructor(options: DictionaryServiceOptions = {}) {
    this.db = options.db ?? defaultDb;
    this.fetchFn = options.customFetch ?? globalThis.fetch;
    this.loadLocalLexicon(options.customAssetsDir);
  }

  /**
   * Normalizes word to canonical NFC lowercase string.
   */
  public normalizeWord(word: string): string {
    return word.normalize('NFC').toLowerCase().trim();
  }

  /**
   * Validates word existence following the approved DEC-003 Precedence Hierarchy:
   * 1. Whitelist (Instant Acceptance)
   * 2. Blacklist (Instant Rejection)
   * 3. Local Lexicon (Tier 1 Acceleration)
   * 4. DB Positive Cache (Tier 2 Permanent Hit)
   * 5. DB Negative Cache (Tier 2 24h Unexpired Rejection)
   * 6. External MediaWiki Action API (Tier 3 Fallback with Coalescing)
   */
  public async validateWord(
    word: string,
    lang: SupportedLanguage = 'en',
    context: CheckWordContext = {},
  ): Promise<ApiResponse> {
    const normalized = this.normalizeWord(word);

    // 1. Guild Whitelist Check
    if (context.whitelist && context.whitelist.has(normalized)) {
      return ApiResponse.WORD_EXISTS;
    }

    // 2. Guild Blacklist Check
    if (context.blacklist && context.blacklist.has(normalized)) {
      return ApiResponse.WORD_NOT_FOUND;
    }

    // 3. Tier 1: Local SCOWL Lexicon Check (in RAM)
    if (this.localLexicon.has(normalized)) {
      return ApiResponse.WORD_EXISTS;
    }

    // 4 & 5. Tier 2: Database Cache Check
    const cached = await this.db.wordChainWordCache.findUnique({
      where: {
        language_word: {
          language: lang,
          word: normalized,
        },
      },
    });

    if (cached) {
      if (!cached.isNegative) {
        // Positive Cache is permanent
        return ApiResponse.WORD_EXISTS;
      }

      // Negative Cache: Verify 24-hour TTL
      if (cached.expiresAt && cached.expiresAt.getTime() > Date.now()) {
        return ApiResponse.WORD_NOT_FOUND;
      }
      // If expired, fall through to re-verify against Tier 3
    }

    // Pre-network validation check
    if (!WordChainRegex.EN_REGEX.test(normalized) || normalized.length < 2) {
      return ApiResponse.WORD_NOT_FOUND;
    }

    // 6. Tier 3: External MediaWiki Action API with SingleFlight Coalescing
    return await this.coalescedNetworkLookup(normalized, lang);
  }

  /**
   * Executes query using the SingleFlight pattern to prevent duplicate in-flight requests.
   */
  private async coalescedNetworkLookup(word: string, lang: SupportedLanguage): Promise<ApiResponse> {
    const cacheKey = `${lang}:${word}`;

    if (this.inFlightRequests.has(cacheKey)) {
      return await this.inFlightRequests.get(cacheKey)!;
    }

    const queryPromise = this.executeNetworkQuery(word, lang);
    this.inFlightRequests.set(cacheKey, queryPromise);

    try {
      return await queryPromise;
    } finally {
      // Zero memory leak guarantee: Promise is always removed in finally block
      this.inFlightRequests.delete(cacheKey);
    }
  }

  /**
   * Performs the rate-limited, concurrency-controlled HTTP request to the MediaWiki Action API.
   */
  private async executeNetworkQuery(word: string, lang: SupportedLanguage): Promise<ApiResponse> {
    // Check Circuit Breaker for HTTP 429 cooldown
    if (Date.now() < this.circuitBreakerUntil) {
      return ApiResponse.ERROR;
    }

    // Acquire concurrency and rate-limiting slots
    await this.acquireSlot();

    try {
      const titles = await this.queryWiktionaryActionApi(word, lang);

      if (titles === null) {
        // Transient error occurred: isolated as ApiResponse.ERROR (NEVER cached as negative)
        return ApiResponse.ERROR;
      }

      if (titles.length > 0) {
        // Positive response: persist permanently in DB cache
        await this.db.wordChainWordCache.upsert({
          where: { language_word: { language: lang, word } },
          create: {
            language: lang,
            word,
            isNegative: false,
            expiresAt: null,
          },
          update: {
            isNegative: false,
            expiresAt: null,
          },
        });
        return ApiResponse.WORD_EXISTS;
      }

      // Definitive negative response: save with 24-hour TTL in DB cache
      const expiresAt = new Date(Date.now() + WordChainConstants.NEGATIVE_CACHE_TTL_MS);
      await this.db.wordChainWordCache.upsert({
        where: { language_word: { language: lang, word } },
        create: {
          language: lang,
          word,
          isNegative: true,
          expiresAt,
        },
        update: {
          isNegative: true,
          expiresAt,
        },
      });
      return ApiResponse.WORD_NOT_FOUND;
    } finally {
      this.releaseSlot();
    }
  }

  /**
   * Queries MediaWiki Action API matching reference cogs/common.py:428-490.
   * Returns list of matching page titles, empty array if none, or null on transient error.
   */
  private async queryWiktionaryActionApi(word: string, lang: string): Promise<string[] | null> {
    const variants = Array.from(new Set([
      word,
      word.toLowerCase(),
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      word.toUpperCase(),
    ]));

    const searchParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      titles: variants.join('|'),
      list: 'prefixsearch',
      pssearch: word,
      psnamespace: '0',
      pslimit: '7',
      psprofile: 'strict',
    });

    const url = `https://${lang}.wiktionary.org/w/api.php?${searchParams.toString()}`;

    try {
      const response = await this.fetchFn(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Lora-WordChainFeature/0.6.0 (https://github.com/Nashidiwa/discordbot_lora)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(WordChainConstants.WIKTIONARY_TIMEOUT_MS),
      });

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const retryAfterSec = retryAfterHeader
          ? parseInt(retryAfterHeader, 10) || WordChainConstants.HTTP_429_DEFAULT_RETRY_AFTER_SEC
          : WordChainConstants.HTTP_429_DEFAULT_RETRY_AFTER_SEC;
        this.circuitBreakerUntil = Date.now() + (retryAfterSec * 1000);
        return null;
      }

      if (response.status >= 400) {
        return null;
      }

      const data = (await response.json()) as MediaWikiQueryResponse;
      if (data.error) {
        return null;
      }

      const titles: string[] = [];
      if (data.query?.pages) {
        for (const page of data.query.pages) {
          if (!page.missing) {
            titles.push(page.title);
          }
        }
      }

      if (data.query?.prefixsearch) {
        for (const match of data.query.prefixsearch) {
          if (match.title.toLowerCase() === word.toLowerCase()) {
            titles.push(match.title);
          }
        }
      }

      return Array.from(new Set(titles));
    } catch {
      // Timeout, network reset, DNS failure, or JSON parse error
      return null;
    }
  }

  /**
   * Helper to add words into the in-memory Local Lexicon (Tier 1).
   */
  public addWordsToLocalLexicon(words: string[]): void {
    for (const w of words) {
      this.localLexicon.add(this.normalizeWord(w));
    }
  }

  /**
   * Concurrency & Rate Limiting Traffic Controller.
   */
  private async acquireSlot(): Promise<void> {
    // 1. Concurrency control: max 5 concurrent outbound requests
    if (this.activeConcurrency >= WordChainConstants.WIKTIONARY_MAX_CONCURRENCY) {
      await new Promise<void>((resolve) => {
        this.concurrencyQueue.push(resolve);
      });
    }
    this.activeConcurrency++;

    // 2. Rate limiting: max 10 requests per second
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((ts) => now - ts < 1000);
    if (this.requestTimestamps.length >= WordChainConstants.WIKTIONARY_MAX_RPS) {
      const oldest = this.requestTimestamps[0];
      if (oldest !== undefined) {
        const waitTime = Math.max(10, 1000 - (now - oldest));
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
    this.requestTimestamps.push(Date.now());
  }

  private releaseSlot(): void {
    this.activeConcurrency = Math.max(0, this.activeConcurrency - 1);
    if (this.concurrencyQueue.length > 0) {
      const next = this.concurrencyQueue.shift();
      if (next) {
        next();
      }
    }
  }

  /**
   * Loads precomputed local SCOWL dictionary asset if available on disk.
   */
  private loadLocalLexicon(customAssetsDir?: string): void {
    let assetsDir = customAssetsDir;
    if (!assetsDir) {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      assetsDir = path.join(currentDir, '..', 'assets');
    }

    const lexiconFile = path.join(assetsDir, 'dictionary_en_common.json');
    if (fs.existsSync(lexiconFile)) {
      try {
        const content = fs.readFileSync(lexiconFile, 'utf-8');
        const list = JSON.parse(content) as string[];
        if (Array.isArray(list)) {
          this.addWordsToLocalLexicon(list);
        }
      } catch {
        // Fall back gracefully if unverified or corrupted
      }
    }
  }
}
