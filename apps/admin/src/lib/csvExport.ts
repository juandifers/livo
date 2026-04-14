/**
 * CSV Export Utilities for Admin Panel
 * Generates CSV files client-side and triggers browser download
 */

/**
 * Escape CSV field value
 */
function escapeCSVField(value: any): string {
  if (value == null) return '';
  const stringValue = String(value);
  // Escape quotes by doubling them
  const escaped = stringValue.replace(/"/g, '""');
  // Wrap in quotes if contains comma, quote, newline, or starts with special chars
  const needsQuotes = /[",\n\r]/.test(escaped) || /^[=+\-@]/.test(escaped);
  return needsQuotes ? `"${escaped}"` : escaped;
}

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  // Header row
  const headerRow = columns.map(c => escapeCSVField(c.header)).join(',');
  
  // Data rows
  const dataRows = data.map(row => {
    return columns.map(col => escapeCSVField(row[col.key])).join(',');
  }).join('\n');
  
  return `${headerRow}\n${dataRows}`;
}

/**
 * Trigger browser download of CSV content
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(prefix: string, extension: string = 'csv'): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${prefix}-${timestamp}.${extension}`;
}
