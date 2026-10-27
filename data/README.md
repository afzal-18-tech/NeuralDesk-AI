# Dataset

NeuralDesk loads `bitext/Bitext-customer-support-llm-chatbot-training-dataset` through Hugging Face `datasets` and caches it in the user's Hugging Face cache (`~/.cache/huggingface/datasets` by default). Override the location with `HF_DATASETS_CACHE`. A local `.csv` or `.parquet` file in `data/raw/` is supported as a fallback. The expected source fields are `instruction`, `intent`, and `category`; `response` and `flags` are excluded from predictive input. The source is synthetically expanded support text, not verified real customer tickets.

The dataset is licensed CDLA-Sharing-1.0. Attribute Bitext and review the [dataset card](https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset) and [license](https://github.com/bitext/customer-support-llm-chatbot-training-dataset/blob/main/LICENSE.txt) before redistributing any data. NeuralDesk does not bundle the raw dataset.

Generated processed splits and quality summaries are local and ignored by Git.
