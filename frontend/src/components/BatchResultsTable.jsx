import React, { useMemo, useState } from 'react';

export default function BatchResultsTable({ rows = [] }) {
  const [sortField, setSortField] = useState('index');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [onlyUncertain, setOnlyUncertain] = useState(false);

  const sortedRows = useMemo(() => {
    let list = rows.filter(r => {
      if (onlyUncertain && r.confidence >= 0.65 && !r.is_uncertain) return false;
      if (filterText.trim()) {
        const q = filterText.toLowerCase();
        return (
          r.text.toLowerCase().includes(q) ||
          r.predicted_intent.toLowerCase().includes(q) ||
          r.predicted_category.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return list.sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (sortField === 'index' || sortField === 'confidence') {
        return sortAsc ? va - vb : vb - va;
      }
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [rows, sortField, sortAsc, filterText, onlyUncertain]);

  if (!rows.length) return null;

  const uncertainCount = rows.filter(r => r.confidence < 0.65 || r.is_uncertain).length;

  function toggleSort(field) {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(field === 'confidence' ? false : true);
    }
  }

  const arrow = (field) => {
    if (sortField !== field) return ' ↕';
    return sortAsc ? ' ↑' : ' ↓';
  };

  return (
    <div className="batch-results-wrap">
      <div className="table-controls">
        <input
          type="search"
          placeholder="Filter results by text, intent, or category…"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          className="table-search"
        />
        <div className="table-stats">
          <button
            type="button"
            className={`filter-chip ${!onlyUncertain ? 'active' : ''}`}
            onClick={() => setOnlyUncertain(false)}
          >
            All ({rows.length})
          </button>
          <button
            type="button"
            className={`filter-chip chip-warning ${onlyUncertain ? 'active' : ''}`}
            onClick={() => setOnlyUncertain(true)}
          >
            Review Needed ({uncertainCount})
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('index')} style={{ cursor: 'pointer' }}>
                Row{arrow('index')}
              </th>
              <th onClick={() => toggleSort('text')} style={{ cursor: 'pointer' }}>
                Ticket{arrow('text')}
              </th>
              <th onClick={() => toggleSort('predicted_intent')} style={{ cursor: 'pointer' }}>
                Predicted Intent{arrow('predicted_intent')}
              </th>
              <th onClick={() => toggleSort('predicted_category')} style={{ cursor: 'pointer' }}>
                Category{arrow('predicted_category')}
              </th>
              <th onClick={() => toggleSort('confidence')} style={{ cursor: 'pointer' }}>
                Confidence{arrow('confidence')}
              </th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length ? (
              sortedRows.map(r => {
                const isUncertain = r.confidence < 0.65 || r.is_uncertain;
                return (
                  <tr key={r.index} className={isUncertain ? 'row-uncertain' : ''}>
                    <td>#{r.index + 1}</td>
                    <td className="cell-ticket" title={r.text}>{r.text}</td>
                    <td>
                      <span className="intent-badge">{r.predicted_intent.replaceAll('_', ' ')}</span>
                    </td>
                    <td>
                      <span className="category-tag">{r.predicted_category}</span>
                    </td>
                    <td className="cell-score">
                      <strong>{(r.confidence * 100).toFixed(1)}%</strong>
                    </td>
                    <td>
                      {isUncertain ? (
                        <span className="status-badge status-warning">⚠️ Review</span>
                      ) : (
                        <span className="status-badge status-ok">✓ Ready</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="empty-row">No tickets match the active filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
