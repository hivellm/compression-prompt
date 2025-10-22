//! N-gram extraction and frequency analysis.
//!
//! This module handles extracting repeated token sequences from the corpus
//! and computing their frequencies for dictionary selection.

use crate::tokenizer::{Token, Tokenizer};
use std::collections::HashMap;

/// An n-gram: a sequence of tokens that appears in the corpus.
#[derive(Debug, Clone)]
pub struct NGram {
    /// The tokens comprising this n-gram.
    pub tokens: Vec<Token>,
    /// The original text representation.
    pub text: String,
    /// How many times this n-gram appears in the corpus.
    pub frequency: usize,
    /// Length in tokens.
    pub token_length: usize,
}

/// Configuration and extraction logic for n-grams.
#[derive(Debug)]
pub struct NGramExtractor {
    /// Minimum n-gram length in tokens (default: 3).
    pub min_length: usize,
    /// Maximum n-gram length in tokens (default: 15).
    pub max_length: usize,
    /// Minimum frequency to include (default: 2).
    pub min_frequency: usize,
}

impl Default for NGramExtractor {
    fn default() -> Self {
        Self {
            min_length: 3,
            max_length: 15,
            min_frequency: 2,
        }
    }
}

impl NGramExtractor {
    /// Create a new extractor with custom parameters.
    pub fn new(min_length: usize, max_length: usize, min_frequency: usize) -> Self {
        Self {
            min_length,
            max_length,
            min_frequency,
        }
    }

    /// Extract all n-grams from the corpus that meet frequency threshold.
    ///
    /// This performs a sliding window over the tokenized corpus to find
    /// all repeated sequences between `min_length` and `max_length` tokens.
    pub fn extract(&self, tokenizer: &dyn Tokenizer, corpus: &str) -> Vec<NGram> {
        // Pre-process corpus once
        let words: Vec<&str> = corpus.split_whitespace().collect();
        let tokens = tokenizer.encode(corpus);

        let mut ngram_counts: HashMap<Vec<Token>, (usize, usize)> = HashMap::new();

        // Sliding window to extract all n-grams
        // Store both count and first occurrence position
        for window_size in self.min_length..=self.max_length {
            if window_size > tokens.len() {
                break;
            }

            for (pos, window) in tokens.windows(window_size).enumerate() {
                ngram_counts
                    .entry(window.to_vec())
                    .and_modify(|(count, _)| *count += 1)
                    .or_insert((1, pos));
            }
        }

        // Convert to NGram structs, filtering by frequency
        let mut ngrams: Vec<NGram> = ngram_counts
            .into_iter()
            .filter(|(_, (freq, _))| *freq >= self.min_frequency)
            .map(|(token_seq, (frequency, first_pos))| {
                let token_length = token_seq.len();

                // Get actual text from words at first occurrence position
                let text = if first_pos + token_length <= words.len() {
                    words[first_pos..first_pos + token_length].join(" ")
                } else {
                    format!("<{} tokens>", token_length)
                };

                NGram {
                    tokens: token_seq,
                    text,
                    frequency,
                    token_length,
                }
            })
            .collect();

        // Sort by frequency descending (most common first)
        ngrams.sort_by(|a, b| b.frequency.cmp(&a.frequency));

        ngrams
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tokenizer::MockTokenizer;

    #[test]
    fn test_ngram_extraction() {
        let tokenizer = MockTokenizer;
        let extractor = NGramExtractor::default();
        let corpus = "foo bar baz foo bar baz foo bar baz";

        let ngrams = extractor.extract(&tokenizer, corpus);

        // Should find "foo bar baz" with frequency 3
        assert!(!ngrams.is_empty());
        let top = &ngrams[0];
        assert_eq!(top.frequency, 3);
        assert_eq!(top.token_length, 3);
    }

    #[test]
    fn test_min_frequency_filter() {
        let tokenizer = MockTokenizer;
        let extractor = NGramExtractor {
            min_frequency: 5,
            ..Default::default()
        };
        let corpus = "a b c a b c"; // Only appears twice

        let ngrams = extractor.extract(&tokenizer, corpus);

        // Should be empty because max frequency is 2 < 5
        assert!(ngrams.is_empty());
    }
}
