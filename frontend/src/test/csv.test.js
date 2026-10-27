import { describe, it, expect } from 'vitest';
import { parseCSV, buildCSV } from '../components/BatchUpload.jsx';

describe('batch CSV handling', () => {
  it('detects supported text column and preserves quoted newlines', () => {
    expect(parseCSV('id,message\n1,"line one\nline two"')).toEqual(['line one\nline two']);
  });
  it('rejects unsupported or malformed CSV input', () => {
    expect(() => parseCSV('name,body\nA,hello')).toThrow(/needs a text/);
    expect(() => parseCSV('text\n"unclosed')).toThrow(/unclosed quoted/);
  });
  it('exports quoted rows and neutralizes spreadsheet formulas', () => {
    const csv = buildCSV([{ index: 0, text: ' =1+1', predicted_intent: 'test', predicted_category: 'A', confidence: 0.8 }]);
    expect(csv).toContain("\"' =1+1\"");
    expect(csv.split('\r\n')).toHaveLength(2);
  });
});
