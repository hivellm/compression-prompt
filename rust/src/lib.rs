//! # Compression Core
//!
//! Semantic lossless compression for LLM prompts using dictionary-based macro substitution.
//!
//! ## Overview
//!
//! This library reduces token usage in LLM prompts by extracting frequent n-grams,
//! building an optimized dictionary, and replacing occurrences with short markers.
//! The LLM performs "mental decompression" using rules provided at the prompt start.
//!
//! ## Architecture
//!
//! The compression pipeline:
//! 1. **Tokenize**: Convert input to tokens using pluggable tokenizer
//! 2. **Extract**: Find frequent n-grams (3-15 tokens)
//! 3. **Select**: Greedily choose dictionary entries by gain formula
//! 4. **Rewrite**: Substitute occurrences with markers
//! 5. **Validate**: Ensure compression ratio > 1.0
//!
//! ## Example
//!
//! ```rust,ignore
//! use compression_prompt::{Compressor, CompressorConfig};
//!
//! let config = CompressorConfig::default();
//! let compressor = Compressor::new(config);
//! let result = compressor.compress(input, &tokenizer)?;
//!
//! println!("Saved {} tokens ({:.1}% compression)",
//!     result.original_tokens - result.compressed_tokens,
//!     (1.0 - result.compression_ratio) * 100.0
//! );
//! ```

#![warn(missing_docs)]
#![warn(clippy::all)]

pub mod compressor;
pub mod dictionary;
pub mod marker;
pub mod ngram;
pub mod quality_metrics;
pub mod statistical_filter;
pub mod tokenizer; // NEW: LLMLingua-inspired model-free filtering

pub use compressor::{CompressionResult, Compressor, CompressorConfig};
pub use dictionary::{Dictionary, DictionaryEntry};
pub use marker::MarkerGenerator;
pub use ngram::{NGram, NGramExtractor};
pub use tokenizer::{Token, Tokenizer};

/// Library version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
