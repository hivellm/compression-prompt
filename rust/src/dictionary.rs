//! Dictionary construction using greedy gain-based selection.
//!
//! This module implements the core dictionary building algorithm that selects
//! which n-grams to include based on the gain formula: fᵢ*(Lᵢ - r) - Hᵢ

use crate::ngram::NGram;
use crate::tokenizer::Tokenizer;
use serde::{Deserialize, Serialize};

/// A single entry in the compression dictionary.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictionaryEntry {
    /// Unique identifier (1-indexed for display).
    pub id: usize,
    /// The original text to be replaced.
    pub text: String,
    /// The marker that replaces this text (e.g., "⟦12⟧").
    pub marker: String,
    /// Frequency of occurrence in the corpus.
    pub frequency: usize,
    /// Net gain in tokens from using this entry.
    pub gain: i64,
}

/// The complete compression dictionary.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dictionary {
    /// All dictionary entries, sorted by ID.
    pub entries: Vec<DictionaryEntry>,
    /// Maximum number of entries allowed.
    pub max_entries: usize,
    /// Token cost of a marker (typically 1-2).
    pub marker_cost: usize,
}

impl Dictionary {
    /// Build a dictionary from n-grams using greedy selection with overlap detection.
    ///
    /// The gain formula for each n-gram:
    /// ```text
    /// gain = fᵢ * (Lᵢ - r) - Hᵢ
    /// ```
    /// Where:
    /// - fᵢ = frequency of n-gram
    /// - Lᵢ = token length of n-gram
    /// - r = marker cost (tokens)
    /// - Hᵢ = header cost (publishing the entry in DICT)
    ///
    /// This implementation also filters out overlapping patterns to avoid redundancy.
    pub fn build(
        ngrams: Vec<NGram>,
        tokenizer: &dyn Tokenizer,
        max_entries: usize,
        marker_format: &str,
    ) -> Self {
        let mut candidates = Vec::new();

        // First pass: calculate gain for all n-grams
        for (idx, ngram) in ngrams.into_iter().enumerate() {
            let id = idx + 1;
            let marker = marker_format.replace("{}", &id.to_string());

            // Calculate marker cost
            let marker_cost = tokenizer.test_marker(&marker);

            // Calculate header cost: "id: text\n"
            let header_line = format!("{}: {}\n", id, ngram.text);
            let header_cost = tokenizer.count_tokens(&header_line);

            // Calculate gain
            let frequency = ngram.frequency as i64;
            let token_length = ngram.token_length as i64;
            let gain = frequency * (token_length - marker_cost as i64) - header_cost as i64;

            // Only include if gain is positive and above minimum threshold
            // Minimum threshold helps filter out low-value entries
            if gain > 10 {
                candidates.push(DictionaryEntry {
                    id,
                    text: ngram.text,
                    marker,
                    frequency: ngram.frequency,
                    gain,
                });
            }
        }

        // Sort by gain descending
        candidates.sort_by(|a, b| b.gain.cmp(&a.gain));

        // Second pass: filter overlapping patterns
        let mut entries = Vec::new();
        for candidate in candidates {
            if entries.len() >= max_entries {
                break;
            }

            // Check if this candidate overlaps with any existing entry
            let overlaps = entries.iter().any(|existing: &DictionaryEntry| {
                Self::is_overlapping(&candidate.text, &existing.text)
            });

            if !overlaps {
                entries.push(candidate);
            }
        }

        // Recalculate IDs after filtering
        for (idx, entry) in entries.iter_mut().enumerate() {
            entry.id = idx + 1;
            entry.marker = marker_format.replace("{}", &entry.id.to_string());
        }

        Dictionary {
            entries,
            max_entries,
            marker_cost: 2, // Conservative estimate
        }
    }

    /// Check if two text patterns overlap significantly.
    ///
    /// Returns true if one pattern is a substring of another, indicating redundancy.
    fn is_overlapping(text1: &str, text2: &str) -> bool {
        // Check if one is contained in the other
        if text1.contains(text2) || text2.contains(text1) {
            return true;
        }

        // Check for significant prefix/suffix overlap (>50% of shorter text)
        // Use character count instead of byte length to avoid Unicode boundary issues
        let text1_chars: Vec<char> = text1.chars().collect();
        let text2_chars: Vec<char> = text2.chars().collect();

        let shorter_len = text1_chars.len().min(text2_chars.len());
        let threshold = shorter_len / 2;

        if threshold == 0 {
            return false;
        }

        // Check suffix of text1 matches prefix of text2
        for overlap_len in threshold..=shorter_len {
            if overlap_len <= text1_chars.len() && overlap_len <= text2_chars.len() {
                let text1_suffix: String = text1_chars[text1_chars.len() - overlap_len..]
                    .iter()
                    .collect();
                let text2_prefix: String = text2_chars[..overlap_len].iter().collect();

                if text1_suffix == text2_prefix {
                    return true;
                }

                let text2_suffix: String = text2_chars[text2_chars.len() - overlap_len..]
                    .iter()
                    .collect();
                let text1_prefix: String = text1_chars[..overlap_len].iter().collect();

                if text2_suffix == text1_prefix {
                    return true;
                }
            }
        }

        false
    }

    /// Format the dictionary header for inclusion in compressed prompt.
    ///
    /// Returns the RULES + DICT block that goes at the top of the prompt.
    pub fn format_header(&self) -> String {
        let mut header = String::new();

        header.push_str("[RULES]\n");
        header.push_str("- Always expand ⟦n⟧ using DICT[n] before reasoning.\n");
        header.push_str("- Do not print DICT in the result, only use it to understand context.\n");
        header.push('\n');

        header.push_str("[DICT]\n");
        for entry in &self.entries {
            header.push_str(&format!("{}: {}\n", entry.id, entry.text));
        }
        header.push('\n');

        header
    }

    /// Calculate total token overhead of the dictionary header.
    pub fn header_cost(&self, tokenizer: &dyn Tokenizer) -> usize {
        tokenizer.count_tokens(&self.format_header())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tokenizer::MockTokenizer;

    #[test]
    fn test_dictionary_build() {
        let tokenizer = MockTokenizer;
        let ngrams = vec![NGram {
            tokens: vec![],
            text: "very long repeated phrase".to_string(),
            frequency: 10,
            token_length: 4,
        }];

        let dict = Dictionary::build(ngrams, &tokenizer, 256, "⟦{}⟧");

        assert!(!dict.entries.is_empty());
        assert!(dict.entries[0].gain > 0);
    }

    #[test]
    fn test_header_format() {
        let dict = Dictionary {
            entries: vec![
                DictionaryEntry {
                    id: 1,
                    text: "example text".to_string(),
                    marker: "⟦1⟧".to_string(),
                    frequency: 5,
                    gain: 10,
                },
                DictionaryEntry {
                    id: 2,
                    text: "another example".to_string(),
                    marker: "⟦2⟧".to_string(),
                    frequency: 3,
                    gain: 8,
                },
            ],
            max_entries: 256,
            marker_cost: 1,
        };

        let header = dict.format_header();
        assert!(header.contains("[RULES]"));
        assert!(header.contains("[DICT]"));
        assert!(header.contains("1: example text"));
        assert!(header.contains("2: another example"));
    }
}
