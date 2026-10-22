/** Only https:// links or site-relative paths ("/file.pdf") are ever rendered. */
export function safeUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  let v = value.trim();
  if (!v || v.length > 600) return '';
  if (v.startsWith('https://')) {
    try {
      new URL(v);
      return v;
    } catch {
      return '';
    }
  }
  // Allow bare relative filenames (e.g. "muaz.jpg", "zain-firas.jpg") by prepending leading slash
  if (/^[a-zA-Z0-9_\-./]+$/.test(v) && !v.includes('://') && !v.startsWith('//')) {
    if (!v.startsWith('/')) v = '/' + v;
  }
  if (/^\/[^/\\\s]/.test(v) && !/\s/.test(v)) return v;
  return '';
}

export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}$/;

/** One CSV cell. Neutralises spreadsheet-formula injection (=, +, -, @, tab, CR). */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Excel-friendly CSV (UTF-8 BOM so Arabic/accents open correctly). */
export function toCsv(rows: unknown[][]): string {
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
