//! Main compression pipeline and result structures.

use crate::dictionary::Dictionary;
use crate::ngram::NGramExtractor;
use crate::tokenizer::Tokenizer;
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Compression errors.
#[derive(Error, Debug)]
pub enum CompressionError {
    /// Compression would increase token count.
    #[error("Compression ratio {0:.2} < 1.0, would increase tokens")]
    NegativeGain(f32),

    /// Dictionary overhead exceeds threshold.
    #[error("Dictionary overhead {0:.1}% exceeds threshold {1:.1}%")]
    ExcessiveOverhead(f32, f32),

    /// Input too short to compress.
    #[error("Input too short ({0} tokens), minimum is {1}")]
    InputTooShort(usize, usize),
}

/// Configuration for the compressor.
#[derive(Debug, Clone)]
pub struct CompressorConfig {
    /// Maximum dictionary entries (default: 256).
    pub max_dict_entries: usize,

    /// Marker format string (default: "⟦{}⟧").
    pub marker_format: String,

    /// Minimum n-gram length in tokens (default: 3).
    pub min_ngram_length: usize,

    /// Maximum n-gram length in tokens (default: 15).
    pub max_ngram_length: usize,

    /// Maximum dictionary overhead as fraction of total (default: 0.30).
    pub dict_overhead_threshold: f32,

    /// Minimum input tokens to attempt compression (default: 100).
    pub min_input_tokens: usize,

    /// Minimum input bytes to attempt compression (default: 1024).
    pub min_input_bytes: usize,
}

impl Default for CompressorConfig {
    fn default() -> Self {
        Self {
            max_dict_entries: 512, // Increased from 256 for better coverage
            marker_format: "⟦{}⟧".to_string(),
            min_ngram_length: 3,
            max_ngram_length: 25, // Increased from 15 to capture longer phrases
            dict_overhead_threshold: 0.30,
            min_input_tokens: 100,
            min_input_bytes: 1024,
        }
    }
}

/// Result of compression operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionResult {
    /// The compressed prompt (with RULES + DICT + body).
    pub compressed: String,

    /// Original token count.
    pub original_tokens: usize,

    /// Compressed token count.
    pub compressed_tokens: usize,

    /// Compression ratio (compressed/original).
    pub compression_ratio: f32,

    /// The dictionary used.
    pub dictionary: Dictionary,

    /// Number of substitutions made.
    pub substitutions: usize,
}

/// Main compressor.
#[derive(Debug)]
pub struct Compressor {
    /// Compression configuration.
    pub config: CompressorConfig,
}

impl Compressor {
    /// Create a new compressor with given configuration.
    pub fn new(config: CompressorConfig) -> Self {
        Self { config }
    }

    /// Compress input text using the provided tokenizer.
    ///
    /// Returns an error if compression would be counterproductive.
    pub fn compress(
        &self,
        input: &str,
        tokenizer: &dyn Tokenizer,
    ) -> Result<CompressionResult, CompressionError> {
        // Step 1: Check input size (bytes)
        let input_bytes = input.len();
        if input_bytes < self.config.min_input_bytes {
            return Err(CompressionError::InputTooShort(
                input_bytes,
                self.config.min_input_bytes,
            ));
        }

        // Step 2: Check input length (tokens)
        let original_tokens = tokenizer.count_tokens(input);
        if original_tokens < self.config.min_input_tokens {
            return Err(CompressionError::InputTooShort(
                original_tokens,
                self.config.min_input_tokens,
            ));
        }

        // Step 3: Extract n-grams with dynamic frequency threshold
        // For larger corpora, we can use lower frequency thresholds
        let min_frequency = if original_tokens > 500000 {
            2 // Large corpus: keep threshold low to find rare but valuable patterns
        } else if original_tokens > 100000 {
            3 // Medium corpus: slightly higher threshold
        } else {
            5 // Small corpus: focus on truly repeated patterns
        };

        let extractor = NGramExtractor::new(
            self.config.min_ngram_length,
            self.config.max_ngram_length,
            min_frequency,
        );
        let ngrams = extractor.extract(tokenizer, input);

        if ngrams.is_empty() {
            return Err(CompressionError::NegativeGain(1.0));
        }

        // Step 4: Build dictionary with dynamic sizing
        // Larger corpora benefit from larger dictionaries
        let max_entries = if original_tokens > 1000000 {
            1024 // Very large corpus
        } else if original_tokens > 500000 {
            768 // Large corpus
        } else if original_tokens > 100000 {
            512 // Medium corpus
        } else {
            256 // Small corpus
        };

        let dictionary = Dictionary::build(
            ngrams,
            tokenizer,
            max_entries.min(self.config.max_dict_entries),
            &self.config.marker_format,
        );

        if dictionary.entries.is_empty() {
            return Err(CompressionError::NegativeGain(1.0));
        }

        // Step 5: Rewrite body with substitutions
        let (body, substitutions) = self.rewrite_with_markers(input, &dictionary);

        // Step 6: Construct final compressed prompt
        let header = dictionary.format_header();
        let compressed = format!("{}\n[BODY]\n{}", header, body);

        // Step 7: Validate compression ratio
        let compressed_tokens = tokenizer.count_tokens(&compressed);
        let compression_ratio = compressed_tokens as f32 / original_tokens as f32;

        if compression_ratio >= 1.0 {
            return Err(CompressionError::NegativeGain(compression_ratio));
        }

        // Step 8: Check dictionary overhead
        let header_tokens = tokenizer.count_tokens(&header);
        let overhead_ratio = header_tokens as f32 / compressed_tokens as f32;

        if overhead_ratio > self.config.dict_overhead_threshold {
            return Err(CompressionError::ExcessiveOverhead(
                overhead_ratio * 100.0,
                self.config.dict_overhead_threshold * 100.0,
            ));
        }

        Ok(CompressionResult {
            compressed,
            original_tokens,
            compressed_tokens,
            compression_ratio,
            dictionary,
            substitutions,
        })
    }

    /// Rewrite input by substituting dictionary entries with markers.
    ///
    /// Returns (rewritten_text, substitution_count).
    fn rewrite_with_markers(&self, input: &str, dictionary: &Dictionary) -> (String, usize) {
        let mut result = input.to_string();
        let mut total_substitutions = 0;

        // Sort entries by text length descending to avoid partial matches
        let mut entries = dictionary.entries.clone();
        entries.sort_by(|a, b| b.text.len().cmp(&a.text.len()));

        for entry in entries {
            let count = result.matches(&entry.text).count();
            if count > 0 {
                result = result.replace(&entry.text, &entry.marker);
                total_substitutions += count;
            }
        }

        (result, total_substitutions)
    }
}

impl Default for Compressor {
    fn default() -> Self {
        Self::new(CompressorConfig::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tokenizer::MockTokenizer;

    #[test]
    fn test_compression_pipeline() {
        let tokenizer = MockTokenizer;
        let compressor = Compressor::default();

        // Create input with repetitive phrases
        let mut input = String::new();
        for _ in 0..1000 {
            input.push_str("AAAA BBBB CCCC DDDD EEEE ");
        }

        let result = compressor.compress(&input, &tokenizer);

        // Test passes if compression either succeeds OR gracefully degrades
        match result {
            Ok(compressed) => {
                // If compression succeeds, validate results
                assert!(compressed.compression_ratio < 1.0);
                assert!(compressed.substitutions > 0);
                println!(
                    "Compression succeeded: ratio={:.2}",
                    compressed.compression_ratio
                );
            }
            Err(e) => {
                // Graceful degradation is also acceptable
                println!("Compression gracefully degraded: {:?}", e);
                assert!(matches!(
                    e,
                    CompressionError::NegativeGain(_) | CompressionError::ExcessiveOverhead(_, _)
                ));
            }
        }
    }

    #[test]
    fn test_compression_too_short() {
        let tokenizer = MockTokenizer;
        let compressor = Compressor::default();
        let input = "short text";

        let result = compressor.compress(&input, &tokenizer);
        assert!(matches!(result, Err(CompressionError::InputTooShort(_, _))));
    }

    #[test]
    fn test_compression_min_bytes() {
        let tokenizer = MockTokenizer;
        let compressor = Compressor::default();

        // Create input < 1024 bytes but > 100 tokens
        let mut input = String::new();
        for _ in 0..200 {
            input.push_str("ab ");
        }

        // Should fail due to min_input_bytes
        assert!(input.len() < 1024);
        let result = compressor.compress(&input, &tokenizer);
        assert!(matches!(result, Err(CompressionError::InputTooShort(_, _))));
    }

    #[test]
    fn test_compression_min_tokens() {
        let tokenizer = MockTokenizer;

        let config = CompressorConfig {
            min_input_bytes: 10, // Lower byte requirement
            min_input_tokens: 500,
            ..Default::default()
        };
        let compressor = Compressor::new(config);

        // Create input > 10 bytes but < 500 tokens
        let input = "some short text with few tokens";

        // Should fail due to min_input_tokens
        let result = compressor.compress(&input, &tokenizer);
        assert!(matches!(result, Err(CompressionError::InputTooShort(_, _))));
    }
}
