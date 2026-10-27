# Architecture

```mermaid
flowchart LR
  CSV[Hugging Face dataset or local CSV/Parquet] --> Clean[Schema validation, normalization, deduplication]
  Clean --> Split[Seeded 70/15/15 disjoint splits]
  Split --> Train[Training-only TextVectorization + BiLSTM]
  Train --> Artifacts[.keras model + label/category mapping]
  Artifacts --> API[FastAPI inference service]
  API --> UI[React dashboard]
  API --> Metrics[Held-out test reports]
  UI --> API
```

Training and API inference are separate. The input feature is `instruction`; intent is the label and category is derived from a validated one-to-one mapping. The model owns its TextVectorization layer. API startup reports a missing or unloadable model and returns HTTP 503 on prediction requests.
