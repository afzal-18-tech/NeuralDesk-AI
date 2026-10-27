import React from 'react';
import TopPredictions from './TopPredictions.jsx';

export default function PredictionResult({ result }) {
  if (!result) return null;
  const isUncertain = result.is_uncertain || result.confidence < 0.65;
  const scorePercent = (result.confidence * 100).toFixed(1);

  return (
    <section className="result">
      <div className="result-heading">
        <div>
          <span className="eyebrow">MODEL SUGGESTION</span>
          <h3>{result.predicted_intent.replaceAll('_', ' ')}</h3>
        </div>
        <div className={`confidence ${isUncertain ? 'confidence-uncertain' : 'confidence-high'}`}>
          {scorePercent}%
          <small>{isUncertain ? 'uncertain' : 'model score'}</small>
        </div>
      </div>

      <div className="result-tags">
        <span className="category-pill">Category: <b>{result.predicted_category}</b></span>
        {isUncertain ? (
          <span className="uncertain-pill">⚠️ Manual Review Recommended</span>
        ) : (
          <span className="ready-pill">✓ Auto-Triage Ready</span>
        )}
      </div>

      {isUncertain && (
        <div className="uncertain-box" role="status">
          <strong>⚠️ Low Confidence Warning</strong>
          <p>
            Model confidence ({scorePercent}%) is below the certainty threshold (65%).
            Review the alternative predictions below before taking action.
          </p>
        </div>
      )}

      <TopPredictions items={result.top_predictions} />
      <small className="disclaimer">Prediction supports triage; confirm decisions with your support team.</small>
    </section>
  );
}
