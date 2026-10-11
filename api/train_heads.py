#!/usr/bin/env python3
"""
Train linear classification heads (Intent, Safety) on normalized MiniLM sentence embeddings.
Usage:
  python train_heads.py <input.csv> <output.joblib>
"""

import sys
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import StratifiedKFold, cross_val_predict

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def train_head(csv_path: Path, output_path: Path):
    print(f"Loading dataset from {csv_path}...")
    df = pd.read_csv(csv_path)
    if "text" not in df.columns or "label" not in df.columns:
        raise ValueError(f"CSV must contain 'text' and 'label' columns. Found: {df.columns.tolist()}")

    texts = df["text"].astype(str).tolist()
    labels = df["label"].astype(str).tolist()

    print(f"Dataset has {len(texts)} samples with classes: {sorted(set(labels))}")

    print(f"Loading embedding model '{MODEL_NAME}'...")
    embedder = SentenceTransformer(MODEL_NAME)

    print("Computing normalized dense embeddings...")
    embeddings = embedder.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=True,
        convert_to_numpy=True
    )

    clf = LogisticRegression(
        max_iter=2000,
        C=4.0,
        class_weight="balanced",
        random_state=42
    )

    # 5-fold cross-validation evaluation (or min class count if small)
    min_class_count = min(labels.count(c) for c in set(labels))
    n_splits = min(5, min_class_count)

    if n_splits >= 2:
        print(f"\n--- {n_splits}-Fold Cross-Validation Report ---")
        cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
        cv_preds = cross_val_predict(clf, embeddings, labels, cv=cv)
        print(classification_report(labels, cv_preds, zero_division=0))
    else:
        print("Dataset too small for multi-fold CV. Training on full dataset.")

    print(f"Fitting final model on all {len(texts)} samples...")
    clf.fit(embeddings, labels)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(clf, output_path)
    print(f"Successfully saved trained classifier to {output_path} (classes: {clf.classes_.tolist()})")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python train_heads.py <input.csv> <output.joblib>", file=sys.stderr)
        sys.exit(1)

    csv_file = Path(sys.argv[1])
    out_file = Path(sys.argv[2])
    train_head(csv_file, out_file)
