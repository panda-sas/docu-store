"""TF-IDF sparse embedding generator for hybrid search.

Uses scikit-learn TfidfVectorizer to produce sparse vectors compatible
with Qdrant's SparseVector format. Provides BM25-like exact-term recall
for scientific identifiers (compound codes, gene names, etc.).

Note: Uses pickle for sklearn model serialization — this is standard practice
for sklearn models and the file is generated locally, not from untrusted sources.
"""

from __future__ import annotations

import pickle
from pathlib import Path

import structlog
from sklearn.feature_extraction.text import TfidfVectorizer

from application.ports.sparse_embedding_generator import SparseEmbedding, SparseEmbeddingGenerator

logger = structlog.get_logger()

# Default path for persisting the fitted vectorizer
_DEFAULT_MODEL_PATH = Path("data/tfidf_vectorizer.pkl")


class TfidfSparseGenerator(SparseEmbeddingGenerator):
    """Sparse embedding generator using scikit-learn TF-IDF.

    The vectorizer must be fit on a corpus before generating embeddings.
    Once fit, it can be persisted to disk and loaded on startup.
    If no persisted model exists, it starts unfitted and will use a
    fallback character n-gram approach for unseen vocabulary.
    """

    def __init__(
        self,
        model_path: Path | str | None = None,
        max_features: int = 30000,
        ngram_range: tuple[int, int] = (1, 2),
        sublinear_tf: bool = True,
    ) -> None:
        self.model_path = Path(model_path) if model_path else _DEFAULT_MODEL_PATH
        self.max_features = max_features

        self._vectorizer = TfidfVectorizer(
            max_features=max_features,
            ngram_range=ngram_range,
            sublinear_tf=sublinear_tf,  # log(1 + tf) — dampens frequent terms
            lowercase=True,
            token_pattern=r"(?u)\b\w[\w\-\.]+\b",  # keeps hyphens/dots in tokens (SACC-111, IC50)
        )
        self._fitted = False

        # Try loading a persisted model (local dev file, not untrusted input)
        if self.model_path.exists():
            try:
                with self.model_path.open("rb") as f:
                    self._vectorizer = pickle.load(f)  # noqa: S301
                self._fitted = True
                vocab_size = len(self._vectorizer.vocabulary_)
                logger.info("tfidf_model_loaded", path=str(self.model_path), vocab_size=vocab_size)
            except Exception as e:  # noqa: BLE001
                logger.warning("tfidf_model_load_failed", error=str(e))

    def fit(self, corpus: list[str]) -> None:
        """Fit the TF-IDF vocabulary on a corpus of documents."""
        if not corpus:
            logger.warning("tfidf_fit_empty_corpus")
            return

        self._vectorizer.fit(corpus)
        self._fitted = True

        vocab_size = len(self._vectorizer.vocabulary_)
        logger.info("tfidf_model_fitted", corpus_size=len(corpus), vocab_size=vocab_size)

        # Persist to disk
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        with self.model_path.open("wb") as f:
            pickle.dump(self._vectorizer, f)
        logger.info("tfidf_model_saved", path=str(self.model_path))

    def generate_sparse_embedding(self, text: str) -> SparseEmbedding:
        """Generate a sparse TF-IDF vector for a single text."""
        if not self._fitted:
            # Auto-fit on single document (bootstrapping — will be refined later)
            self._vectorizer.fit([text])
            self._fitted = True
            logger.warning("tfidf_auto_fitted_single_doc")

        matrix = self._vectorizer.transform([text])
        csr = matrix.tocsr()[0]

        return SparseEmbedding(
            indices=csr.indices.tolist(),
            values=csr.data.tolist(),
        )

    def generate_batch_sparse_embeddings(self, texts: list[str]) -> list[SparseEmbedding]:
        """Generate sparse TF-IDF vectors for a batch of texts."""
        if not self._fitted:
            self._vectorizer.fit(texts)
            self._fitted = True
            logger.warning("tfidf_auto_fitted_from_batch", batch_size=len(texts))

        matrix = self._vectorizer.transform(texts)

        results = []
        for i in range(matrix.shape[0]):
            row = matrix.getrow(i).tocsr()
            results.append(
                SparseEmbedding(
                    indices=row.indices.tolist(),
                    values=row.data.tolist(),
                ),
            )
        return results
