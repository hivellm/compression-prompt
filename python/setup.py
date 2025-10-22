"""Setup script for compression-prompt Python package."""

from setuptools import setup, find_packages
from pathlib import Path

# Read README
readme_file = Path(__file__).parent.parent / "README.md"
long_description = readme_file.read_text(encoding="utf-8") if readme_file.exists() else ""

setup(
    name="compression-prompt",
    version="0.1.0",
    author="HiveLLM Team",
    description="Fast statistical compression for LLM prompts - 50% token reduction with 91% quality retention",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/hivellm/compression-prompt",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Text Processing",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=[
        # No external dependencies for core functionality
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "black>=23.0.0",
            "mypy>=1.0.0",
        ],
        "image": [
            "Pillow>=10.0.0",
        ],
    },
    scripts=[
        "bin/compress",
    ],
    keywords=["llm", "compression", "prompt", "optimization", "token-reduction"],
    project_urls={
        "Bug Reports": "https://github.com/hivellm/compression-prompt/issues",
        "Source": "https://github.com/hivellm/compression-prompt",
    },
)

