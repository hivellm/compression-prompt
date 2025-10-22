/**
 * Statistical token importance filtering (LLMLingua-inspired, model-free)
 */

enum SpanType {
  CODE_BLOCK = 'code_block',
  JSON_BLOCK = 'json_block',
  PATH = 'path',
  IDENTIFIER = 'identifier',
  HASH_OR_NUMBER = 'hash_or_number',
  BRACKET = 'bracket',
}

interface ProtectedSpan {
  start: number;
  end: number;
  spanType: SpanType;
}

export interface WordImportance {
  position: number;
  text: string;
  score: number;
}

export interface StatisticalFilterConfig {
  compressionRatio: number;
  idfWeight: number;
  positionWeight: number;
  posWeight: number;
  entityWeight: number;
  entropyWeight: number;
  enableProtectionMasks: boolean;
  enableContextualStopwords: boolean;
  preserveNegations: boolean;
  preserveComparators: boolean;
  domainTerms: string[];
  minGapBetweenCritical: number;
}

export class StatisticalFilter {
  private static readonly STOP_WORDS = new Set([
    // English
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
    'can', 'shall', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
    'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
    // Add other languages as needed
  ]);

  private static readonly NEGATIONS = new Set([
    'not', 'no', 'never', "don't", "won't", "can't", "couldn't", "wouldn't",
    "shouldn't", "mustn't", "haven't", "hasn't", "hadn't", "isn't", "aren't",
    "wasn't", "weren't", 'neither', 'nor', 'none',
  ]);

  private static readonly COMPARATORS = new Set(['!=', '!==', '<=', '>=', '<', '>', '==', '===', '!']);

  private static readonly MODALS = new Set(['only', 'except', 'must', 'should', 'may', 'might', 'at', 'least', 'most']);

  private config: StatisticalFilterConfig;

  // Regex patterns
  private codeBlockRe = /```[\s\S]*?```/g;
  private jsonRe = /\{[^}]*:[^}]*\}/g;
  private pathRe = /(?:[A-Za-z]+:)?\/\/[^\s]+|[\/\\][\w\/\\.-]+\.[A-Za-z0-9]{1,5}\b/g;
  private camelRe = /\b[A-Z][a-z0-9]+[A-Z][A-Za-z0-9]+\b/g;
  private snakeRe = /\b[a-z_][a-z0-9_]{2,}\b/g;
  private upperSnakeRe = /\b[A-Z][A-Z0-9_]+\b/g;
  private hashRe = /\b[0-9a-f]{7,}\b|\b\d{3,}\b/g;
  private bracketRe = /[\{\[\(][^\}\]\)]*[\}\]\)]/g;

  constructor(config: StatisticalFilterConfig) {
    this.config = config;
  }

  compress(text: string): string {
    const importances = this.scoreWords(text);

    if (importances.length === 0) {
      return text;
    }

    // Sort by score (descending)
    const sorted = [...importances].sort((a, b) => b.score - a.score);

    // Keep top N% based on compression ratio
    const keepCount = Math.max(1, Math.floor(importances.length * this.config.compressionRatio));

    // Get indices of tokens to keep
    const keepIndices = new Set(sorted.slice(0, keepCount).map(imp => imp.position));

    // Fill gaps between critical tokens
    const criticalThreshold = 0.8;
    const criticalPositions = importances
      .filter(imp => imp.score > criticalThreshold && keepIndices.has(imp.position))
      .map(imp => imp.position)
      .sort((a, b) => a - b);

    for (let i = 0; i < criticalPositions.length - 1; i++) {
      const gapSize = criticalPositions[i + 1] - criticalPositions[i];
      if (gapSize > this.config.minGapBetweenCritical) {
        const gapCandidates = importances.filter(
          imp =>
            imp.position > criticalPositions[i] &&
            imp.position < criticalPositions[i + 1] &&
            !keepIndices.has(imp.position)
        );

        if (gapCandidates.length > 0) {
          const best = gapCandidates.reduce((prev, curr) =>
            curr.score > prev.score ? curr : prev
          );
          keepIndices.add(best.position);
        }
      }
    }

    // Reconstruct text with kept tokens
    const words = text.split(/\s+/);
    const kept = Array.from(keepIndices)
      .sort((a, b) => a - b)
      .map(idx => words[idx]);

    return kept.join(' ');
  }

  scoreWords(text: string): WordImportance[] {
    const words = text.split(/\s+/);

    if (words.length === 0) {
      return [];
    }

    const protectedSpans = this.detectProtectedSpans(text);
    const wordPositions = this.buildWordPositions(text, words);

    const idfScores = this.calculateIdf(words);
    const positionScores = this.calculatePositionImportance(words);
    const posScores = this.calculatePosImportance(words);
    const entityScores = this.calculateEntityImportance(words);
    const entropyScores = this.calculateLocalEntropy(words);

    return words.map((word, idx) => {
      const criticalScore = this.isCriticalTerm(word);

      let finalScore: number;
      if (criticalScore !== null) {
        finalScore = criticalScore;
      } else {
        const [start, end] = wordPositions[idx];
        const isProtected = this.isWordProtected(start, end, protectedSpans);

        if (isProtected) {
          finalScore = Infinity;
        } else {
          const idf = idfScores.get(word) || 0;
          finalScore =
            idf * this.config.idfWeight +
            positionScores[idx] * this.config.positionWeight +
            posScores[idx] * this.config.posWeight +
            entityScores[idx] * this.config.entityWeight +
            entropyScores[idx] * this.config.entropyWeight;
        }
      }

      return { position: idx, text: word, score: finalScore };
    });
  }

  private detectProtectedSpans(text: string): ProtectedSpan[] {
    if (!this.config.enableProtectionMasks) {
      return [];
    }

    const spans: ProtectedSpan[] = [];

    // Code blocks
    for (const match of text.matchAll(this.codeBlockRe)) {
      if (match.index !== undefined) {
        spans.push({
          start: match.index,
          end: match.index + match[0].length,
          spanType: SpanType.CODE_BLOCK,
        });
      }
    }

    // JSON blocks
    for (const match of text.matchAll(this.jsonRe)) {
      if (match.index !== undefined && match[0].includes(':')) {
        spans.push({
          start: match.index,
          end: match.index + match[0].length,
          spanType: SpanType.JSON_BLOCK,
        });
      }
    }

    // Paths
    for (const match of text.matchAll(this.pathRe)) {
      if (match.index !== undefined) {
        spans.push({
          start: match.index,
          end: match.index + match[0].length,
          spanType: SpanType.PATH,
        });
      }
    }

    // Identifiers
    for (const match of text.matchAll(this.camelRe)) {
      if (match.index !== undefined) {
        spans.push({
          start: match.index,
          end: match.index + match[0].length,
          spanType: SpanType.IDENTIFIER,
        });
      }
    }

    for (const match of text.matchAll(this.snakeRe)) {
      if (match.index !== undefined && match[0].includes('_')) {
        spans.push({
          start: match.index,
          end: match.index + match[0].length,
          spanType: SpanType.IDENTIFIER,
        });
      }
    }

    return spans;
  }

  private buildWordPositions(text: string, words: string[]): Array<[number, number]> {
    const positions: Array<[number, number]> = [];
    let charIdx = 0;

    for (const word of words) {
      while (charIdx < text.length && /\s/.test(text[charIdx])) {
        charIdx++;
      }

      const start = charIdx;
      charIdx += word.length;
      const end = charIdx;

      positions.push([start, end]);
    }

    return positions;
  }

  private isWordProtected(start: number, end: number, spans: ProtectedSpan[]): boolean {
    return spans.some(span => start < span.end && end > span.start);
  }

  private isCriticalTerm(word: string): number | null {
    const lower = word.toLowerCase();

    for (const term of this.config.domainTerms) {
      if (word.toLowerCase() === term.toLowerCase()) {
        return Infinity;
      }
    }

    if (this.config.preserveNegations && StatisticalFilter.NEGATIONS.has(lower)) {
      return 10.0;
    }

    if (this.config.preserveComparators && StatisticalFilter.COMPARATORS.has(word)) {
      return 10.0;
    }

    if (StatisticalFilter.MODALS.has(lower)) {
      return 5.0;
    }

    return null;
  }

  private calculateIdf(words: string[]): Map<string, number> {
    const freqMap = new Map<string, number>();
    for (const word of words) {
      freqMap.set(word, (freqMap.get(word) || 0) + 1);
    }

    const total = words.length;
    const idfMap = new Map<string, number>();
    for (const [word, count] of freqMap.entries()) {
      idfMap.set(word, Math.log(total / count));
    }

    return idfMap;
  }

  private calculatePositionImportance(words: string[]): number[] {
    const len = words.length;
    return words.map((_, idx) => {
      const normalized = idx / len;
      if (normalized < 0.1 || normalized > 0.9) return 1.0;
      if (normalized < 0.2 || normalized > 0.8) return 0.7;
      return 0.3;
    });
  }

  private calculatePosImportance(words: string[]): number[] {
    return words.map(word => {
      const lower = word.toLowerCase();

      if (StatisticalFilter.STOP_WORDS.has(lower)) {
        return 0.1;
      }
      if (word.length > 0 && word[0] === word[0].toUpperCase()) {
        return 1.0;
      }
      if (word.length > 6) {
        return 0.7;
      }
      return 0.5;
    });
  }

  private calculateEntityImportance(words: string[]): number[] {
    return words.map((word, idx) => {
      let score = 0;

      if (word.length > 0 && word[0] === word[0].toUpperCase()) {
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

      if (word.length > 1 && word === word.toUpperCase()) {
        score += 0.4;
      }

      return Math.min(score, 1.0);
    });
  }

  private calculateLocalEntropy(words: string[]): number[] {
    const WINDOW = 10;
    return words.map((_, idx) => {
      const start = Math.max(0, idx - Math.floor(WINDOW / 2));
      const end = Math.min(words.length, idx + Math.floor(WINDOW / 2));
      const window = words.slice(start, end);
      const unique = new Set(window).size;
      return unique / window.length;
    });
  }
}

