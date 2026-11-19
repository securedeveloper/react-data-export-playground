# react-data-export playground

Interactive playground for [react-data-export](https://www.npmjs.com/package/react-data-export): export datasets and HTML tables to `.xlsx` and `.csv` with the real library, in the browser. Files you open never leave your machine: there is no backend, no analytics and no cookies.

It installs the **published** package from npm at an exact version (currently `react-data-export@1.0.0`, the `latest` tag), so it shows what users get.

## What it shows

- **Dataset**: edit a `{ columns, data }` dataset as JSON, pick a sample, or drop your own `.csv` / `.json` file. Change the export options live: sheet name, file name, `.xlsx` or `.csv` (delimiter, BOM), header style (bold, fill, text colour), frozen header rows, autofilter, auto width, totals row, banded rows, right-to-left, and per-column width and number format. A preview renders the sheet `fromDataset` builds, with merges and formatted values.
- **HTML table**: an ordinary `<table>` on the page (rowspan/colspan, `data-type`/`data-numfmt` hints, an ignored row, a hidden row, a footer) exported with `<ExportTableButton>`, `useTableExport` or `exportTable`, with a preview of the sheet `fromTable` reads.
- **Legacy (0.x)**: the deprecated `react-data-export/legacy` entry (`<ExcelFile>`, `<ExcelSheet>`, `<ExcelColumn>`) next to the 1.0 `<ExcelExport>` for the same data. Download both and the page reads the two files back with javascript-excel and compares every cell. A short migration note links to the full guide.
- **Code generator**: the exact component, hook or function code for the current settings (`<ExcelExport>` / `useExcelExport` / `exportDataset`, and the table equivalents), with the install command and copy buttons. The Download button runs the API you picked.
- **Examples** (one click), **shareable links** (settings in the query string), **recent exports** with timings in `localStorage`, **performance metrics** (build and export time, file size), light/dark theme and keyboard shortcuts (press `?`).

## Local development

Node 22.18 or later (CI uses Node 26).

```sh
npm ci
npm run dev        # http://localhost:5173
npm run typecheck
npm run lint
npm test           # Vitest + Testing Library
npm run build      # → dist/
npm run preview    # serves dist with the production security headers from vercel.json
```

## Deploying

The site is a static Vite build. On Vercel, import the repository with the **Vite** framework preset and the default build command (`npm run build`) and output directory (`dist`); no environment variables are needed. `vercel.json` only sets security headers (Content-Security-Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors 'none'`). `vite preview` serves the same headers, so the CSP is exercised locally. After a deploy, check them with:

```sh
curl -sI https://react-data-export-playground.vercel.app/ | grep -i content-security
```

To move to a new react-data-export release, bump the exact version in `package.json` and run `npm install`.

## License

[MIT](LICENSE)
