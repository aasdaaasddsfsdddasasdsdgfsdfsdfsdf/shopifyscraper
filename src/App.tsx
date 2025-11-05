import { useState, useEffect, useCallback, memo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Database, UserCheck, Loader2, 
  ChevronLeft, ChevronRight, Search, Filter, 
  ExternalLink, Settings2, X,
  CheckSquare,
  DollarSign, 
  Euro, 
  Briefcase 
} from 'lucide-react';

// =================================================================================
// 1. SUPABASE KURULUMU
// =================================================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SABİT LİSTE
const REVIEWERS = ['Efkan', 'Mert', 'Furkan'];

// --- GÜNCELLENDİ: Yeni şemaya göre ScrapedData arayüzü ---
export interface ScrapedData {
  id: string;
  date: string;
  domain: string;
  "Currency": string | null; 
  language: string | null;
  created_at: string;
  
  listedurum: boolean | null; 
  inceleyen: string | null;
  
  ciro: string | null;
  adlink: string | null;
  niche: string | null;
  product_count: string | null; 
  trafik: string | null;
  app: string | null;
  theme: string | null;

  // --- YENİ ŞEMA SÜTUNLARI ---
  "Durum": string | null; 
  title: string | null; 
  product_error: string | null;
  image1: string | null; 
  image2: string | null; 
  image3: string | null; 
  
  pazar: string | null;
}

// --- Veri Kartları için arayüz ---
interface StatsData {
  toplam: number;
  tr: number;
  usd: number;
  eu: number;
}
// === DEĞİŞİKLİK 1: İnceleyen Kişi Sayıları için Arayüz ===
interface ReviewerStat {
  name: string;
  count: number;
}
// === DEĞİŞİKLİK 1 SONU ===


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

// ... exportToCSV ve exportToJSON fonksiyonları (değişiklik yok) ...
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
      row.date, escapeCSV(row.domain), escapeCSV(row.niche), escapeCSV(row.ciro),
      escapeCSV(row.trafik), escapeCSV(row.product_count), escapeCSV(row.app),
      escapeCSV(row.theme), escapeCSV(row.adlink), escapeCSV(row["Currency"]), 
      escapeCSV(row.language), escapeCSV(row["Durum"]), escapeCSV(row.title),      
      escapeCSV(row.image1), escapeCSV(row.image2), escapeCSV(row.image3),     
      escapeCSV(row.product_error), String(row.listedurum), escapeCSV(row.inceleyen),
      escapeCSV(row.pazar),
    ];
    csvRows.push(values.join(','));
  }
  const csvContent = csvRows.join('\n');
  downloadFile(csvContent, 'scraped-data.csv', 'text/csv');
}

export function exportToJSON(data: ScrapedData[]): void {
  const jsonData = data.map(row => ({
    date: row.date, domain: row.domain, niche: row.niche, ciro: row.ciro,
    trafik: row.trafik, product_count: row.product_count, app: row.app,
    theme: row.theme, adlink: row.adlink, Currency: row["Currency"], 
    language: row.language, listedurum: row.listedurum, inceleyen: row.inceleyen,
    status: row["Durum"], title: row.title, image1: row.image1,        
    image2: row.image2, image3: row.image3, product_error: row.product_error,
    pazar: row.pazar,
  }));
  const jsonContent = JSON.stringify(jsonData, null, 2);
  downloadFile(jsonContent, 'scraped-data.json', 'application/json');
}

// =================================================================================
// 3. YARDIMCI BİLEŞENLER (COMPONENTS)
// =================================================================================

// --- ListingDropdown Bileşeni (Değişiklik yok) ---
interface ListingDropdownProps {
  rowId: string;
  initialValue: boolean | null;
  currentUser: string;
}
const ListingDropdown = memo(({ rowId, initialValue, currentUser }: ListingDropdownProps) => {
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { 
    setCurrentValue(initialValue); 
  }, [initialValue]);

  const getValueAsString = (val: boolean | null): string => {
    if (val === true) return "true";
    if (val === false) return "false";
    return "unset"; 
  };
  
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!currentUser) { 
      alert('Lütfen işlem yapmadan önce "İnceleyen Kişi" seçimi yapın.'); 
      e.target.value = getValueAsString(currentValue); 
      return; 
    }
    
    const newValueString = e.target.value; 
    
    let newValue: boolean | null;
    if (newValueString === "true") {
      newValue = true;
    } else if (newValueString === "false") {
      newValue = false;
    } else {
      newValue = null; 
    }

    setIsLoading(true);
    setCurrentValue(newValue); 

    const { error } = await supabase
      .from('scraped_data')
      .update({ 
        listedurum: newValue, 
        inceleyen: newValue === null ? null : currentUser 
      })
      .eq('id', rowId);
      
    if (error) { 
      console.error('Update error:', error); 
      setCurrentValue(initialValue); 
      alert(`Hata: ${error.message}`); 
    }
    setIsLoading(false);
  };

  const selectValue = getValueAsString(currentValue);

  return (
    <div className="flex items-center justify-center">
      {isLoading ? (<Loader2 className="w-4 h-4 animate-spin text-blue-500" />) : (
        <select
          value={selectValue} 
          onChange={handleChange}
          disabled={!currentUser}
          className={`w-28 px-2 py-1 border rounded-md text-sm font-medium ${
            !currentUser ? 'cursor-not-allowed opacity-50 bg-gray-100' : 'cursor-pointer'
          } ${
            selectValue === 'true' 
              ? 'bg-green-100 text-green-800 border-green-200' 
            : selectValue === 'false'
              ? 'bg-red-100 text-red-800 border-red-200'
              : 'bg-gray-100 text-gray-700 border-gray-200'
          }`}
          title={!currentUser ? 'İşlem yapmak için inceleyen kişi seçmelisiniz' : 'Listeleme durumunu değiştir'}
        >
          <option value="unset">Seçim Yapın</option> 
          <option value="true">Evet</option>
          <option value="false">Hayır</option>
        </select>
      )}
    </div>
  );
});


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

// --- StatsCards Bileşeni (Değişiklik yok) ---
interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  isLoading: boolean;
}

const StatsCard = ({ title, value, icon: Icon, color, isLoading }: StatsCardProps) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <div className="text-sm font-medium text-gray-500">{title}</div>
      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mt-1" />
      ) : (
        <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
      )}
    </div>
  </div>
);

interface StatsCardsProps {
  stats: StatsData | null;
  isLoading: boolean;
}

const StatsCards = ({ stats, isLoading }: StatsCardsProps) => (
  <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
    <StatsCard
      title="Toplam İnceleme"
      value={stats?.toplam ?? 0}
      icon={CheckSquare}
      color="bg-blue-500"
      isLoading={isLoading}
    />
    <StatsCard
      title="TR Pazarı (TRY)"
      value={stats?.tr ?? 0}
      icon={Briefcase}
      color="bg-red-500"
      isLoading={isLoading}
    />
    <StatsCard
      title="USD Pazarı"
      value={stats?.usd ?? 0}
      icon={DollarSign}
      color="bg-green-500"
      isLoading={isLoading}
    />
    <StatsCard
      title="EU Pazarı (EUR)"
      value={stats?.eu ?? 0}
      icon={Euro}
      color="bg-yellow-500"
      isLoading={isLoading}
    />
  </div>
);


// --- DataTable Bileşeni (Varsayılan Sütunlar ve Ekrana Sığdırma Güncellendi) ---
const ALL_COLUMNS = [
  { key: 'date', label: 'Date', defaultVisible: false },
  { key: 'domain', label: 'Domain', defaultVisible: true },
  { key: 'niche', label: 'Niche', defaultVisible: false },
  { key: 'ciro', label: 'Ciro', defaultVisible: true },
  { key: 'trafik', label: 'Trafik', defaultVisible: false },
  { key: 'product_count', label: 'Ürün Sayısı', defaultVisible: false },
  { key: 'app', label: 'App', defaultVisible: false },
  { key: 'theme', label: 'Theme', defaultVisible: false },
  { key: 'adlink', label: 'Ad Link', defaultVisible: true },
  { key: 'Currency', label: 'Currency', defaultVisible: false },
  { key: 'language', label: 'Language', defaultVisible: false },
  { key: 'Durum', label: 'Status', defaultVisible: false },
  { key: 'title', label: 'Product Title', defaultVisible: true },
  { key: 'images', label: 'Products', defaultVisible: true },
  { key: 'inceleyen', label: 'İnceleyen', defaultVisible: true },
  { key: 'listedurum', label: 'Listelensin mi?', defaultVisible: true },
  { key: 'pazar', label: 'Pazar', defaultVisible: false },
];

// === DEĞİŞİKLİK 2: DataTableProps güncellendi ===
interface DataTableProps {
  data: ScrapedData[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  allData: ScrapedData[]; 
  isLoading: boolean;
  currentUser: string; 
  setCurrentUser: (value: string) => void; // Eklendi
  reviewers: string[]; // Bu artık kullanılmayacak, reviewerStats kullanılacak
  reviewerStats: ReviewerStat[]; // Eklendi
  isStatsLoading: boolean; // Eklendi
  
  // Filtreler ve Setter'ları
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterDomain: string;
  setFilterDomain: (value: string) => void;
  filterStatus: string; 
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
// === DEĞİŞİKLİK 2 SONU ===

const DataTable = memo(({
  data,
  currentPage,
  totalPages,
  totalRecords,
  onPageChange,
  isLoading,
  currentUser,
  // === DEĞİŞİKLİK 3: Yeni proplar alındı ===
  setCurrentUser,
  reviewerStats,
  isStatsLoading,
  // === DEĞİŞİKLİK 3 SONU ===
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
          Veri Sayısı ({totalRecords.toLocaleString()} records)
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
      
      {/* === DEĞİŞİKLİK 4: Filtre Gridi Güncellendi (UserSelector eklendi) === */}
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
        
        <select
          value={localFilterListedurum}
          onChange={(e) => setLocalFilterListedurum(e.target.value as 'all' | 'true' | 'false')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Tüm Listeleme</option>
          <option value="true">Evet</option>
          <option value="false">Hayır</option>
        </select>
        
        <select value={localFilterInceleyen} onChange={(e) => setLocalFilterInceleyen(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="all">Filtrele: İnceleyen</option>
          {/* İnceleyen listesi artık statik REVIEWERS listesinden geliyor */}
          {REVIEWERS.map(r => (<option key={r} value={r}>{r}</option>))}
        </select>
        
        <button onClick={handleFilterApply} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
          <Filter className="w-4 h-4" /> Filtrele
        </button>
        
        <button onClick={handleFilterClear} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors">
          Filtreleri Temizle
        </button>
        
        {/* İnceleyen Kişi Seçimi (Sayılarla Birlikte) Buraya Taşındı */}
        <select
          id="user-selector"
          value={currentUser}
          onChange={(e) => setCurrentUser(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          title="İşlem yapmak için inceleyen kişiyi seçin"
        >
          <option value="">İnceleyen Seç...</option>
          {reviewerStats.map(stat => (
            <option key={stat.name} value={stat.name}>
              {stat.name} ({isStatsLoading ? '...' : stat.count})
            </option>
          ))}
        </select>
      </div>
      {/* === DEĞİŞİKLİK 4 SONU === */}
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
              : 'Veri bulunamadı.'
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
            <table className="w-full">
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
                  {visibleColumns.includes('adlink') && <th className{...thCell}>Ad Link</th>}
                  {visibleColumns.includes('Currency') && <th className={thCell}>Currency</th>}
                  {visibleColumns.includes('language') && <th className={thCell}>Language</th>}
                  {visibleColumns.includes('Durum') && <th className={thCell}>Status</th>}       
                  {visibleColumns.includes('title') && <th className={thCell}>Product Title</th>}  
                  {visibleColumns.includes('images') && <th className={thCell}>Products</th>}     
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
                    
                    {visibleColumns.includes('title') && (
                      <td className={`${tdCell} max-w-64 truncate`} title={row.title || undefined}>
                        {row.title || '-'}
                      </td>
                    )}
                    
                    {visibleColumns.includes('images') && (
                      <td className={tdCell}>
                        {(() => {
                          const images = [row.image1, row.image2, row.image3].filter(Boolean) as string[];
                          return String(row["Durum"]).toLowerCase() === 'open' && images.length > 0 ? (
                            <div className="flex gap-2">
                              {images.map((img, idx) => (
                                <img
                                  key={idx} 
                                  src={img} 
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
                    
                    {visibleColumns.includes('inceleyen') && <td className={`${tdCell} whitespace-nowrap`}>{row.inceleyen || '-'}</td>}
                    
                    {visibleColumns.includes('listedurum') && (
                      <td className={`${tdCell} text-center`}>
                        <ListingDropdown 
                          rowId={row.id} 
                          initialValue={row.listedurum} 
                          currentUser={currentUser} 
                        />
                      </td>
                    )}
                    
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
// REVIEWERS sabiti yukarı taşındı

function App() {
  const [currentUser, setCurrentUser] = useState('');
  
  const [data, setData] = useState<ScrapedData[]>([]);
  const [allData, setAllData] = useState<ScrapedData[]>([]); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Stats State
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [reviewerStats, setReviewerStats] = useState<ReviewerStat[]>([]); // Güncellendi
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // --- Filtre State'leri (Değişiklik yok) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all'); 
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

  // === DEĞİŞİKLİK 5: İstatistik Yükleme Fonksiyonu Güncellendi (İnceleyen Sayıları Eklendi) ===
  const loadStatsData = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      // Pazar Yeri İstatistikleri
      const toplamQuery = supabase.from('scraped_data').select('id', { count: 'exact', head: true }).eq('listedurum', true);
      const trQuery = supabase.from('scraped_data').select('id', { count: 'exact', head: true }).eq('listedurum', true).eq('"Currency"', 'TRY');
      const usdQuery = supabase.from('scraped_data').select('id', { count: 'exact', head: true }).eq('listedurum', true).eq('"Currency"', 'USD');
      const euQuery = supabase.from('scraped_data').select('id', { count: 'exact', head: true }).eq('listedurum', true).eq('"Currency"', 'EUR');

      // İnceleyen Kişi Sayıları (Sadece 'listedurum' true veya false olanlar, null olmayanlar)
      const reviewerCountPromises = REVIEWERS.map(name =>
        supabase
          .from('scraped_data')
          .select('id', { count: 'exact', head: true })
          .eq('inceleyen', name)
          .not('listedurum', 'is', null) // Sadece 'Evet' veya 'Hayır' dediklerini say
      );
      
      const [toplamRes, trRes, usdRes, euRes, ...reviewerResults] = await Promise.all([
        toplamQuery, 
        trQuery, 
        usdQuery, 
        euQuery, 
        ...reviewerCountPromises
      ]);

      // Pazar Yeri State'ini ayarla
      setStatsData({
        toplam: toplamRes.count || 0,
        tr: trRes.count || 0,
        usd: usdRes.count || 0,
        eu: euRes.count || 0,
      });
      
      // İnceleyen Kişi State'ini ayarla
      const newReviewerStats = reviewerResults.map((res, index) => ({
        name: REVIEWERS[index],
        count: res.count || 0,
      }));
      setReviewerStats(newReviewerStats);

    } catch (error) {
      console.error("Error loading stats data:", error);
      setStatsData(null);
      setReviewerStats([]);
    }
    setIsStatsLoading(false);
  }, []); // Bağımlılık yok, çünkü REVIEWERS artık sabit
  // === DEĞİŞİKLİK 5 SONU ===


  // --- Veri Yükleme Fonksiyonu (Filtreler için) ---
  const loadGridData = useCallback(async (page: number) => {
    setIsLoading(true);
    const offset = (page - 1) * ITEMS_PER_PAGE;

    let pageQuery = supabase
      .from('scraped_data')
      .select('*', { count: 'exact' }); 

    // Filtreler...
    if (filterDomain) pageQuery = pageQuery.ilike('domain', `%${filterDomain}%`);
    if (filterStatus !== 'all') pageQuery = pageQuery.eq('"Durum"', filterStatus); 
    if (filterCurrency) pageQuery = pageQuery.ilike('"Currency"', `%${filterCurrency}%`); 
    if (filterLanguage) pageQuery = pageQuery.ilike('language', `%${filterLanguage}%`);
    if (filterTitle) pageQuery = pageQuery.ilike('title', `%${filterTitle}%`); 
    
    if (filterListedurum !== 'all') {
      if (filterListedurum === 'true') {
        pageQuery = pageQuery.eq('listedurum', true);
      } else {
        pageQuery = pageQuery.or('listedurum.is.false,listedurum.is.null');
      }
    }
    
    if (filterNiche) pageQuery = pageQuery.ilike('niche', `%${filterNiche}%`);
    if (filterCiro) pageQuery = pageQuery.ilike('ciro', `%${filterCiro}%`);
    if (filterTrafik) pageQuery = pageQuery.ilike('trafik', `%${filterTrafik}%`);
    if (filterProductCount !== '') {
      pageQuery = pageQuery.gte('product_count', filterProductCount);
    }
    if (filterApp) pageQuery = pageQuery.ilike('app', `%${filterApp}%`);
    if (filterTheme) pageQuery = pageQuery.ilike('theme', `%${filterTheme}%`);
    if (filterInceleyen !== 'all') pageQuery = pageQuery.eq('inceleyen', filterInceleyen);

    if (searchTerm) {
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

    // --- Dışa Aktarım Sorgusu (Kaldırıldı ama allData state'i lazım olabilir diye duruyor) ---
    let allDataQuery = supabase
      .from('scraped_data')
      .select('*');

    if (filterDomain) allDataQuery = allDataQuery.ilike('domain', `%${filterDomain}%`);
    if (filterStatus !== 'all') allDataQuery = allDataQuery.eq('"Durum"', filterStatus);  
    if (filterCurrency) allDataQuery = allDataQuery.ilike('"Currency"', `%${filterCurrency}%`); 
    if (filterLanguage) allDataQuery = allDataQuery.ilike('language', `%${filterLanguage}%`);
    if (filterTitle) allDataQuery = allDataQuery.ilike('title', `%${filterTitle}%`); 
    if (filterListedurum !== 'all') {
       if (filterListedurum === 'true') {
        allDataQuery = allDataQuery.eq('listedurum', true);
      } else {
        allDataQuery = allDataQuery.or('listedurum.is.false,listedurum.is.null');
      }
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
          console.log('Veri değişikliği algılandı, grid ve statlar yenileniyor:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
             loadGridData(currentPage);
             loadStatsData(); 
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadGridData, currentPage, loadStatsData]); 
  
  
  // İlk yükleme
  useEffect(() => {
    loadGridData(1);
    loadStatsData();
  }, [loadGridData, loadStatsData]); 

  
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Roasell Veri Filtreleme ve Yönetme Arayüzü</h1>
          </div>
       
        </div>

        {/* Veri Kartları */}
        <StatsCards stats={statsData} isLoading={isStatsLoading} />

        {/* "İnceleyen Kişi" bloğu buradan kaldırıldı */}

        <DataTable
          data={data}
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
          allData={allData} 
          isLoading={isLoading}
          
          // === DEĞİŞİKLİK 6: Yeni proplar DataTable'a geçirildi ===
          currentUser={currentUser} 
          setCurrentUser={setCurrentUser}
          reviewerStats={reviewerStats}
          isStatsLoading={isStatsLoading}
          reviewers={REVIEWERS} // Bu hala filtre için kullanılıyor
          // === DEĞİŞİKLİK 6 SONU ===
          
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
        />
      </div>
    </div>
  );
}

export default App;