import { QualityMetrics as IQualityMetrics } from './types';

/**
 * Calculate quality metrics for compression
 */
export class QualityMetrics {
  /**
   * Calculate quality metrics by comparing original and compressed text
   */
  static calculate(original: string, compressed: string): IQualityMetrics {
    const originalWords = this.extractWords(original);
    const compressedWords = this.extractWords(compressed);

    const keywords = this.extractKeywords(original);
    const entities = this.extractEntities(original);

    const keywordRetention = this.calculateRetention(keywords, compressedWords);
    const entityRetention = this.calculateRetention(entities, compressedWords);

    const originalVocab = new Set(originalWords.map(w => w.toLowerCase()));
    const compressedVocab = new Set(compressedWords.map(w => w.toLowerCase()));

    const vocabularyRatio = compressedVocab.size / originalVocab.size;
    const informationDensity = compressedVocab.size / compressedWords.length;

    // Overall score is weighted combination
    const overallScore =
      keywordRetention * 0.4 +
      entityRetention * 0.3 +
      vocabularyRatio * 0.2 +
      informationDensity * 0.1;

    return {
      overallScore,
      keywordRetention,
      entityRetention,
      vocabularyRatio,
      informationDensity,
    };
  }

  /**
   * Extract words from text
   */
  private static extractWords(text: string): string[] {
    return text.match(/\b\w+\b/g) || [];
  }

  /**
   * Extract keywords (long words, capitalized, technical terms)
   */
  private static extractKeywords(text: string): Set<string> {
    const words = this.extractWords(text);
    const keywords = new Set<string>();

    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were',
    ]);

    for (const word of words) {
      const lower = word.toLowerCase();
      
      // Skip stopwords
      if (stopwords.has(lower)) continue;
      
      // Long words (likely important)
      if (word.length > 6) {
        keywords.add(lower);
        continue;
      }

      // Capitalized (likely names/terms)
      if (word[0] === word[0].toUpperCase()) {
        keywords.add(lower);
        continue;
      }

      // Technical patterns
      if (/[A-Z]{2,}/.test(word) || /_/.test(word)) {
        keywords.add(lower);
      }
    }

    return keywords;
  }

  /**
   * Extract named entities (capitalized words, numbers)
   */
  private static extractEntities(text: string): Set<string> {
    const words = this.extractWords(text);
    const entities = new Set<string>();

    for (const word of words) {
      // Capitalized words
      if (word[0] === word[0].toUpperCase() && word.length > 1) {
        entities.add(word.toLowerCase());
      }
      
      // Numbers
      if (/\d/.test(word)) {
        entities.add(word.toLowerCase());
      }
    }

    return entities;
  }

  /**
   * Calculate retention percentage
   */
  private static calculateRetention(
    original: Set<string>,
    compressed: string[]
  ): number {
    if (original.size === 0) return 1.0;

    const compressedSet = new Set(compressed.map(w => w.toLowerCase()));
    let preserved = 0;

    for (const item of original) {
      if (compressedSet.has(item)) {
        preserved++;
      }
    }

    return preserved / original.size;
  }
}

