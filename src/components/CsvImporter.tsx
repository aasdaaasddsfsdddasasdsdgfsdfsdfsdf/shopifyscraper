import { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from 'npm run dev -- --force/lib/supabase';
import { Loader2, UploadCloud, CheckCircle, XCircle } from 'lucide-react';

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
}

interface CsvImporterProps {
  // Veri aktarımı tamamlandığında App.tsx'teki grid'i yenilemek için
  onImportComplete: () => void;
  // Aktarım sırasında diğer butonları (örn: Scrape) devre dışı bırakmak için
  setIsImporting: (isImporting: boolean) => void;
  // Başka bir işlem (örn: scraping) çalışıyorsa butonu devre dışı bırak
  disabled: boolean;
}

export function CsvImporter({ onImportComplete, setIsImporting, disabled }: CsvImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(null);
      setProgress(0);
      setTotal(0);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setSuccess(null);
    setProgress(0);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        setTotal(rows.length);

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          setProgress(i + 1);

          if (!row.domain || !row.title) {
            console.warn(`[Satır ${i + 1}] 'domain' veya 'title' eksik, atlanıyor.`);
            continue;
          }

          try {
            // 1. ADIM: `scraped_data`'ya ekle/güncelle (UPSERT)
            const { data: scrapedData, error: scrapedDataError } = await supabase
              .from('scraped_data')
              .upsert(
                {
                  domain: row.domain,
                  ciro: row.ciro || null,
                  adlink: row.adlink || null,
                  niche: row.niche || null,
                  product_count: parseInt(row.product_count || '0') || null,
                  trafik: row.trafik || null,
                  app: row.app || null,
                  theme: row.theme || null,
                  date: new Date().toISOString().split('T')[0],
                  job_id: 'csv-import',
                },
                { onConflict: 'domain' }
              )
              .select('id')
              .single();

            if (scrapedDataError) throw new Error(`scraped_data Hatası: ${scrapedDataError.message}`);
            if (!scrapedData) throw new Error('scraped_data ID alınamadı.');

            // 2. ADIM: `product_details`'e ekle/güncelle (UPSERT)
            const images = [row.image1, row.image2, row.image3].filter(Boolean) as string[];

            const { error: productDetailsError } = await supabase
              .from('product_details')
              .upsert(
                {
                  scraped_data_id: scrapedData.id,
                  title: row.title,
                  images: images,
                  status: 'open',
                },
                { onConflict: 'scraped_data_id' }
              );
            
            if (productDetailsError) throw new Error(`product_details Hatası: ${productDetailsError.message}`);

          } catch (err: any) {
            setError(`[Satır ${i + 1} - ${row.domain}] Hata: ${err.message}. İşlem durduruldu.`);
            setIsImporting(false);
            return; // Hata anında döngüden çık
          }
        }
        
        // İşlem bitti
        setSuccess(`${rows.length} satır başarıyla işlendi.`);
        setIsImporting(false);
        onImportComplete(); // Grid'i yenile
      },
      error: (err: any) => {
        setError(`CSV okuma hatası: ${err.message}`);
        setIsImporting(false);
      }
    });
  };

  const isLoading = progress > 0 && progress < total;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <UploadCloud className="w-5 h-5" />
        Toplu Veri İçe Aktarma (CSV)
      </h2>
      
      <div className="flex gap-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={isLoading || disabled}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50"
        />
        <button
          onClick={handleImport}
          disabled={!file || isLoading || disabled}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <UploadCloud className="w-5 h-5" />
          )}
          İçe Aktar
        </button>
      </div>

      {/* İlerleme ve Durum Mesajları */}
      {isLoading && (
        <div className="mt-4">
          <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
            <span>İşleniyor... ({progress} / {total})</span>
            <span>{Math.round((progress / total) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${(progress / total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 flex items-center gap-2 text-sm text-green-600 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 p-3 bg-red-50 rounded-lg">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}
    </div>
  );
}