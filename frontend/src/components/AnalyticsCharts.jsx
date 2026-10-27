import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const COLORS = ['#4f46e5', '#6366f1', '#818cf8', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

export default function AnalyticsCharts({ categories = [], intents = [], metrics = null }) {
  const topIntents = intents.slice(0, 6).map(x => ({ ...x, display: x.name.replaceAll('_', ' ') }));

  return (
    <div className="analytics-container">
      <div className="charts">
        <section className="chart-card">
          <div className="chart-title-wrap">
            <h3>Category Distribution</h3>
            <span className="chart-subtitle">Predictions by high-level category</span>
          </div>
          {categories.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categories} layout="vertical" margin={{ left: 12, right: 16, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[0, 6, 6, 0]}>
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty">Classify tickets to see category distribution.</p>
          )}
        </section>

        <section className="chart-card">
          <div className="chart-title-wrap">
            <h3>Class (Intent) Distribution</h3>
            <span className="chart-subtitle">Top predicted intent classes</span>
          </div>
          {topIntents.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topIntents} layout="vertical" margin={{ left: 12, right: 16, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="display" width={110} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]}>
                  {topIntents.map((entry, index) => (
                    <Cell key={`intent-cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty">Classify tickets to see class distribution.</p>
          )}
        </section>
      </div>

      {metrics && (
        <section className="eval-metrics-strip">
          <div className="eval-head">
            <span className="eyebrow">HELD-OUT EVALUATION BENCHMARKS</span>
            <h4>Offline Model Performance (BiLSTM)</h4>
          </div>
          <div className="eval-grid">
            <div className="eval-item">
              <span>Accuracy</span>
              <strong>{(metrics.accuracy * 100).toFixed(1)}%</strong>
              <small>Held-out test set</small>
            </div>
            <div className="eval-item">
              <span>Macro F1</span>
              <strong>{metrics.macro_f1.toFixed(3)}</strong>
              <small>Across 27 classes</small>
            </div>
            <div className="eval-item">
              <span>Macro Precision</span>
              <strong>{metrics.macro_precision.toFixed(3)}</strong>
              <small>Unweighted average</small>
            </div>
            <div className="eval-item">
              <span>Macro Recall</span>
              <strong>{metrics.macro_recall.toFixed(3)}</strong>
              <small>Unweighted average</small>
            </div>
            <div className="eval-item">
              <span>Test Samples</span>
              <strong>{metrics.test_rows?.toLocaleString() || '3,684'}</strong>
              <small>Disjoint split</small>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
