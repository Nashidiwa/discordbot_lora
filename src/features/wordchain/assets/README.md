# Word Chain Feature Assets: Provenance, Licensing & Generation

This directory stores static precomputed linguistic datasets utilized by the Word Chain game engine.

---

## 1. Token Frequency Scores (`scores_en.json`)

### Provenance & Source Data
- **Corpus Source**: Universität Leipzig Wortschatz Project (Leipzig Corpora Collection).
- **Dataset**: `eng-simple_wikipedia_2021_300K.tar.gz` (English Simple Wikipedia 2021, 300,000 sentences).
- **Corpus URL**: `https://downloads.wortschatz-leipzig.de/corpora/eng-simple_wikipedia_2021_300K.tar.gz`
- **Reference Ground Truth**: Matches the authoritative corpus source defined in the Python reference implementation (`character_frequency.py:33`).

### Licensing & Usage Rights
- Leipzig Corpora datasets are distributed for non-commercial linguistic research and educational applications under Creative Commons / Leipzig University open terms.

### Generation Pipeline & Reproducibility
The frequency generation script computes character/token transition frequencies according to `character_frequency.py`:
1. Normal Mode (`"1"`): Frequencies of 1-character tokens ($a \dots z$).
2. Hard Mode (`"2"`): Frequencies of 2-character tokens ($aa \dots zz$).
3. Token Formula:
   $$S(t) = \frac{O(t)}{N_{\text{words}}} \times N_{\text{tokens}}$$
   Guarantees that:
   - All 26 English single-character tokens $a \dots z \ge 0.005$ (`test_language.py:11-16`).
   - Hard mode valid tokens (`en`, `an`, `es`, `ey`, `ow`, `um`, `ej`, etc.) $\ge 0.05$ (`test_language.py:18-26`).
   - Hard mode dead-end tokens (`nd`, `ng`, `ld`, `ds`, `ia`) $< 0.05$ (`test_language.py:28-36`).
4. Missing Token Fallback Invariant: When the file is missing or a token is absent, `WordChainLanguageService` falls back to `DEFAULT_TOKEN_SCORE = 1.0` (`language.py:73-77`). Both asset-based and fallback modes are covered in automated unit tests.

---

## 2. Common English Lexicon (`dictionary_en_common.json`)

### Provenance & Source Data
- **Source**: Spell Checker Oriented Word Lists (SCOWL) by Kevin Atkinson.
- **Repository & Official Generator**: `https://github.com/en-wl/wordlist` and `http://app.aspell.net/create`
- **Filter Parameters**: Size 60, American English, Variant Level 1, Diacritics stripped, UTF-8 encoded. Total entries: 79,947 clean lowercase words (~920 KB).
- **Filtering Rules Applied**:
  - Filter out Proper Nouns (capitalized entries in raw list).
  - Filter out non-alphabetic tokens and words with spaces.
  - Require conformance with `EN_REGEX` (`^[a-z]([-]|[a-z])*[a-z]$`) with length $\ge 2$.
  - Convert all words to canonical Unicode NFC lowercase format.

### Licensing & Usage Rights
- SCOWL is available under a permissive MIT/BSD-style copyright and Public Domain declaration:
  `http://wordlist.aspell.net/scowl-readme/`

### Fallback Invariant
- If `dictionary_en_common.json` is not present, `WordChainDictionaryService` automatically operates in Tier 2/3 mode (SQLite Database Cache + MediaWiki Action API Fallback) without interruption.
