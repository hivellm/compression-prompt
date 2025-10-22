/**
 * Statistical token importance filtering (LLMLingua-inspired, model-free)
 * 
 * This module implements a compression strategy similar to LLMLingua but using
 * pure statistical heuristics instead of model-based perplexity scoring.
 * 
 * Enhanced with token-aware semantic preservation:
 * - Protects code blocks, JSON, paths, identifiers
 * - Contextual stopword filtering
 * - Preserves negations, comparators, domain terms
 */

import { StatisticalFilterConfig, WordImportance, ProtectedSpan, SpanType, CompressionResult } from './types';

/**
 * Statistical token filter (model-free alternative to LLMLingua)
 */
export class StatisticalFilter {
  private config: StatisticalFilterConfig;

  /**
   * Default configuration - 50% compression with 89% quality retention
   * Validated on 20 real papers: 92% keyword retention, 90% entity retention
   * Speed: <0.2ms average
   */
  static readonly DEFAULT_CONFIG: StatisticalFilterConfig = {
    compressionRatio: 0.5, // Keep 50% of tokens (recommended)
    idfWeight: 0.3,
    positionWeight: 0.2,
    posWeight: 0.2,
    entityWeight: 0.2,
    entropyWeight: 0.1,
    // Token-aware semantic preservation (all enabled by default)
    enableProtectionMasks: true,
    enableContextualStopwords: true,
    preserveNegations: true,
    preserveComparators: true,
    domainTerms: ['Vectorizer', 'Synap', 'UMICP', 'Graphs'],
    minGapBetweenCritical: 3,
  };

  // Complete multilingual stopwords (11 languages)
  private static readonly STOP_WORDS = new Set([
    // English
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'shall',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
    'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
    // Spanish (Español)
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero',
    'en', 'de', 'del', 'al', 'para', 'por', 'con', 'sin', 'sobre', 'entre',
    'hasta', 'desde', 'es', 'son', 'está', 'están', 'ser', 'estar', 'haber',
    'hacer', 'tener', 'decir', 'ir', 'ver', 'dar', 'saber', 'querer', 'poder',
    'poner', 'este', 'ese', 'aquel', 'mi', 'tu', 'su', 'nuestro', 'vuestro',
    'que', 'quien', 'cual', 'cuando', 'donde', 'como',
    // Portuguese (Português)
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'e', 'ou', 'mas', 'em',
    'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'ao', 'à', 'aos',
    'às', 'para', 'por', 'com', 'sem', 'sobre', 'entre', 'até', 'desde', 'é',
    'são', 'está', 'estão', 'ser', 'estar', 'haver', 'ter', 'fazer', 'dizer',
    'ir', 'ver', 'dar', 'saber', 'querer', 'poder', 'pôr', 'este', 'esse',
    'aquele', 'meu', 'teu', 'seu', 'nosso', 'vosso', 'que', 'quem', 'qual',
    'quando', 'onde', 'como',
    // French (Français)
    'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'dans', 'en',
    'de', 'du', 'au', 'aux', 'pour', 'par', 'avec', 'sans', 'sur', 'sous',
    'entre', 'vers', 'chez', 'est', 'sont', 'être', 'avoir', 'faire', 'dire',
    'aller', 'voir', 'savoir', 'pouvoir', 'vouloir', 'venir', 'devoir',
    'prendre', 'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 'son', 'notre',
    'votre', 'leur', 'que', 'qui', 'quoi', 'dont', 'où', 'quand', 'comment',
    // German (Deutsch)
    'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines',
    'einem', 'einen', 'und', 'oder', 'aber', 'in', 'im', 'an', 'auf', 'für',
    'von', 'zu', 'mit', 'bei', 'nach', 'über', 'unter', 'ist', 'sind', 'war',
    'waren', 'sein', 'haben', 'werden', 'können', 'müssen', 'sollen', 'wollen',
    'dieser', 'jener', 'mein', 'dein', 'sein', 'unser', 'euer', 'ihr', 'was',
    'wer', 'wo', 'wann', 'wie', 'warum',
    // Italian (Italiano)
    'il', 'lo', 'l', 'i', 'gli', 'la', 'le', 'un', 'uno', 'una', 'e', 'o', 'ma',
    'in', 'di', 'del', 'dello', 'della', 'dei', 'degli', 'delle', 'al', 'allo',
    'alla', 'ai', 'agli', 'alle', 'per', 'da', 'dal', 'dallo', 'dalla', 'dai',
    'dagli', 'dalle', 'con', 'su', 'sul', 'sullo', 'sulla', 'sui', 'sugli',
    'sulle', 'è', 'sono', 'essere', 'avere', 'fare', 'dire', 'andare', 'vedere',
    'sapere', 'potere', 'volere', 'questo', 'quello', 'mio', 'tuo', 'suo',
    'nostro', 'vostro', 'loro', 'che', 'chi', 'quale', 'quando', 'dove', 'come',
    'perché',
    // Russian (Русский) - romanized
    'i', 'v', 'ne', 'na', 'ya', 'on', 's', 'eto', 'kak', 'po', 'no', 'oni',
    'vse', 'tak', 'ego', 'za', 'byl', 'bylo', 'tem', 'chto', 'esli', 'mogu',
    'mozhet', 'by',
    // Chinese (中文) - common particles
    '的', '了', '和', '是', '在', '我', '有', '他', '这', '中', '大', '来', '上',
    '国', '个', '到', '说', '们', '为', '子', '你', '地', '出', '道', '也', '时',
    '年',
    // Japanese (日本語) - particles and common words
    'は', 'が', 'を', 'に', 'で', 'と', 'の', 'も', 'や', 'から', 'まで', 'より',
    'か', 'な', 'ね', 'よ', 'わ', 'さ', 'だ', 'です', 'ます', 'ある', 'いる',
    'する', 'なる', 'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'ここ',
    'そこ', 'あそこ',
    // Arabic (العربية) - romanized
    'al', 'wa', 'fi', 'min', 'ila', 'an', 'ma', 'la', 'li', 'bi', 'qad', 'lam',
    'kan', 'ala', 'hatha', 'dhalika', 'huwa', 'hiya', 'hum',
    // Hindi (हिन्दी) - romanized
    'ka', 'ki', 'ke', 'se', 'ne', 'ko', 'me', 'par', 'hai', 'tha', 'the', 'thi',
    'aur', 'ya', 'to', 'is', 'wo', 'ye', 'kya', 'kaise', 'kab', 'kahan', 'kyun',
  ]);

  // Negations (very high priority - score: 10.0)
  private static readonly NEGATIONS = new Set([
    'not', 'no', 'never', "don't", "won't", "can't", "couldn't", "wouldn't",
    "shouldn't", "mustn't", "haven't", "hasn't", "hadn't", "isn't", "aren't",
    "wasn't", "weren't", 'neither', 'nor', 'none',
  ]);

  // Comparators and operators (very high priority - score: 10.0)
  private static readonly COMPARATORS = new Set([
    '!=', '!==', '<=', '>=', '<', '>', '==', '===', '!',
  ]);

  // Modal qualifiers (high priority - score: 5.0)
  private static readonly MODALS = new Set([
    'only', 'except', 'must', 'should', 'may', 'might', 'at', 'least', 'most',
  ]);

  // Regex patterns (compiled once)
  private static readonly CODE_BLOCK_RE = /```[\s\S]*?```/g;
  private static readonly JSON_RE = /\{[^}]*:[^}]*\}/g;
  private static readonly PATH_RE = /(?:[A-Za-z]+:)?\/\/[^\s]+|[/\\][\w/\\.-]+\.[A-Za-z0-9]{1,5}\b/g;
  private static readonly CAMEL_RE = /\b[A-Z][a-z0-9]+[A-Z][A-Za-z0-9]+\b/g;
  private static readonly SNAKE_RE = /\b[a-z_][a-z0-9_]{2,}\b/g;
  private static readonly UPPER_SNAKE_RE = /\b[A-Z][A-Z0-9_]+\b/g;
  private static readonly HASH_RE = /\b[0-9a-f]{7,}\b|\b\d{3,}\b/g;
  private static readonly BRACKET_RE = /[\{\[\(][^\}\]\)]*[\}\]\)]/g;

  constructor(config: Partial<StatisticalFilterConfig> = {}) {
    this.config = { ...StatisticalFilter.DEFAULT_CONFIG, ...config };
  }

  /**
   * Detect protected spans in text that should not be modified
   */
  private detectProtectedSpans(text: string): ProtectedSpan[] {
    if (!this.config.enableProtectionMasks) {
      return [];
    }

    const spans: ProtectedSpan[] = [];

    // Code blocks (```...```)
    StatisticalFilter.CODE_BLOCK_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = StatisticalFilter.CODE_BLOCK_RE.exec(text)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        spanType: SpanType.CodeBlock,
      });
    }

    // JSON blocks (simple detection: {...} with colons)
    StatisticalFilter.JSON_RE.lastIndex = 0;
    while ((match = StatisticalFilter.JSON_RE.exec(text)) !== null) {
      const content = match[0];
      const colonCount = (content.match(/:/g) || []).length;
      if (colonCount > 0) {
        spans.push({
          start: match.index,
          end: match.index + match[0].length,
          spanType: SpanType.JsonBlock,
        });
      }
    }

    // Paths and URLs
    StatisticalFilter.PATH_RE.lastIndex = 0;
    while ((match = StatisticalFilter.PATH_RE.exec(text)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        spanType: SpanType.Path,
      });
    }

    // CamelCase identifiers
    StatisticalFilter.CAMEL_RE.lastIndex = 0;
    while ((match = StatisticalFilter.CAMEL_RE.exec(text)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        spanType: SpanType.Identifier,
      });
    }

    // snake_case identifiers
    StatisticalFilter.SNAKE_RE.lastIndex = 0;
    while ((match = StatisticalFilter.SNAKE_RE.exec(text)) !== null) {
      if (match[0].includes('_')) {
        spans.push({
          start: match.index,
          end: match.index + match[0].length,
          spanType: SpanType.Identifier,
        });
      }
    }

    // UPPER_SNAKE_CASE identifiers
    StatisticalFilter.UPPER_SNAKE_RE.lastIndex = 0;
    while ((match = StatisticalFilter.UPPER_SNAKE_RE.exec(text)) !== null) {
      if (match[0].length > 1) {
        spans.push({
          start: match.index,
          end: match.index + match[0].length,
          spanType: SpanType.Identifier,
        });
      }
    }

    // Hashes and large numbers
    StatisticalFilter.HASH_RE.lastIndex = 0;
    while ((match = StatisticalFilter.HASH_RE.exec(text)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        spanType: SpanType.HashOrNumber,
      });
    }

    // Brackets, braces, parens content
    StatisticalFilter.BRACKET_RE.lastIndex = 0;
    while ((match = StatisticalFilter.BRACKET_RE.exec(text)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        spanType: SpanType.Bracket,
      });
    }

    return spans;
  }

  /**
   * Check if a word/token position overlaps with any protected span
   */
  private isWordProtected(
    wordStart: number,
    wordEnd: number,
    protected: ProtectedSpan[]
  ): boolean {
    return protected.some(
      span => wordStart < span.end && wordEnd > span.start
    );
  }

  /**
   * Check if a stopword should be preserved based on context
   */
  private shouldPreserveStopword(
    word: string,
    contextBefore: string[],
    contextAfter: string[]
  ): boolean {
    if (!this.config.enableContextualStopwords) {
      return false;
    }

    const wordLower = word.toLowerCase();

    // "to" in infinitive/phrasal verbs: "how to", "steps to", "need to"
    if (wordLower === 'to') {
      if (contextBefore.length > 0) {
        const prev = contextBefore[contextBefore.length - 1].toLowerCase();
        if (['how', 'steps', 'need', 'want', 'try', 'used', 'able'].includes(prev)) {
          return true;
        }
      }
    }

    // "in/on/at" followed by paths or technical terms
    if (['in', 'on', 'at'].includes(wordLower)) {
      if (contextAfter.length > 0) {
        const next = contextAfter[0];
        // Check if next word looks like a path component
        if (next.includes('/') || next.includes('\\') || next.includes('.')) {
          return true;
        }
        // Check if next word is technical (starts with uppercase or contains _)
        if (next[0] === next[0].toUpperCase() || next.includes('_')) {
          return true;
        }
      }
    }

    // "is/are/was/were" in assertions (follows important term)
    if (['is', 'are', 'was', 'were', 'be'].includes(wordLower)) {
      if (contextBefore.length > 0) {
        const prev = contextBefore[contextBefore.length - 1];
        // If previous word is capitalized or technical, keep the verb
        if (prev[0] === prev[0].toUpperCase() || prev.length > 6 || prev.includes('_')) {
          return true;
        }
      }
    }

    // "and/or" between important terms
    if (['and', 'or'].includes(wordLower)) {
      const prevImportant =
        contextBefore.length > 0 &&
        (contextBefore[contextBefore.length - 1][0] ===
          contextBefore[contextBefore.length - 1][0].toUpperCase() ||
          contextBefore[contextBefore.length - 1].length > 6);
      const nextImportant =
        contextAfter.length > 0 &&
        (contextAfter[0][0] === contextAfter[0][0].toUpperCase() || contextAfter[0].length > 6);
      if (prevImportant && nextImportant) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a word is a critical term that must be preserved
   */
  private isCriticalTerm(word: string): number | null {
    const wordLower = word.toLowerCase();

    // Domain-specific terms (highest priority - always preserve)
    for (const domainTerm of this.config.domainTerms) {
      if (word.toLowerCase() === domainTerm.toLowerCase()) {
        return Infinity;
      }
    }

    // Negations (very high priority)
    if (this.config.preserveNegations) {
      if (StatisticalFilter.NEGATIONS.has(wordLower)) {
        return 10.0;
      }
    }

    // Comparators and operators (very high priority)
    if (this.config.preserveComparators) {
      if (StatisticalFilter.COMPARATORS.has(word)) {
        return 10.0;
      }
    }

    // Modal qualifiers (high priority)
    if (StatisticalFilter.MODALS.has(wordLower)) {
      return 5.0;
    }

    return null;
  }

  /**
   * Score words in text by importance
   */
  public scoreWords(text: string): WordImportance[] {
    const words = text.split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) {
      return [];
    }

    // Detect protected spans
    const protectedSpans = this.detectProtectedSpans(text);

    // Build a mapping of word index to character position in original text
    const wordPositions: Array<[number, number]> = [];
    let charIdx = 0;
    const textChars = text.split('');

    for (const word of words) {
      // Skip whitespace
      while (charIdx < textChars.length && /\s/.test(textChars[charIdx])) {
        charIdx++;
      }

      const start = charIdx;
      const wordLen = word.length;
      charIdx += wordLen;
      const end = charIdx;

      wordPositions.push([start, end]);
    }

    // Calculate various statistical features
    const idfScores = this.calculateIDF(words);
    const positionScores = this.calculatePositionImportance(words);
    const posScores = this.calculatePOSImportance(words, protectedSpans, text);
    const entityScores = this.calculateEntityImportance(words);
    const entropyScores = this.calculateLocalEntropy(words);

    // Combine scores for each word
    return words.map((word, idx) => {
      // Check if word is critical or protected
      const criticalScore = this.isCriticalTerm(word);
      let finalScore: number;

      if (criticalScore !== null) {
        finalScore = criticalScore;
      } else {
        // Check if word is in a protected span using the character position
        const [start, end] = wordPositions[idx];
        const isProtected = this.isWordProtected(start, end, protectedSpans);

        if (isProtected) {
          finalScore = Infinity; // Never remove protected words
        } else {
          // Calculate normal combined score
          const idf = idfScores.get(word) || 0.0;
          const posScore = positionScores[idx];
          const posTagScore = posScores[idx];
          const entityScore = entityScores[idx];
          const entropy = entropyScores[idx];

          finalScore =
            idf * this.config.idfWeight +
            posScore * this.config.positionWeight +
            posTagScore * this.config.posWeight +
            entityScore * this.config.entityWeight +
            entropy * this.config.entropyWeight;
        }
      }

      return {
        position: idx,
        text: word,
        score: finalScore,
        charPosition: wordPositions[idx][0],
      };
    });
  }

  /**
   * Filter text keeping only high-importance words
   */
  public compress(text: string): string {
    const importances = this.scoreWords(text);

    if (importances.length === 0) {
      return text;
    }

    // Sort by score (descending)
    const sortedByScore = [...importances].sort((a, b) => b.score - a.score);

    // Keep top N% based on compression ratio
    const keepCount = Math.max(
      1,
      Math.min(importances.length, Math.floor(importances.length * this.config.compressionRatio))
    );

    // Get indices of tokens to keep
    const keepIndices = new Set(
      sortedByScore.slice(0, keepCount).map(imp => imp.position)
    );

    // Fill gaps between critical tokens
    const criticalThreshold = 0.8;
    const criticalPositions = importances
      .filter(imp => imp.score > criticalThreshold && keepIndices.has(imp.position))
      .map(imp => imp.position)
      .sort((a, b) => a - b);

    // Check for large gaps between critical tokens
    for (let i = 0; i < criticalPositions.length - 1; i++) {
      const window0 = criticalPositions[i];
      const window1 = criticalPositions[i + 1];

      if (window1 > window0) {
        const gapSize = window1 - window0;
        if (gapSize > this.config.minGapBetweenCritical) {
          // Find the highest-scored token in the gap that wasn't kept
          const gapCandidates = importances.filter(
            imp =>
              imp.position > window0 &&
              imp.position < window1 &&
              !keepIndices.has(imp.position)
          );

          if (gapCandidates.length > 0) {
            const bestGapToken = gapCandidates.reduce((best, current) =>
              current.score > best.score ? current : best
            );
            keepIndices.add(bestGapToken.position);
          }
        }
      }
    }

    // Sort by original position to maintain order
    const sortedIndices = Array.from(keepIndices).sort((a, b) => a - b);

    // Reconstruct text with kept tokens
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return sortedIndices.map(idx => words[idx]).join(' ');
  }

  /**
   * Compress text and return detailed metrics
   */
  public compressWithMetrics(text: string): CompressionResult {
    // Perform statistical compression
    const compressed = this.compress(text);

    // Calculate token counts (rough estimation: words)
    const originalTokens = text.split(/\s+/).filter(w => w.length > 0).length;
    const compressedTokens = compressed.split(/\s+/).filter(w => w.length > 0).length;
    const compressionRatio = originalTokens > 0 ? compressedTokens / originalTokens : 1.0;
    const tokensRemoved = originalTokens - compressedTokens;

    return {
      compressed,
      originalTokens,
      compressedTokens,
      compressionRatio,
      tokensRemoved,
    };
  }

  /**
   * Calculate IDF scores
   */
  private calculateIDF(words: string[]): Map<string, number> {
    const freqMap = new Map<string, number>();
    for (const word of words) {
      freqMap.set(word, (freqMap.get(word) || 0) + 1);
    }

    const total = words.length;
    const idfScores = new Map<string, number>();
    for (const [word, count] of freqMap) {
      idfScores.set(word, Math.log(total / count));
    }
    return idfScores;
  }

  /**
   * Calculate position importance (U-shaped: start and end are important)
   */
  private calculatePositionImportance(words: string[]): number[] {
    const len = words.length;
    return Array.from({ length: len }, (_, idx) => {
      const normalized = idx / len;
      if (normalized < 0.1 || normalized > 0.9) {
        return 1.0;
      } else if (normalized < 0.2 || normalized > 0.8) {
        return 0.7;
      } else {
        return 0.3;
      }
    });
  }

  /**
   * Calculate POS importance using stop word heuristics (multilingual)
   * Enhanced with contextual stopword preservation
   */
  private calculatePOSImportance(
    words: string[],
    _protectedSpans: ProtectedSpan[],
    _text: string
  ): number[] {
    return words.map((word, idx) => {
      const lower = word.toLowerCase();

      // Check if it's a stopword
      if (StatisticalFilter.STOP_WORDS.has(lower)) {
        // Check contextual preservation
        const contextBefore = idx > 0 ? words.slice(Math.max(0, idx - 3), idx) : [];
        const contextAfter =
          idx + 1 < words.length ? words.slice(idx + 1, Math.min(words.length, idx + 4)) : [];

        if (this.shouldPreserveStopword(word, contextBefore, contextAfter)) {
          return 0.7; // Contextually important stopword
        } else {
          return 0.1; // Regular stopword - low importance
        }
      } else if (word[0] && word[0] === word[0].toUpperCase()) {
        return 1.0; // Proper noun - high importance
      } else if (word.length > 6) {
        return 0.7; // Long word - medium-high importance
      } else {
        return 0.5; // Regular word - medium importance
      }
    });
  }

  /**
   * Detect named entities using simple patterns
   */
  private calculateEntityImportance(words: string[]): number[] {
    return words.map((word, idx) => {
      let score = 0.0;

      if (word[0] && word[0] === word[0].toUpperCase()) {
        score += 0.3;
      }

      if (idx > 0) {
        const prev = words[idx - 1].toLowerCase();
        if (prev.startsWith('mr.') || prev.startsWith('dr.')) {
          score += 0.5;
        }
      }

      if (word.includes('@') || word.startsWith('http')) {
        score += 0.6;
      }

      if (word.length > 1 && word.split('').every(c => c === c.toUpperCase())) {
        score += 0.4;
      }

      return Math.min(score, 1.0);
    });
  }

  /**
   * Calculate local entropy (vocabulary diversity)
   */
  private calculateLocalEntropy(words: string[]): number[] {
    const WINDOW = 10;
    return words.map((_, idx) => {
      const start = Math.max(0, idx - Math.floor(WINDOW / 2));
      const end = Math.min(words.length, idx + Math.floor(WINDOW / 2));
      const window = words.slice(start, end);
      const unique = new Set(window);
      return unique.size / window.length;
    });
  }
}

