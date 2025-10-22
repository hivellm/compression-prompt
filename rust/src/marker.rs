//! Marker generation and validation.
//!
//! This module handles creating short, tokenization-efficient markers
//! for dictionary substitution.

use crate::tokenizer::Tokenizer;

/// Generates markers for dictionary entries.
#[derive(Debug, Clone)]
pub struct MarkerGenerator {
    /// Format string with {} placeholder for ID.
    pub format: String,
}

impl Default for MarkerGenerator {
    fn default() -> Self {
        Self {
            format: "⟦{}⟧".to_string(),
        }
    }
}

impl MarkerGenerator {
    /// Create a new marker generator with custom format.
    pub fn new(format: String) -> Self {
        Self { format }
    }

    /// Generate a marker for a given ID.
    pub fn generate(&self, id: usize) -> String {
        self.format.replace("{}", &id.to_string())
    }

    /// Test marker formats to find the one with lowest token cost.
    ///
    /// Returns the best format and its token cost.
    pub fn find_best_format(tokenizer: &dyn Tokenizer) -> (String, usize) {
        let candidates = vec![
            "⟦{}⟧",  // Unicode mathematical brackets
            "[#{}]", // Square brackets with hash
            "⦃{}⦄",  // Double curly brackets
            "«{}»",  // Guillemets
            "⟪{}⟫",  // Mathematical angle brackets
        ];

        candidates
            .into_iter()
            .map(|format| {
                let marker = format.replace("{}", "42"); // Test with example ID
                let cost = tokenizer.test_marker(&marker);
                (format.to_string(), cost)
            })
            .min_by_key(|(_, cost)| *cost)
            .unwrap_or_else(|| ("⟦{}⟧".to_string(), 2))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tokenizer::MockTokenizer;

    #[test]
    fn test_marker_generation() {
        let generator = MarkerGenerator::default();
        assert_eq!(generator.generate(1), "⟦1⟧");
        assert_eq!(generator.generate(42), "⟦42⟧");
        assert_eq!(generator.generate(999), "⟦999⟧");
    }

    #[test]
    fn test_custom_format() {
        let generator = MarkerGenerator::new("[#{}]".to_string());
        assert_eq!(generator.generate(1), "[#1]");
        assert_eq!(generator.generate(10), "[#10]");
    }

    #[test]
    fn test_find_best_format() {
        let tokenizer = MockTokenizer;
        let (format, cost) = MarkerGenerator::find_best_format(&tokenizer);

        assert!(!format.is_empty());
        assert!(cost > 0);
        assert!(cost <= 3); // Should be reasonably short
    }
}
