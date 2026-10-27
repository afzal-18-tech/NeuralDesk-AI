import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import MetricCard from '../components/MetricCard.jsx';
import TicketForm from '../components/TicketForm.jsx';
import BatchUpload from '../components/BatchUpload.jsx';
import AnalyticsCharts from '../components/AnalyticsCharts.jsx';
import ModelDiagnostics from '../components/ModelDiagnostics.jsx';
import { getMetrics } from '../services/api.js';

export default function Dashboard() {
  const [count, setCount] = useState(0);
  const [predictions, setPredictions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [classificationReport, setClassificationReport] = useState(null);
  const [hasConfusionMatrix, setHasConfusionMatrix] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    getMetrics()
      .then(data => {
        setMetrics(data.offline_test_metrics);
        setClassificationReport(data.classification_report);
        setHasConfusionMatrix(Boolean(data.has_confusion_matrix));
      })
      .catch(error => setApiError(error.message));
  }, []);

  const addPrediction = result => {
    setCount(current => current + 1);
    setPredictions(current => [...current, result]);
  };

  const addBatch = results => {
    setCount(current => current + results.length);
    setPredictions(current => [...current, ...results]);
  };

  const categories = useMemo(() => {
    const counts = predictions.reduce(
      (acc, item) => ({ ...acc, [item.predicted_category]: (acc[item.predicted_category] || 0) + 1 }),
      {}
    );
    return Object.entries(counts).map(([name, value]) => ({ name, count: value }));
  }, [predictions]);

  const intents = useMemo(() => {
    const counts = predictions.reduce(
      (acc, item) => ({ ...acc, [item.predicted_intent]: (acc[item.predicted_intent] || 0) + 1 }),
      {}
    );
    return Object.entries(counts)
      .map(([name, value]) => ({ name, count: value }))
      .sort((a, b) => b.count - a.count);
  }, [predictions]);

  return (
    <>
      <Navbar />
      <main id="top">
        <section className="hero-compact">
          <div className="hero-content">
            <span className="eyebrow">AI-POWERED TICKET INTELLIGENCE</span>
            <h1>Every ticket, <em>understood in seconds.</em></h1>
            <p>
              Automate customer support ticket triage with a 27-class Bidirectional LSTM.
              Predict intent, category, and confidence scores with manual review safeguards.
            </p>
          </div>
          <div className="hero-badge-strip">
            <div className="hero-pill">
              <span className="pill-dot" /> 27 Intent Classes
            </div>
            <div className="hero-pill">
              <span className="pill-dot pill-blue" /> 11 Categories
            </div>
            <div className="hero-pill">
              <span className="pill-dot pill-purple" /> BiLSTM Neural Engine
            </div>
          </div>
        </section>

        {apiError && <div className="banner" role="status">{apiError}</div>}

        <section className="metrics-grid">
          <MetricCard
            label="Classified this session"
            value={count}
            note="Single & batch tickets processed"
          />
          <MetricCard
            label="Top predicted intent"
            value={intents[0]?.name.replaceAll('_', ' ') || '—'}
            note="Based on session stream"
          />
          <MetricCard
            label="Test accuracy"
            value={metrics ? `${(metrics.accuracy * 100).toFixed(1)}%` : '—'}
            note="Held-out evaluation (3,684 tickets)"
          />
          <MetricCard
            label="Macro F1-Score"
            value={metrics ? metrics.macro_f1.toFixed(3) : '—'}
            note="Unweighted across 27 classes"
          />
        </section>

        <section className="work-grid">
          <article className="panel classify-panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">01 / SINGLE TICKET</span>
                <h2>Classify a ticket</h2>
              </div>
              <span className="step-icon">⌁</span>
            </div>
            <TicketForm onClassified={addPrediction} />
          </article>

          <article className="panel batch-panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">02 / BATCH WORKFLOW</span>
                <h2>Upload ticket CSV</h2>
              </div>
              <span className="step-icon">▤</span>
            </div>
            <BatchUpload onResults={addBatch} />
          </article>
        </section>

        <section className="panel analytics-panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">03 / SESSION ANALYTICS</span>
              <h2>Live Distribution Overview</h2>
            </div>
            <span className="muted">{count} tickets classified</span>
          </div>
          <AnalyticsCharts categories={categories} intents={intents} metrics={metrics} />
        </section>

        <section className="panel diagnostics-panel-wrap">
          <ModelDiagnostics
            report={classificationReport}
            hasConfusionMatrix={hasConfusionMatrix}
          />
        </section>

        <footer>
          NeuralDesk · Predictions assist ticket triage and should not make consequential customer-service decisions automatically.
        </footer>
      </main>
    </>
  );
}
