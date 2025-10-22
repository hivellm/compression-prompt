//! Test multilingual compression with statistical filtering
//!
//! Demonstrates stop word filtering across 10 languages

use compression_prompt::statistical_filter::{StatisticalFilter, StatisticalFilterConfig};
use compression_prompt::tokenizer::{MockTokenizer, Tokenizer};

fn main() {
    let tokenizer = MockTokenizer;
    let config = StatisticalFilterConfig {
        compression_ratio: 0.5,
        ..Default::default()
    };
    let filter = StatisticalFilter::new(config);

    println!("🌍 Multilingual Compression Test\n");
    println!("Testing stop word filtering across 10 languages:\n");

    // Test cases in different languages
    let test_cases = vec![
        (
            "🇬🇧 English",
            "The quick brown fox jumps over the lazy dog in the garden",
        ),
        (
            "🇪🇸 Spanish",
            "El rápido zorro marrón salta sobre el perro perezoso en el jardín",
        ),
        (
            "🇧🇷 Portuguese",
            "A rápida raposa marrom pula sobre o cachorro preguiçoso no jardim",
        ),
        (
            "🇫🇷 French",
            "Le rapide renard brun saute par-dessus le chien paresseux dans le jardin",
        ),
        (
            "🇩🇪 German",
            "Der schnelle braune Fuchs springt über den faulen Hund im Garten",
        ),
        (
            "🇮🇹 Italian",
            "La volpe marrone veloce salta sopra il cane pigro nel giardino",
        ),
        (
            "🇷🇺 Russian (romanized)",
            "Bystraya korichnevaya lisa prygnula cherez lenivuyu sobaku v sadu",
        ),
        (
            "🇨🇳 Chinese",
            "快速的棕色狐狸在花园里跳过懒狗",
        ),
        (
            "🇯🇵 Japanese",
            "速い茶色のキツネは庭で怠け者の犬を飛び越える",
        ),
        (
            "🇸🇦 Arabic (romanized)",
            "Al-thalab al-asmar al-saria qafaza fawqa al-kalb al-kasul fi al-hadiqah",
        ),
    ];

    for (lang, text) in test_cases {
        let original_tokens = tokenizer.count_tokens(text);
        let compressed = filter.compress(text, &tokenizer);
        let compressed_tokens = tokenizer.count_tokens(&compressed);
        
        let ratio = compressed_tokens as f64 / original_tokens as f64;
        let savings = (1.0 - ratio) * 100.0;

        println!("{}", lang);
        println!("  Original:    {} ({} tokens)", text, original_tokens);
        println!("  Compressed:  {} ({} tokens)", compressed, compressed_tokens);
        println!("  Savings:     {:.1}%", savings);
        println!();
    }

    println!("✅ Multilingual compression complete!");
    println!("\n📊 Stop word coverage:");
    println!("  - English: ~50 words");
    println!("  - Spanish: ~60 words");
    println!("  - Portuguese: ~60 words");
    println!("  - French: ~50 words");
    println!("  - German: ~40 words");
    println!("  - Italian: ~60 words");
    println!("  - Russian: ~20 words (romanized)");
    println!("  - Chinese: ~20 particles");
    println!("  - Japanese: ~20 particles");
    println!("  - Arabic: ~20 words (romanized)");
    println!("  - Hindi: ~20 words (romanized)");
    println!("\n🌎 Total: ~450 stop words across 10 languages");
    println!("   Coverage: ~60% of world population (~4.5B speakers)");
}

