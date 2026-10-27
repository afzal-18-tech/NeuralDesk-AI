"""Held-out evaluation and report generation."""
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report, confusion_matrix
from backend.config import REPORT_DIR, DATA_DIR

def evaluate(model=None, labels=None, category_by_intent=None, test_frame=None, history=None):
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    if model is None:
        import tensorflow as tf
        from backend.config import MODEL_PATH, LABEL_PATH
        if not MODEL_PATH.exists(): raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
        model = tf.keras.models.load_model(MODEL_PATH)
        mapping = json.loads(LABEL_PATH.read_text(encoding="utf-8")); labels = mapping["labels"]
        test_frame = __import__("pandas").read_csv(DATA_DIR / "processed" / "test.csv")
        history_path = MODEL_PATH.parent / "training_history.json"
        history = json.loads(history_path.read_text(encoding="utf-8")) if history_path.exists() else {}
    ids = {name: i for i, name in enumerate(labels)}
    y_true = test_frame.intent.map(ids).to_numpy()
    probs = model.predict(test_frame.instruction.to_numpy(), verbose=0)
    y_pred = np.argmax(probs, axis=1)
    p, r, f, _ = precision_recall_fscore_support(y_true, y_pred, labels=np.arange(len(labels)), zero_division=0)
    report = classification_report(y_true, y_pred, labels=np.arange(len(labels)), target_names=labels, output_dict=True, zero_division=0)
    metrics = {"accuracy": float(accuracy_score(y_true, y_pred)), "macro_precision": float(p.mean()), "macro_recall": float(r.mean()), "macro_f1": float(f.mean()), "weighted_f1": float(precision_recall_fscore_support(y_true, y_pred, average="weighted", zero_division=0)[2]), "test_rows": len(test_frame), "class_count": len(labels), "metric_source": "held-out test set", "confidence_note": "Scores are model outputs, not calibrated probabilities."}
    (REPORT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (REPORT_DIR / "classification_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    np.savetxt(REPORT_DIR / "confusion_matrix.csv", confusion_matrix(y_true, y_pred, labels=np.arange(len(labels))), delimiter=",", fmt="%d")
    fig, ax = plt.subplots(figsize=(max(10, len(labels)*.45), max(8, len(labels)*.4)))
    matrix = confusion_matrix(y_true, y_pred, labels=np.arange(len(labels)))
    ax.imshow(matrix, cmap="Blues"); ax.set(xticks=range(len(labels)), yticks=range(len(labels)), xticklabels=labels, yticklabels=labels, xlabel="Predicted", ylabel="Actual", title="Held-out test confusion matrix")
    plt.setp(ax.get_xticklabels(), rotation=90); fig.tight_layout(); fig.savefig(REPORT_DIR / "confusion_matrix.png", dpi=160); plt.close(fig)
    if history:
        fig, axes = plt.subplots(1, 2, figsize=(10, 4))
        for metric, ax in zip(("loss", "accuracy"), axes):
            for key in (metric, "val_" + metric):
                if key in history: ax.plot(history[key], label=key)
            ax.set_title(metric.title()); ax.set_xlabel("Epoch"); ax.legend()
        fig.tight_layout(); fig.savefig(REPORT_DIR / "training_history.png", dpi=160); plt.close(fig)
    summary = "# Held-out evaluation\n\n" + "\n".join(f"- **{k.replace('_',' ').title()}:** {v:.4f}" for k,v in metrics.items() if isinstance(v,float)) + f"\n- Test rows: {len(test_frame)}\n- Classes: {len(labels)}\n\nThese measurements describe performance on a held-out split of synthetic Bitext text. They do not establish performance on real support tickets. Model scores are not calibrated probabilities.\n"
    (REPORT_DIR / "evaluation_summary.md").write_text(summary, encoding="utf-8")
    return metrics

if __name__ == "__main__": print(json.dumps(evaluate(), indent=2))
