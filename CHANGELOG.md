# Changelog

All notable changes to Compression-Prompt will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Token-Aware Semantic Preservation
- **Protection mask system** for code structures and technical content
  - Code blocks (` ```...``` `) automatically protected from compression
  - JSON/YAML structures preserved intact
  - File paths and URLs protected (`src/main.rs`, `http://...`)
  - Identifiers preserved (camelCase, snake_case, UPPER_SNAKE)
  - Hashes and large numbers protected
- **Contextual stopword filtering** for smarter compression
  - "to" preserved in infinitives ("how to", "steps to")
  - "in/on/at" preserved before paths ("in src/main.rs")
  - "is/are" preserved in technical assertions ("X is deprecated")
  - "and/or" preserved between important terms
- **Critical term preservation** with priority scores
  - Negations always preserved ("not", "never", "don't", etc.)
  - Comparators protected (">=", "!=", "===", etc.)
  - Modal qualifiers preserved ("only", "must", "at least", etc.)
  - Domain-specific terms (configurable list)
- **Gap-filling algorithm** prevents readability issues
  - Re-adds tokens between widely-separated critical terms
  - Configurable gap threshold (default: 3 tokens)
  - Maintains semantic flow even with aggressive compression
- **12 comprehensive tests** for all protection features
  - Code block, JSON, path, and identifier protection
  - Contextual stopword preservation
  - Negation and comparator handling
  - Domain term preservation
  - Gap filling between critical tokens
  - Feature toggle tests (can disable all protections)

### Changed - Enhanced Configuration Options
- **StatisticalFilterConfig extended** with new fields:
  - `enable_protection_masks: bool` (default: `true`)
  - `enable_contextual_stopwords: bool` (default: `true`)
  - `preserve_negations: bool` (default: `true`)
  - `preserve_comparators: bool` (default: `true`)
  - `domain_terms: Vec<String>` (default: ["Vectorizer", "Synap", "UMICP", "Graphs"])
  - `min_gap_between_critical: usize` (default: `3`)
- **Priority-based scoring** for critical terms
  - Domain terms: ∞ (always preserve)
  - Negations/comparators: 10.0 (very high priority)
  - Modal qualifiers: 5.0 (high priority)
  - Protected spans: ∞ (never remove)

### Improved - Character-Level Position Tracking
- Accurate word-to-character position mapping
- Proper overlap detection with protected spans
- Handles multi-character Unicode correctly

### Planned
- Streaming support for large inputs
- Advanced optimizations (context-aware extraction, domain-specific tuning)
- Real-time API integration examples

## [0.4.0] - 2025-10-22

### 🎉 Major Release: Complete LLM Validation

**Full A/B testing completed across 6 major LLMs** with 350+ test pairs (100 & 200 paper datasets).

### Added - Comprehensive LLM Benchmarks
- **A/B test suite** with 44 individual compression tests
  - 100papers dataset: 50 pairs per technique
  - 200papers dataset: 100 pairs per technique
  - Techniques tested: statistical_50, statistical_70, hybrid
- **LLM validation reports** for 6 flagship models:
  - **Grok-4** (xAI): 93% quality @ 50% compression ⭐ Best overall
  - **Claude 3.5 Sonnet**: 91% quality @ 50% compression ⭐ Best cost-benefit
  - **Gemini Pro**: 89% quality @ 50% compression
  - **GPT-5**: 89% quality @ 50% compression
  - **Grok (code-fast-1)**: 88% quality @ 50% compression
  - **Claude 3.5 Haiku**: 87% quality @ 50% compression
- **Quality scoring methodology** based on:
  - Semantic preservation
  - Task performance (summarization, Q&A, reasoning)
  - Information density
  - Context reconstruction capabilities
  - Edge case handling

### Validation Results

**Statistical 70% (Conservative - 30% savings):**
- Average quality: 94-98% across all models
- Keyword retention: Excellent (99%+)
- Entity retention: Excellent (98%+)
- Recommended for: Claude Haiku, Grok, high-fidelity tasks

**Statistical 50% (Aggressive - 50% savings) ⭐ PRODUCTION DEFAULT:**
- Average quality: 87-93% across flagship models
- Keyword retention: Good-Excellent (91-92%)
- Entity retention: Good (89-90%)
- Recommended for: Grok-4, Claude Sonnet, GPT-5, Gemini Pro
- **Best cost-benefit ratio** for production use

**Hybrid (50% savings + dictionary):**
- Average quality: 87-94%
- Slight edge for mathematical/code-heavy content
- Recommended for: Specialized technical domains only

### Key Findings

1. **Flagship models handle aggressive compression better:**
   - Grok-4: Only 5% quality drop (50% → 70%)
   - Claude Sonnet: Only 6% quality drop
   - Smaller models: ~7% quality drop

2. **Production recommendation changed:**
   - **New default: statistical_50 with flagship LLMs**
   - 50% cost reduction with <10% quality loss
   - Claude Sonnet + statistical_50 = best cost-benefit

3. **Cost savings validated:**
   - Grok-4: $2.50 saved per 1M tokens (93% quality preserved)
   - Claude Sonnet: $2.50 saved per 1M tokens (91% quality)
   - Annual savings: $30K-$300K for high-volume apps

### Documentation

- Added `CLAUDE-SONNET-TEST-AB.md` - Claude Sonnet validation report
- Added `CLAUDE-HAIKU-TEST-AB.md` - Claude Haiku validation report  
- Added `GEMINI-TEST-AB.md` - Gemini Pro validation report
- Added `GPT5-TEST-AB.md` - GPT-5 validation report
- Added `GROK-TEST-AB.md` - Grok validation report
- Added `GROK-4-TEST-AB.md` - Grok-4 validation report
- Updated `ab_test_comparison.md` - Complete comparison table

### Benchmarks

600+ files generated in `llm_tests/`:
- 150 files per technique (100papers dataset)
- 300 files per technique (200papers dataset)
- All test pairs available for reproduction

### Recommendations by Use Case

**Maximum Economy (50% reduction):**
1. Grok-4 + statistical_50 → 93% quality
2. Claude Sonnet + statistical_50 → 91% quality
3. Gemini Pro + statistical_50 → 89% quality

**Maximum Quality (>95%):**
1. Grok-4 + statistical_70 → 98% quality (30% savings)
2. Claude Sonnet + statistical_70 → 97% quality
3. GPT-5 + statistical_70 → 96% quality

**Best Cost-Benefit ⭐:**
- **Claude Sonnet + statistical_50**
  - 50% economy, 91% quality
  - Excellent context reconstruction
  - Production ready for general use

## [0.3.0] - 2024-10-21

### 🎉 Major Change: Statistical Filtering is Now the Primary Method

**Dictionary compression is deprecated.** Statistical filtering provides:
- **8x better compression** (50% vs 6%)
- **42x faster** (0.92s vs 38.89s for 1.6M tokens)
- **100% success rate** (vs 15% for dictionary)
- **Excellent quality** (88.6% with 100% keyword retention)

### Added - Statistical Filtering as Recommended Default
- **Statistical filtering (statistical_50pct) is now the only recommended method**
  - 50% token reduction with 88.6% quality retention
  - Validated on 200 real arXiv papers (1.6M tokens)
  - <1ms compression speed (10.58 MB/s throughput)
  - 100% keyword retention, 92% entity preservation
  - 100% success rate on all text types
- **Quality metrics system** for objective compression evaluation
  - Keyword retention analysis (important term preservation)
  - Named entity preservation tracking (people, places, concepts)
  - Vocabulary diversity measurement
  - Information density calculation
- **LLM evaluation dataset** ready for real-world testing
  - 63 prompt pairs (original + compressed)
  - 189 files total (txt + metadata)
  - 3 compression levels tested (30%, 50%, 70%)
  - Complete quality metrics for each pair
- **Comprehensive documentation updates**
  - README.md rewritten focusing solely on statistical filtering
  - EXAMPLES.md with practical use cases
  - ANALYSIS.md with detailed benchmark results
  - Evaluation dataset in benchmarks/datasets/llm_evaluation/

### Changed
- **StatisticalFilterConfig::default() uses 50% compression** (validated)
- **README.md completely rewritten**
  - Dictionary compression removed from main documentation
  - Statistical filtering as the only recommended approach
  - Real-world validation results (1.6M tokens tested)
  - Clear ROI calculations and cost savings
- **Documentation structure simplified**
  - Focus on statistical filtering benefits
  - Dictionary method deprecated (legacy only)
  - Performance benchmarks with real numbers

### Deprecated
- **Dictionary compression** is no longer recommended
  - Only 6.1% compression (vs 50% for statistical)
  - 42x slower than statistical filtering
  - 15% success rate on typical text
  - Kept for backward compatibility only

### Performance (Validated on 200 Papers, 1.6M Tokens)
- **statistical_50pct** ⭐: 50.0% compression, 88.6% quality, 0.92s total
  - Throughput: 10.58 MB/s
  - Keywords: 100% retention (perfect!)
  - Entities: 91.8% retention
  - Success rate: 100%

### Cost Savings
Real-world ROI for GPT-4 pricing ($5/1M input tokens):
- **$2.50 saved per million tokens** (50% reduction)
- High-volume app (100M tokens/month): **$2,500/month = $30K/year**

### Benchmark Results
Aggregate statistics from 200 papers (1.6M tokens):
- Compression ratio: Exactly 50.0% (perfect consistency)
- Quality score: 88.6% (excellent)
- Keyword retention: 100% (all important terms preserved)
- Entity retention: 91.8% (names, numbers, concepts preserved)
- Speed: <1ms per paper average
- Top removed words: "the" (75K), "and" (36K), "of" (35K)

## [0.2.0] - 2025-10-21

### Added - Algorithm Improvements
- **Overlapping pattern detection** to eliminate redundant dictionary entries
- **Dynamic dictionary sizing** based on corpus size (256-1024 entries)
- **Adaptive frequency thresholds** (2-5) based on corpus size
- **Minimum gain threshold** (>10 tokens) for quality filtering
- Unicode-safe overlap detection using character boundaries

### Changed
- Increased `max_ngram_length` from 15 to 25 tokens
- Default `max_dict_entries` increased from 256 to 512
- Improved test suite with Unicode-aware tests

### Performance
- **84% improvement** in compression ratio (3.2% → 5.9% on 100 papers)
- **79% improvement** on large corpus (3.4% → 6.1% on 200 papers)
- Trade-off: 2.1-2.4x slower due to overlap detection (acceptable for batch processing)
- 512 dictionary entries, 42,344 substitutions on large corpus

### Benchmarks
- 100 arXiv papers: 793K → 746K tokens (5.9% savings, 17.5s)
- 200 arXiv papers: 1.66M → 1.56M tokens (6.1% savings, 40s)
- Top patterns: "et al. ,", "Published as a conference paper at ICLR", "the number of"

## [0.1.0] - 2024-10-21

### Added - Initial Release
- Core compression algorithm implementation
- Pluggable tokenizer trait with MockTokenizer
- N-gram extraction (3-15 tokens)
- Greedy dictionary construction with gain formula: `fᵢ*(Lᵢ - r) - Hᵢ`
- Marker generation and substitution
- Graceful degradation (min 1024 bytes, 100 tokens)
- Dictionary overhead validation (<30%)
- Compression ratio validation (must be <1.0)

### Documentation
- Complete arXiv paper draft (LaTeX)
- Technical specifications (ARCHITECTURE, ROADMAP, specs/)
- Comprehensive README and contributor guidelines

### Testing
- 12 unit tests
- 7 integration tests
- All tests passing with zero warnings

### Benchmarks - Baseline
- 100 arXiv papers: 3.2% savings (793K → 768K tokens, 8.28s)
- 200 arXiv papers: 3.4% savings (1.66M → 1.61M tokens, 16.51s)
- Performance: ~0.55 MB/s throughput

