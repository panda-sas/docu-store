"""Port for sparse embedding generation (BM25/TF-IDF style)."""

from dataclasses import dataclass
from typing import Protocol


@dataclass
class SparseEmbedding:
    """Sparse vector representation — indices + values pairs."""

    indices: list[int]
    values: list[float]


class SparseEmbeddingGenerator(Protocol):
    """Port for generating sparse (BM25/TF-IDF) embeddings."""

    def generate_sparse_embedding(self, text: str) -> SparseEmbedding:
        """Generate a sparse vector for a single text."""
        ...

    def generate_batch_sparse_embeddings(self, texts: list[str]) -> list[SparseEmbedding]:
        """Generate sparse vectors for a batch of texts."""
        ...

    def fit(self, corpus: list[str]) -> None:
        """Fit the vocabulary/IDF weights on a corpus.

        Must be called before generate methods if the model needs training.
        For pre-trained models (BM25), this may be a no-op.
        """
        ...
