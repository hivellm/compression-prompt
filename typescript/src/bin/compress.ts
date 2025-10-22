#!/usr/bin/env node
/**
 * CLI tool for compressing text using compression-prompt
 */

import * as fs from 'fs';
import * as process from 'process';
import { Compressor, CompressionError, OutputFormat } from '../compressor';

interface CliArgs {
  inputFile?: string;
  outputFile?: string;
  ratio: number;
  stats: boolean;
  help: boolean;
}

function printUsage(): void {
  console.log(`Usage: compress [OPTIONS] [INPUT_FILE]

Options:
  -r, --ratio <RATIO>      Compression ratio (0.0-1.0, default: 0.5)
  -o, --output <FILE>      Output file (default: stdout)
  -s, --stats              Show compression statistics
  -h, --help               Show this help message

Examples:
  compress input.txt                        # Compress to stdout
  compress -r 0.7 input.txt                 # Conservative (70%)
  compress -r 0.3 input.txt                 # Aggressive (30%)
  cat input.txt | compress                  # Read from stdin
  compress -s input.txt                     # Show statistics
`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    ratio: 0.5,
    stats: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '-h':
      case '--help':
        args.help = true;
        break;

      case '-r':
      case '--ratio':
        i++;
        if (i >= argv.length) {
          throw new Error('Missing value for --ratio');
        }
        args.ratio = parseFloat(argv[i]);
        if (isNaN(args.ratio) || args.ratio < 0 || args.ratio > 1) {
          throw new Error('Ratio must be between 0.0 and 1.0');
        }
        break;

      case '-o':
      case '--output':
        i++;
        if (i >= argv.length) {
          throw new Error('Missing value for --output');
        }
        args.outputFile = argv[i];
        break;

      case '-s':
      case '--stats':
        args.stats = true;
        break;

      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        args.inputFile = arg;
        break;
    }
  }

  return args;
}

async function readInput(args: CliArgs): Promise<string> {
  if (args.inputFile) {
    return fs.readFileSync(args.inputFile, 'utf8');
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  }
}

function writeOutput(args: CliArgs, text: string): void {
  if (args.outputFile) {
    fs.writeFileSync(args.outputFile, text, 'utf8');
  } else {
    process.stdout.write(text);
  }
}

async function main() {
  try {
    const args = parseArgs(process.argv);

    if (args.help) {
      printUsage();
      process.exit(0);
    }

    const input = await readInput(args);

    const compressor = new Compressor({
      targetRatio: args.ratio,
      minInputBytes: 100,
      minInputTokens: 10,
    });

    const result = compressor.compressWithFormat(input, OutputFormat.TEXT);

    if (args.stats) {
      console.error('Compression Statistics:');
      console.error(`  Original tokens:   ${result.originalTokens}`);
      console.error(`  Compressed tokens: ${result.compressedTokens}`);
      console.error(`  Tokens removed:    ${result.tokensRemoved}`);
      console.error(`  Compression ratio: ${((1.0 - result.compressionRatio) * 100).toFixed(1)}%`);
      console.error(`  Target ratio:      ${((1.0 - args.ratio) * 100).toFixed(1)}%`);
      console.error('');
    }

    writeOutput(args, result.compressed);
  } catch (error) {
    if (error instanceof CompressionError) {
      console.error(`Compression error: ${error.message}`);
      process.exit(1);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      printUsage();
      process.exit(1);
    } else {
      console.error('Unknown error occurred');
      process.exit(1);
    }
  }
}

main();

