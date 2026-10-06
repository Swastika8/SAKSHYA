"""Read-only corpus retrieval. Only corpus vectors are cached; never case text."""

import json
import os
from pathlib import Path
from functools import lru_cache
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

ROOT = Path(__file__).resolve().parents[1]
CORPUS = json.loads((ROOT / "corpus" / "provisions.json").read_text(encoding="utf-8"))
ROUTES = json.loads((ROOT / "corpus" / "routes.json").read_text(encoding="utf-8"))


class Retriever:
    def __init__(self):
        self.model = None
        self.mode = "tfidf"
        texts = [
            " ".join([p["title"], p["plain_summary"], " ".join(p["keywords"])])
            for p in CORPUS
        ]
        mode = os.getenv("RAG_MODE", "auto")
        cached_model = any((ROOT / ".model-cache").glob("**/config.json"))
        if mode == "transformer" or (mode == "auto" and cached_model):
            try:
                from sentence_transformers import SentenceTransformer

                self.model = SentenceTransformer(
                    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                    cache_folder=str(ROOT / ".model-cache"),
                    local_files_only=mode != "transformer",
                )
                self.matrix = self.model.encode(
                    texts, normalize_embeddings=True, show_progress_bar=False
                )
                self.mode = "transformer"
            except Exception:
                self.model = None
        if self.model is None:
            self.vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5))
            self.matrix = self.vectorizer.fit_transform(texts).toarray()

    def retrieve(self, query: str, minor: bool):
        # A keyword gate avoids presenting plausible-looking legal matches for
        # unrelated queries, even if an embedding has nonzero similarity.
        candidates = [
            i
            for i, p in enumerate(CORPUS)
            if (not p.get("minor_only") or minor)
            and any(k.casefold() in query.casefold() for k in p["keywords"])
        ]
        if not candidates:
            return []
        q = (
            self.model.encode(
                [query], normalize_embeddings=True, show_progress_bar=False
            )[0]
            if self.model
            else self.vectorizer.transform([query]).toarray()[0]
        )
        scores = (
            self.matrix
            @ q
            / (np.linalg.norm(self.matrix, axis=1) * np.linalg.norm(q) + 1e-9)
        )
        ranked = sorted(candidates, key=lambda i: float(scores[i]), reverse=True)
        # Include child protection when supported by the query and minor flag.
        if minor:
            child = [i for i in ranked if CORPUS[i].get("minor_only")]
            ranked = list(dict.fromkeys(child[:2] + ranked))
        return [CORPUS[i] for i in ranked[:8]]


@lru_cache(maxsize=1)
def retriever():
    return Retriever()


def routes(platform: str, minor: bool):
    base = [
        r
        for r in ROUTES
        if r["platform"] == "all"
        and (r.get("audience", "all") == "all" or (r["audience"] == "minor") == minor)
    ]
    base += [
        r
        for r in ROUTES
        if r["platform"] != "all"
        and r["platform"].casefold() == platform.strip().casefold()
    ]
    return base
