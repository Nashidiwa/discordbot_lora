import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../shared/db/client.js';
import { GameMode, ApiResponse } from './types/wordchain.types.js';
import { WordChainLanguageService } from './services/wordchain-language.service.js';
import { WordChainKarmaService } from './services/wordchain-karma.service.js';
import { WordChainRoleService } from './services/wordchain-role.service.js';
import { WordChainDictionaryService } from './services/wordchain-dictionary.service.js';

// ==========================================
// 1. LANGUAGE SERVICE TESTS
// ==========================================
test('WordChainLanguageService: normalization and token extraction', () => {
  const langService = new WordChainLanguageService();

  // Normalization
  assert.equal(langService.normalizeWord('  APPLE  '), 'apple');
  assert.equal(langService.normalizeWord('Café'), 'café');

  // Regex validation (EN_REGEX)
  assert.equal(langService.isValidWordFormat('word'), true);
  assert.equal(langService.isValidWordFormat('ice-cream'), true);
  assert.equal(langService.isValidWordFormat('pre-wrap-up'), true);
  assert.equal(langService.isValidWordFormat('a'), false); // single letter
  assert.equal(langService.isValidWordFormat('word123'), false); // digits
  assert.equal(langService.isValidWordFormat('-word'), false); // leading hyphen
  assert.equal(langService.isValidWordFormat('word-'), false); // trailing hyphen
  assert.equal(langService.isValidWordFormat('two words'), false); // space

  // Token extraction - Normal Mode (1 char)
  assert.equal(langService.extractStartToken('apple', GameMode.NORMAL), 'a');
  assert.equal(langService.extractEndToken('apple', GameMode.NORMAL), 'e');

  // Token extraction - Hard Mode (2 chars)
  assert.equal(langService.extractStartToken('apple', GameMode.HARD), 'ap');
  assert.equal(langService.extractEndToken('apple', GameMode.HARD), 'le');

  // Chaining rules
  assert.equal(langService.doesWordChain('apple', 'elephant', GameMode.NORMAL), true);
  assert.equal(langService.doesWordChain('apple', 'tiger', GameMode.NORMAL), false);
  assert.equal(langService.doesWordChain('lemon', 'onward', GameMode.HARD), true);
  assert.equal(langService.doesWordChain('lemon', 'noble', GameMode.HARD), false);
});

test('WordChainLanguageService: frequency fallback and dead-end checking', () => {
  const langService = new WordChainLanguageService();

  // Asset scores loaded from scores_en.json
  assert.equal(langService.getTokenScore('z', GameMode.NORMAL), 0.06);
  assert.equal(langService.getTokenScore('zz', GameMode.HARD), 0.08);

  // Default fallback returns 1.0 when token is not found
  assert.equal(langService.getTokenScore('unknown_token', GameMode.NORMAL), 1.0);
  assert.equal(langService.getTokenScore('unknown_hard', GameMode.HARD), 1.0);

  // Tokens above threshold never trigger dead-ends
  assert.equal(langService.isDeadEndToken('z', GameMode.NORMAL), false);
  assert.equal(langService.isDeadEndToken('zz', GameMode.HARD), false);

  // Custom scores injection
  langService.setCustomTokenScores('en', GameMode.NORMAL, {
    x: 0.001, // below 0.005 threshold
    e: 0.12,
  });
  langService.setCustomTokenScores('en', GameMode.HARD, {
    xz: 0.01, // below 0.05 threshold
    th: 0.08,
  });

  assert.equal(langService.isDeadEndToken('x', GameMode.NORMAL), true);
  assert.equal(langService.isDeadEndToken('e', GameMode.NORMAL), false);
  assert.equal(langService.isDeadEndToken('xz', GameMode.HARD), true);
  assert.equal(langService.isDeadEndToken('th', GameMode.HARD), false);
});

// ==========================================
// 2. KARMA SERVICE TESTS
// ==========================================
test('WordChainKarmaService: score adaptation and base karma baseline', () => {
  const karmaService = new WordChainKarmaService();

  // Score adaptation: f(1.0) = sqrt(1.0) + 0.025 = 1.025
  assert.equal(karmaService.scoreAdaptation(1.0), 1.025);

  // Baseline base karma when start and end tokens are both 1.0 (fallback state):
  // firstCharKarma = (1.025 - 1) * -1 = -0.025 -> clamped to 0
  // lastCharKarma = 1.025 - 1 = 0.025
  // baseKarma = 0 + 0.025 * 0.7 = 0.0175 (DISC-003 ground truth)
  const baseKarma = karmaService.calculateBaseKarma(1.0, 1.0);
  assert.ok(Math.abs(baseKarma - 0.0175) < 1e-6, `Expected 0.0175, got ${baseKarma}`);
});

test('WordChainKarmaService: suffix decay and recency weighting', () => {
  const karmaService = new WordChainKarmaService();
  const langService = new WordChainLanguageService();

  // Suffix repetition on empty history -> decay factor = 1.0
  assert.equal(karmaService.calculateDecay(0), 1.0);
  assert.equal(karmaService.calculateSuffixHistoryScore('e', [], GameMode.NORMAL), 0);

  // Recency weights: L = 5
  // indices 0..4 have weights: 2*(5-0)/5 = 2.0, 1.6, 1.2, 0.8, 0.4
  const history = ['pie', 'cake', 'apple', 'grape', 'ice']; // all end in 'e'
  const n = karmaService.calculateSuffixHistoryScore('e', history, GameMode.NORMAL);
  // Sum = 2.0 + 1.6 + 1.2 + 0.8 + 0.4 = 6.0
  assert.ok(Math.abs(n - 6.0) < 1e-6, `Expected n=6.0, got ${n}`);

  // Decay factor for n = 6.0: delta(6) = 2 * e^(-6 * 0.33) - 1 ≈ -0.724
  const decay = karmaService.calculateDecay(n);
  assert.ok(decay < 0, `Expected negative decay, got ${decay}`);

  // Total karma calculation: positive base karma multiplied by negative decay flips to negative
  const result = karmaService.calculateTotalKarma('pie', history, langService, GameMode.NORMAL);
  assert.ok(result.baseKarma > 0);
  assert.ok(result.finalKarma < 0, 'Heavy suffix repetition should flip positive karma to negative');
});

// ==========================================
// 3. ROLE SERVICE TESTS
// ==========================================
test('WordChainRoleService: reliable and failed role eligibility (strictly greater than >)', () => {
  const roleService = new WordChainRoleService();

  // Reliable Role: requires karma > 25.0 and accuracy > 97.5% (reference cogs/common.py:302-303)
  // Exact boundary: karma = 25.0 exactly is FALSE
  assert.equal(
    roleService.isEligibleForReliableRole({ karma: 25.0, correctInputs: 100, wrongInputs: 0 }),
    false,
    'Karma = 25.0 exact must be false (strictly greater than > 25 required)',
  );

  // Exact boundary: karma = 25.001 is TRUE (accuracy = 100% > 97.5%)
  assert.equal(
    roleService.isEligibleForReliableRole({ karma: 25.001, correctInputs: 100, wrongInputs: 0 }),
    true,
  );

  // Exact boundary: accuracy = 39/40 = 0.975 (97.5% exact) is FALSE
  assert.equal(
    roleService.isEligibleForReliableRole({ karma: 30.0, correctInputs: 39, wrongInputs: 1 }),
    false,
    'Accuracy = 97.5% exact must be false (strictly greater than > 97.5% required)',
  );

  // Exact boundary: accuracy = 391/400 = 0.9775 (> 97.5%) is TRUE
  assert.equal(
    roleService.isEligibleForReliableRole({ karma: 30.0, correctInputs: 391, wrongInputs: 9 }),
    true,
  );

  // 0 total inputs is FALSE
  assert.equal(
    roleService.isEligibleForReliableRole({ karma: 50.0, correctInputs: 0, wrongInputs: 0 }),
    false,
  );

  // Failed Role: cleared after >= 30 correct inputs
  assert.equal(roleService.hasClearedFailedRole(29), false);
  assert.equal(roleService.hasClearedFailedRole(30), true);
  assert.equal(roleService.hasClearedFailedRole(35), true);

  // Hierarchy check
  assert.equal(roleService.canManageRoleHierarchy(10, 5), true);
  assert.equal(roleService.canManageRoleHierarchy(5, 5), false);
  assert.equal(roleService.canManageRoleHierarchy(3, 7), false);
});

// ==========================================
// 4. THREE-TIER DICTIONARY SERVICE TESTS (MOCKED)
// ==========================================
test('WordChainDictionaryService: precedence hierarchy (Whitelist, Blacklist, Lexicon, DB Cache)', async () => {
  const dictService = new WordChainDictionaryService({ db });

  // 1. Whitelist override
  const res1 = await dictService.validateWord('unknownxyz', 'en', {
    whitelist: new Set(['unknownxyz']),
  });
  assert.equal(res1, ApiResponse.WORD_EXISTS);

  // 2. Blacklist override
  const res2 = await dictService.validateWord('apple', 'en', {
    blacklist: new Set(['apple']),
  });
  assert.equal(res2, ApiResponse.WORD_NOT_FOUND);

  // 3. Local Lexicon (Tier 1 Acceleration)
  dictService.addWordsToLocalLexicon(['lexiconword']);
  const res3 = await dictService.validateWord('lexiconword', 'en');
  assert.equal(res3, ApiResponse.WORD_EXISTS);
});

test('WordChainDictionaryService: Tier 2 DB Cache (Positive & Negative TTL)', async () => {
  const dictService = new WordChainDictionaryService({ db });
  const positiveWord = 'dbpositiveword';
  const negativeWord = 'dbnegativeword';
  const expiredWord = 'dbexpiredword';

  try {
    // Seed DB positive entry
    await db.wordChainWordCache.create({
      data: {
        language: 'en',
        word: positiveWord,
        isNegative: false,
        expiresAt: null,
      },
    });

    // Seed DB negative entry (unexpired)
    await db.wordChainWordCache.create({
      data: {
        language: 'en',
        word: negativeWord,
        isNegative: true,
        expiresAt: new Date(Date.now() + 60_000), // expires in 1 min
      },
    });

    // Seed DB negative entry (already expired)
    await db.wordChainWordCache.create({
      data: {
        language: 'en',
        word: expiredWord,
        isNegative: true,
        expiresAt: new Date(Date.now() - 60_000), // expired 1 min ago
      },
    });

    // Positive hit
    const posRes = await dictService.validateWord(positiveWord, 'en');
    assert.equal(posRes, ApiResponse.WORD_EXISTS);

    // Negative unexpired hit (instant rejection)
    const negRes = await dictService.validateWord(negativeWord, 'en');
    assert.equal(negRes, ApiResponse.WORD_NOT_FOUND);
  } finally {
    await db.wordChainWordCache.deleteMany({
      where: { word: { in: [positiveWord, negativeWord, expiredWord] } },
    });
  }
});

test('WordChainDictionaryService: Tier 3 Network Mocking (Action API success, 404, error isolation, SingleFlight)', async () => {
  let networkCallCount = 0;

  // Mock fetch function simulating MediaWiki Action API responses
  const mockFetch: typeof fetch = async (input, init) => {
    networkCallCount++;
    const urlStr = input.toString();

    // 1. Simulate word exists
    if (urlStr.includes('pssearch=validword')) {
      return new Response(
        JSON.stringify({
          query: {
            pages: [{ title: 'Validword' }],
            prefixsearch: [{ title: 'Validword' }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 2. Simulate word not found definitively
    if (urlStr.includes('pssearch=nonexistentword')) {
      return new Response(
        JSON.stringify({
          query: {
            pages: [{ title: 'Nonexistentword', missing: true }],
            prefixsearch: [],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 3. Simulate HTTP 429 Too Many Requests
    if (urlStr.includes('pssearch=ratelimited')) {
      return new Response('Rate limited', {
        status: 429,
        headers: { 'Retry-After': '10' },
      });
    }

    // 4. Simulate HTTP 500 Internal Server Error
    if (urlStr.includes('pssearch=servererror')) {
      return new Response('Server error', { status: 500 });
    }

    return new Response('Not found', { status: 404 });
  };

  const dictService = new WordChainDictionaryService({ db, customFetch: mockFetch });

  try {
    // Case 1: Valid word confirms existence and persists to DB cache
    const res1 = await dictService.validateWord('validword', 'en');
    assert.equal(res1, ApiResponse.WORD_EXISTS);

    const savedPos = await db.wordChainWordCache.findUnique({
      where: { language_word: { language: 'en', word: 'validword' } },
    });
    assert.ok(savedPos !== null);
    assert.equal(savedPos?.isNegative, false);

    // Case 2: Non-existent word confirms not found and saves negative cache with TTL
    const res2 = await dictService.validateWord('nonexistentword', 'en');
    assert.equal(res2, ApiResponse.WORD_NOT_FOUND);

    const savedNeg = await db.wordChainWordCache.findUnique({
      where: { language_word: { language: 'en', word: 'nonexistentword' } },
    });
    assert.ok(savedNeg !== null);
    assert.equal(savedNeg?.isNegative, true);
    assert.ok(savedNeg?.expiresAt !== null);

    // Case 3: Transient error (HTTP 500) -> returns ApiResponse.ERROR and NEVER caches as negative!
    const res3 = await dictService.validateWord('servererror', 'en');
    assert.equal(res3, ApiResponse.ERROR);

    const savedErr = await db.wordChainWordCache.findUnique({
      where: { language_word: { language: 'en', word: 'servererror' } },
    });
    assert.equal(savedErr, null, 'Transient network errors must NEVER be cached as negative!');

    // Case 4: SingleFlight coalescing (concurrent requests for un-cached word share single network call)
    networkCallCount = 0;
    const [coalesced1, coalesced2] = await Promise.all([
      dictService.validateWord('coalescedword', 'en'),
      dictService.validateWord('coalescedword', 'en'),
    ]);
    assert.equal(coalesced1, coalesced2);
    assert.equal(networkCallCount, 1, 'SingleFlight should coalesce concurrent queries into 1 HTTP call');
  } finally {
    await db.wordChainWordCache.deleteMany({
      where: { word: { in: ['validword', 'nonexistentword', 'servererror', 'coalescedword'] } },
    });
  }
});

test('WordChainDictionaryService: Deep Network Mocking (Timeout, HTTP 429 Retry-After, Malformed JSON, API Error)', async () => {
  const errorWords = ['timeoutword', 'malformedword', 'apierrorword', 'cooldownword', 'ratelimitedword'];

  const deepMockFetch: typeof fetch = async (input) => {
    const urlStr = input.toString();

    // Timeout simulation
    if (urlStr.includes('pssearch=timeoutword')) {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    }

    // Malformed JSON (e.g. HTML gateway page instead of JSON)
    if (urlStr.includes('pssearch=malformedword')) {
      return new Response('<html><body>502 Bad Gateway</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // API error payload
    if (urlStr.includes('pssearch=apierrorword')) {
      return new Response(
        JSON.stringify({
          error: { code: 'unknown_action', info: 'Unrecognized action.' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // HTTP 429 without Retry-After (defaults to 15s)
    if (urlStr.includes('pssearch=ratelimitedword')) {
      return new Response('Too Many Requests', {
        status: 429,
      });
    }

    return new Response('{}', { status: 200 });
  };

  const dictService = new WordChainDictionaryService({ db, customFetch: deepMockFetch });

  try {
    // 1. Timeout returns ApiResponse.ERROR and is NEVER cached as negative
    const timeoutRes = await dictService.validateWord('timeoutword', 'en');
    assert.equal(timeoutRes, ApiResponse.ERROR);
    const timeoutCached = await db.wordChainWordCache.findUnique({
      where: { language_word: { language: 'en', word: 'timeoutword' } },
    });
    assert.equal(timeoutCached, null);

    // 2. Malformed JSON returns ApiResponse.ERROR and is NEVER cached as negative
    const malformedRes = await dictService.validateWord('malformedword', 'en');
    assert.equal(malformedRes, ApiResponse.ERROR);
    const malformedCached = await db.wordChainWordCache.findUnique({
      where: { language_word: { language: 'en', word: 'malformedword' } },
    });
    assert.equal(malformedCached, null);

    // 3. API Error payload returns ApiResponse.ERROR and is NEVER cached as negative
    const apiErrorRes = await dictService.validateWord('apierrorword', 'en');
    assert.equal(apiErrorRes, ApiResponse.ERROR);
    const apiErrorCached = await db.wordChainWordCache.findUnique({
      where: { language_word: { language: 'en', word: 'apierrorword' } },
    });
    assert.equal(apiErrorCached, null);

    // 4. HTTP 429 engages circuit breaker cooldown
    const rateLimitedRes = await dictService.validateWord('ratelimitedword', 'en');
    assert.equal(rateLimitedRes, ApiResponse.ERROR);

    // 5. While circuit breaker is open, un-cached word immediately returns ApiResponse.ERROR without network calls
    const cooldownRes = await dictService.validateWord('cooldownword', 'en');
    assert.equal(cooldownRes, ApiResponse.ERROR);
  } finally {
    await db.wordChainWordCache.deleteMany({
      where: { word: { in: errorWords } },
    });
  }
});

test('WordChainLanguageService: Comprehensive edge case matrix', () => {
  const lang = new WordChainLanguageService();

  // Valid English words
  assert.equal(lang.isValidWordFormat('apple'), true);
  assert.equal(lang.isValidWordFormat('ice-cream'), true);
  assert.equal(lang.isValidWordFormat('a-b'), true);
  assert.equal(lang.isValidWordFormat('pre--wrap'), true); // Repeated hyphens permitted by reference regex (rejected later by Wiktionary)
  assert.equal(lang.isValidWordFormat('a-b-c-d'), true);

  // Invalid formats (rejected by EN_REGEX)
  assert.equal(lang.isValidWordFormat(''), false);
  assert.equal(lang.isValidWordFormat('a'), false); // single letter
  assert.equal(lang.isValidWordFormat('-apple'), false); // leading hyphen
  assert.equal(lang.isValidWordFormat('apple-'), false); // trailing hyphen
  assert.equal(lang.isValidWordFormat('apple123'), false); // digits
  assert.equal(lang.isValidWordFormat('apple pie'), false); // whitespace
  assert.equal(lang.isValidWordFormat('café'), false); // non-ASCII accent rejected in English

  // Hard Mode Hyphenated chaining
  assert.equal(lang.doesWordChain('pre-wrap', 'apple', GameMode.HARD), true); // 'ap' matches 'ap'
  assert.equal(lang.doesWordChain('ice-cream', 'ambulance', GameMode.HARD), true); // 'am' matches 'am'
});
