"""Shared configuration for training and serving."""
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_DIR = Path(os.getenv("NEURALDESK_ARTIFACT_DIR", ROOT / "backend" / "artifacts"))
DATA_DIR = Path(os.getenv("NEURALDESK_DATA_DIR", ROOT / "data"))
REPORT_DIR = Path(os.getenv("NEURALDESK_REPORT_DIR", ROOT / "reports"))
MODEL_PATH = ARTIFACT_DIR / "neuraldesk_model.keras"
LABEL_PATH = ARTIFACT_DIR / "label_mapping.json"
METRICS_PATH = REPORT_DIR / "metrics.json"
SEED = int(os.getenv("NEURALDESK_SEED", "42"))
MAX_TEXT_LENGTH = int(os.getenv("NEURALDESK_MAX_TEXT_LENGTH", "5000"))
MAX_BATCH_SIZE = int(os.getenv("NEURALDESK_MAX_BATCH_SIZE", "500"))
DATASET_ID = "bitext/Bitext-customer-support-llm-chatbot-training-dataset"
