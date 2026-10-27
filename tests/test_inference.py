import numpy as np
import pytest
from backend.inference import InferenceEngine

class FakeModel:
    def predict(self,texts,verbose=0):return np.tile([.7,.2,.1],(len(texts),1))

def test_prediction_shape_and_stable_mapping():
    mapping={'labels':['a','b','c'],'category_by_intent':{'a':'A','b':'B','c':'C'}}
    engine=InferenceEngine(FakeModel(),mapping)
    one=engine.predict('hello')
    assert one['predicted_intent']=='a' and one['predicted_category']=='A'
    assert len(one['top_predictions'])==3
    assert engine.predict_many(['one','two'])[1]['confidence']==pytest.approx(.7)

def test_missing_artifacts(tmp_path):
    with pytest.raises(FileNotFoundError):InferenceEngine.load(tmp_path/'none.keras',tmp_path/'none.json')

def test_real_model_integration():
    from backend.config import MODEL_PATH, LABEL_PATH
    if not MODEL_PATH.exists() or not LABEL_PATH.exists():
        pytest.skip("Trained model artifacts not present")
    engine = InferenceEngine.load()
    res = engine.predict("I cannot log in to my account")
    assert "predicted_intent" in res
    assert "predicted_category" in res
    assert 0.0 <= res["confidence"] <= 1.0
    assert len(res["top_predictions"]) == 3
    batch = engine.predict_many(["Where is my order?", "Can I get a refund?"])
    assert len(batch) == 2
    assert batch[0]["predicted_intent"] in engine.labels

\n