import { ScrapedData } from './supabase'; // Güncellenmiş ScrapedData arayüzünü kullan

export function exportToCSV(data: ScrapedData[]): void {
  if (data.length === 0) return;

  // --- GÜNCELLENMİŞ SÜTUNLAR ---
  const headers = [
    'date',
    'domain',
    'currency',
    'language',
    'status', // product_details'den
    'title',  // product_details'den
    'images', // product_details'den
    'listedurum', // Yeni
    'inceleyen'   // Yeni
  ];
  const csvRows = [headers.join(',')];

  for (const row of data) {
    // product_details'in null olma ihtimaline karşı (eski/hatalı veri)
    const p = row.product_details; 
    
    const values = [
      row.date,
      escapeCSV(row.domain),
      escapeCSV(row.currency),
      escapeCSV(row.language),
      escapeCSV(p?.status), // product_details'den
      escapeCSV(p?.title),  // product_details'den
      escapeCSV(p?.images?.join(' | ')), // Resim dizisini birleştir
      String(row.listedurum), // Yeni
      escapeCSV(row.inceleyen), // Yeni
    ];
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  downloadFile(csvContent, 'scraped-data.csv', 'text/csv');
}

export function exportToJSON(data: ScrapedData[]): void {
  // Veriyi düzleştirerek (flatten) JSON oluştur
  const jsonData = data.map(row => ({
    date: row.date,
    domain: row.domain,
    currency: row.currency,
    language: row.language,
    listedurum: row.listedurum, // Yeni
    inceleyen: row.inceleyen,   // Yeni
    // product_details'den gelen veriler
    product_status: row.product_details?.status,
    product_title: row.product_details?.title,
    product_images: row.product_details?.images,
    product_error: row.product_details?.error,
  }));

  const jsonContent = JSON.stringify(jsonData, null, 2);
  downloadFile(jsonContent, 'scraped-data.json', 'application/json');
}

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
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