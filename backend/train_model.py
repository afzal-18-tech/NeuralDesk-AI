"""Train the NeuralDesk BiLSTM; run with `python -m backend.train_model`."""
import json, os, random
from datetime import datetime, timezone
import numpy as np
import tensorflow as tf
from backend.config import ARTIFACT_DIR, DATA_DIR, DATASET_ID, SEED
from backend.data_loader import load_dataset, save_processed

CFG = {"vocabulary_size": int(os.getenv("NEURALDESK_VOCABULARY_SIZE", "20000")), "sequence_length": int(os.getenv("NEURALDESK_SEQUENCE_LENGTH", "80")), "embedding_dim": int(os.getenv("NEURALDESK_EMBEDDING_DIM", "64")), "lstm_units": int(os.getenv("NEURALDESK_LSTM_UNITS", "64")), "dropout": float(os.getenv("NEURALDESK_DROPOUT", "0.3")), "batch_size": int(os.getenv("NEURALDESK_BATCH_SIZE", "32")), "epochs": int(os.getenv("NEURALDESK_EPOCHS", "5"))}

def main():
    random.seed(SEED); np.random.seed(SEED); tf.keras.utils.set_random_seed(SEED)
    df, summary = load_dataset()
    train, valid, test = save_processed(df, summary)
    labels = sorted(df.intent.unique().tolist())
    label_to_id = {label: i for i, label in enumerate(labels)}
    category_by_intent = df.drop_duplicates("intent").set_index("intent").category.to_dict()
    y_train = train.intent.map(label_to_id).to_numpy(); y_valid = valid.intent.map(label_to_id).to_numpy()
    vectorizer = tf.keras.layers.TextVectorization(max_tokens=CFG["vocabulary_size"], output_mode="int", output_sequence_length=CFG["sequence_length"])
    vectorizer.adapt(tf.data.Dataset.from_tensor_slices(train.instruction.to_numpy()).batch(256))
    inputs = tf.keras.Input(shape=(), dtype=tf.string, name="text")
    x = vectorizer(inputs)
    x = tf.keras.layers.Embedding(CFG["vocabulary_size"], CFG["embedding_dim"], mask_zero=True)(x)
    x = tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(CFG["lstm_units"]))(x)
    x = tf.keras.layers.Dropout(CFG["dropout"])(x)
    x = tf.keras.layers.Dense(64, activation="relu")(x)
    outputs = tf.keras.layers.Dense(len(labels), activation="softmax")(x)
    model = tf.keras.Model(inputs, outputs, name="neuraldesk_bilstm")
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    history = model.fit(train.instruction.to_numpy(), y_train, validation_data=(valid.instruction.to_numpy(), y_valid), batch_size=CFG["batch_size"], epochs=CFG["epochs"], callbacks=[tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=2, restore_best_weights=True)])
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    model.save(ARTIFACT_DIR / "neuraldesk_model.keras")
    (ARTIFACT_DIR / "label_mapping.json").write_text(json.dumps({"labels": labels, "label_to_id": label_to_id, "category_by_intent": category_by_intent}, indent=2), encoding="utf-8")
    metadata = {"architecture": "TextVectorization -> Embedding -> Bidirectional LSTM -> Dropout -> Dense(ReLU) -> Dense(softmax)", "dataset_source": DATASET_ID, "target_column": "intent", "class_labels": labels, "seed": SEED, "training_configuration": CFG, "training_date_utc": datetime.now(timezone.utc).isoformat(), "selected_validation_metric": "val_loss", "best_validation_loss": float(min(history.history["val_loss"])), "tensorflow_version": tf.__version__, "dataset_summary": summary, "split_sizes": {"train": len(train), "validation": len(valid), "test": len(test)}}
    (ARTIFACT_DIR / "model_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (ARTIFACT_DIR / "training_history.json").write_text(json.dumps({k: [float(v) for v in values] for k, values in history.history.items()}, indent=2), encoding="utf-8")
    from backend.evaluate_model import evaluate
    evaluate(model=model, labels=labels, category_by_intent=category_by_intent, test_frame=test, history=history.history)
    print(f"Trained {len(labels)}-class model on {len(train)} rows; artifacts: {ARTIFACT_DIR}")

if __name__ == "__main__": main()
