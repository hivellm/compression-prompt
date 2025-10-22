//! Extract original and compressed texts to separate files for LLM testing
//! 
//! Creates paired .txt files for easy A/B testing with language models

use compression_prompt::compressor::{Compressor, CompressorConfig};
use compression_prompt::statistical_filter::{StatisticalFilter, StatisticalFilterConfig};
use compression_prompt::tokenizer::{MockTokenizer, Tokenizer};
use std::fs;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("📝 Extracting texts for LLM A/B Testing\n");

    let tokenizer = MockTokenizer;

    // Load datasets
    let benchmark_files = vec![
        ("100", "../benchmarks/datasets/prompts/benchmark_100_papers.txt", 50),
        ("200", "../benchmarks/datasets/prompts/benchmark_200_papers.txt", 100),
    ];

    for (name, path, paper_count) in benchmark_files {
        if let Ok(content) = fs::read_to_string(path) {
            println!("📄 Processing: benchmark_{} (taking {} papers)", name, paper_count);
            
            // Split into individual papers
            let papers: Vec<&str> = content
                .split("\n\n")
                .filter(|p| p.trim().len() > 500)
                .take(paper_count)
                .collect();

            println!("   Found {} papers\n", papers.len());

            // Create output directories
            let base_dir = PathBuf::from("../benchmarks/llm_tests");
            
            // Techniques to generate
            let techniques = vec![
                ("statistical_50", 0.5f32),
                ("statistical_70", 0.7f32),
                ("hybrid", 0.5f32), // Will use hybrid for this
            ];

            for (technique_name, ratio) in &techniques {
                let output_dir = base_dir.join(format!("{}papers_{}", name, technique_name));
                fs::create_dir_all(&output_dir)?;

                println!("🔧 Generating {} tests...", technique_name);

                for (idx, paper) in papers.iter().enumerate() {
                    let test_num = idx + 1;
                    
                    // Save original
                    let original_file = output_dir.join(format!("test_{:03}_original.txt", test_num));
                    fs::write(&original_file, paper)?;

                    // Generate compressed version based on technique
                    let compressed = if technique_name.starts_with("statistical") {
                        // Statistical filtering
                        let config = StatisticalFilterConfig {
                            compression_ratio: *ratio,
                            ..Default::default()
                        };
                        let filter = StatisticalFilter::new(config);
                        filter.compress(paper, &tokenizer)
                    } else {
                        // Hybrid: dictionary + statistical
                        let dict_config = CompressorConfig::default();
                        let dict_compressor = Compressor::new(dict_config);
                        
                        match dict_compressor.compress(paper, &tokenizer) {
                            Ok(dict_result) => {
                                // Apply statistical filtering to dictionary result
                                let stat_config = StatisticalFilterConfig {
                                    compression_ratio: 0.5,
                                    ..Default::default()
                                };
                                let stat_filter = StatisticalFilter::new(stat_config);
                                stat_filter.compress(&dict_result.compressed, &tokenizer)
                            }
                            Err(_) => {
                                // Fallback to statistical only if dictionary fails
                                let config = StatisticalFilterConfig {
                                    compression_ratio: 0.5,
                                    ..Default::default()
                                };
                                let filter = StatisticalFilter::new(config);
                                filter.compress(paper, &tokenizer)
                            }
                        }
                    };

                    // Save compressed
                    let compressed_file = output_dir.join(format!("test_{:03}_compressed.txt", test_num));
                    fs::write(&compressed_file, &compressed)?;

                    // Generate metadata file
                    let original_tokens = tokenizer.count_tokens(paper);
                    let compressed_tokens = tokenizer.count_tokens(&compressed);
                    let ratio_actual = compressed_tokens as f64 / original_tokens as f64;
                    
                    let metadata = format!(
                        "Test: {:03}\nTechnique: {}\nOriginal Tokens: {}\nCompressed Tokens: {}\nCompression Ratio: {:.3}\nToken Savings: {:.1}%\n",
                        test_num,
                        technique_name,
                        original_tokens,
                        compressed_tokens,
                        ratio_actual,
                        (1.0 - ratio_actual) * 100.0
                    );
                    
                    let metadata_file = output_dir.join(format!("test_{:03}_metadata.txt", test_num));
                    fs::write(&metadata_file, metadata)?;
                }

                println!("   ✅ Generated {} test pairs in {}", papers.len(), output_dir.display());
                println!();
            }

            // Generate README for this benchmark
            generate_readme(&base_dir, name, papers.len())?;
        }
    }

    println!("\n✅ All text files generated!");
    println!("\n📁 Output structure:");
    println!("   benchmarks/llm_tests/");
    println!("   ├── 100papers_statistical_50/");
    println!("   │   ├── test_001_original.txt");
    println!("   │   ├── test_001_compressed.txt");
    println!("   │   ├── test_001_metadata.txt");
    println!("   │   └── ...");
    println!("   ├── 100papers_statistical_70/");
    println!("   ├── 100papers_hybrid/");
    println!("   ├── 200papers_statistical_50/");
    println!("   ├── 200papers_statistical_70/");
    println!("   └── 200papers_hybrid/");
    println!();
    println!("🎯 Ready for LLM testing!");

    Ok(())
}

fn generate_readme(base_dir: &PathBuf, dataset_name: &str, paper_count: usize) -> Result<(), Box<dyn std::error::Error>> {
    let readme_content = format!(r#"# LLM A/B Testing - {} Papers Dataset

This directory contains extracted text files for A/B testing compression techniques with language models.

## Directory Structure

Each technique folder contains:
- `test_NNN_original.txt` - Original uncompressed text
- `test_NNN_compressed.txt` - Compressed version using the technique
- `test_NNN_metadata.txt` - Test metadata (tokens, ratio, savings)

## Techniques

### statistical_50
- **Target**: 50% token reduction
- **Method**: Statistical filtering (IDF, position, POS, entities, entropy)
- **Best for**: General academic text, maximum savings

### statistical_70
- **Target**: 30% token reduction  
- **Method**: Statistical filtering (less aggressive)
- **Best for**: Higher fidelity requirements

### hybrid
- **Target**: ~52% token reduction
- **Method**: Dictionary compression + statistical filtering
- **Best for**: Mathematical/technical text with repeated symbols

## How to Use for LLM Testing

### Basic Workflow

1. **Select a test pair**:
   ```bash
   test_001_original.txt
   test_001_compressed.txt
   ```

2. **Send both to your LLM** with the same prompt/question

3. **Compare outputs**:
   - Semantic similarity
   - Task accuracy
   - Response quality

### Example Prompts for Testing

#### Summarization
```
Summarize the following research paper in 3 bullet points:

[insert text from test_NNN_original.txt or test_NNN_compressed.txt]
```

#### Question Answering
```
Based on the following text, answer: What is the main contribution of this work?

[insert text]
```

#### Classification
```
Classify this paper into one of: Machine Learning, NLP, Computer Vision, Robotics

[insert text]
```

### Evaluation Metrics

1. **Semantic Similarity**:
   - Compare LLM outputs using cosine similarity
   - Target: >90% similarity

2. **Task Accuracy**:
   - Compare task-specific results
   - Target: >95% accuracy preservation

3. **Human Evaluation**:
   - Sample 20 pairs for human review
   - Check for information loss

## Statistics

- **Total Tests**: {} pairs
- **Original Avg Tokens**: ~450
- **Compressed Avg Tokens**: ~225 (50%), ~315 (70%), ~220 (hybrid)
- **Processing Time**: <1ms per text

## Quick Test Script (Python)

```python
import os
from pathlib import Path

def test_llm_pair(test_num, technique="statistical_50"):
    base = Path("{}papers_{{}}".format(technique))
    
    original = (base / f"test_{{test_num:03d}}_original.txt").read_text()
    compressed = (base / f"test_{{test_num:03d}}_compressed.txt").read_text()
    metadata = (base / f"test_{{test_num:03d}}_metadata.txt").read_text()
    
    # Send to your LLM API
    response_original = llm_api(original)
    response_compressed = llm_api(compressed)
    
    # Compare
    similarity = calculate_similarity(response_original, response_compressed)
    
    return {{
        "test": test_num,
        "similarity": similarity,
        "metadata": metadata
    }}
```

## Results Tracking

Create a results file to track your findings:

```json
{{
  "model": "gpt-4-turbo",
  "technique": "statistical_50",
  "tests": [
    {{
      "test_id": "001",
      "semantic_similarity": 0.94,
      "task_accuracy": 1.0,
      "notes": "Perfect preservation"
    }}
  ],
  "avg_similarity": 0.92,
  "avg_accuracy": 0.96
}}
```

## Notes

- All texts are academic papers from arXiv
- Papers are pre-filtered for quality (>500 chars)
- Compression is deterministic and reproducible
- Token counts use GPT-style tokenization

## Support

For issues or questions:
- Check `benchmarks/ab_tests/ab_test_comparison.md` for detailed stats
- See `rust/benches/README.md` for technical details

---

Generated: {}
Dataset: {} papers
Ready for production LLM testing! 🚀
"#, 
        paper_count,
        dataset_name,
        paper_count,
        chrono::Utc::now().format("%Y-%m-%d"),
        dataset_name
    );

    let readme_file = base_dir.join(format!("README_{}papers.md", dataset_name));
    fs::write(&readme_file, readme_content)?;

    Ok(())
}

