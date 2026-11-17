import { describe, expect, it } from 'vitest';
import { fileToDataset, leafColumns, parseDataset, updateLeafColumn } from '../src/lib/dataset';
import { decodeState, encodeState } from '../src/lib/share';
import { SAMPLES } from '../src/lib/samples';

describe('uploads', () => {
  it('turns a CSV into columns from the header row, with inferred numbers and dates', () => {
    const ds = fileToDataset('people.csv', 'Name,Age,Joined\r\nAda,36,2024-01-15\r\n"Turing, Alan",41,2024-05-02\r\n');
    expect(ds.columns).toEqual([
      { title: 'Name', key: 'Name' },
      { title: 'Age', key: 'Age' },
      { title: 'Joined', key: 'Joined', type: 'date', numFmt: 'yyyy-mm-dd' },
    ]);
    expect(ds.data).toEqual([
      { Name: 'Ada', Age: 36, Joined: '2024-01-15' },
      { Name: 'Turing, Alan', Age: 41, Joined: '2024-05-02' },
    ]);
  });

  it('accepts JSON as { columns, data }, objects or arrays', () => {
    expect(fileToDataset('a.json', '[{"a":1},{"a":2,"b":"x"}]')).toEqual({ columns: [{ title: 'a', key: 'a' }, { title: 'b', key: 'b' }], data: [{ a: 1 }, { a: 2, b: 'x' }] });
    expect(fileToDataset('a.json', '[["A","B"],[1,2]]')).toEqual({ columns: [{ title: 'A', index: 0 }, { title: 'B', index: 1 }], data: [[1, 2]] });
    expect(() => fileToDataset('a.json', '42')).toThrow(/columns, data/);
    expect(() => fileToDataset('a.xlsx', '')).toThrow(/\.csv or \.json/);
  });

  it('explains invalid editor JSON', () => {
    expect(parseDataset('{')).toMatchObject({ ok: false, message: expect.stringMatching(/^Not valid JSON/) });
    expect(parseDataset('{"columns":[]}')).toMatchObject({ ok: false });
  });
});

describe('column editing', () => {
  it('changes width and number format of a leaf inside a group', () => {
    const text = JSON.stringify(SAMPLES[0]!.dataset);
    const leaves = leafColumns(parseDataset(text).ok ? (JSON.parse(text) as never) : (undefined as never));
    expect(leaves.map((l) => l.title)).toEqual(['Name', 'City', 'Joined', 'Q1', 'Q2']);
    const next = updateLeafColumn(text, 4, { width: '12', numFmt: '0.0%' });
    const q2 = (JSON.parse(next) as { columns: Array<{ children?: Array<Record<string, unknown>> }> }).columns[3]!.children![1]!;
    expect(q2).toMatchObject({ title: 'Q2', width: { wch: 12 }, numFmt: '0.0%' });
    const cleared = JSON.parse(updateLeafColumn(next, 4, { width: '', numFmt: '' })).columns[3].children[1];
    expect(cleared.width).toBeUndefined();
    expect(cleared.numFmt).toBeUndefined();
  });
});

describe('share links', () => {
  it('round-trips state with non-ASCII text through base64url', () => {
    const state = { o: { sheetName: 'المدينة' }, d: { columns: [{ title: '€ & ü' }], data: [] } };
    const s = encodeState(state);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeState(s)).toEqual(state);
    expect(decodeState('%%%')).toBeUndefined();
  });
});
