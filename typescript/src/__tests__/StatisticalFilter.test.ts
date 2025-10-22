import { StatisticalFilter } from '../StatisticalFilter';

describe('StatisticalFilter', () => {
  let filter: StatisticalFilter;

  beforeEach(() => {
    filter = new StatisticalFilter();
  });

  describe('compress', () => {
    it('should compress text', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const compressed = filter.compress(text);
      
      expect(compressed).toBeDefined();
      expect(compressed.length).toBeLessThan(text.length);
    });

    it('should preserve important words', () => {
      const text = 'Machine learning algorithms require large datasets for training';
      const compressed = filter.compress(text);
      
      expect(compressed.toLowerCase()).toContain('machine');
      expect(compressed.toLowerCase()).toContain('learning');
    });

    it('should handle empty input', () => {
      const result = filter.compressWithMetrics('');
      
      expect(result.compressed).toBe('');
      expect(result.originalTokens).toBe(0);
      expect(result.compressedTokens).toBe(0);
    });

    it('should achieve target compression ratio', () => {
      const text = `
        Artificial intelligence is transforming technology.
        Machine learning models are becoming increasingly sophisticated.
        Natural language processing enables better human-computer interaction.
        Deep learning algorithms process vast amounts of data efficiently.
      `;
      
      const result = filter.compressWithMetrics(text);
      const actualRatio = 1 - result.compressionRatio;
      
      expect(actualRatio).toBeGreaterThan(0.3); // At least 30% compression
    });
  });

  describe('compressWithMetrics', () => {
    it('should return detailed metrics', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const result = filter.compressWithMetrics(text);
      
      expect(result).toHaveProperty('compressed');
      expect(result).toHaveProperty('originalTokens');
      expect(result).toHaveProperty('compressedTokens');
      expect(result).toHaveProperty('compressionRatio');
      expect(result).toHaveProperty('tokensRemoved');
      
      expect(result.originalTokens).toBeGreaterThan(0);
      expect(result.compressedTokens).toBeLessThan(result.originalTokens);
      expect(result.tokensRemoved).toBeGreaterThan(0);
    });
  });

  describe('configuration', () => {
    it('should respect custom compression ratio', () => {
      const conservativeFilter = new StatisticalFilter({ compressionRatio: 0.7 });
      const aggressiveFilter = new StatisticalFilter({ compressionRatio: 0.3 });
      
      const text = 'This is a sample text that will be compressed with different ratios';
      
      const conservative = conservativeFilter.compress(text);
      const aggressive = aggressiveFilter.compress(text);
      
      expect(conservative.length).toBeGreaterThan(aggressive.length);
    });

    it('should preserve domain terms', () => {
      const customFilter = new StatisticalFilter({
        domainTerms: ['CustomTerm', 'ImportantWord'],
      });
      
      const text = 'This text contains CustomTerm and other words';
      const compressed = customFilter.compress(text);
      
      expect(compressed).toContain('CustomTerm');
    });
  });

  describe('protected spans', () => {
    it('should protect code blocks', () => {
      const text = `
        Here is some code:
        \`\`\`javascript
        function hello() {
          console.log("Hello, world!");
        }
        \`\`\`
        This should be preserved.
      `;
      
      const compressed = filter.compress(text);
      
      expect(compressed).toContain('```');
      expect(compressed).toContain('function');
    });

    it('should protect file paths', () => {
      const text = 'The file is located at /usr/local/bin/compress and works well';
      const compressed = filter.compress(text);
      
      expect(compressed).toContain('/usr/local/bin/compress');
    });

    it('should protect URLs', () => {
      const text = 'Visit https://github.com/hivellm/compression-prompt for more info';
      const compressed = filter.compress(text);
      
      expect(compressed).toContain('https://github.com');
    });
  });

  describe('negations', () => {
    it('should preserve negations', () => {
      const text = 'This is not a good idea and we should not proceed';
      const compressed = filter.compress(text);
      
      expect(compressed.toLowerCase()).toMatch(/not|never|don't|n't/);
    });
  });

  describe('technical terms', () => {
    it('should preserve technical terms', () => {
      const text = 'The Bayesian network uses probabilistic inference methods';
      const compressed = filter.compress(text);
      
      expect(compressed).toContain('Bayesian');
    });

    it('should preserve identifiers', () => {
      const text = 'The function camelCaseFunction and snake_case_variable work together';
      const compressed = filter.compress(text);
      
      expect(compressed).toContain('camelCaseFunction');
      expect(compressed).toContain('snake_case_variable');
    });
  });
});

