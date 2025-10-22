# compression-prompt

> Fast, intelligent prompt compression for LLMs - Save 50% tokens while maintaining 91% quality

[![PyPI version](https://badge.fury.io/py/compression-prompt.svg)](https://badge.fury.io/py/compression-prompt)
[![Python](https://img.shields.io/pypi/pyversions/compression-prompt.svg)](https://pypi.org/project/compression-prompt/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/hivellm/compression-prompt/blob/main/LICENSE)

Statistical compression for LLM prompts using intelligent filtering. Achieve **50% token reduction** with **91% quality retention** in milliseconds.

## 🎯 Why Use This?

- **💰 Save Money**: 50% fewer tokens = 50% lower LLM costs
- **⚡ Ultra Fast**: Sub-millisecond compression time
- **🎓 Proven Quality**: 91% quality with Claude Sonnet, 93% with Grok-4
- **✅ LLM Validated**: A/B tested on 6 flagship models
- **🚀 Production Ready**: No external models, pure Python, minimal dependencies
- **🌍 Multilingual**: Supports 10+ languages

## Quick Start

### Installation

```bash
pip install compression-prompt
```

For image output support:
```bash
pip install compression-prompt[image]
```

### Basic Usage

```python
from compression_prompt import Compressor

compressor = Compressor()
text = "Your long text here..."

result = compressor.compress(text)

print(f"Original: {result.original_tokens} tokens")
print(f"Compressed: {result.compressed_tokens} tokens")
print(f"Saved: {result.tokens_removed} tokens ({(1-result.compression_ratio)*100:.1f}%)")
print(f"\nCompressed text:\n{result.compressed}")
```

### CLI Usage

```bash
compress input.txt                        # Compress to stdout
compress -r 0.7 input.txt                 # Conservative (70%)
compress -r 0.3 input.txt                 # Aggressive (30%)
compress -s input.txt                     # Show statistics
cat input.txt | compress                  # Read from stdin
```

## Features

- ✅ **Zero Dependencies** (core package)
- ✅ **Statistical Filtering** - No AI models needed
- ✅ **Quality Metrics** - Track compression quality
- ✅ **Smart Protection** - Preserves code, JSON, paths, identifiers
- ✅ **Multilingual** - English, Spanish, Portuguese, French, German, Italian, Russian, Chinese, Japanese, Arabic, Hindi
- ✅ **Image Output** - Optical context compression (optional)
- ✅ **Type-Safe** - Full type hints with `py.typed`

## Advanced Usage

### Custom Configuration

```python
from compression_prompt import Compressor, CompressorConfig, StatisticalFilterConfig

# Custom compression ratio
config = CompressorConfig(target_ratio=0.7)  # Keep 70%
filter_config = StatisticalFilterConfig(
    compression_ratio=0.7,
    domain_terms=["YourTerm", "AnotherTerm"]  # Always preserve these
)

compressor = Compressor(config, filter_config)
result = compressor.compress(text)
```

### Image Output (Vision Models)

```python
from compression_prompt import ImageRenderer

renderer = ImageRenderer()
png_data = renderer.render_to_png(compressed_text)
jpeg_data = renderer.render_to_jpeg(compressed_text, quality=85)

# Save to file
renderer.render_to_file(text, "output.png", format='png')
```

### RAG System Integration

```python
from compression_prompt import Compressor

# Compress retrieved context
retrieved_docs = get_documents(query)
context = "\n\n".join(doc.text for doc in retrieved_docs)

compressor = Compressor()
result = compressor.compress(context)

# Use compressed context
prompt = f"Context: {result.compressed}\n\nQuestion: {user_question}"
response = llm.generate(prompt)
```

## Performance

| Configuration | Token Savings | Quality | Use Case |
|--------------|--------------|---------|----------|
| **Conservative (70%)** | 30% | 90-95% | High precision |
| **Balanced (50%)** ⭐ | 50% | 82-87% | Best balance |
| **Aggressive (30%)** | 70% | 75-80% | Maximum savings |

Validated on 6 flagship LLMs with 350+ test pairs.

## Documentation

- [GitHub Repository](https://github.com/hivellm/compression-prompt)
- [Full Documentation](https://github.com/hivellm/compression-prompt/blob/main/README.md)
- [API Reference](https://github.com/hivellm/compression-prompt/blob/main/python/README.md)

## License

MIT License - see [LICENSE](https://github.com/hivellm/compression-prompt/blob/main/LICENSE)

## Citation

If you use this in your research, please cite:

```bibtex
@software{compression_prompt,
  title = {Compression-Prompt: Statistical LLM Prompt Compression},
  author = {HiveLLM Team},
  year = {2025},
  url = {https://github.com/hivellm/compression-prompt}
}
```

