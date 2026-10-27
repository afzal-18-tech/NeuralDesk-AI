# Implementation log

- Inspected initially empty workspace; no existing files or Git repository were present.
- Initialized a new local `main` branch. Git's ownership safety check requires a one-command `safe.directory` override for status in this sandbox account; no global Git configuration was changed.
- Initial environment: Python 3.14.6 only (`py -0p` reported no installed distributions), Node 24.16.0, npm 11.13.0. Installed Python 3.11.15 with `uv` and created the project `.venv`.
- Reviewed the live Hugging Face dataset card on 2026-10-26: viewer reports 26.9k rows, 27 intent values, 11 category values, and CDLA-Sharing-1.0. Source GitHub readme documents 26,872 pairs and 10 categories, so code derives actual values from the resolved dataset.
- Added modular loader, BiLSTM training/evaluation, inference and FastAPI implementation; React dashboard with single and CSV batch classification; initial backend/frontend tests and user documentation.
- Acquired the Hugging Face dataset with Python 3.11.15. The loader found 26,872 source rows, retained 24,554 after exact-text deduplication, and saved disjoint 70/15/15 splits (17,187/3,683/3,684; 27 intents and 11 categories). No empty or missing-target rows were found. The Hugging Face cache is stored in the user's standard cache directory; machine-specific absolute paths are not recorded here.
- Pinned PyArrow to 19.0.1 after the initial latest-PyArrow install required NumPy 2 and conflicted with TensorFlow 2.16.1's NumPy 1.x requirement. Moved the HF datasets cache to the short per-user cache path to avoid Windows MAX_PATH lock errors.
- Installed the non-TensorFlow backend dependencies and ran `.venv\\Scripts\\python.exe -m pytest`: 8 passed on Python 3.11.15.
- Resolved the 359.5 MiB TensorFlow wheel download stalling issue caused by network socket timeouts on large payloads. Implemented a robust, resumable downloader script with HTTP Range header chunking, 10-second socket timeout, and automatic 2-second reconnect (`tools/download_wheel.py`). Downloaded the complete wheel (`tensorflow_intel-2.16.1-cp311-cp311-win_amd64.whl`, 376,955,589 bytes) and installed it along with `tensorflow==2.16.1` via `uv pip install`.
- Configured `matplotlib.use("Agg")` in `backend/evaluate_model.py` for headless execution.
- Trained the full 27-class Bidirectional LSTM on 17,187 training rows for 5 epochs. Reached `val_accuracy: 0.9889` and `val_loss: 0.0462`.
- Saved model artifacts in `backend/artifacts/`: `neuraldesk_model.keras` (16.4 MB), `label_mapping.json`, `model_metadata.json`, and `training_history.json`.
- Evaluated the model on the held-out test split of 3,684 tickets: accuracy = 98.78%, macro precision = 98.77%, macro recall = 98.71%, macro F1 = 98.73%, weighted F1 = 98.78%. Generated `reports/metrics.json`, `reports/classification_report.json`, `reports/confusion_matrix.png`, `reports/confusion_matrix.csv`, `reports/training_history.png`, and `reports/evaluation_summary.md`.
- Fixed Keras 3 string input compatibility in `backend/inference.py`: replaced `dtype=str` with `dtype=object` in `np.asarray(texts, dtype=object)` to prevent `ValueError: Invalid dtype: str1056`.
- Resolved OneDrive filesystem lock collision on `.pytest-tmp` and `.pytest_cache` by updating `pytest.ini` with `-p no:cacheprovider`, directing pytest temporary directories to `%TEMP%`.
- Added end-to-end integration tests using the real trained model and live FastAPI endpoints to `tests/test_inference.py` and `tests/test_api.py`. Ran full pytest suite: 10/10 tests passed.
- Ran frontend test suite (`npm.cmd test`): 7/7 vitest tests passed. Verified production bundle build (`npm.cmd run build`): succeeded.
- Created `data/samples/sample_tickets.csv` for out-of-the-box batch classification testing.
- Launched FastAPI backend (`uvicorn`) on port 8000 and Vite development server on port 5173.
- Verified live API endpoints: `/health` (model_loaded: true), `/metrics` (returns saved offline metrics), `/predict` (single ticket classification with top 3 alternatives), `/predict/batch` (batch ticket processing with index preservation).
- Performed end-to-end browser testing using the browser agent: verified dashboard rendering, offline metrics display, sample prompt selection, live single-ticket classification, category and confidence visualization, and session analytics updating. Captured and saved screenshot to `docs/dashboard_screenshot.png`.
- Investigated the login message intent prediction: Bitext contains no generic `login` or `login_issue` intent; account-related queries are split among `create_account`, `edit_account`, `delete_account`, `switch_account`, `recover_password`, and `registration_problems`. The tokens "log in" / "login" do not appear in the training corpus. Queries like "cannot ... account" without "password" keywords distribute probability across account classes (primarily `switch_account` and `delete_account`), whereas queries mentioning credentials properly resolve to `recover_password` with high confidence.
- Implemented real-time Navbar health indicator connected directly to `GET /health` (`BiLSTM Online · Port 8000`).
- Implemented uncertainty safeguards: added `is_uncertain` flag when confidence < 65% or top-two margin < 15%. Renders prominent `⚠️ Manual Review Recommended` warnings and badges in single prediction results and batch tables.
- Enhanced batch processing: added multi-column sorting (Row, Ticket, Intent, Category, Confidence), live text search, review-only filter chips, and enriched CSV export with review status and top alternatives.
- Created collapsible `ModelDiagnostics` component (`frontend/src/components/ModelDiagnostics.jsx`) with live confusion matrix plot and interactive per-class precision/recall/F1 table across all 27 intent classes.
- Compacted hero section and curated 4 high-quality example prompts that directly map to verified dataset classes.

\n