// ============ CSV EXPORT UTILITIES ============

/**
 * Escape a value for CSV format
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If the value contains commas, quotes, or newlines, wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of objects to CSV string
 */
export function toCSV(
  headers: { key: string; label: string }[],
  rows: Record<string, any>[]
): string {
  const headerLine = headers.map(h => escapeCSV(h.label)).join(',');
  const dataLines = rows.map(row =>
    headers.map(h => escapeCSV(row[h.key])).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Trigger a file download in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv') {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download data as CSV file
 */
export function downloadCSV(
  headers: { key: string; label: string }[],
  rows: Record<string, any>[],
  filename: string
) {
  const csv = toCSV(headers, rows);
  downloadFile(csv, filename, 'text/csv');
}

/**
 * Format a date for display in exports
 */
export function formatExportDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a date+time for display in exports
 */
export function formatExportDateTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('en-ZA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format currency for export (plain number without symbol for CSV compatibility)
 */
export function formatExportZAR(amount: number): string {
  return `R ${amount.toFixed(2)}`;
}

/**
 * Filter items by date range
 */
export function filterByDateRange<T extends Record<string, any>>(
  items: T[],
  dateField: string,
  startDate: string | null,
  endDate: string | null
): T[] {
  return items.filter(item => {
    const itemDate = new Date(item[dateField]);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (itemDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (itemDate > end) return false;
    }
    return true;
  });
}

/**
 * Generate a filename with timestamp
 */
export function generateFilename(prefix: string, extension: string = 'csv'): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  return `${prefix}_${dateStr}_${timeStr}.${extension}`;
}
