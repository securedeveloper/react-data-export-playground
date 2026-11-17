import { isExcelError } from 'react-data-export';

export function describe(error: unknown): string {
  if (isExcelError(error)) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}

export const isAbort = (error: unknown): boolean => error instanceof DOMException && error.name === 'AbortError';
