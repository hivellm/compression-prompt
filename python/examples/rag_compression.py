#!/usr/bin/env python3
"""Example: RAG System Context Compression"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from compression_prompt import Compressor, QualityMetrics


def simulate_rag_system():
    """Simulate a RAG system with context compression."""
    
    # Simulate retrieved documents
    retrieved_docs = [
        """
        Machine Learning (ML) is a subset of artificial intelligence that focuses on 
        building systems that can learn from and make decisions based on data. Deep 
        Learning, a specialized branch of Machine Learning, uses neural networks with 
        multiple layers to process complex patterns in large datasets.
        """,
        """
        Natural Language Processing (NLP) enables computers to understand, interpret, 
        and generate human language. Modern NLP systems use transformer architectures 
        like BERT and GPT to achieve state-of-the-art performance on tasks such as 
        translation, summarization, and question answering.
        """,
        """
        Computer Vision is a field of AI that trains computers to interpret and 
        understand visual information from the world. Applications include image 
        recognition, object detection, facial recognition, and autonomous vehicle 
        navigation systems.
        """
    ]
    
    # Combine all retrieved context
    full_context = "\n\n".join(retrieved_docs)
    
    print("=" * 70)
    print("RAG SYSTEM - CONTEXT COMPRESSION EXAMPLE")
    print("=" * 70)
    print()
    
    print("ORIGINAL CONTEXT:")
    print("-" * 70)
    print(full_context.strip())
    print()
    
    # Compress context
    compressor = Compressor()
    result = compressor.compress(full_context)
    
    print("COMPRESSED CONTEXT:")
    print("-" * 70)
    print(result.compressed)
    print()
    
    print("COMPRESSION STATISTICS:")
    print("-" * 70)
    print(f"Original tokens:   {result.original_tokens}")
    print(f"Compressed tokens: {result.compressed_tokens}")
    print(f"Tokens saved:      {result.tokens_removed}")
    print(f"Reduction:         {(1.0 - result.compression_ratio) * 100:.1f}%")
    print()
    
    # Quality metrics
    metrics = QualityMetrics.calculate(full_context, result.compressed)
    print("QUALITY METRICS:")
    print("-" * 70)
    print(metrics.format())
    print()
    
    # Simulate LLM prompt
    user_question = "What is the difference between ML and NLP?"
    
    print("FINAL PROMPT TO LLM:")
    print("-" * 70)
    prompt = f"""Context: {result.compressed}

Question: {user_question}

Please answer based on the context above."""
    
    print(prompt)
    print()
    
    print("=" * 70)
    print(f"💰 COST SAVINGS: {result.tokens_removed} tokens saved per query")
    print(f"🎯 QUALITY: {metrics.overall_score * 100:.1f}% retained")
    print("=" * 70)


if __name__ == '__main__':
    simulate_rag_system()

