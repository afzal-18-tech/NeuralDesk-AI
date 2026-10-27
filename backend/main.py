"""NeuralDesk REST API."""
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.config import METRICS_PATH, REPORT_DIR
from backend.inference import InferenceEngine
from backend.schemas import TicketRequest, BatchRequest

@asynccontextmanager
async def lifespan(app):
    try:
        app.state.engine = InferenceEngine.load()
        app.state.model_error = None
    except Exception as exc:
        app.state.engine = None
        app.state.model_error = str(exc)
    app.state.processed = 0
    yield

app = FastAPI(title="NeuralDesk API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["*"])

def _engine():
    engine = getattr(app.state, "engine", None)
    if engine is None: raise HTTPException(status_code=503, detail={"error": "model_unavailable", "message": getattr(app.state, "model_error", "Model has not loaded")})
    return engine

@app.get("/health")
def health():
    loaded = getattr(app.state, "engine", None) is not None
    return {"status": "ok", "model_loaded": loaded, "model_error": None if loaded else getattr(app.state, "model_error", "Model not loaded"), "session_tickets_classified": getattr(app.state, "processed", 0)}

@app.post("/predict")
def predict(request: TicketRequest):
    result = _engine().predict(request.text); app.state.processed += 1
    return result

@app.post("/predict/batch")
def predict_batch(request: BatchRequest):
    results = _engine().predict_many(request.texts); app.state.processed += len(results)
    return {"results": [{"index": i, "result": row} for i, row in enumerate(results)], "count": len(results)}

@app.get("/metrics")
def metrics():
    saved = json.loads(METRICS_PATH.read_text(encoding="utf-8")) if METRICS_PATH.exists() else None
    report_file = REPORT_DIR / "classification_report.json"
    report = json.loads(report_file.read_text(encoding="utf-8")) if report_file.exists() else None
    cm_file = REPORT_DIR / "confusion_matrix.png"
    return {
        "offline_test_metrics": saved,
        "classification_report": report,
        "has_confusion_matrix": cm_file.exists(),
        "session_tickets_classified": getattr(app.state, "processed", 0)
    }

@app.get("/metrics/confusion-matrix")
def confusion_matrix_image():
    cm_path = REPORT_DIR / "confusion_matrix.png"
    if not cm_path.exists():
        raise HTTPException(status_code=404, detail="Confusion matrix not generated")
    return FileResponse(cm_path, media_type="image/png")

\n