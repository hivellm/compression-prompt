//! Main compression pipeline and result structures.

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Compression errors.
#[derive(Error, Debug)]
pub enum CompressionError {
    /// Compression would increase token count.
    #[error("Compression ratio {0:.2} < 1.0, would increase tokens")]
    NegativeGain(f32),

    /// Input too short to compress.
    #[error("Input too short ({0} tokens), minimum is {1}")]
    InputTooShort(usize, usize),
}

/// Configuration for the compressor.
#[derive(Debug, Clone)]
pub struct CompressorConfig {
    /// Target compression ratio (default: 0.5 = 50% of original size).
    pub target_ratio: f32,

    /// Minimum input tokens to attempt compression (default: 100).
    pub min_input_tokens: usize,

    /// Minimum input bytes to attempt compression (default: 1024).
    pub min_input_bytes: usize,
}

impl Default for CompressorConfig {
    fn default() -> Self {
        Self {
            target_ratio: 0.5,
            min_input_tokens: 100,
            min_input_bytes: 1024,
        }
    }
}

/// Result of compression operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionResult {
    /// The compressed text.
    pub compressed: String,

    /// Original token count.
    pub original_tokens: usize,

    /// Compressed token count.
    pub compressed_tokens: usize,

    /// Compression ratio (compressed/original).
    pub compression_ratio: f32,

    /// Number of tokens removed.
    pub tokens_removed: usize,
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

    /// Compress input text.
    ///
    /// Returns an error if compression would be counterproductive.
    /// 
    /// TODO: Implement statistical filtering strategy
    pub fn compress(
        &self,
        input: &str,
    ) -> Result<CompressionResult, CompressionError> {
        // Step 1: Check input size (bytes)
        let input_bytes = input.len();
        if input_bytes < self.config.min_input_bytes {
            return Err(CompressionError::InputTooShort(
                input_bytes,
                self.config.min_input_bytes,
            ));
        }

        // Step 2: Estimate tokens (using char count / 4 as rough estimate)
        let original_tokens = input.chars().count() / 4;
        if original_tokens < self.config.min_input_tokens {
            return Err(CompressionError::InputTooShort(
                original_tokens,
                self.config.min_input_tokens,
            ));
        }

        // Step 3: Apply statistical filtering (placeholder for new strategy)
        // TODO: Implement statistical filtering based on statistical_filter module
        let compressed = input.to_string();

        // Step 4: Validate compression ratio
        let compressed_tokens = compressed.chars().count() / 4;
        let compression_ratio = compressed_tokens as f32 / original_tokens as f32;

        if compression_ratio >= 1.0 {
            return Err(CompressionError::NegativeGain(compression_ratio));
        }

        let tokens_removed = original_tokens.saturating_sub(compressed_tokens);

        Ok(CompressionResult {
            compressed,
            original_tokens,
            compressed_tokens,
            compression_ratio,
            tokens_removed,
        })
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

    #[test]
    fn test_compression_too_short() {
        let compressor = Compressor::default();
        let input = "short text";

        let result = compressor.compress(&input);
        assert!(matches!(result, Err(CompressionError::InputTooShort(_, _))));
    }

    #[test]
    fn test_compression_min_bytes() {
        let compressor = Compressor::default();

        // Create input < 1024 bytes but > 100 tokens
        let mut input = String::new();
        for _ in 0..200 {
            input.push_str("ab ");
        }

        // Should fail due to min_input_bytes
        assert!(input.len() < 1024);
        let result = compressor.compress(&input);
        assert!(matches!(result, Err(CompressionError::InputTooShort(_, _))));
    }

    #[test]
    fn test_compression_min_tokens() {
        let config = CompressorConfig {
            min_input_bytes: 10, // Lower byte requirement
            min_input_tokens: 500,
            ..Default::default()
        };
        let compressor = Compressor::new(config);

        // Create input > 10 bytes but < 500 tokens
        let input = "some short text with few tokens";

        // Should fail due to min_input_tokens
        let result = compressor.compress(&input);
        assert!(matches!(result, Err(CompressionError::InputTooShort(_, _))));
    }
}
