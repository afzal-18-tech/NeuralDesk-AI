import React, { useState } from 'react';
import { predictBatch } from '../services/api.js';
import BatchResultsTable from './BatchResultsTable.jsx';

export function parseCSV(text) {
  const records = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      row.push(cell); cell = '';
      if (row.some(value => value.trim())) records.push(row);
      row = [];
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else cell += c;
  }
  if (quoted) throw Error('CSV has an unclosed quoted field.');
  row.push(cell);
  if (row.some(value => value.trim())) records.push(row);
  if (!records.length) throw Error('CSV is empty.');
  const headers = records[0].map((value, i) => (i === 0 ? value.replace(/^\uFEFF/, '') : value).trim());
  const textIndex = headers.findIndex(value => ['text', 'instruction', 'ticket', 'message', 'subject'].includes(value.toLowerCase()));
  if (textIndex < 0) throw Error('CSV needs a text, instruction, ticket, or message column.');
  return records.slice(1).map(record => record[textIndex]?.trim() || '').filter(Boolean);
}

export function safeCell(value) {
  const text = String(value ?? '');
  return /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
}

export function buildCSV(results) {
  const columns = [
    'row',
    'text',
    'predicted_intent',
    'predicted_category',
    'confidence',
    'confidence_percent',
    'review_recommended',
    'top_alternative'
  ];
  const quote = value => `"${safeCell(value).replaceAll('"', '""')}"`;
  return [
    columns.join(','),
    ...results.map(result => {
      const isUncertain = result.confidence < 0.65 || result.is_uncertain;
      const alt = result.top_predictions?.[1]?.label || '';
      const conf = typeof result.confidence === 'number' ? result.confidence : parseFloat(result.confidence || 0);
      return [
        result.index + 1,
        result.text,
        result.predicted_intent,
        result.predicted_category,
        conf.toFixed(4),
        `${(conf * 100).toFixed(1)}%`,
        isUncertain ? 'YES' : 'NO',
        alt
      ].map(quote).join(',');
    })
  ].join('\r\n');
}

export default function BatchUpload({ onResults }) {
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  async function file(event) {
    setError(''); setResults([]);
    try {
      const selected = event.target.files?.[0];
      if (!selected) return;
      if (!selected.name.toLowerCase().endsWith('.csv')) throw Error('Choose a .csv file.');
      setFileName(selected.name);
      const data = parseCSV(await selected.text());
      if (!data.length) throw Error('No non-empty ticket messages found.');
      if (data.length > 500) throw Error('Batch limit is 500 tickets.');
      setRows(data);
    } catch (err) { setRows([]); setFileName(''); setError(err.message); }
  }

  async function run() {
    setBusy(true); setError('');
    try {
      const response = await predictBatch(rows);
      const output = response.results.map((item, i) => ({ ...item.result, index: item.index, text: rows[i] }));
      setResults(output); onResults?.(output);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  function exportCSV() {
    if (!results || results.length === 0) return;
    const csv = buildCSV(results);
    // Prepend UTF-8 BOM so Excel and other spreadsheet applications
    // recognize the encoding and separate columns properly.
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.setAttribute('download', 'neuraldesk_ticket_predictions.csv');
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setDownloaded(true);
    setTimeout(() => {
      setDownloaded(false);
      if (document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
      URL.revokeObjectURL(url);
    }, 1000);
  }

  async function copyCSV() {
    if (!results || results.length === 0) return;
    const csv = buildCSV(results);
    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <label className="upload">
        <input aria-label="Upload ticket CSV" type="file" accept=".csv,text/csv" onChange={file} />
        <span className="upload-icon">▤</span>
        <b>{fileName ? `Selected: ${fileName}` : 'Choose a CSV file'}</b>
        <small>Required column: text, instruction, ticket, message, or subject · up to 500 rows</small>
      </label>
      {error && <p role="alert" className="error">{error}</p>}
      {rows.length > 0 && (
        <>
          <div className="batch-actions">
            <span><b>{rows.length}</b> tickets validated and ready</span>
            <button className="primary" disabled={busy} onClick={run}>
              {busy ? 'Classifying…' : 'Classify batch'}
            </button>
            {results.length > 0 && (
              <>
                <button className="secondary" onClick={exportCSV} title="Download formatted .csv file for Excel/Sheets">
                  {downloaded ? '✓ Downloaded .csv' : 'Export CSV ↗'}
                </button>
                <button className="secondary" onClick={copyCSV} title="Copy spreadsheet CSV text to clipboard">
                  {copied ? '✓ Copied CSV!' : 'Copy CSV 📋'}
                </button>
              </>
            )}
          </div>
          <div className="preview">
            <b>Preview · first {Math.min(rows.length, 5)} rows</b>
            <ol>
              {rows.slice(0, 5).map((text, index) => (
                <li key={`${index}-${text}`}>{text}</li>
              ))}
            </ol>
          </div>
        </>
      )}
      <BatchResultsTable rows={results} />
    </div>
  );
}
