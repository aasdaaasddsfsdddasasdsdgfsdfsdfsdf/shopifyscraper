import { supabase, ScrapedData } from './supabase';

// ProductData artık ProductDetails olarak supabase.ts'den geliyor
export type { ScrapedData };

// YENİ: Edge fonksiyonundan gelen 'ProductData' (yeni adıyla)
// Bu, 'product_details' tablosuna GİRMEDEN ÖNCEKI ham veridir
export interface ScrapedProductData {
  title: string;
  images: string[];
  status: 'open' | 'closed';
  error?: string;
}

export interface ScrapedRecord {
  date: string;
  domain: string;
  currency: string;
  language: string;
  products: ScrapedProductData; // Güncellendi
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

// --- saveRecords FONKSİYONU TAMAMEN YENİLENDİ ---
// Artık iki aşamalı (scraped_data -> product_details)
// ve toplu (batch) ekleme yapıyor.

export async function saveRecords(jobId: string, records: ScrapedRecord[]) {
  if (records.length === 0) return;

  const BATCH_SIZE = 50;
  
  console.log(`[saveRecords] Starting to save ${records.length} records in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    console.log(`[saveRecords] Inserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)} (${batch.length} records)`);

    // 1. ADIM: Ana `scraped_data` kayıtlarını ekle (products OLMADAN)
    // .select() ile eklenen kayıtların ID'lerini geri al
    const dataToInsert = batch.map(r => ({
      job_id: jobId,
      date: r.date,
      domain: r.domain,
      currency: r.currency,
      language: r.language,
      // 'products' alanı artık burada değil
    }));

    const { data: insertedScrapedData, error: scrapedDataError } = await supabase
      .from('scraped_data')
      .insert(dataToInsert)
      .select('id'); // Eklenen kayıtların ID'lerini al

    if (scrapedDataError || !insertedScrapedData) {
      console.error(`[saveRecords] Supabase insert error on scraped_data batch ${i}:`, scrapedDataError);
      throw new Error(`Failed to save scraped_data (batch ${i}): ${scrapedDataError?.message}`);
    }

    // 2. ADIM: Dönen ID'leri kullanarak `product_details` kayıtlarını oluştur
    if (insertedScrapedData.length !== batch.length) {
      console.warn(`[saveRecords] Mismatch in returned IDs. Expected ${batch.length}, got ${insertedScrapedData.length}`);
      // Bu durumda devam etmek riskli olabilir, ancak şimdilik hata vermiyoruz
    }
    
    const productDetailsToInsert = batch.map((r, index) => {
      // Dönen ID'yi (insertedScrapedData[index].id) al
      const scrapedDataId = insertedScrapedData[index]?.id;
      
      // Eğer ID alınamadıysa (bir hata oluştuysa) bu kaydı atla
      if (!scrapedDataId) return null;

      return {
        scraped_data_id: scrapedDataId, // Foreign Key
        status: r.products.status,
        title: r.products.title,
        images: r.products.images,
        error: r.products.error || null,
      };
    }).filter(Boolean); // null olanları (ID'si olmayanları) filtrele

    // 3. ADIM: `product_details` kayıtlarını ekle
    if (productDetailsToInsert.length > 0) {
      const { error: productDetailsError } = await supabase
        .from('product_details')
        .insert(productDetailsToInsert as any); // 'Boolean' filtresi sonrası tipi any yaptık

      if (productDetailsError) {
        console.error(`[saveRecords] Supabase insert error on product_details batch ${i}:`, productDetailsError);
        // Burada hatayı fırlatabilir veya loglayıp devam edebiliriz
        // Eğer fırlatırsak, scraped_data'ya eklenmiş ama product_details'e eklenmemiş
        // "yetim" kayıtlar kalabilir. Şimdilik loglayıp devam ediyoruz.
        console.error(`Batch ${i} product details failed to insert. Corresponding scraped_data IDs may be orphaned.`);
      }
    }
  }
  
  console.log(`[saveRecords] Successfully processed all ${records.length} records.`);
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