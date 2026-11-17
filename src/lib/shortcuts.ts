export const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

export const SHORTCUTS: Array<[string, string]> = [
  [`${MOD} + Enter`, 'Download with the current settings'],
  ['C', 'Copy the generated code'],
  ['U', 'Upload a .csv or .json dataset'],
  ['1 / 2 / 3', 'Dataset, Table and Legacy tabs'],
  ['T', 'Toggle light and dark theme'],
  ['?', 'Show this help'],
  ['Esc', 'Close this dialog'],
];
