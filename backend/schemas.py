from pydantic import BaseModel, Field, field_validator
from backend.config import MAX_TEXT_LENGTH, MAX_BATCH_SIZE

class TicketRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=MAX_TEXT_LENGTH)
    @field_validator("text")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("text must contain non-whitespace characters")
        return value.strip()

class BatchRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=MAX_BATCH_SIZE)
    @field_validator("texts")
    @classmethod
    def valid_texts(cls, values):
        for i, value in enumerate(values):
            if not value.strip() or len(value) > MAX_TEXT_LENGTH:
                raise ValueError(f"texts[{i}] must be non-empty and at most {MAX_TEXT_LENGTH} characters")
        return [v.strip() for v in values]

class Prediction(BaseModel):
    label: str
    category: str
    score: float

class TicketResult(BaseModel):
    predicted_intent: str
    predicted_category: str
    confidence: float
    top_predictions: list[Prediction]
    is_uncertain: bool = False

class BatchResult(BaseModel):
    index: int
    result: TicketResult
