import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// parseCsv yerine CsvParseStream'i (Akışlı Okuyucu) import ediyoruz
// --- DÜZELTME: Doğru dosya yolu 'parse.ts' olarak güncellendi ---
import { CsvParseStream } from 'https://deno.land/std@0.208.0/csv/parse.ts';

// --- DÜZELTME: BATCH_SIZE = 1 ---
// Her fonksiyon çağrısı sadece 1 satır işleyecek.
// Bu, zaman aşımını (timeout) kesin olarak engeller.
const BATCH_SIZE = 1;

// Arayüz (CSV dosyanızdaki sütun adlarıyla eşleşmeli)
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
}

// Supabase Admin İstemcisi
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// CORS Ayarları
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 1 Satırı işleyen çekirdek fonksiyon
const processRow = async (row: CsvRow, jobId: string) => {
  // 'row' objesi CsvParseStream tarafından (başlıklara göre) doldurulur
  if (!row.domain || !row.title) {
    console.warn(`[Job ${jobId}] Satır atlandı (domain/title eksik):`, row.domain);
    return;
  }
  
  try {
    // 1. Ana veriyi ekle/güncelle
    const dataToInsertOrUpdate = {
      domain: row.domain, ciro: row.ciro || null, adlink: row.adlink || null,
      niche: row.niche || null, product_count: parseInt(row.product_count || '0') || null,
      trafik: row.trafik || null, app: row.app || null, theme: row.theme || null,
      currency: row.currency || null, date: new Date().toISOString().split('T')[0],
      job_id: jobId,
    };

    const { data: upsertedData, error: upsertError } = await supabaseAdmin
      .from('scraped_data')
      .upsert(dataToInsertOrUpdate, { onConflict: 'domain' })
      .select('id').single();

    if (upsertError) throw new Error(`scraped_data upsert hatası: ${upsertError.message}`);
    if (!upsertedData) throw new Error('scraped_data ID alınamadı');

    // 2. Ürün detaylarını ekle/güncelle
    const images = [row.image1, row.image2, row.image3].filter(Boolean) as string[];
    const { error: productDetailsError } = await supabaseAdmin
      .from('product_details')
      .upsert(
        { scraped_data_id: upsertedData.id, title: row.title, images: images, status: 'open' },
        { onConflict: 'scraped_data_id' }
      );

    if (productDetailsError) throw new Error(`product_details upsert hatası: ${productDetailsError.message}`);

  } catch (err) {
    console.error(`[Job ${jobId}] Satır ${row.domain} işlenemedi:`, err.message);
  }
};

// Ana Sunucu Fonksiyonu
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let jobId = 'unknown_job';
  try {
    const { jobId: reqJobId, filePath, batchIndex } = await req.json();
    jobId = reqJobId;

    if (!jobId || !filePath) {
      throw new Error("Eksik parametre: 'jobId' veya 'filePath' gerekli.");
    }

    // BATCH_SIZE = 1 olduğu için, startIndex = batchIndex
    const startIndex = batchIndex * BATCH_SIZE; 
    const endIndex = startIndex + BATCH_SIZE;
    let currentIndex = 0;
    const rowsToProcess: CsvRow[] = [];

    console.log(`[Job ${jobId}] Batch ${batchIndex} (Satır ${startIndex}) işleniyor...`);

    // 1. CSV dosyasını Storage'dan indir
    const { data: fileData, error: storageError } = await supabaseAdmin.storage
      .from('csv-uploads')
      .download(filePath);

    if (storageError) throw storageError;
    if (!fileData || !fileData.body) throw new Error("Storage'dan dosya gövdesi (body) alınamadı.");

    // 2. Dosyayı 'Stream' (Akış) olarak oku
    const readableStream = fileData.body;

    // CsvParseStream'i ayarla (başlıkları otomatik okur ve objeye çevirir)
    const csvStream = readableStream
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new CsvParseStream({
        skipFirstRow: true, // Başlık satırını atla
      }));

    let totalRowsInFile = 0; 
    let reachedEndOfFile = false;

    // 3. Dosyayı satır satır tara
    for await (const row of csvStream) {
      totalRowsInFile++;
      
      // Bu satır bizim aradığımız satırın altındaysa, atla
      if (currentIndex < startIndex) {
        currentIndex++;
        continue;
      }

      // Bu satır bizim aradığımız satırsa (BATCH_SIZE = 1), listeye ekle
      if (currentIndex < endIndex) {
        rowsToProcess.push(row as unknown as CsvRow);
      }
      
      currentIndex++;

      // Batch (grup) dolduysa (1 satır bulunduysa), daha fazla okumayı bırak
      if (currentIndex >= endIndex) {
        break;
      }
    }

    // Eğer 'rowsToProcess' boşsa, dosyanın sonuna gelmişiz demektir
    if (rowsToProcess.length === 0) {
      reachedEndOfFile = true;
    }

    // 4. Batch'i işle (eğer satır varsa)
    if (!reachedEndOfFile) {
      
      // Sadece 1 satır işlenecek
      console.log(`[Job ${jobId}] ${rowsToProcess.length} satır işleniyor...`);
      for (const row of rowsToProcess) {
        await processRow(row, jobId); // 1 satırı bekle
      }
      console.log(`[Job ${jobId}] Batch ${batchIndex} tamamlandı.`);
    
      // 5. Bir sonraki batch'i tetikle (sonraki satır için)
      const nextBatchIndex = batchIndex + 1;
      const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/import-csv`;
      
      // 'await' kullanmıyoruz (fire-and-forget)
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

    } else {
      // 7. Dosyanın sonuna ulaşıldı, işlemi bitir
      await supabaseAdmin
        .from('scrape_jobs')
        .update({ status: 'completed', total_records: totalRowsInFile }) // Toplam satır sayısını kaydet
        .eq('id', jobId);
      
      console.log(`[Job ${jobId}] Tamamlandı. Toplam ${totalRowsInFile} satır.`);
      // İşlem bitti, CSV dosyasını Storage'dan sil
      await supabaseAdmin.storage.from('csv-uploads').remove([filePath]); 

      return new Response(JSON.stringify({ message: `Job ${jobId} tamamlandı.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

  } catch (error) {
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