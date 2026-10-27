"""Model loading and prediction functions independent of FastAPI."""
import json
from pathlib import Path
import numpy as np
from backend.config import MODEL_PATH, LABEL_PATH

class InferenceEngine:
    def __init__(self, model, mapping):
        self.model = model
        self.labels = mapping["labels"]
        self.category_by_intent = mapping["category_by_intent"]
    @classmethod
    def load(cls, model_path=MODEL_PATH, label_path=LABEL_PATH):
        model_path, label_path = Path(model_path), Path(label_path)
        if not model_path.exists() or not label_path.exists(): raise FileNotFoundError("Trained model artifacts are missing. Train with `python -m backend.train_model`.")
        import tensorflow as tf
        return cls(tf.keras.models.load_model(model_path), json.loads(label_path.read_text(encoding="utf-8")))
    def predict_many(self, texts):
        scores = np.asarray(self.model.predict(np.asarray(texts, dtype=object), verbose=0))
        results = []
        for row in scores:
            order = np.argsort(row)[::-1][:3]
            best = self.labels[int(order[0])]
            top_score = float(row[order[0]])
            second_score = float(row[order[1]]) if len(order) > 1 else 0.0
            is_uncertain = bool(top_score < 0.65 or (top_score - second_score) < 0.15)
            results.append({"predicted_intent": best, "predicted_category": self.category_by_intent[best], "confidence": top_score, "is_uncertain": is_uncertain, "top_predictions": [{"label": self.labels[int(i)], "category": self.category_by_intent[self.labels[int(i)]], "score": float(row[i])} for i in order]})
        return results
    def predict(self, text): return self.predict_many([text])[0]
