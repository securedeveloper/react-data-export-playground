// Sample datasets and one-click examples. Plain JSON, so the editor shows what an app would pass.
import { DEFAULT_OPTIONS, type DatasetEditorOptions } from './options';

export interface JsonDataset {
  columns: unknown[];
  data: unknown[];
}

export interface Sample {
  id: string;
  label: string;
  dataset: JsonDataset;
}

const SALES: JsonDataset = {
  columns: [
    { title: 'Name', key: 'name', width: 'auto' },
    { title: 'City', key: 'city' },
    { title: 'Joined', key: 'joined', type: 'date', numFmt: 'yyyy-mm-dd' },
    {
      title: 'Sales',
      children: [
        { title: 'Q1', path: 'sales.q1', numFmt: '#,##0.00', total: 'sum' },
        { title: 'Q2', path: 'sales.q2', numFmt: '#,##0.00', total: 'sum' },
      ],
    },
  ],
  data: [
    { name: 'Ada Lovelace', city: 'London', joined: '2024-01-15', sales: { q1: 1200.5, q2: 980 } },
    { name: 'Alan Turing', city: 'Manchester', joined: '2024-05-02', sales: { q1: 860, q2: 1430.25 } },
    { name: 'Grace Hopper', city: 'New York', joined: '2023-11-30', sales: { q1: 0, q2: 75.5 } },
    { name: 'Katherine Johnson', city: 'Hampton', joined: '2022-08-26', sales: { q1: 2210, q2: 1890.75 } },
  ],
};

const EMPLOYEES: JsonDataset = {
  columns: [
    { title: 'Employee', key: 'name', width: { wch: 22 } },
    { title: 'Department', key: 'dept', width: { wch: 14 } },
    { title: 'Salary', key: 'salary', numFmt: '"$"#,##0', total: 'sum', width: { wch: 12 } },
    { title: 'Bonus', key: 'bonus', numFmt: '0.0%', total: 'average', width: { wch: 10 } },
    { title: 'Remote', key: 'remote', type: 'boolean' },
  ],
  data: [
    { name: 'Monika Schmidt', dept: 'Finance', salary: 72000, bonus: 0.08, remote: true },
    { name: 'Rahul Verma', dept: 'Engineering', salary: 98000, bonus: 0.12, remote: false },
    { name: 'Chen Wei', dept: 'Engineering', salary: 104500, bonus: 0.1, remote: true },
    { name: 'Sara Okafor', dept: 'Sales', salary: 65000, bonus: 0.2, remote: false },
    { name: 'Lucas Martin', dept: 'Support', salary: 51000, bonus: 0.05, remote: true },
  ],
};

const INVENTORY: JsonDataset = {
  columns: [
    { title: 'SKU', key: 'sku' },
    { title: 'Item', key: 'item' },
    { title: 'In stock', key: 'qty', type: 'number', numFmt: '#,##0', total: 'sum' },
    { title: 'Unit price', key: 'price', numFmt: '"€"#,##0.00' },
    { title: 'Restocked', key: 'restocked', type: 'date', numFmt: 'd mmm yyyy' },
  ],
  data: [
    { sku: 'A-100', item: 'Desk lamp', qty: 140, price: 24.9, restocked: '2026-10-02' },
    { sku: 'A-101', item: 'Monitor arm', qty: 32, price: 89, restocked: '2026-09-18' },
    { sku: 'B-200', item: 'USB-C hub', qty: 410, price: 39.5, restocked: '2026-10-20' },
    { sku: 'B-201', item: 'Keyboard', qty: 75, price: 119, restocked: '2026-08-30' },
    { sku: 'C-300', item: 'Cable ties (100)', qty: 1200, price: 4.25, restocked: '2026-11-01' },
  ],
};

const ARABIC: JsonDataset = {
  columns: [
    { title: 'المدينة', key: 'city', width: { wch: 16 } },
    { title: 'السكان', key: 'population', numFmt: '#,##0' },
  ],
  data: [
    { city: 'القاهرة', population: 10230350 },
    { city: 'الرياض', population: 7676654 },
    { city: 'الدار البيضاء', population: 3359818 },
  ],
};

const CITIES = ['Berlin', 'Lagos', 'Lima', 'Osaka', 'Pune', 'Quebec', 'Seville', 'Tallinn'];

/** A generated dataset for timing: n order rows. Deterministic, so links reproduce it. */
export function ordersDataset(n: number): JsonDataset {
  return {
    columns: [
      { title: 'Order', key: 'id' },
      { title: 'City', key: 'city' },
      { title: 'Placed', key: 'placed', type: 'date', numFmt: 'yyyy-mm-dd' },
      { title: 'Items', key: 'items', total: 'sum' },
      { title: 'Amount', key: 'amount', numFmt: '#,##0.00', total: 'sum' },
    ],
    data: Array.from({ length: n }, (_, i) => ({
      id: 10000 + i,
      city: CITIES[i % CITIES.length],
      placed: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      items: (i * 7) % 13 + 1,
      amount: Math.round(((i * 37) % 1000) * 10.5) / 10,
    })),
  };
}

export const SAMPLES: Sample[] = [
  { id: 'sales', label: 'Sales (grouped headers, totals)', dataset: SALES },
  { id: 'employees', label: 'Employees (currency, percent, widths)', dataset: EMPLOYEES },
  { id: 'inventory', label: 'Inventory (dates, number formats)', dataset: INVENTORY },
  { id: 'arabic', label: 'Cities in Arabic (right-to-left)', dataset: ARABIC },
  { id: 'orders-1k', label: 'Orders, 1,000 rows (timing)', dataset: ordersDataset(1000) },
];

export interface Example {
  id: string;
  title: string;
  description: string;
  sample: string;
  options: Partial<DatasetEditorOptions>;
}

export const EXAMPLES: Example[] = [
  {
    id: 'report',
    title: 'Sales report',
    description: 'Grouped header, frozen header rows, autofilter, auto width and a totals row.',
    sample: 'sales',
    options: {},
  },
  {
    id: 'payroll',
    title: 'Payroll with formats',
    description: 'Currency and percent formats, fixed widths, banded rows, a green header.',
    sample: 'employees',
    options: { sheetName: 'Payroll', filename: 'payroll', autoWidth: false, bandedRows: true, headerFill: 'E2EFDA' },
  },
  {
    id: 'csv-semicolon',
    title: 'CSV for European Excel',
    description: 'A .csv with a semicolon delimiter and a BOM, so Excel opens it with the right columns.',
    sample: 'inventory',
    options: { sheetName: 'Inventory', filename: 'inventory', format: 'csv', csvDelimiter: ';', totals: false },
  },
  {
    id: 'rtl',
    title: 'Right-to-left sheet',
    description: 'Arabic headers with the sheet direction set to right-to-left.',
    sample: 'arabic',
    options: { sheetName: 'Cities', filename: 'cities', rightToLeft: true, totals: false, headerFill: 'FCE4D6' },
  },
  {
    id: 'big',
    title: '1,000 rows, timed',
    description: 'A larger file: see build and write times in the metrics.',
    sample: 'orders-1k',
    options: { sheetName: 'Orders', filename: 'orders', headerFill: '', bandedRows: true },
  },
];

export const exampleOptions = (e: Example): DatasetEditorOptions => ({ ...DEFAULT_OPTIONS, ...e.options });

export const sampleText = (id: string): string => JSON.stringify(SAMPLES.find((s) => s.id === id)?.dataset ?? SAMPLES[0]!.dataset, null, 2);
