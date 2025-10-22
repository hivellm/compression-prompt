//! Pluggable tokenizer interface for multiple LLM providers.
//!
//! This module defines the trait that all tokenizer implementations must satisfy,
//! allowing the compression algorithm to work with different tokenization schemes
//! (Claude, GPT, Mistral, etc.).

/// A single token represented as a u32 identifier.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Token(pub u32);

/// Pluggable tokenizer trait for different LLM providers.
///
/// Implementations must be thread-safe (Send + Sync) to support parallel processing.
pub trait Tokenizer: Send + Sync {
    /// Encode text into a sequence of tokens.
    fn encode(&self, text: &str) -> Vec<Token>;

    /// Decode a sequence of tokens back into text.
    fn decode(&self, tokens: &[Token]) -> String;

    /// Count tokens in text without allocating the token vector.
    ///
    /// Default implementation uses `encode().len()`, but can be optimized.
    fn count_tokens(&self, text: &str) -> usize {
        self.encode(text).len()
    }

    /// Test how many tokens a marker string produces.
    ///
    /// Critical for calculating marker overhead in the gain formula.
    fn test_marker(&self, marker: &str) -> usize {
        self.count_tokens(marker)
    }

    /// Get tokenizer name for debugging/logging.
    fn name(&self) -> &str;
}

/// Mock tokenizer for testing (splits on whitespace).
///
/// Maps each unique word to a consistent token ID.
#[derive(Debug)]
pub struct MockTokenizer;

impl Tokenizer for MockTokenizer {
    fn encode(&self, text: &str) -> Vec<Token> {
        use std::collections::HashMap;

        let words: Vec<&str> = text.split_whitespace().collect();
        let mut word_to_id: HashMap<&str, u32> = HashMap::new();
        let mut next_id = 0u32;

        words
            .iter()
            .map(|word| {
                let id = word_to_id.entry(word).or_insert_with(|| {
                    let id = next_id;
                    next_id += 1;
                    id
                });
                Token(*id)
            })
            .collect()
    }

    fn decode(&self, tokens: &[Token]) -> String {
        format!("<{} tokens>", tokens.len())
    }

    fn count_tokens(&self, text: &str) -> usize {
        text.split_whitespace().count()
    }

    fn name(&self) -> &str {
        "MockTokenizer"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_tokenizer() {
        let tokenizer = MockTokenizer;
        let text = "hello world foo bar";
        assert_eq!(tokenizer.count_tokens(text), 4);
        assert_eq!(tokenizer.test_marker("⟦12⟧"), 1);
    }
}
