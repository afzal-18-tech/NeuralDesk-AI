# Model artifacts

`python -m backend.train_model` writes `neuraldesk_model.keras`, `label_mapping.json`, `model_metadata.json`, and training history here after successful training. The model embeds its `TextVectorization` layer. Generated model artifacts are intentionally excluded from Git; run the training command after cloning to create local artifacts.
