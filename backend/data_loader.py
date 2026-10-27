"""Dataset acquisition, validation, cleaning, and deterministic split creation."""
import json
import os
import re
from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split
from backend.config import DATA_DIR, DATASET_ID, SEED

def _normalize(value):
    return re.sub(r"\s+", " ", str(value)).strip()

def load_dataset(local_path=None, download=True):
    """Load the Bitext dataset (or local CSV/Parquet); response/flags are never model inputs."""
    source = ""
    if local_path:
        path = Path(local_path)
        if path.suffix.lower() == ".csv": df = pd.read_csv(path)
        elif path.suffix.lower() in (".parquet", ".pq"): df = pd.read_parquet(path)
        else: raise ValueError("Local dataset must be CSV or Parquet")
        source = str(path.resolve())
    else:
        # Keep the hub cache path short on Windows: datasets embeds cache paths
        # into lock filenames, which can exceed MAX_PATH inside a long workspace.
        cache = Path(os.getenv("HF_DATASETS_CACHE", Path.home() / ".cache" / "huggingface" / "datasets"))
        cache.mkdir(parents=True, exist_ok=True)
        try:
            from datasets import load_dataset as hf_load_dataset
            split = hf_load_dataset(DATASET_ID, split="train", cache_dir=str(cache), download_mode="reuse_dataset_if_exists" if download else "reuse_cache_if_exists")
            df = split.to_pandas()
            source = f"Hugging Face: {DATASET_ID} (cached at {cache})"
        except Exception as exc:
            fallback = next(iter((DATA_DIR / "raw").glob("*.csv")), None)
            if fallback is None: fallback = next(iter((DATA_DIR / "raw").glob("*.parquet")), None)
            if fallback is None: raise RuntimeError(f"Could not load {DATASET_ID} and no local CSV/Parquet fallback exists: {exc}") from exc
            df = pd.read_csv(fallback) if fallback.suffix.lower() == ".csv" else pd.read_parquet(fallback)
            source = str(fallback.resolve())
    required = {"instruction", "intent", "category"}
    missing = required - set(df.columns)
    if missing: raise ValueError(f"Dataset missing required columns: {sorted(missing)}; found {list(df.columns)}")
    original = len(df)
    d = df[["instruction", "intent", "category"]].copy()
    d["instruction"] = d.instruction.fillna("").map(_normalize)
    d["intent"] = d.intent.fillna("").map(_normalize)
    d["category"] = d.category.fillna("").map(_normalize)
    empty_text = int(d.instruction.eq("").sum())
    missing_target = int((d.intent.eq("") | d.category.eq("")).sum())
    d = d[(d.instruction != "") & (d.intent != "") & (d.category != "")]
    duplicates = int(d.duplicated("instruction", keep="first").sum())
    d = d.drop_duplicates("instruction", keep="first").reset_index(drop=True)
    mapping = d.groupby("intent").category.nunique()
    if (mapping > 1).any(): raise ValueError(f"Some intents map to multiple categories: {mapping[mapping > 1].to_dict()}")
    summary = {"source": source, "source_rows": original, "usable_rows": len(d), "removed_empty_text": empty_text, "removed_missing_target": missing_target, "removed_duplicate_text": duplicates, "intent_count": int(d.intent.nunique()), "category_count": int(d.category.nunique()), "class_distribution": d.intent.value_counts().sort_index().to_dict(), "columns_found": list(df.columns), "input_feature": "instruction", "target": "intent", "excluded_columns": [c for c in ("response", "flags") if c in df.columns]}
    return d, summary

def create_splits(df, seed=SEED):
    """Create 70/15/15 stratified splits; rare classes fall back to deterministic random split."""
    counts = df.intent.value_counts()
    stratify = df.intent if counts.min() >= 3 else None
    try:
        train, temp = train_test_split(df, test_size=.30, random_state=seed, stratify=stratify)
        temp_counts = temp.intent.value_counts()
        temp_stratify = temp.intent if temp_counts.min() >= 2 else None
        valid, test = train_test_split(temp, test_size=.5, random_state=seed, stratify=temp_stratify)
    except ValueError:
        train, temp = train_test_split(df, test_size=.30, random_state=seed)
        valid, test = train_test_split(temp, test_size=.5, random_state=seed)
    assert not (set(train.instruction) & set(valid.instruction) or set(train.instruction) & set(test.instruction) or set(valid.instruction) & set(test.instruction))
    return train.reset_index(drop=True), valid.reset_index(drop=True), test.reset_index(drop=True)

def save_processed(df, summary):
    out = DATA_DIR / "processed"
    out.mkdir(parents=True, exist_ok=True)
    train, valid, test = create_splits(df)
    for name, part in (("train", train), ("validation", valid), ("test", test)):
        part.to_csv(out / f"{name}.csv", index=False)
    summary["split_sizes"] = {"train": len(train), "validation": len(valid), "test": len(test)}
    (out / "data_quality.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return train, valid, test

if __name__ == "__main__":
    frame, quality = load_dataset()
    train, validation, test = save_processed(frame, quality)
    print(json.dumps({**quality, "split_sizes": {"train": len(train), "validation": len(validation), "test": len(test)}}, indent=2))
