import { supabase, ProductData, ScrapedData } from './supabase';

export type { ProductData, ScrapedData };

export interface ScrapedRecord {
  date: string;
  domain: string;
  currency: string;
  language: string;
  products: ProductData;
}

export async function scrapeDate(dateStr: string): Promise<ScrapedRecord[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/scrape-merchant`;

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ date: dateStr }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Edge function error response:', errorData);
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error(`Error scraping ${dateStr}:`, error);
    throw error;
  }
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// --- DÜZELTME BAŞLANGICI: Toplu kayıtları bölerek (batch) ekleme ---

export async function saveRecords(jobId: string, records: ScrapedRecord[]) {
  if (records.length === 0) return;

  // 418 kaydı 50'şerli gruplara ayır
  const BATCH_SIZE = 50;
  
  console.log(`[saveRecords] Starting to save ${records.length} records in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    console.log(`[saveRecords] Inserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)} (${batch.length} records)`);

    const dataToInsert = batch.map(r => ({
      job_id: jobId,
      date: r.date,
      domain: r.domain,
      currency: r.currency,
      language: r.language,
      products: r.products,
    }));

    const { error } = await supabase
      .from('scraped_data')
      .insert(dataToInsert);

    if (error) {
      // Eğer bir grup hata verirse, işlemi durdur ve hatayı fırlat
      console.error(`[saveRecords] Supabase insert error on batch starting at index ${i}:`, error);
      throw new Error(`Failed to save records (batch ${i}): ${error.message}`);
    }
  }
  
  console.log(`[saveRecords] Successfully inserted all ${records.length} records.`);
}
// --- DÜZELTME SONU ---


export async function updateJobProgress(
  jobId: string,
  processingDate: string,
  status: string,
  totalRecords: number
) {
  const { error } = await supabase
    .from('scrape_jobs')
    .update({
      processing_date: processingDate,
      status,
      total_records: totalRecords,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error("Supabase update job error:", error);
    throw new Error(`Failed to update job: ${error.message}`);
  }
}