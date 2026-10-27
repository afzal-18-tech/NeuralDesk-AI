import React, { useState } from 'react';
import { predict } from '../services/api.js';
import PredictionResult from './PredictionResult.jsx';

const EXAMPLES = [
  'Where is my recent order? It shows pending',
  'I need to reset the password for my user account',
  'How can I get a refund for my last invoice?',
  'I want to speak with a human customer service agent',
];

export default function TicketForm({ onClassified }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!text.trim()) {
      setError('Enter a ticket message first.');
      return;
    }
    setBusy(true);
    try {
      const r = await predict(text.trim());
      setResult(r);
      onClassified?.(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="ticket-text">Ticket message</label>
      <textarea
        id="ticket-text"
        value={text}
        maxLength={5000}
        onChange={e => setText(e.target.value)}
        placeholder="Describe the customer's issue in their own words…"
      />
      <div className="form-foot">
        <span>{text.length} / 5000</span>
        <button className="primary" disabled={busy} type="submit">
          {busy ? 'Analyzing…' : 'Classify ticket'} <span>↗</span>
        </button>
      </div>
      <div className="examples">
        <span>Try an example</span>
        {EXAMPLES.map(x => (
          <button type="button" key={x} onClick={() => setText(x)}>
            {x}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      <PredictionResult result={result} />
    </form>
  );
}
