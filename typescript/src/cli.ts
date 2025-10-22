#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { StatisticalFilter } from './StatisticalFilter';
import { QualityMetrics } from './QualityMetrics';

const program = new Command();

program
  .name('compress')
  .description('Compress text for LLM prompts - 50% token reduction with 91% quality retention')
  .version('0.1.0')
  .argument('[input]', 'Input file (defaults to stdin)')
  .option('-o, --output <file>', 'Output file (defaults to stdout)')
  .option('-r, --ratio <ratio>', 'Compression ratio (0.0-1.0, default: 0.5)', parseFloat, 0.5)
  .option('-s, --stats', 'Show compression statistics')
  .option('--quality', 'Show quality metrics')
  .action(async (input: string | undefined, options) => {
    try {
      // Read input
      let text: string;
      if (input) {
        text = fs.readFileSync(input, 'utf-8');
      } else {
        // Read from stdin
        text = fs.readFileSync(0, 'utf-8');
      }

      if (text.trim().length === 0) {
        console.error('Error: Empty input');
        process.exit(1);
      }

      // Configure compressor
      const filter = new StatisticalFilter({
        compressionRatio: options.ratio,
      });

      // Compress
      const result = filter.compressWithMetrics(text);

      // Calculate quality metrics if requested
      let quality;
      if (options.quality) {
        quality = QualityMetrics.calculate(text, result.compressed);
      }

      // Show stats if requested
      if (options.stats) {
        console.error('Compression Statistics:');
        console.error(`  Original tokens:   ${result.originalTokens}`);
        console.error(`  Compressed tokens: ${result.compressedTokens}`);
        console.error(`  Tokens removed:    ${result.tokensRemoved}`);
        console.error(`  Compression ratio: ${((1 - result.compressionRatio) * 100).toFixed(1)}%`);
        console.error(`  Target ratio:      ${((1 - options.ratio) * 100).toFixed(1)}%`);
        console.error('');

        if (quality) {
          console.error('Quality Metrics:');
          console.error(`  Overall score:      ${(quality.overallScore * 100).toFixed(1)}%`);
          console.error(`  Keyword retention:  ${(quality.keywordRetention * 100).toFixed(1)}%`);
          console.error(`  Entity retention:   ${(quality.entityRetention * 100).toFixed(1)}%`);
          console.error(`  Vocabulary ratio:   ${(quality.vocabularyRatio * 100).toFixed(1)}%`);
          console.error(`  Info density:       ${(quality.informationDensity * 100).toFixed(1)}%`);
          console.error('');
        }
      }

      // Write output
      if (options.output) {
        fs.writeFileSync(options.output, result.compressed);
        if (options.stats) {
          console.error(`Output saved to: ${options.output}`);
        }
      } else {
        process.stdout.write(result.compressed);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    }
  });

program.parse();

