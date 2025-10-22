# @hivellm/compression-prompt (TypeScript)

> Fast statistical compression for LLM prompts - 50% token reduction with 91% quality retention

[![npm version](https://img.shields.io/npm/v/@hivellm/compression-prompt)](https://www.npmjs.com/package/@hivellm/compression-prompt)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

A TypeScript/JavaScript implementation of statistical prompt compression that reduces LLM token usage by 50% while maintaining 91% quality.

## 🎯 Features

- **💰 Save Money**: 50% fewer tokens = 50% lower LLM costs
- **⚡ Ultra Fast**: Milliseconds compression time, no external dependencies
- **🎓 Proven Quality**: 91% quality retention validated on Claude Sonnet
- **📦 Zero Dependencies**: Pure TypeScript with no runtime dependencies
- **🔧 Configurable**: Adjust compression ratio and behavior
- **🛠️ CLI Tool**: Compress files from command line

## 📦 Installation

```bash
npm install @hivellm/compression-prompt
```

Or with yarn:

```bash
yarn add @hivellm/compression-prompt
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { StatisticalFilter } from '@hivellm/compression-prompt';

const filter = new StatisticalFilter();
const compressed = filter.compress('Your long text here...');

console.log(compressed);
```

### With Metrics

```typescript
import { StatisticalFilter } from '@hivellm/compression-prompt';

const filter = new StatisticalFilter();
const result = filter.compressWithMetrics('Your text here...');

console.log(`Compressed: ${result.compressed}`);
console.log(`Saved ${result.tokensRemoved} tokens (${(result.compressionRatio * 100).toFixed(1)}% reduction)`);
```

### Custom Configuration

```typescript
import { StatisticalFilter } from '@hivellm/compression-prompt';

// Conservative compression (70% retention)
const conservative = new StatisticalFilter({
  compressionRatio: 0.7,
});

// Aggressive compression (30% retention)
const aggressive = new StatisticalFilter({
  compressionRatio: 0.3,
});

// Custom domain terms
const custom = new StatisticalFilter({
  compressionRatio: 0.5,
  domainTerms: ['MyProduct', 'ImportantTerm'],
  preserveNegations: true,
});
```

### Quality Metrics

```typescript
import { StatisticalFilter, QualityMetrics } from '@hivellm/compression-prompt';

const filter = new StatisticalFilter();
const compressed = filter.compress(originalText);

const quality = QualityMetrics.calculate(originalText, compressed);
console.log(`Quality Score: ${(quality.overallScore * 100).toFixed(1)}%`);
console.log(`Keyword Retention: ${(quality.keywordRetention * 100).toFixed(1)}%`);
console.log(`Entity Retention: ${(quality.entityRetention * 100).toFixed(1)}%`);
```

## 🖥️ CLI Usage

```bash
# Install globally
npm install -g @hivellm/compression-prompt

# Compress a file
compress input.txt -o output.txt

# With statistics
compress input.txt -s

# Custom compression ratio
compress input.txt -r 0.7 -s

# From stdin
cat input.txt | compress -s

# Show quality metrics
compress input.txt --quality -s
```

### CLI Options

```
Usage: compress [options] [input]

Options:
  -V, --version         output the version number
  -o, --output <file>   Output file (defaults to stdout)
  -r, --ratio <ratio>   Compression ratio (0.0-1.0, default: 0.5)
  -s, --stats           Show compression statistics
  --quality             Show quality metrics
  -h, --help            display help for command
```

## 📊 Configuration Options

```typescript
interface StatisticalFilterConfig {
  compressionRatio: number;          // 0.0-1.0 (default: 0.5)
  idfWeight: number;                 // IDF score weight (default: 0.3)
  positionWeight: number;            // Position score weight (default: 0.2)
  posWeight: number;                 // POS score weight (default: 0.2)
  entityWeight: number;              // Entity score weight (default: 0.2)
  entropyWeight: number;             // Entropy score weight (default: 0.1)
  enableProtectionMasks: boolean;    // Protect code/paths (default: true)
  enableContextualStopwords: boolean; // Smart stopword removal (default: true)
  preserveNegations: boolean;        // Keep negations (default: true)
  preserveComparators: boolean;      // Keep comparators (default: true)
  domainTerms: string[];             // Terms to always preserve
  minGapBetweenCritical: number;     // Gap filling threshold (default: 3)
}
```

## 🎨 Use Cases

### ✅ Perfect For:

- **RAG Systems**: Compress retrieved context (50% token savings)
- **Q&A Systems**: Reduce prompt size while preserving semantics
- **Long Document Processing**: Pre-compress before sending to LLM
- **Cost Optimization**: 50% fewer tokens = 50% lower API costs
- **Real-time Applications**: Milliseconds compression time

### ⚠️ Not Ideal For:

- Creative writing (may lose style/voice)
- Poetry or literary text
- Very short texts (< 100 tokens)
- When every word matters (legal contracts, exact quotes)

## 💰 Cost Savings

**Example with GPT-4 ($5/1M input tokens):**

| Usage | Before | After (50% compression) | Savings |
|-------|--------|------------------------|---------|
| 1M tokens | $5.00 | $2.50 | $2.50 |
| 100M tokens/month | $500 | $250 | $250/month |
| 1B tokens/month | $5,000 | $2,500 | $2,500/month |

**Annual savings for high-volume apps:**
- 100M tokens/month: **$3,000/year** 💰
- 1B tokens/month: **$30,000/year** 💰

## 🧪 Testing

```bash
# Run tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📝 API Reference

### StatisticalFilter

#### `constructor(config?: Partial<StatisticalFilterConfig>)`
Create a new filter with optional configuration.

#### `compress(text: string): string`
Compress text and return the compressed string.

#### `compressWithMetrics(text: string): CompressionResult`
Compress text and return detailed metrics.

### QualityMetrics

#### `static calculate(original: string, compressed: string): QualityMetrics`
Calculate quality metrics by comparing original and compressed text.

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

## 📄 License

MIT © HiveLLM Team

## 🔗 Related

- [Rust Implementation](../rust) - Original Rust implementation
- [GitHub Repository](https://github.com/hivellm/compression-prompt)
- [Documentation](../docs)

## ⭐ Support

If you find this useful, please star the repository!

