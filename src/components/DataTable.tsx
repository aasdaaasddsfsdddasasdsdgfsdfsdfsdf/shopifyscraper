import { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Download, FileJson, Search, Loader2, Filter, 
  ExternalLink, Settings2, EyeOff, CheckCheck 
} from 'lucide-react';
import { ScrapedData } from '../lib/supabase';
import { exportToCSV, exportToJSON } from '../lib/export';
import { ListingCheckbox } from './ListingCheckbox';
import { ImageModal } from './ImageModal'; // Yeni Modal bileşenini import et

// Sütunların tanımı
// 'key' veritabanı sütun adıyla (veya 'product_details.title' gibi) eşleşir
// 'label' arayüzde görünecek addır
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

// Prop arayüzü tüm filtreleri içerecek şekilde güncellendi
interface DataTableProps {
  data: ScrapedData[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  allData: ScrapedData[];
  isLoading: boolean;
  currentUser: string; 
  
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
  
  // Yeni filtre propları
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

export function DataTable({
  data,
  currentPage,
  totalPages,
  totalRecords,
  onPageChange,
  allData,
  isLoading,
  currentUser, 
  ...filterProps // Geri kalan tüm filtre proplarını tek bir objede topla
}: DataTableProps) {
  
  // --- YENİ: Sütun görünürlüğü ve Modal state'leri ---
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key)
  );
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // --- YENİ: Tüm filtreler için lokal state'ler ---
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
    // Parent state'i kontrol et
    const isParentStateDirty = Object.values(filterProps).some(val => 
      typeof val === 'string' ? val !== '' :
      typeof val === 'number' ? val !== '' :
      (val as 'all' | 'true' | 'false') !== 'all' // status ve listedurum için
    );

    // Lokal state'leri temizle
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

    // Sadece parent kirliyse (filtre uygulanmışsa) parent'ı güncelle
    if (isParentStateDirty) {
      handleFilterApply();
    }
  };

  // Prop'lar değiştiğinde lokal state'leri güncelle
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

  // Sütun görünürlüğünü yönet
  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-gray-500 mt-2">Loading data...</p>
      </div>
    );
  }

  // --- FİLTRE KONTROLLERİ TAMAMEN GÜNCELLENDİ ---
  const filterControls = (
    <div className="p-4 border-b border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Scraped Data ({totalRecords.toLocaleString()} records)
        </h3>
        <div className="flex gap-2">
          {/* Sütun Yönetim Düğmesi */}
          <div className="relative">
            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Settings2 className="w-4 h-4" />
              Sütunları Yönet
            </button>
            {/* Sütun Yönetim Dropdown */}
            {showColumnManager && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-20">
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

      {/* Grid 6 sütuna çıkarıldı */}
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
        
        {/* Yeni Filtre Inputları */}
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
        
        {/* Eski Filtreler */}
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

        {/* Butonlar */}
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
  
  // "No data" durumu
  if (!isLoading && totalRecords === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filterControls}
        <div className="p-8 text-center">
          <p className="text-gray-500">
            {Object.values(filterProps).some(v => !!v && v !== 'all')
              ? 'Filtrelerinizle eşleşen kayıt bulunamadı.'
              : 'No data available. Start a scraping job to see results.'
            }
          </p>
        </div>
      </div>
    );
  }

  // --- TABLO GÖVDESİ VE BAŞLIĞI (THEAD/TBODY) GÜNCELLENDİ ---
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Filtre ve Sütun Yöneticisi */}
      {filterControls}

      {/* Yatay Kaydırma */}
      <div className="overflow-x-auto">
        {/* Sütunların toplamına göre bir min-width ver */}
        <table className="w-full min-w-[2000px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {/* Sütunlar dinamik olarak render ediliyor */}
              {visibleColumns.includes('date') && <th className="th-cell">Date</th>}
              {visibleColumns.includes('domain') && <th className="th-cell">Domain</th>}
              {visibleColumns.includes('niche') && <th className="th-cell">Niche</th>}
              {visibleColumns.includes('ciro') && <th className="th-cell">Ciro</th>}
              {visibleColumns.includes('trafik') && <th className="th-cell">Trafik</th>}
              {visibleColumns.includes('product_count') && <th className="th-cell">Ürün Sayısı</th>}
              {visibleColumns.includes('app') && <th className="th-cell">App</th>}
              {visibleColumns.includes('theme') && <th className="th-cell">Theme</th>}
              {visibleColumns.includes('adlink') && <th className="th-cell">Ad Link</th>}
              {visibleColumns.includes('currency') && <th className="th-cell">Currency</th>}
              {visibleColumns.includes('language') && <th className="th-cell">Language</th>}
              {visibleColumns.includes('product_details.status') && <th className="th-cell">Status</th>}
              {visibleColumns.includes('product_details.title') && <th className="th-cell">Product Title</th>}
              {visibleColumns.includes('products') && <th className="th-cell">Products</th>}
              {visibleColumns.includes('inceleyen') && <th className="th-cell">İnceleyen</th>}
              {visibleColumns.includes('listedurum') && <th className="th-cell text-center">Listelensin mi?</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                
                {visibleColumns.includes('date') && <td className="td-cell whitespace-nowrap">{row.date}</td>}
                
                {visibleColumns.includes('domain') && (
                  <td className="td-cell whitespace-nowrap">
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
                
                {visibleColumns.includes('niche') && <td className="td-cell whitespace-nowrap">{row.niche || '-'}</td>}
                {visibleColumns.includes('ciro') && <td className="td-cell whitespace-nowrap">{row.ciro || '-'}</td>}
                {visibleColumns.includes('trafik') && <td className="td-cell whitespace-nowrap">{row.trafik || '-'}</td>}
                {visibleColumns.includes('product_count') && <td className="td-cell whitespace-nowrap">{row.product_count ?? '-'}</td>}
                
                {/* GÜNCELLENDİ: 'App' sütunu kısaltıldı */}
                {visibleColumns.includes('app') && (
                  <td className="td-cell max-w-xs truncate" title={row.app || undefined}>
                    {row.app || '-'}
                  </td>
                )}
                
                {visibleColumns.includes('theme') && <td className="td-cell whitespace-nowrap">{row.theme || '-'}</td>}
                
                {/* GÜNCELLENDİ: 'Ad Link' butona dönüştü */}
                {visibleColumns.includes('adlink') && (
                  <td className="td-cell">
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
                
                {visibleColumns.includes('currency') && <td className="td-cell whitespace-nowrap">{row.currency || '-'}</td>}
                {visibleColumns.includes('language') && <td className="td-cell whitespace-nowrap">{row.language || '-'}</td>}
                
                {visibleColumns.includes('product_details.status') && (
                  <td className="td-cell whitespace-nowrap">
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
                  <td className="td-cell max-w-xs truncate" title={row.product_details?.title}>
                    {row.product_details?.title || '-'}
                  </td>
                )}
                
                {/* GÜNCELLENDİ: Görseller artık modalı açıyor */}
                {visibleColumns.includes('products') && (
                  <td className="td-cell">
                    {row.product_details?.status === 'open' && row.product_details?.images?.length > 0 ? (
                      <div className="flex gap-2">
                        {row.product_details.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Product ${idx + 1}`}
                            className="w-12 h-12 rounded object-cover border border-gray-200 hover:border-blue-500 transition-colors cursor-pointer"
                            onClick={() => setSelectedImage(img)} // Modal'ı aç
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
                
                {visibleColumns.includes('inceleyen') && <td className="td-cell whitespace-nowrap">{row.inceleyen || '-'}</td>}
                
                {visibleColumns.includes('listedurum') && (
                  <td className="td-cell text-center">
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

      {/* Sayfalama */}
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

      {/* Görüntü Modalı */}
      {selectedImage && (
        <ImageModal 
          imageUrl={selectedImage} 
          onClose={() => setSelectedImage(null)} 
        />
      )}
    </div>
  );
}

// CSS Sınıflarını Tailwind için ekleyelim
// Bu (th-cell, td-cell) sınıfları DataTable.tsx içindedir ve normalde 
// index.css'e eklenebilir, ancak tek dosya tutarlılığı için burada
// (gerçekte kullanılmayan) bir yorum olarak ekliyorum.
/*
@layer components {
  .th-cell {
    @apply px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap;
  }
  .td-cell {
    @apply px-4 py-4 text-sm text-gray-900;
  }
}
*/
