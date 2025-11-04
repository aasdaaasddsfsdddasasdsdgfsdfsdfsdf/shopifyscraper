import { ScrapedData } from './supabase';

export function exportToCSV(data: ScrapedData[]): void {
  if (data.length === 0) return;

  const headers = ['date', 'domain', 'currency', 'language', 'source_url'];
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = [
      row.date,
      escapeCSV(row.domain),
      escapeCSV(row.currency),
      escapeCSV(row.language),
      escapeCSV(row.source_url),
    ];
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  downloadFile(csvContent, 'scraped-data.csv', 'text/csv');
}

export function exportToJSON(data: ScrapedData[]): void {
  const jsonData = data.map(row => ({
    date: row.date,
    domain: row.domain,
    currency: row.currency,
    language: row.language,
    source_url: row.source_url,
  }));

  const jsonContent = JSON.stringify(jsonData, null, 2);
  downloadFile(jsonContent, 'scraped-data.json', 'application/json');
}

function escapeCSV(value: string): string {
  if (!value) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

