import React, { useState } from 'react';
import { getConfusionMatrixUrl } from '../services/api.js';

export default function ModelDiagnostics({ report = null, hasConfusionMatrix = true }) {
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState('per-class');

  if (!report && !hasConfusionMatrix) return null;

  // Extract class entries excluding aggregate summary keys
  const classEntries = report
    ? Object.entries(report)
        .filter(([key]) => !['accuracy', 'macro avg', 'weighted avg'].includes(key))
        .map(([intent, data]) => ({
          intent,
          display: intent.replaceAll('_', ' '),
          precision: data.precision,
          recall: data.recall,
          f1: data['f1-score'],
          support: data.support,
        }))
        .filter(item => {
          if (!filter.trim()) return true;
          return item.display.toLowerCase().includes(filter.toLowerCase());
        })
        .sort((a, b) => b.f1 - a.f1)
    : [];

  return (
    <details className="diagnostics-accordion">
      <summary className="diagnostics-summary">
        <div>
          <span className="eyebrow">OFFLINE MODEL VERIFICATION</span>
          <h3>🔬 Deep Model Diagnostics & Confusion Matrix</h3>
        </div>
        <span className="toggle-label">Expand Details ▾</span>
      </summary>

      <div className="diagnostics-body">
        <div className="diagnostics-nav">
          <button
            type="button"
            className={`diag-tab ${activeTab === 'per-class' ? 'active' : ''}`}
            onClick={() => setActiveTab('per-class')}
          >
            Per-Class Metrics ({classEntries.length} Classes)
          </button>
          <button
            type="button"
            className={`diag-tab ${activeTab === 'confusion-matrix' ? 'active' : ''}`}
            onClick={() => setActiveTab('confusion-matrix')}
          >
            Confusion Matrix (Held-out Test)
          </button>
        </div>

        {activeTab === 'per-class' && (
          <div className="per-class-view">
            <div className="per-class-head">
              <input
                type="search"
                placeholder="Search intent class (e.g. refund, password, order)…"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="diag-search"
              />
              <span className="diag-note">Held-out test split (3,684 tickets)</span>
            </div>

            <div className="table-wrap diag-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Intent Class</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1-Score</th>
                    <th>Test Samples</th>
                  </tr>
                </thead>
                <tbody>
                  {classEntries.map(item => (
                    <tr key={item.intent}>
                      <td>
                        <b>{item.display}</b>
                        <small className="mono-sub">{item.intent}</small>
                      </td>
                      <td>{(item.precision * 100).toFixed(1)}%</td>
                      <td>{(item.recall * 100).toFixed(1)}%</td>
                      <td>
                        <strong className="f1-highlight">{(item.f1 * 100).toFixed(1)}%</strong>
                      </td>
                      <td>{item.support}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'confusion-matrix' && (
          <div className="cm-view">
            <p className="cm-desc">
              Held-out test set confusion matrix (27 classes vs 27 predictions). Diagonal cells indicate correct classifications.
            </p>
            <div className="cm-img-wrap">
              <img
                src={getConfusionMatrixUrl()}
                alt="NeuralDesk Held-Out Confusion Matrix"
                className="cm-image"
                loading="lazy"
              />
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
