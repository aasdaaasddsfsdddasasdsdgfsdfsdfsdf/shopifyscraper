import { useState, useEffect, useCallback, memo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Database, UserCheck, Loader2, 
  ChevronLeft, ChevronRight, Search, Filter, 
  ExternalLink, Settings2, X 
} from 'lucide-react';

// =================================================================================
// 1. SUPABASE KURULUMU
// =================================================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- GÜNCELLENDİ: Yeni şemaya göre ScrapedData arayüzü ---
export interface ScrapedData {
  id: string;
  date: string;
  domain: string;
  "Currency": string | null; // Şemaya göre büyük harf ve tırnaklı
  language: string | null;
  created_at: string;
  
  listedurum: boolean;
  inceleyen: string | null;
  
  ciro: string | null;
  adlink: string | null;
  niche: string | null;
  product_count: string | null; // Şemada 'text' olarak belirtilmiş
  trafik: string | null;
  app: string | null;
  theme: string | null;

  // --- YENİ ŞEMA SÜTUNLARI ---
  "Durum": string | null; // Şemaya göre büyük harf ve tırnaklı
  title: string | null; // Product başlığı
  product_error: string | null;
  image1: string | null; // Görsel 1
  image2: string | null; // Görsel 2
  image3: string | null; // Görsel 3
  
  pazar: string | null;
}

// =================================================================================
// 2. EXPORT FONKSİYONLARI (KODDA KULLANILMIYOR AMA SİLİNMEDİ)
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

// --- GÜNCELLENDİ: Yeni düz yapıdan veri okuyor ---
export function exportToCSV(data: ScrapedData[]): void {
  if (data.length === 0) return;

  const headers = [
    'date', 'domain', 'niche', 'ciro', 'trafik', 'product_count', 'app', 
    'theme', 'adlink', 'Currency', 'language', 'Durum', 'title', 
    'image1', 'image2', 'image3', 'product_error', 'listedurum', 'inceleyen', 'pazar'
  ];
  const csvRows = [headers.join(',')];

  for (const row of data) {
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
      escapeCSV(row["Currency"]), // Güncellendi
      escapeCSV(row.language),
      escapeCSV(row["Durum"]),    // Güncellendi
      escapeCSV(row.title),      // Güncellendi
      escapeCSV(row.image1),     // Güncellendi
      escapeCSV(row.image2),     // Güncellendi
      escapeCSV(row.image3),     // Güncellendi
      escapeCSV(row.product_error),
      String(row.listedurum),
      escapeCSV(row.inceleyen),
      escapeCSV(row.pazar),
    ];
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  downloadFile(csvContent, 'scraped-data.csv', 'text/csv');
}

// --- GÜNCELLENDİ: Yeni düz yapıdan veri okuyor ---
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
    Currency: row["Currency"], // Güncellendi
    language: row.language,
    listedurum: row.listedurum,
    inceleyen: row.inceleyen,
    status: row["Durum"],      // Güncellendi
    title: row.title,          // Güncellendi
    image1: row.image1,        // Güncellendi
    image2: row.image2,        // Güncellendi
    image3: row.image3,        // Güncellendi
    product_error: row.product_error,
    pazar: row.pazar,
  }));

  const jsonContent = JSON.stringify(jsonData, null, 2);
  downloadFile(jsonContent, 'scraped-data.json', 'application/json');
}


// =================================================================================
// 4. BİLEŞENLER (COMPONENTS)
// =================================================================================

// --- DEĞİŞİKLİK 1: Checkbox yerine Dropdown Bileşeni ---
interface ListingDropdownProps {
  rowId: string;
  initialValue: boolean;
  currentUser: string;
}
const ListingDropdown = memo(({ rowId, initialValue, currentUser }: ListingDropdownProps) => {
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { 
    setCurrentValue(initialValue); 
  }, [initialValue]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!currentUser) { 
      alert('Lütfen işlem yapmadan önce "İnceleyen Kişi" seçimi yapın.'); 
      // Seçimi eski haline getir
      e.target.value = String(currentValue);
      return; 
    }
    
    const newValueString = e.target.value;
    // "true" -> true, "false" -> false
    const newValueBoolean = newValueString === 'true'; 

    setIsLoading(true);
    setCurrentValue(newValueBoolean); // Optimistic update

    const { error } = await supabase
      .from('scraped_data')
      .update({ listedurum: newValueBoolean, inceleyen: currentUser })
      .eq('id', rowId);
      
    if (error) { 
      console.error('Update error:', error); 
      setCurrentValue(!newValueBoolean); // Revert on error
      alert(`Hata: ${error.message}`); 
    }
    setIsLoading(false);
  };

  // boolean (true) değerini string ("true") değere çeviririz
  const selectValue = String(currentValue);

  return (
    <div className="flex items-center justify-center">
      {isLoading ? (<Loader2 className="w-4 h-4 animate-spin text-blue-500" />) : (
        <select
          value={selectValue} // "true" veya "false"
          onChange={handleChange}
          disabled={!currentUser}
          className={`w-24 px-2 py-1 border border-gray-300 rounded-md text-sm font-medium ${
            !currentUser ? 'cursor-not-allowed opacity-50 bg-gray-100' : 'cursor-pointer'
          } ${
            // Duruma göre renklendirme
            selectValue === 'true' 
              ? 'bg-green-100 text-green-800 border-green-200' 
              : 'bg-red-100 text-red-800 border-red-200'
          }`}
          title={!currentUser ? 'İşlem yapmak için inceleyen kişi seçmelisiniz' : 'Listeleme durumunu değiştir'}
        >
          <option value="true">Evet</option>
          <option value="false">Hayır</option>
        </select>
      )}
    </div>
  );
});
// --- DEĞİŞİKLİK 1 SONU ---


// --- ImageModal Bileşeni (Değişiklik yok) ---
interface ImageModalProps { imageUrl: string; onClose: () => void; }
const ImageModal = memo(({ imageUrl, onClose }: ImageModalProps) => {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 transition-opacity duration-300">
      <div onClick={(e) => e.stopPropagation()} className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl">
        <img src={imageUrl} alt="Büyük ürün görseli" className="object-contain w-full h-auto max-h-[90vh] rounded-lg" />
        <button onClick={onClose} className="absolute -top-4 -right-4 z-10 p-2 bg-white rounded-full text-gray-700 hover:bg-gray-200 transition-colors shadow-lg" title="Kapat">
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
});


// --- DataTable Bileşeni (GÜNCELLENDİ) ---
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
  { key: 'Currency', label: 'Currency', defaultVisible: false }, // Güncellendi
  { key: 'language', label: 'Language', defaultVisible: false },
  { key: 'Durum', label: 'Status', defaultVisible: true },    // Güncellendi
  { key: 'title', label: 'Product Title', defaultVisible: true }, // Güncellendi
  { key: 'images', label: 'Products', defaultVisible: true }, // Bu sanal bir key, görsel sütununu temsil eder
  { key: 'inceleyen', label: 'İnceleyen', defaultVisible: true },
  { key: 'listedurum', label: 'Listelensin mi?', defaultVisible: true },
  { key: 'pazar', label: 'Pazar', defaultVisible: false },
];

interface DataTableProps {
  data: ScrapedData[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  allData: ScrapedData[]; // Bu prop artık kullanılmıyor (export kaldırıldığı için)
  isLoading: boolean;
  currentUser: string; 
  reviewers: string[];
  
  // Filtreler ve Setter'ları
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterDomain: string;
  setFilterDomain: (value: string) => void;
  filterStatus: string; // 'all' | 'open' | 'closed' | string;
  setFilterStatus: (value: string) => void;
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
  filterInceleyen: 'all' | string;
  setFilterInceleyen: (value: 'all' | string) => void;
}

const DataTable = memo(({
  data,
  currentPage,
  totalPages,
  totalRecords,
  onPageChange,
  // allData prop'u kaldırıldı
  isLoading,
  currentUser,
  reviewers,
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
  const [localFilterInceleyen, setLocalFilterInceleyen] = useState(filterProps.filterInceleyen);

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
    filterProps.setFilterInceleyen(localFilterInceleyen);
  };

  const handleFilterClear = () => {
    setLocalSearchTerm(''); setLocalFilterDomain(''); setLocalFilterStatus('all');
    setLocalFilterCurrency(''); setLocalFilterLanguage(''); setLocalFilterTitle('');
    setLocalFilterListedurum('all'); setLocalFilterNiche(''); setLocalFilterCiro('');
    setLocalFilterTrafik(''); setLocalFilterProductCount(''); setLocalFilterApp('');
    setLocalFilterTheme(''); setLocalFilterInceleyen('all');

    filterProps.setSearchTerm(''); filterProps.setFilterDomain(''); filterProps.setFilterStatus('all');
    filterProps.setFilterCurrency(''); filterProps.setFilterLanguage(''); filterProps.setFilterTitle('');
    filterProps.setFilterListedurum('all'); filterProps.setFilterNiche(''); filterProps.setFilterCiro('');
    filterProps.setFilterTrafik(''); filterProps.setFilterProductCount(''); filterProps.setFilterApp('');
    filterProps.setFilterTheme(''); filterProps.setFilterInceleyen('all');
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
    setLocalFilterInceleyen(filterProps.filterInceleyen);
  }, [
      filterProps.searchTerm, filterProps.filterDomain, filterProps.filterStatus,
      filterProps.filterCurrency, filterProps.filterLanguage, filterProps.filterTitle,
      filterProps.filterListedurum, filterProps.filterNiche, filterProps.filterCiro,
      filterProps.filterTrafik, filterProps.filterProductCount, filterProps.filterApp,
      filterProps.filterTheme, filterProps.filterInceleyen
  ]); 

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  // --- filterControls GÜNCELLENDİ (Export butonları kaldırıldı) ---
  const filterControls = (
    <div className="p-4 border-b border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Scraped Data ({totalRecords.toLocaleString()} records)
        </h3>
        <div className="flex gap-2">
          {/* Sütun Yönetimi */}
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
          {/* Export Butonları KALDIRILDI */}
        </div>
      </div>
      
      {/* Filtre Inputları (Değişiklik yok) */}
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
        <input type="text" placeholder="Filtrele: Niche..." value={localFilterNiche} onChange={(e) => setLocalFilterNiche(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input type="text" placeholder="Filtrele: Ciro..." value={localFilterCiro} onChange={(e) => setLocalFilterCiro(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input type="text" placeholder="Filtrele: Trafik..." value={localFilterTrafik} onChange={(e) => setLocalFilterTrafik(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input type="number" placeholder="Filtrele: Min. Ürün Sayısı" value={localFilterProductCount} onChange={(e) => setLocalFilterProductCount(e.target.value === '' ? '' : parseInt(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input type="text" placeholder="Filtrele: Domain..." value={localFilterDomain} onChange={(e) => setLocalFilterDomain(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input type="text" placeholder="Filtrele: Ürün Başlığı..." value={localFilterTitle} onChange={(e) => setLocalFilterTitle(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input type="text" placeholder="Filtrele: App..." value={localFilterApp} onChange={(e) => setLocalFilterApp(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input type="text" placeholder="Filtrele: Theme..." value={localFilterTheme} onChange={(e) => setLocalFilterTheme(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input type="text" placeholder="Filtrele: Para Birimi..." value={localFilterCurrency} onChange={(e) => setLocalFilterCurrency(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input type="text" placeholder="Filtrele: Dil..." value={localFilterLanguage} onChange={(e) => setLocalFilterLanguage(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <select value={localFilterStatus} onChange={(e) => setLocalFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="all">Tüm Durumlar</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        
        {/* === Listelensin mi? Filtresi (Evet/Hayır) === */}
        <select
          value={localFilterListedurum}
          onChange={(e) => setLocalFilterListedurum(e.target.value as 'all' | 'true' | 'false')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Tüm Listeleme</option>
          <option value="true">Evet</option>
          <option value="false">Hayır</option>
        </select>
        {/* === Filtre SONU === */}
        
        <select value={localFilterInceleyen} onChange={(e) => setLocalFilterInceleyen(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="all">Tüm İnceleyenler</option>
          {reviewers.map(r => (<option key={r} value={r}>{r}</option>))}
        </select>
        <button onClick={handleFilterApply} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
          <Filter className="w-4 h-4" /> Filtrele
        </button>
        <button onClick={handleFilterClear} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors">
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
              : 'Veri bulunamadı.' // Mesaj güncellendi
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
                  {visibleColumns.includes('Currency') && <th className={thCell}>Currency</th>}
                  {visibleColumns.includes('language') && <th className={thCell}>Language</th>}
                  {visibleColumns.includes('Durum') && <th className={thCell}>Status</th>}       {/* Güncellendi */}
                  {visibleColumns.includes('title') && <th className={thCell}>Product Title</th>}  {/* Güncellendi */}
                  {visibleColumns.includes('images') && <th className={thCell}>Products</th>}     {/* Güncellendi (sanal) */}
                  {visibleColumns.includes('inceleyen') && <th className={thCell}>İnceleyen</th>}
                  {visibleColumns.includes('listedurum') && <th className={`${thCell} text-center`}>Listelensin mi?</th>}
                  {visibleColumns.includes('pazar') && <th className={thCell}>Pazar</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    
                    {visibleColumns.includes('date') && <td className={`${tdCell} whitespace-nowrap`}>{row.date}</td>}
                    {visibleColumns.includes('domain') && (
                      <td className={`${tdCell} whitespace-nowrap`}>
                        <a href={`https://${row.domain}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                          {row.domain}
                        </a>
                      </td>
                    )}
                    {visibleColumns.includes('niche') && <td className={`${tdCell} whitespace-nowrap`}>{row.niche || '-'}</td>}
                    {visibleColumns.includes('ciro') && <td className={`${tdCell} whitespace-nowrap`}>{row.ciro || '-'}</td>}
                    {visibleColumns.includes('trafik') && <td className={`${tdCell} whitespace-nowrap`}>{row.trafik || '-'}</td>}
                    {visibleColumns.includes('product_count') && <td className={`${tdCell} whitespace-nowrap`}>{row.product_count ?? '-'}</td>}
                    {visibleColumns.includes('app') && <td className={`${tdCell} max-w-xs truncate`} title={row.app || undefined}>{row.app || '-'}</td>}
                    {visibleColumns.includes('theme') && <td className={`${tdCell} whitespace-nowrap`}>{row.theme || '-'}</td>}
                    {visibleColumns.includes('adlink') && (
                      <td className={tdCell}>
                        {row.adlink ? (
                          <a href={row.adlink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium">
                            <ExternalLink className="w-3.5 h-3.5" /> Git
                          </a>
                        ) : ('-')}
                      </td>
                    )}
                    {visibleColumns.includes('Currency') && <td className={`${tdCell} whitespace-nowrap`}>{row["Currency"] || '-'}</td>}
                    {visibleColumns.includes('language') && <td className={`${tdCell} whitespace-nowrap`}>{row.language || '-'}</td>}
                    
                    {/* --- GÜNCELLENDİ: Yeni düz yapıdan okuma --- */}
                    {visibleColumns.includes('Durum') && (
                      <td className={`${tdCell} whitespace-nowrap`}>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          String(row["Durum"]).toLowerCase() === 'open'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {row["Durum"]?.toUpperCase() || 'BİLİNMİYOR'}
                        </span>
                      </td>
                    )}
                    
                    {/* === DEĞİŞİKLİK 2: Title Genişliği Sınırlandı === */}
                    {visibleColumns.includes('title') && (
                      <td className={`${tdCell} max-w-64 truncate`} title={row.title || undefined}>
                        {row.title || '-'}
                      </td>
                    )}
                    {/* === DEĞİŞİKLİK 2 SONU === */}
                    
                    {visibleColumns.includes('images') && (
                      <td className={tdCell}>
                        {(() => {
                          // 1. ADIM: image1, image2, image3 sütunları bir diziye toplanır
                          const images = [row.image1, row.image2, row.image3].filter(Boolean) as string[];
                          
                          // 2. ADIM: "Durum" "open" ise ve görsel varsa, img etiketleri oluşturulur
                          return String(row["Durum"]).toLowerCase() === 'open' && images.length > 0 ? (
                            <div className="flex gap-2">
                              {images.map((img, idx) => (
                                <img
                                  key={idx} 
                                  src={img} // GÖRSEL BURADA KULLANILIYOR
                                  alt={`Product ${idx + 1}`}
                                  className="w-12 h-12 rounded object-cover border border-gray-200 hover:border-blue-500 transition-colors cursor-pointer"
                                  onClick={() => setSelectedImage(img)}
                                  onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect fill="%23f0f0f0" width="48" height="48"/%3E%3Ctext x="50%25" y="50%25" font-size="12" fill="%23999" text-anchor="middle" dy=".3em"%3EError%3C/text%3E%3C/svg%3E'; }}
                                />
                              ))}
                            </div>
                          ) : (<span className="text-gray-500 text-sm">{String(row["Durum"]).toLowerCase() === 'closed' ? 'KAPALI' : 'No images'}</span>);
                        })()}
                      </td>
                    )}
                    {/* --- GÜNCELLEME SONU --- */}
                    
                    {visibleColumns.includes('inceleyen') && <td className={`${tdCell} whitespace-nowrap`}>{row.inceleyen || '-'}</td>}
                    
                    {/* --- DEĞİŞİKLİK 3: Checkbox yerine Dropdown kullanılır --- */}
                    {visibleColumns.includes('listedurum') && (
                      <td className={`${tdCell} text-center`}>
                        <ListingDropdown 
                          rowId={row.id} 
                          initialValue={row.listedurum} 
                          currentUser={currentUser} 
                        />
                      </td>
                    )}
                    {/* --- DEĞİŞİKLİK 3 SONU --- */}
                    
                    {visibleColumns.includes('pazar') && <td className={`${tdCell} whitespace-nowrap`}>{row.pazar || '-'}</td>}
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
                <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      {selectedImage && (
        <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </div>
  );
});


// =================================================================================
// 5. ANA APP BİLEŞENİ (GÜNCELLENDİ)
// =================================================================================

const ITEMS_PER_PAGE = 50;
const REVIEWERS = ['Efkan', 'Mert', 'Furkan'];

function App() {
  const [currentUser, setCurrentUser] = useState('');
  
  const [data, setData] = useState<ScrapedData[]>([]);
  const [allData, setAllData] = useState<ScrapedData[]>([]); // 'allData' 'loadGridData' içinde hala kullanılıyor
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // --- Filtre State'leri (Değişiklik yok) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // Güncellendi
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
  const [filterInceleyen, setFilterInceleyen] = useState<'all' | string>('all');

  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  // --- Veri Yükleme Fonksiyonu (GÜNCELLENDİ) ---
  const loadGridData = useCallback(async (page: number) => {
    setIsLoading(true);
    const offset = (page - 1) * ITEMS_PER_PAGE;

    let pageQuery = supabase
      .from('scraped_data')
      .select('*', { count: 'exact' }); 

    // --- GÜNCELLENDİ: Filtreler yeni sütun adlarına göre ---
    if (filterDomain) pageQuery = pageQuery.ilike('domain', `%${filterDomain}%`);
    if (filterStatus !== 'all') pageQuery = pageQuery.eq('"Durum"', filterStatus); // Güncellendi
    if (filterCurrency) pageQuery = pageQuery.ilike('"Currency"', `%${filterCurrency}%`); // Güncellendi
    if (filterLanguage) pageQuery = pageQuery.ilike('language', `%${filterLanguage}%`);
    if (filterTitle) pageQuery = pageQuery.ilike('title', `%${filterTitle}%`); // Güncellendi
    if (filterListedurum !== 'all') {
      pageQuery = pageQuery.eq('listedurum', filterListedurum === 'true');
    }
    if (filterNiche) pageQuery = pageQuery.ilike('niche', `%${filterNiche}%`);
    if (filterCiro) pageQuery = pageQuery.ilike('ciro', `%${filterCiro}%`);
    if (filterTrafik) pageQuery = pageQuery.ilike('trafik', `%${filterTrafik}%`);
    if (filterProductCount !== '') {
      // product_count şemada text, ancak Supabase gte'yi sayısal stringler için yönetebilmeli
      pageQuery = pageQuery.gte('product_count', filterProductCount);
    }
    if (filterApp) pageQuery = pageQuery.ilike('app', `%${filterApp}%`);
    if (filterTheme) pageQuery = pageQuery.ilike('theme', `%${filterTheme}%`);
    if (filterInceleyen !== 'all') pageQuery = pageQuery.eq('inceleyen', filterInceleyen);

    if (searchTerm) {
      // Güncellendi: 'title' ve '"Currency"' eklendi
      const searchConditions = `domain.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,date.ilike.%${searchTerm}%,"Currency".ilike.%${searchTerm}%,language.ilike.%${searchTerm}%,niche.ilike.%${searchTerm}%,app.ilike.%${searchTerm}%`;
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

    // --- Dışa Aktarım Sorgusu (GÜNCELLENDİ) ---
    // (Export butonları kaldırılsa bile, allData'yı (veya export işlevselliğini)
    // gelecekte kullanmak üzere kodda bırakmak iyi bir pratiktir)
    let allDataQuery = supabase
      .from('scraped_data')
      .select('*');

    if (filterDomain) allDataQuery = allDataQuery.ilike('domain', `%${filterDomain}%`);
    if (filterStatus !== 'all') allDataQuery = allDataQuery.eq('"Durum"', filterStatus);  // Güncellendi
    if (filterCurrency) allDataQuery = allDataQuery.ilike('"Currency"', `%${filterCurrency}%`); // Güncellendi
    if (filterLanguage) allDataQuery = allDataQuery.ilike('language', `%${filterLanguage}%`);
    if (filterTitle) allDataQuery = allDataQuery.ilike('title', `%${filterTitle}%`); // Güncellendi
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
    if (filterInceleyen !== 'all') allDataQuery = allDataQuery.eq('inceleyen', filterInceleyen);
    
    if (searchTerm) {
      // Güncellendi
      const searchConditions = `domain.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,date.ilike.%${searchTerm}%,"Currency".ilike.%${searchTerm}%,language.ilike.%${searchTerm}%,niche.ilike.%${searchTerm}%,app.ilike.%${searchTerm}%`; 
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
    filterProductCount, filterApp, filterTheme, filterInceleyen
  ]); 
  
  
  // Veritabanı Değişikliklerini Dinle
  useEffect(() => {
    const channel = supabase
      .channel('scraped-data-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scraped_data' }, 
        (payload) => {
          console.log('Veri değişikliği algılandı, grid yenileniyor:', payload);
          loadGridData(currentPage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadGridData, currentPage]);
  
  
  useEffect(() => {
    loadGridData(1);
  }, [loadGridData]);

  
  // Filtreler değiştiğinde sayfayı sıfırla
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [
    searchTerm, filterDomain, filterStatus, filterCurrency, filterLanguage, 
    filterTitle, filterListedurum, filterNiche, filterCiro, filterTrafik, 
    filterProductCount, filterApp, filterTheme, filterInceleyen
  ]); 

  
  // Sayfa değiştiğinde veri yükle
  useEffect(() => {
    loadGridData(currentPage);
  }, [currentPage, loadGridData]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  
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
            Veri filtreleme ve yönetme arayüzü
          </p>
        </div>

        {userSelector}

        {/* --- Veri Yükleme Notu KALDIRILDI --- */}

        <DataTable
          data={data}
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
          allData={allData} 
          isLoading={isLoading}
          currentUser={currentUser} 
          
          // ... (Tüm filtre prop'ları) ...
          searchTerm={searchTerm} setSearchTerm={setSearchTerm}
          filterDomain={filterDomain} setFilterDomain={setFilterDomain}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          filterCurrency={filterCurrency} setFilterCurrency={setFilterCurrency}
          filterLanguage={filterLanguage} setFilterLanguage={setFilterLanguage}
          filterTitle={filterTitle} setFilterTitle={setFilterTitle}
          filterListedurum={filterListedurum} setFilterListedurum={setFilterListedurum}
          filterNiche={filterNiche} setFilterNiche={setFilterNiche}
          filterCiro={filterCiro} setFilterCiro={setFilterCiro}
          filterTrafik={filterTrafik} setFilterTrafik={setFilterTrafik}
          filterProductCount={filterProductCount} setFilterProductCount={setFilterProductCount}
          filterApp={filterApp} setFilterApp={setFilterApp}
          filterTheme={filterTheme} setFilterTheme={setFilterTheme}
          filterInceleyen={filterInceleyen} setFilterInceleyen={setFilterInceleyen}
          reviewers={REVIEWERS}
        />
      </div>
    </div>
  );
}

export default App;