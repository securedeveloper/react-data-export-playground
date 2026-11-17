import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fromTable } from 'javascript-excel/dom';
import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { exportTable } from 'react-data-export';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { previewOf } from '../src/lib/preview';
import { DemoTable } from '../src/tabs/DemoTable';
import LegacyTab from '../src/tabs/LegacyTab';

let blobs: Blob[] = [];
beforeEach(() => {
  blobs = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
    blobs.push(b as Blob);
    return 'blob:test';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

function mountTable(): HTMLTableElement {
  document.body.innerHTML = renderToStaticMarkup(<DemoTable tableRef={createRef()} />);
  return document.querySelector('table')!;
}

describe('the HTML table tab', () => {
  it('builds a sheet with merges and typed values, skipping ignored and hidden rows', () => {
    const p = previewOf(fromTable(mountTable(), { freezeHeader: true }));
    expect(p.frozenRows).toBe(2);
    expect(p.rows.map((r) => r.map((c) => c?.text ?? null))).toEqual([
      ['Order', 'Customer', 'Details', null],
      [null, null, 'Net', 'Shipped'],
      ['1001', 'Ada', '1,250.50', expect.stringMatching(/2024|45306/)],
      ['1002', 'Grace', '980.00', expect.stringMatching(/2024|45307/)],
      ['Total', null, '2,230.50', ''],
    ]);
  });

  it('exports CSV with exportTable', async () => {
    const result = await exportTable({ current: mountTable() }, { format: 'csv', filename: 'orders' });
    expect(result.filename).toBe('orders.csv');
    expect((await result.blob.text()).replace(/^\uFEFF/, '')).toBe('Order,Customer,Details,\r\n,,Net,Shipped\r\n1001,Ada,1250.5,2024-01-15\r\n1002,Grace,980,2024-01-16\r\nTotal,,2230.5,\r\n');
  });
});

describe('the Legacy tab', () => {
  it('downloads the same values with the 0.x <ExcelFile> and the 1.0 <ExcelExport>', async () => {
    const user = userEvent.setup();
    const onExported = vi.fn();
    render(<LegacyTab onExported={onExported} />);
    await user.click(screen.getByRole('button', { name: 'Download (0.x API)' }));
    await screen.findByText(/0\.x file saved/);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Download (1.0 API)' })).toHaveProperty('disabled', false));
    await user.click(screen.getByRole('button', { name: 'Download (1.0 API)' }));
    await waitFor(() => expect(blobs).toHaveLength(2));
    expect(await screen.findByText(/Identical values: 32 cells across 2 sheets \(Employees, Leaves\)/, {}, { timeout: 3000 })).toBeTruthy();
    expect(onExported).toHaveBeenCalledTimes(2);
  });
});
