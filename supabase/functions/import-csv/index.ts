import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse as parseCsv } from 'https://deno.land/std@0.208.0/csv/parse.ts';
import { pooledMap } from 'https://deno.land/std@0.208.0/async/pool.ts';

// İşlenecek satır sayısı
const BATCH_SIZE = 50;
// Aynı anda kaç veritabanı işlemi yapılacak (performans için)
const CONCURRENCY_LIMIT = 5;

// CsvRow arayüzünü (App.tsx'teki ile aynı) tanımla
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

// Supabase Admin Client (gizli anahtarı kullanır)
// Not: Fonksiyon ayarlarından 'SUPABASE_SERVICE_ROLE_KEY' environment değişkenini tanımlamalısınız.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// CORS Ayarları
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // OPTIONS isteği (tarayıcı kontrolü için)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { jobId, filePath, batchIndex } = await req.json();

    if (!jobId || !filePath) {
      throw new Error("Eksik parametre: 'jobId' veya 'filePath' gerekli.");
    }

    const startIndex = batchIndex * BATCH_SIZE;

    console.log(`[Job ${jobId}] Batch ${batchIndex} (Satır ${startIndex}+) işleniyor...`);

    // 1. CSV dosyasını Storage'dan indir
    const { data: fileData, error: storageError } = await supabaseAdmin.storage
      .from('csv-uploads') // DİKKAT: 'csv-uploads' adında bir bucket oluşturmalısınız
      .download(filePath);

    if (storageError) throw storageError;

    // 2. Dosya içeriğini oku ve CSV olarak ayrıştır
    const csvText = await fileData.text();
    const rows = parseCsv(csvText, {
      skipFirstRow: true, // Başlık satırını atla
      columns: [ // App.tsx'teki CsvRow ile eşleşen başlıklar
        'domain', 'title', 'image1', 'image2', 'image3', 'ciro', 'adlink',
        'niche', 'product_count', 'trafik', 'app', 'theme', 'currency'
      ],
    }) as CsvRow[];

    // 3. Bu batch'e ait satırları al
    const batchRows = rows.slice(startIndex, startIndex + BATCH_SIZE);

    if (batchRows.length === 0) {
      // İşlenecek satır kalmadı, job'u 'completed' yap
      await supabaseAdmin
        .from('scrape_jobs')
        .update({ status: 'completed', total_records: rows.length })
        .eq('id', jobId);
      
      console.log(`[Job ${jobId}] Tamamlandı. Toplam ${rows.length} satır.`);
      
      // İşlem bitti, dosyayı Storage'dan sil
      await supabaseAdmin.storage.from('csv-uploads').remove([filePath]);

      return new Response(JSON.stringify({ message: `Job ${jobId} tamamlandı.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 4. Batch'i işle (pooledMap ile performanslı)
    const processRow = async (row: CsvRow) => {
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

        // Domain'e göre UPSERT (Ekle veya Güncelle)
        const { data: upsertedData, error: upsertError } = await supabaseAdmin
          .from('scraped_data')
          .upsert(dataToInsertOrUpdate, { onConflict: 'domain' }) // migration'da domain'i UNIQUE yapmıştık
          .select('id')
          .single();

        if (upsertError) throw new Error(`scraped_data upsert hatası: ${upsertError.message}`);
        if (!upsertedData) throw new Error('scraped_data ID alınamadı');

        // Product Details'i de Ekle/Güncelle
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
        // Hata durumunda bile devam et
      }
    };
    
    // Satırları paralel olarak işle
    for await (const _ of pooledMap(CONCURRENCY_LIMIT, batchRows, processRow)) {
      // İşlemlerin bitmesini bekle
    }

    // 5. Bir sonraki batch'i tetikle
    const nextBatchIndex = batchIndex + 1;
    const functionUrl = `${Deno.env.get('VITE_SUPABASE_URL')}/functions/v1/import-csv`;
    
    // ÖNEMLİ: Yeni fonksiyonu 'await' KULLANMADAN çağırıyoruz (fire-and-forget)
    // Bu sayede mevcut fonksiyon 60 saniye dolmadan yanıt dönebilir.
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
      status: 202, // 202 Accepted (İşlem kabul edildi, devam ediyor)
    });

  } catch (error) {
    // İşlemde genel bir hata olursa Job'u 'failed' yap
    // (jobId'yi payload'dan okumaya çalış, okuyamazsan 'unknown_job')
    const jobId = (await req.json().catch(() => ({})))?.jobId || 'unknown_job';
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