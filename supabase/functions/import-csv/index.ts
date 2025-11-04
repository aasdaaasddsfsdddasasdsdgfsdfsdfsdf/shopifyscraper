import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse as parseCsv } from 'https://deno.land/std@0.208.0/csv/parse.ts';
import { pooledMap } from 'https://deno.land/std@0.208.0/async/pool.ts';

const BATCH_SIZE = 25;
const CONCURRENCY_LIMIT = 5;

// CsvRow arayüzü (Hangi sütunları KULLANACAĞIMIZI tanımlar)
interface CsvRow {
  domain: string;
  title: string;
  image1?: string;
  image2?: string;
  image3?: string;
  ciro?: string;
  adlink?: string;
  niche?: string;
  product_count?: string;
  trafik?: string;
  app?: string;
  theme?: string;
  currency?: string;
  // Not: CSV dosyanızda 15 sütun olsa bile, biz sadece bu 13'ünü kullanacağız.
  // Diğer sütunlar (örn: 'image4', 'image5') zararsızca yok sayılacak.
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // --- DÜZELTME: Hata ayıklama için jobId'yi en dışa taşıdık ---
  let jobId = 'unknown_job';
  try {
    const { jobId: reqJobId, filePath, batchIndex } = await req.json();
    jobId = reqJobId; // jobId'yi global skopta ayarla

    if (!jobId || !filePath) {
      throw new Error("Eksik parametre: 'jobId' veya 'filePath' gerekli.");
    }

    const startIndex = batchIndex * BATCH_SIZE;
    console.log(`[Job ${jobId}] Batch ${batchIndex} (Satır ${startIndex}+) işleniyor...`);

    const { data: fileData, error: storageError } = await supabaseAdmin.storage
      .from('csv-uploads')
      .download(filePath);

    if (storageError) throw storageError;

    const csvText = await fileData.text();
    
    // --- DÜZELTME: 'columns' array'i kaldırıldı ---
    // Artık 'skipFirstRow: true' düzgün çalışacak ve başlıklar
    // dosyadan dinamik olarak okunacak (15 sütunun tamamı).
    const rows = parseCsv(csvText, {
      skipFirstRow: true, 
    }) as CsvRow[]; // Tipi CsvRow olarak zorluyoruz

    const batchRows = rows.slice(startIndex, startIndex + BATCH_SIZE);

    if (batchRows.length === 0) {
      await supabaseAdmin
        .from('scrape_jobs')
        .update({ status: 'completed', total_records: rows.length })
        .eq('id', jobId);
      
      console.log(`[Job ${jobId}] Tamamlandı. Toplam ${rows.length} satır.`);
      await supabaseAdmin.storage.from('csv-uploads').remove([filePath]);

      return new Response(JSON.stringify({ message: `Job ${jobId} tamamlandı.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 4. Batch'i işle
    const processRow = async (row: CsvRow) => {
      // Not: 'row' objesi artık CSV'deki 15 sütunu da içeriyor,
      // ama biz sadece ihtiyacımız olanları (domain, title, vs.) çağırıyoruz.
      if (!row.domain || !row.title) {
        console.warn(`[Job ${jobId}] Satır atlandı (domain/title eksik):`, row.domain);
        return;
      }
      
      try {
        const dataToInsertOrUpdate = {
          domain: row.domain,
          ciro: row.ciro || null,
          adlink: row.adlink || null,
          niche: row.niche || null,
          product_count: parseInt(row.product_count || '0') || null,
          trafik: row.trafik || null,
          app: row.app || null,
          theme: row.theme || null,
          currency: row.currency || null,
          date: new Date().toISOString().split('T')[0],
          job_id: jobId,
        };

        const { data: upsertedData, error: upsertError } = await supabaseAdmin
          .from('scraped_data')
          .upsert(dataToInsertOrUpdate, { onConflict: 'domain' })
          .select('id')
          .single();

        if (upsertError) throw new Error(`scraped_data upsert hatası: ${upsertError.message}`);
        if (!upsertedData) throw new Error('scraped_data ID alınamadı');

        const images = [row.image1, row.image2, row.image3].filter(Boolean) as string[];
        const { error: productDetailsError } = await supabaseAdmin
          .from('product_details')
          .upsert(
            {
              scraped_data_id: upsertedData.id,
              title: row.title,
              images: images,
              status: 'open',
            },
            { onConflict: 'scraped_data_id' }
          );

        if (productDetailsError) throw new Error(`product_details upsert hatası: ${productDetailsError.message}`);

      } catch (err) {
        console.error(`[Job ${jobId}] Satır ${row.domain} işlenemedi:`, err.message);
      }
    };
    
    for await (const _ of pooledMap(CONCURRENCY_LIMIT, batchRows, processRow)) {
      // İşlemlerin bitmesini bekle
    }

    // 5. Bir sonraki batch'i tetikle
    const nextBatchIndex = batchIndex + 1;
    const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/import-csv`;
    
    fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: jobId,
        filePath: filePath,
        batchIndex: nextBatchIndex,
      }),
    });

    // 6. Tarayıcıya "işlem devam ediyor" yanıtı dön
    return new Response(JSON.stringify({ message: `Job ${jobId}, Batch ${batchIndex} işlendi. Sonraki batch tetiklendi.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 202,
    });

  } catch (error) {
    // --- DÜZELTME: jobId'yi artık dış skoptan alıyoruz ---
    if (jobId !== 'unknown_job') {
       await supabaseAdmin
        .from('scrape_jobs')
        .update({ status: 'failed' })
        .eq('id', jobId);
    }
    
    console.error(`[Job ${jobId}] KRİTİK HATA:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});