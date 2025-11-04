import { useState, useEffect, useCallback, memo } from 'react'; // 'memo' import edildi
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import { 
  Database, UserCheck, Loader2, UploadCloud, CheckCircle, XCircle, 
  ChevronLeft, ChevronRight, Download, FileJson, Search, Filter, 
  ExternalLink, Settings2, EyeOff, CheckCheck, Pause, Calendar, PlayCircle, X 
} from 'lucide-react';

// =================================================================================
// 1. SUPABASE KURULUMU (src/lib/supabase.ts içeriği)
// =================================================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ScrapeJob {
  id: string;
  start_date: string;
  end_date: string;
  processing_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  total_records: number;
  created_at: string;
  updated_at: string;
}

export interface ProductDetails {
  id: string;
  scraped_data_id: string;
  status: 'open' | 'closed';
  title: string;
  images: string[];
  error?: string;
  created_at: string;
}

export interface ScrapedData {
  id: string;
  job_id: string;
  date: string;
  domain: string;
  currency: string | null; // CSV importu null olabilir
  language: string | null;
  created_at: string;
  
  product_details: ProductDetails; 
  
  listedurum: boolean;
  inceleyen: string | null;
  
  ciro: string | null;
  adlink: string | null;
  niche: string | null;
  product_count: number | null;
  trafik: string | null;
  app: string | null;
  theme: string | null;
}

// =================================================================================
// 2. EXPORT FONKSİYONLARI (src/lib/export.ts içeriği)
// =================================================================================

function escapeCSV(value: string | null | undefined | number | boolean): string {
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

export function exportToCSV(data: ScrapedData[]): void {
  if (data.length === 0) return;

  const headers = [
    'date', 'domain', 'niche', 'ciro', 'trafik', 'product_count', 'app', 
    'theme', 'adlink', 'currency', 'language', 'status', 'title', 
    'images', 'listedurum', 'inceleyen'
  ];
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const p = row.product_details; 
    
    const values = [
      row.date,
      escapeCSV(row.domain),
      escapeCSV(row.niche),
      escapeCSV(row.ciro),
      escapeCSV(row.trafik),
      escapeCSV(row.product_count),
      escapeCSV(row.app),
      escapeCSV(row.theme),
      escapeCSV(row.adlink),
      escapeCSV(row.currency),
      escapeCSV(row.language),
      escapeCSV(p?.status),
      escapeCSV(p?.title),
      escapeCSV(p?.images?.join(' | ')),
      String(row.listedurum),
      escapeCSV(row.inceleyen),
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
    niche: row.niche,
    ciro: row.ciro,
    trafik: row.trafik,
    product_count: row.product_count,
    app: row.app,
    theme: row.theme,
    adlink: row.adlink,
    currency: row.currency,
    language: row.language,
    listedurum: row.listedurum,
    inceleyen: row.inceleyen,
    product_status: row.product_details?.status,
    product_title: row.product_details?.title,
    product_images: row.product_details?.images,
    product_error: row.product_details?.error,
  }));

  const jsonContent = JSON.stringify(jsonData, null, 2);
  downloadFile(jsonContent, 'scraped-data.json', 'application/json');
}

// =================================================================================
// 3. SCRAPER FONKSİYONLARI (src/lib/scraper.ts içeriği) - ARTIK KULLANILMIYOR AMA SİLMEDİM
// =================================================================================

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
  products: ScrapedProductData;
}

export async function scrapeDate(dateStr: string): Promise<ScrapedRecord[]> {
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/scrape-merchant`;

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
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

export async function saveRecords(jobId: string, records: ScrapedRecord[]) {
  if (records.length === 0) return;

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
    }));

    const { data: insertedScrapedData, error: scrapedDataError } = await supabase
      .from('scraped_data')
      .insert(dataToInsert)
      .select('id'); 

    if (scrapedDataError || !insertedScrapedData) {
      console.error(`[saveRecords] Supabase insert error on scraped_data batch ${i}:`, scrapedDataError);
      throw new Error(`Failed to save scraped_data (batch ${i}): ${scrapedDataError?.message}`);
    }
    
    const productDetailsToInsert = batch.map((r, index) => {
      const scrapedDataId = insertedScrapedData[index]?.id;
      if (!scrapedDataId) return null;
      return {
        scraped_data_id: scrapedDataId,
        status: r.products.status,
        title: r.products.title,
        images: r.products.images,
        error: r.products.error || null,
      };
    }).filter(Boolean); 

    if (productDetailsToInsert.length > 0) {
      const { error: productDetailsError } = await supabase
        .from('product_details')
        .insert(productDetailsToInsert as any); 

      if (productDetailsError) {
        console.error(`[saveRecords] Supabase insert error on product_details batch ${i}:`, productDetailsError);
      }
    }
  }
  
  console.log(`[saveRecords] Successfully processed all ${records.length} records.`);
}

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

// =================================================================================
// 4. BİLEŞENLER (COMPONENTS) - 'App' DIŞINA TAŞINDI VE 'memo' KULLANILDI
// =================================================================================

// --- ListingCheckbox Bileşeni ---
interface ListingCheckboxProps {
  rowId: string;
  initialValue: boolean;
  currentUser: string;
}

const ListingCheckbox = memo(({ rowId, initialValue, currentUser }: ListingCheckboxProps) => {
  const [isChecked, setIsChecked] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  // Prop (veri) değiştiğinde lokal state'i senkronize et
  useEffect(() => {
    setIsChecked(initialValue);
  }, [initialValue]);

  const handleChange = async () => {
    if (!currentUser) {
      alert('Lütfen işlem yapmadan önce "İnceleyen Kişi" seçimi yapın.');
      return;
    }
    
    setIsLoading(true);
    const newValue = !isChecked;
    setIsChecked(newValue); // Optimistic update

    const { error } = await supabase
      .from('scraped_data')
      .update({
        listedurum: newValue,
        inceleyen: currentUser
      })
      .eq('id', rowId);

    if (error) {
      console.error('Update error:', error);
      setIsChecked(!newValue); // Hata varsa geri al
      alert(`Hata: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center">
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      ) : (
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleChange}
          disabled={!currentUser} 
          className={`w-5 h-5 rounded text-blue-600 focus:ring-blue-500 ${
            !currentUser ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
          title={!currentUser ? 'İşlem yapmak için inceleyen kişi seçmelisiniz' : (isChecked ? 'Listeden çıkar' : 'Listeye ekle')}
        />
      )}
    </div>
  );
});

// --- ImageModal Bileşeni ---
interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageModal = memo(({ imageUrl, onClose }: ImageModalProps) => {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 transition-opacity duration-300"
    >
      <div
        onClick={(e) => e.stopPropagation()} 
        className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl"
      >
        <img
          src={imageUrl}
          alt="Büyük ürün görseli"
          className="object-contain w-full h-auto max-h-[90vh] rounded-lg"
        />
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 z-10 p-2 bg-white rounded-full text-gray-700 hover:bg-gray-200 transition-colors shadow-lg"
          title="Kapat"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
});

// --- CsvImporter Bileşeni ---
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

interface CsvImporterProps {
  onImportComplete: () => void;
  setIsImporting: (isImporting: boolean) => void;
  disabled: boolean;
}

const CsvImporter = memo(({ onImportComplete, setIsImporting, disabled }: CsvImporterProps) => {
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

    let csvJobId: string | null = null;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: jobData, error: jobError } = await supabase
        .from('scrape_jobs')
        .insert({
          start_date: today,
          end_date: today,
          processing_date: today,
          status: 'completed',
          total_records: 0,
        })
        .select('id')
        .single();
      
      if (jobError) throw new Error(`CSV için 'job' kaydı oluşturulamadı: ${jobError.message}`);
      if (!jobData) throw new Error("CSV 'job' ID'si alınamadı.");
      
      csvJobId = jobData.id;

    } catch (err: any) {
      setError(`Başlangıç hatası: ${err.message}`);
      setIsImporting(false);
      return;
    }

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        setTotal(rows.length);
        let successfulRows = 0;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          setProgress(i + 1);

          if (!row.domain || !row.title) {
            console.warn(`[Satır ${i + 1}] 'domain' veya 'title' eksik, atlanıyor.`);
            continue;
          }

          try {
            let scrapedDataId: string | null = null;
            
            const { data: existingData, error: selectError } = await supabase
              .from('scraped_data')
              .select('id')
              .eq('domain', row.domain)
              .maybeSingle();
            
            if (selectError) {
              throw new Error(`scraped_data ARAMA Hatası: ${selectError.message}`);
            }

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
              job_id: csvJobId,
            };

            if (existingData) {
              scrapedDataId = existingData.id;
              const { error: updateError } = await supabase
                .from('scraped_data')
                .update(dataToInsertOrUpdate)
                .eq('id', scrapedDataId);
              
              if (updateError) {
                throw new Error(`scraped_data GÜNCELLEME Hatası: ${updateError.message}`);
              }
            } else {
              const { data: newData, error: insertError } = await supabase
                .from('scraped_data')
                .insert(dataToInsertOrUpdate)
                .select('id')
                .single();

              if (insertError) {
                throw new Error(`scraped_data EKLEME Hatası: ${insertError.message}`);
              }
              if (!newData) {
                throw new Error('scraped_data eklendi ancak ID geri dönmedi.');
              }
              scrapedDataId = newData.id;
            }
            
            const images = [row.image1, row.image2, row.image3].filter(Boolean) as string[];

            const { error: productDetailsError } = await supabase
              .from('product_details')
              .upsert(
                {
                  scraped_data_id: scrapedDataId,
                  title: row.title,
                  images: images,
                  status: 'open',
                },
                { onConflict: 'scraped_data_id' }
              );
            
            if (productDetailsError) {
              throw new Error(`product_details Hatası: ${productDetailsError.message}`);
            }
            successfulRows++;
          } catch (err: any) {
            setError(`[Satır ${i + 1} - ${row.domain}] Hata: ${err.message}. İşlem durduruldu.`);
            setIsImporting(false);
            return;
          }
        }
        
        if (csvJobId) {
          await supabase
            .from('scrape_jobs')
            .update({ total_records: successfulRows })
            .eq('id', csvJobId);
        }
        
        setSuccess(`${successfulRows} satır başarıyla işlendi.`);
        setIsImporting(false);
        onImportComplete();
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
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
          İçe Aktar
        </button>
      </div>
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
});


// --- DataTable Bileşeni ---
const ALL_COLUMNS = [
  { key: 'date', label: 'Date', defaultVisible: true },
  { key: 'domain', label: 'Domain', defaultVisible: true },
  { key: 'niche', label: 'Niche', defaultVisible: true },
  { key: 'ciro', label: 'Ciro', defaultVisible: true },
  { key: 'trafik', label: 'Trafik', defaultVisible: true },
  { key: 'product_count', label: 'Ürün Sayısı', defaultVisible: false },
  { key: 'app', label: 'App', defaultVisible: true },
  { key: 'theme', label: 'Theme', defaultVisible: false },
  { key: 'adlink', label: 'Ad Link', defaultVisible: true },
  { key: 'currency', label: 'Currency', defaultVisible: false },
  { key: 'language', label: 'Language', defaultVisible: false },
  { key: 'product_details.status', label: 'Status', defaultVisible: true },
  { key: 'product_details.title', label: 'Product Title', defaultVisible: true },
  { key: 'products', label: 'Products', defaultVisible: true },
  { key: 'inceleyen', label: 'İnceleyen', defaultVisible: true },
  { key: 'listedurum', label: 'Listelensin mi?', defaultVisible: true },
];

interface DataTableProps {
  data: ScrapedData[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  allData: ScrapedData[];
  isLoading: boolean;
  currentUser: string; 
  
  // Filtreler ve Setter'ları
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterDomain: string;
  setFilterDomain: (value: string) => void;
  filterStatus: 'all' | 'open' | 'closed';
  setFilterStatus: (value: 'all' | 'open' | 'closed') => void;
  filterCurrency: string;
  setFilterCurrency: (value: string) => void;
  filterLanguage: string;
  setFilterLanguage: (value: string) => void;
  filterTitle: string;
  setFilterTitle: (value: string) => void;
  filterListedurum: 'all' | 'true' | 'false';
  setFilterListedurum: (value: 'all' | 'true' | 'false') => void;
  filterNiche: string;
  setFilterNiche: (value: string) => void;
  filterCiro: string;
  setFilterCiro: (value: string) => void;
  filterTrafik: string;
  setFilterTrafik: (value: string) => void;
  filterProductCount: number | '';
  setFilterProductCount: (value: number | '') => void;
  filterApp: string;
  setFilterApp: (value: string) => void;
  filterTheme: string;
  setFilterTheme: (value: string) => void;
}

const DataTable = memo(({
  data,
  currentPage,
  totalPages,
  totalRecords,
  onPageChange,
  allData,
  isLoading,
  currentUser, 
  ...filterProps 
}: DataTableProps) => {
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key)
  );
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [localSearchTerm, setLocalSearchTerm] = useState(filterProps.searchTerm);
  const [localFilterDomain, setLocalFilterDomain] = useState(filterProps.filterDomain);
  const [localFilterStatus, setLocalFilterStatus] = useState(filterProps.filterStatus);
  const [localFilterCurrency, setLocalFilterCurrency] = useState(filterProps.filterCurrency);
  const [localFilterLanguage, setLocalFilterLanguage] = useState(filterProps.filterLanguage);
  const [localFilterTitle, setLocalFilterTitle] = useState(filterProps.filterTitle);
  const [localFilterListedurum, setLocalFilterListedurum] = useState(filterProps.filterListedurum);
  const [localFilterNiche, setLocalFilterNiche] = useState(filterProps.filterNiche);
  const [localFilterCiro, setLocalFilterCiro] = useState(filterProps.filterCiro);
  const [localFilterTrafik, setLocalFilterTrafik] = useState(filterProps.filterTrafik);
  const [localFilterProductCount, setLocalFilterProductCount] = useState(filterProps.filterProductCount);
  const [localFilterApp, setLocalFilterApp] = useState(filterProps.filterApp);
  const [localFilterTheme, setLocalFilterTheme] = useState(filterProps.filterTheme);

  const handleFilterApply = () => {
    filterProps.setSearchTerm(localSearchTerm);
    filterProps.setFilterDomain(localFilterDomain);
    filterProps.setFilterStatus(localFilterStatus);
    filterProps.setFilterCurrency(localFilterCurrency);
    filterProps.setFilterLanguage(localFilterLanguage);
    filterProps.setFilterTitle(localFilterTitle);
    filterProps.setFilterListedurum(localFilterListedurum);
    filterProps.setFilterNiche(localFilterNiche);
    filterProps.setFilterCiro(localFilterCiro);
    filterProps.setFilterTrafik(localFilterTrafik);
    filterProps.setFilterProductCount(localFilterProductCount);
    filterProps.setFilterApp(localFilterApp);
    filterProps.setFilterTheme(localFilterTheme);
  };

  const handleFilterClear = () => {
    setLocalSearchTerm('');
    setLocalFilterDomain('');
    setLocalFilterStatus('all');
    setLocalFilterCurrency('');
    setLocalFilterLanguage('');
    setLocalFilterTitle('');
    setLocalFilterListedurum('all');
    setLocalFilterNiche('');
    setLocalFilterCiro('');
    setLocalFilterTrafik('');
    setLocalFilterProductCount('');
    setLocalFilterApp('');
    setLocalFilterTheme('');

    // Parent state'i (App) de temizle
    filterProps.setSearchTerm('');
    filterProps.setFilterDomain('');
    filterProps.setFilterStatus('all');
    filterProps.setFilterCurrency('');
    filterProps.setFilterLanguage('');
    filterProps.setFilterTitle('');
    filterProps.setFilterListedurum('all');
    filterProps.setFilterNiche('');
    filterProps.setFilterCiro('');
    filterProps.setFilterTrafik('');
    filterProps.setFilterProductCount('');
    filterProps.setFilterApp('');
    filterProps.setFilterTheme('');
  };

  useEffect(() => {
    setLocalSearchTerm(filterProps.searchTerm);
    setLocalFilterDomain(filterProps.filterDomain);
    setLocalFilterStatus(filterProps.filterStatus);
    setLocalFilterCurrency(filterProps.filterCurrency);
    setLocalFilterLanguage(filterProps.filterLanguage);
    setLocalFilterTitle(filterProps.filterTitle);
    setLocalFilterListedurum(filterProps.filterListedurum);
    setLocalFilterNiche(filterProps.filterNiche);
    setLocalFilterCiro(filterProps.filterCiro);
    setLocalFilterTrafik(filterProps.filterTrafik);
    setLocalFilterProductCount(filterProps.filterProductCount);
    setLocalFilterApp(filterProps.filterApp);
    setLocalFilterTheme(filterProps.filterTheme);
  }, [filterProps]); 

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const filterControls = (
    <div className="p-4 border-b border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Scraped Data ({totalRecords.toLocaleString()} records)
        </h3>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Settings2 className="w-4 h-4" />
              Sütunları Yönet
            </button>
            {showColumnManager && (
              <div 
                className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-20"
                onMouseLeave={() => setShowColumnManager(false)}
              >
                <div className="p-2 font-semibold text-gray-800 border-b">
                  Sütunları Göster/Gizle
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {ALL_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{col.label}</span>
                    </label>
                  ))}
                </div>
                <div className="p-2 border-t flex gap-2">
                  <button onClick={() => setVisibleColumns(ALL_COLUMNS.map(c => c.key))} className="text-sm text-blue-600 hover:underline">Tümünü Seç</button>
                  <button onClick={() => setVisibleColumns([])} className="text-sm text-blue-600 hover:underline">Hiçbiri</button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => exportToCSV(allData)}
            disabled={allData.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:bg-gray-400"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={() => exportToJSON(allData)}
            disabled={allData.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:bg-gray-400"
          >
            <FileJson className="w-4 h-4" />
            JSON
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Genel Arama (Domain, Başlık, Niche, App...)"
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <input
          type="text"
          placeholder="Filtrele: Niche..."
          value={localFilterNiche}
          onChange={(e) => setLocalFilterNiche(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="text"
          placeholder="Filtrele: Ciro..."
          value={localFilterCiro}
          onChange={(e) => setLocalFilterCiro(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="text"
          placeholder="Filtrele: Trafik..."
          value={localFilterTrafik}
          onChange={(e) => setLocalFilterTrafik(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="number"
          placeholder="Filtrele: Min. Ürün Sayısı"
          value={localFilterProductCount}
          onChange={(e) => setLocalFilterProductCount(e.target.value === '' ? '' : parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="text"
          placeholder="Filtrele: Domain..."
          value={localFilterDomain}
          onChange={(e) => setLocalFilterDomain(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="text"
          placeholder="Filtrele: Ürün Başlığı..."
          value={localFilterTitle}
          onChange={(e) => setLocalFilterTitle(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="text"
          placeholder="Filtrele: App..."
          value={localFilterApp}
          onChange={(e) => setLocalFilterApp(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="text"
          placeholder="Filtrele: Theme..."
          value={localFilterTheme}
          onChange={(e) => setLocalFilterTheme(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="text"
          placeholder="Filtrele: Para Birimi..."
          value={localFilterCurrency}
          onChange={(e) => setLocalFilterCurrency(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="text"
          placeholder="Filtrele: Dil..."
          value={localFilterLanguage}
          onChange={(e) => setLocalFilterLanguage(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={localFilterStatus}
          onChange={(e) => setLocalFilterStatus(e.target.value as 'all' | 'open' | 'closed')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={localFilterListedurum}
          onChange={(e) => setLocalFilterListedurum(e.target.value as 'all' | 'true' | 'false')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Tüm Listeleme</option>
          <option value="true">Listelenenler</option>
          <option value="false">Listelenmeyenler</option>
        </select>
        <button
          onClick={handleFilterApply}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtrele
        </button>
        <button
          onClick={handleFilterClear}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
        >
          Filtreleri Temizle
        </button>
      </div>
    </div>
  );
  
  if (!isLoading && totalRecords === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filterControls}
        <div className="p-8 text-center">
          <p className="text-gray-500">
            {Object.keys(filterProps).some(key => {
              const val = filterProps[key as keyof typeof filterProps];
              return (typeof val === 'string' && val !== '') ||
                     (typeof val === 'number' && val !== '') ||
                     (val !== 'all' && typeof val !== 'function');
            })
              ? 'Filtrelerinizle eşleşen kayıt bulunamadı.'
              : 'No data available. Start a CSV import to see results.' // Scraper kaldırıldı
            }
          </p>
        </div>
      </div>
    );
  }

  const thCell = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap";
  const tdCell = "px-4 py-4 text-sm text-gray-900";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {filterControls}
      
      {isLoading && (
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-gray-500 mt-2">Veri yükleniyor...</p>
        </div>
      )}

      {!isLoading && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[2000px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {visibleColumns.includes('date') && <th className={thCell}>Date</th>}
                  {visibleColumns.includes('domain') && <th className={thCell}>Domain</th>}
                  {visibleColumns.includes('niche') && <th className={thCell}>Niche</th>}
                  {visibleColumns.includes('ciro') && <th className={thCell}>Ciro</th>}
                  {visibleColumns.includes('trafik') && <th className={thCell}>Trafik</th>}
                  {visibleColumns.includes('product_count') && <th className={thCell}>Ürün Sayısı</th>}
                  {visibleColumns.includes('app') && <th className={thCell}>App</th>}
                  {visibleColumns.includes('theme') && <th className={thCell}>Theme</th>}
                  {visibleColumns.includes('adlink') && <th className={thCell}>Ad Link</th>}
                  {visibleColumns.includes('currency') && <th className={thCell}>Currency</th>}
                  {visibleColumns.includes('language') && <th className={thCell}>Language</th>}
                  {visibleColumns.includes('product_details.status') && <th className={thCell}>Status</th>}
                  {visibleColumns.includes('product_details.title') && <th className{thCell}>Product Title</th>}
                  {visibleColumns.includes('products') && <th className={thCell}>Products</th>}
                  {visibleColumns.includes('inceleyen') && <th className={thCell}>İnceleyen</th>}
                  {visibleColumns.includes('listedurum') && <th className={`${thCell} text-center`}>Listelensin mi?</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    
                    {visibleColumns.includes('date') && <td className={`${tdCell} whitespace-nowrap`}>{row.date}</td>}
                    
                    {visibleColumns.includes('domain') && (
                      <td className={`${tdCell} whitespace-nowrap`}>
                        <a
                          href={`https://${row.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {row.domain}
                        </a>
                      </td>
                    )}
                    
                    {visibleColumns.includes('niche') && <td className={`${tdCell} whitespace-nowrap`}>{row.niche || '-'}</td>}
                    {visibleColumns.includes('ciro') && <td className={`${tdCell} whitespace-nowrap`}>{row.ciro || '-'}</td>}
                    {visibleColumns.includes('trafik') && <td className={`${tdCell} whitespace-nowrap`}>{row.trafik || '-'}</td>}
                    {visibleColumns.includes('product_count') && <td className={`${tdCell} whitespace-nowrap`}>{row.product_count ?? '-'}</td>}
                    
                    {visibleColumns.includes('app') && (
                      <td className={`${tdCell} max-w-xs truncate`} title={row.app || undefined}>
                        {row.app || '-'}
                      </td>
                    )}
                    
                    {visibleColumns.includes('theme') && <td className={`${tdCell} whitespace-nowrap`}>{row.theme || '-'}</td>}
                    
                    {visibleColumns.includes('adlink') && (
                      <td className={tdCell}>
                        {row.adlink ? (
                          <a
                            href={row.adlink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Git
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    )}
                    
                    {visibleColumns.includes('currency') && <td className={`${tdCell} whitespace-nowrap`}>{row.currency || '-'}</td>}
                    {visibleColumns.includes('language') && <td className={`${tdCell} whitespace-nowrap`}>{row.language || '-'}</td>}
                    
                    {visibleColumns.includes('product_details.status') && (
                      <td className={`${tdCell} whitespace-nowrap`}>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          row.product_details?.status === 'open'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {row.product_details?.status?.toUpperCase() || 'BİLİNMİYOR'}
                        </span>
                      </td>
                    )}
                    
                    {visibleColumns.includes('product_details.title') && (
                      <td className={`${tdCell} max-w-xs truncate`} title={row.product_details?.title}>
                        {row.product_details?.title || '-'}
                      </td>
                    )}
                    
                    {visibleColumns.includes('products') && (
                      <td className={tdCell}>
                        {row.product_details?.status === 'open' && row.product_details?.images?.length > 0 ? (
                          <div className="flex gap-2">
                            {row.product_details.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Product ${idx + 1}`}
                                className="w-12 h-12 rounded object-cover border border-gray-200 hover:border-blue-500 transition-colors cursor-pointer"
                                onClick={() => setSelectedImage(img)}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect fill="%23f0f0f0" width="48" height="48"/%3E%3Ctext x="50%25" y="50%25" font-size="12" fill="%23999" text-anchor="middle" dy=".3em"%3EError%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">
                            {row.product_details?.status === 'closed' ? 'KAPALI' : 'No images'}
                          </span>
                        )}
                      </td>
                    )}
                    
                    {visibleColumns.includes('inceleyen') && <td className={`${tdCell} whitespace-nowrap`}>{row.inceleyen || '-'}</td>}
                    
                    {visibleColumns.includes('listedurum') && (
                      <td className={`${tdCell} text-center`}>
                        <ListingCheckbox
                          rowId={row.id}
                          initialValue={row.listedurum}
                          currentUser={currentUser}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} ({data.length} visible of {totalRecords.toLocaleString()} matching records)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      {selectedImage && (
        <ImageModal 
          imageUrl={selectedImage} 
          onClose={() => setSelectedImage(null)} 
        />
      )}
    </div>
  );
});


// =================================================================================
// 5. ANA APP BİLEŞENİ (SADELEŞTİRİLDİ)
// =================================================================================

const ITEMS_PER_PAGE = 50;
const REVIEWERS = ['Efkan', 'Mert', 'Furkan'];

function App() {
  // Scraper ile ilgili state'ler kaldırıldı
  const [isImporting, setIsImporting] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  
  const [data, setData] = useState<ScrapedData[]>([]);
  const [allData, setAllData] = useState<ScrapedData[]>([]); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // --- Tüm Filtre State'leri ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterTitle, setFilterTitle] = useState('');
  const [filterListedurum, setFilterListedurum] = useState<'all' | 'true' | 'false'>('all');
  const [filterNiche, setFilterNiche] = useState('');
  const [filterCiro, setFilterCiro] = useState('');
  const [filterTrafik, setFilterTrafik] = useState('');
  const [filterProductCount, setFilterProductCount] = useState<number | ''>('');
  const [filterApp, setFilterApp] = useState('');
  const [filterTheme, setFilterTheme] = useState('');

  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  // --- Veri Yükleme Fonksiyonu (useCallback ile optimize edildi) ---
  const loadGridData = useCallback(async (page: number) => {
    setIsLoading(true);
    const offset = (page - 1) * ITEMS_PER_PAGE;

    let pageQuery = supabase
      .from('scraped_data')
      .select('*, product_details(*)', { count: 'exact' }); 

    if (filterDomain) pageQuery = pageQuery.ilike('domain', `%${filterDomain}%`);
    if (filterStatus !== 'all') pageQuery = pageQuery.eq('product_details.status', filterStatus);
    if (filterCurrency) pageQuery = pageQuery.ilike('currency', `%${filterCurrency}%`);
    if (filterLanguage) pageQuery = pageQuery.ilike('language', `%${filterLanguage}%`);
    if (filterTitle) pageQuery = pageQuery.ilike('product_details.title', `%${filterTitle}%`);
    if (filterListedurum !== 'all') {
      pageQuery = pageQuery.eq('listedurum', filterListedurum === 'true');
    }
    if (filterNiche) pageQuery = pageQuery.ilike('niche', `%${filterNiche}%`);
    if (filterCiro) pageQuery = pageQuery.ilike('ciro', `%${filterCiro}%`);
    if (filterTrafik) pageQuery = pageQuery.ilike('trafik', `%${filterTrafik}%`);
    if (filterProductCount !== '') {
      pageQuery = pageQuery.gte('product_count', filterProductCount);
    }
    if (filterApp) pageQuery = pageQuery.ilike('app', `%${filterApp}%`);
    if (filterTheme) pageQuery = pageQuery.ilike('theme', `%${filterTheme}%`);

    if (searchTerm) {
      const searchConditions = `domain.ilike.%${searchTerm}%,product_details.title.ilike.%${searchTerm}%,date.ilike.%${searchTerm}%,currency.ilike.%${searchTerm}%,language.ilike.%${searchTerm}%,niche.ilike.%${searchTerm}%,app.ilike.%${searchTerm}%`;
      pageQuery = pageQuery.or(searchConditions);
    }

    const { data: pageData, error: dataError, count } = await pageQuery
      .order('date', { ascending: false })
      .order('domain', { ascending: true }) 
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (dataError) {
      console.error('Error loading data:', dataError);
      setData([]);
      setTotalRecords(0);
    } else {
      setData(pageData as ScrapedData[] || []); 
      setTotalRecords(count || 0);
    }

    // Dışa Aktarım Sorgusu
    let allDataQuery = supabase
      .from('scraped_data')
      .select('*, product_details(*)');

    if (filterDomain) allDataQuery = allDataQuery.ilike('domain', `%${filterDomain}%`);
    if (filterStatus !== 'all') allDataQuery = allDataQuery.eq('product_details.status', filterStatus); 
    if (filterCurrency) allDataQuery = allDataQuery.ilike('currency', `%${filterCurrency}%`);
    if (filterLanguage) allDataQuery = allDataQuery.ilike('language', `%${filterLanguage}%`);
    if (filterTitle) allDataQuery = allDataQuery.ilike('product_details.title', `%${filterTitle}%`);
    if (filterListedurum !== 'all') {
      allDataQuery = allDataQuery.eq('listedurum', filterListedurum === 'true');
    }
    if (filterNiche) allDataQuery = allDataQuery.ilike('niche', `%${filterNiche}%`);
    if (filterCiro) allDataQuery = allDataQuery.ilike('ciro', `%${filterCiro}%`);
    if (filterTrafik) allDataQuery = allDataQuery.ilike('trafik', `%${filterTrafik}%`);
    if (filterProductCount !== '') {
      allDataQuery = allDataQuery.gte('product_count', filterProductCount);
    }
    if (filterApp) allDataQuery = allDataQuery.ilike('app', `%${filterApp}%`);
    if (filterTheme) allDataQuery = allDataQuery.ilike('theme', `%${filterTheme}%`);
    
    if (searchTerm) {
      const searchConditions = `domain.ilike.%${searchTerm}%,product_details.title.ilike.%${searchTerm}%,date.ilike.%${searchTerm}%,currency.ilike.%${searchTerm}%,language.ilike.%${searchTerm}%,niche.ilike.%${searchTerm}%,app.ilike.%${searchTerm}%`; 
      allDataQuery = allDataQuery.or(searchConditions);
    }

    const { data: fullData } = await allDataQuery
      .order('date', { ascending: false })
      .order('domain', { ascending: true });
    
    setAllData(fullData as ScrapedData[] || []);
    setIsLoading(false);

  }, [
    searchTerm, filterDomain, filterStatus, filterCurrency, filterLanguage, 
    filterTitle, filterListedurum, filterNiche, filterCiro, filterTrafik, 
    filterProductCount, filterApp, filterTheme
  ]); 
  
  // Scraper ile ilgili (loadLatestJob, resumeScraping) fonksiyonlar kaldırıldı
  
  useEffect(() => {
    loadGridData(1);  // Sadece grid'i yükle
  }, [loadGridData]); // Bağımlılık eklendi

  
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [
    searchTerm, filterDomain, filterStatus, filterCurrency, filterLanguage, 
    filterTitle, filterListedurum, filterNiche, filterCiro, filterTrafik, 
    filterProductCount, filterApp, filterTheme
  ]); 

  
  useEffect(() => {
    loadGridData(currentPage);
  }, [currentPage, loadGridData]); 

  // Scraper ile ilgili (handleStartScraping, handleContinueFromLast) fonksiyonlar kaldırıldı

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  
  const handleImportComplete = useCallback(() => {
    console.log("İçe aktarma tamamlandı, grid yenileniyor...");
    setIsImporting(false);
    loadGridData(1); 
  }, [loadGridData]);

  const userSelector = (
    <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <label htmlFor="user-selector" className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-2">
        <UserCheck className="w-5 h-5 text-blue-600" />
        İnceleyen Kişi
      </label>
      <select
        id="user-selector"
        value={currentUser}
        onChange={(e) => setCurrentUser(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="" disabled>Lütfen adınızı seçin...</option>
        {REVIEWERS.map(user => (
          <option key={user} value={user}>{user}</option>
        ))}
      </select>
      {!currentUser && (
        <p className="text-sm text-red-600 mt-2">
          Listeleme yapmak (checkbox'ları işaretlemek) için bir kullanıcı seçmeniz gerekmektedir.
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">MerchantGenius</h1>
          </div>
          <p className="text-gray-600">
            Toplu veri içe aktarma, filtreleme ve yönetme arayüzü
          </p>
        </div>

        {userSelector}

        {/* Scraper bölümü kaldırıldı, sadece CsvImporter kaldı */}
        <div className="mb-6">
          <CsvImporter 
            onImportComplete={handleImportComplete}
            setIsImporting={setIsImporting}
            disabled={isImporting} // Sadece isImporting'e bağlı
          />
        </div>

        <DataTable
          data={data}
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
          allData={allData} 
          isLoading={isLoading}
          currentUser={currentUser} 
          
          // Tüm filtreleri ve optimize edilmiş setter'ları DataTable'a yolla
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterDomain={filterDomain}
          setFilterDomain={setFilterDomain}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterCurrency={filterCurrency}
          setFilterCurrency={setFilterCurrency}
          filterLanguage={filterLanguage}
          setFilterLanguage={setFilterLanguage}
          filterTitle={filterTitle}
          setFilterTitle={setFilterTitle}
          filterListedurum={filterListedurum}
          setFilterListedurum={setFilterListedurum}
          filterNiche={filterNiche}
          setFilterNiche={setFilterNiche}
          filterCiro={filterCiro}
          setFilterCiro={setFilterCiro}
          filterTrafik={filterTrafik}
          setFilterTrafik={setFilterTrafik}
          filterProductCount={filterProductCount}
          setFilterProductCount={setFilterProductCount}
          filterApp={filterApp}
          setFilterApp={setFilterApp}
          filterTheme={filterTheme}
          setFilterTheme={setFilterTheme}
        />
      </div>
    </div>
  );
}

export default App;

