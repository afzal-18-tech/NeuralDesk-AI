from fastapi.testclient import TestClient
from backend.main import app
from backend.inference import InferenceEngine
import numpy as np

class FakeModel:
    def predict(self,texts,verbose=0):return np.tile([.8,.2],(len(texts),1))

def setup_engine(monkeypatch):
    monkeypatch.setattr(InferenceEngine,'load',classmethod(lambda cls: InferenceEngine(FakeModel(),{'labels':['login','billing'],'category_by_intent':{'login':'ACCOUNT','billing':'PAYMENT'}})))

def test_health_and_predictions(monkeypatch):
    setup_engine(monkeypatch)
    with TestClient(app) as client:
        assert client.get('/health').json()['model_loaded']
        one=client.post('/predict',json={'text':'cannot log in'})
        assert one.status_code==200 and one.json()['predicted_category']=='ACCOUNT'
        batch=client.post('/predict/batch',json={'texts':['one','two']})
        assert batch.status_code==200 and batch.json()['count']==2

def test_invalid_and_unavailable(monkeypatch):
    setup_engine(monkeypatch)
    with TestClient(app) as client:
        assert client.post('/predict',json={'text':' '}).status_code==422
        assert client.post('/predict/batch',json={'texts':[]}).status_code==422
        app.state.engine=None;app.state.model_error='missing'
        assert client.post('/predict',json={'text':'hi'}).status_code==503

def test_metrics_endpoint(monkeypatch,tmp_path):
    setup_engine(monkeypatch)
    from backend import main
    monkeypatch.setattr(main,'METRICS_PATH',tmp_path/'metrics.json')
    with TestClient(app) as client:
        assert client.get('/metrics').json()['offline_test_metrics'] is None
        (tmp_path/'metrics.json').write_text('{"accuracy":0.95,"macro_f1":0.94}',encoding='utf-8')
        app.state.processed=3
        res=client.get('/metrics').json()
        assert res['offline_test_metrics']['accuracy']==0.95
        assert res['session_tickets_classified']==3

def test_real_api_integration():
    from backend.config import MODEL_PATH, LABEL_PATH
    import pytest
    if not MODEL_PATH.exists() or not LABEL_PATH.exists():
        pytest.skip("Trained model artifacts not present")
    with TestClient(app) as client:
        health = client.get('/health').json()
        assert health['status'] == 'ok'
        assert health['model_loaded'] is True
        pred = client.post('/predict', json={'text': 'I need help resetting my password'})
        assert pred.status_code == 200
        data = pred.json()
        assert 'predicted_intent' in data
        assert 'predicted_category' in data
        assert len(data['top_predictions']) == 3
        batch = client.post('/predict/batch', json={'texts': ['Where is my delivery?', 'Cancel my order please']})
        assert batch.status_code == 200
        assert batch.json()['count'] == 2

\n