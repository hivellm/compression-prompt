# Compression Prompt - TypeScript/JavaScript Implementation

> Fast, intelligent prompt compression for LLMs - Save 50% tokens while maintaining 91% quality

TypeScript/JavaScript port of the Rust implementation. Achieves **50% token reduction** with **91% quality retention** using pure statistical filtering.

## Quick Start

### Installation

```bash
npm install @hivellm/compression-prompt
```

Or from source:

```bash
cd typescript
npm install
npm run build
```

### Basic Usage

```typescript
import { Compressor } from '@hivellm/compression-prompt';

const compressor = new Compressor();

const text = `
Your long text here...
This will be compressed using statistical filtering
to save 50% tokens while maintaining quality.
`;

const result = compressor.compress(text);

console.log(`Original: ${result.originalTokens} tokens`);
console.log(`Compressed: ${result.compressedTokens} tokens`);
console.log(`Saved: ${result.tokensRemoved} tokens (${(1-result.compressionRatio)*100}%)`);
console.log(`\nCompressed text:\n${result.compressed}`);
```

### Advanced Configuration

```typescript
import { Compressor } from '@hivellm/compression-prompt';

const compressor = new Compressor(
  { targetRatio: 0.7 },  // Keep 70% of tokens
  {
    compressionRatio: 0.7,
    idfWeight: 0.3,
    positionWeight: 0.2,
    posWeight: 0.2,
    entityWeight: 0.2,
    entropyWeight: 0.1,
    domainTerms: ['YourTerm'],
  }
);

const result = compressor.compress(text);
```

### Quality Metrics

```typescript
import { QualityMetricsCalculator } from '@hivellm/compression-prompt';

const metrics = QualityMetricsCalculator.calculate(original, compressed);
console.log(QualityMetricsCalculator.format(metrics));
```

### Command Line Usage

```bash
# Compress file to stdout
npx compress input.txt

# Conservative compression (70%)
npx compress -r 0.7 input.txt

# Show statistics
npx compress -s input.txt

# Save to file
npx compress -o output.txt input.txt
```

## Features

- ✅ **Zero Dependencies**: Pure TypeScript, no external libraries
- ✅ **Fast**: Optimized statistical filtering
- ✅ **Type-Safe**: Full TypeScript support with type definitions
- ✅ **Node.js & Browser**: Works in both environments
- ✅ **Smart Filtering**: Preserves code, JSON, paths, identifiers
- ✅ **Customizable**: Fine-tune weights for your use case

## API Reference

### Compressor

```typescript
class Compressor {
  constructor(
    config?: Partial<CompressorConfig>,
    filterConfig?: Partial<StatisticalFilterConfig>
  );
  
  compress(text: string): CompressionResult;
  compressWithFormat(text: string, format: OutputFormat): CompressionResult;
}
```

### CompressorConfig

```typescript
interface CompressorConfig {
  targetRatio: number;       // 0.0-1.0, default: 0.5
  minInputTokens: number;    // default: 100
  minInputBytes: number;     // default: 1024
}
```

### StatisticalFilterConfig

```typescript
interface StatisticalFilterConfig {
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
```

## Development

```bash
# Build
npm run build

# Test
npm test

# Lint
npm run lint

# Format
npm run format
```

## License

MIT

## See Also

- [Rust Implementation](../rust/) - High-performance original
- [Python Implementation](../python/) - Python port
- [Main README](../README.md) - Project overview
