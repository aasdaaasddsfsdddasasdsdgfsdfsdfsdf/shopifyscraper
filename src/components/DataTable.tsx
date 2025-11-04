import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, FileJson, Search, Loader2, Filter } from 'lucide-react';
import { ScrapedData } from '../lib/supabase';
import { exportToCSV, exportToJSON } from '../lib/export';
import { ListingCheckbox } from './ListingCheckbox'; 

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
  searchTerm,
  setSearchTerm,
  filterDomain,
  setFilterDomain,
  filterStatus,
  setFilterStatus,
  filterCurrency,
  setFilterCurrency,
  filterLanguage,
  setFilterLanguage,
  filterTitle,
  setFilterTitle,
  filterListedurum, 
  setFilterListedurum 
}: DataTableProps) {
  
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [localFilterDomain, setLocalFilterDomain] = useState(filterDomain);
  const [localFilterStatus, setLocalFilterStatus] = useState(filterStatus);
  const [localFilterCurrency, setLocalFilterCurrency] = useState(filterCurrency);
  const [localFilterLanguage, setLocalFilterLanguage] = useState(filterLanguage);
  const [localFilterTitle, setLocalFilterTitle] = useState(filterTitle);
  const [localFilterListedurum, setLocalFilterListedurum] = useState(filterListedurum);


  const handleFilterApply = () => {
    setSearchTerm(localSearchTerm);
    setFilterDomain(localFilterDomain);
    setFilterStatus(localFilterStatus);
    setFilterCurrency(localFilterCurrency);
    setFilterLanguage(localFilterLanguage);
    setFilterTitle(localFilterTitle);
    setFilterListedurum(localFilterListedurum); 
  };

  const handleFilterClear = () => {
    const isParentStateDirty = searchTerm || filterDomain || filterStatus !== 'all' ||
      filterCurrency || filterLanguage || filterTitle ||
      filterListedurum !== 'all'; 

    setLocalSearchTerm('');
    setLocalFilterDomain('');
    setLocalFilterStatus('all');
    setLocalFilterCurrency('');
    setLocalFilterLanguage('');
    setLocalFilterTitle('');
    setLocalFilterListedurum('all'); 

    if (isParentStateDirty) {
      setSearchTerm('');
      setFilterDomain('');
      setFilterStatus('all');
      setFilterCurrency('');
      setFilterLanguage('');
      setFilterTitle('');
      setFilterListedurum('all'); 
    }
  };

  useEffect(() => {
    setLocalSearchTerm(searchTerm);
    setLocalFilterDomain(filterDomain);
    setLocalFilterStatus(filterStatus);
    setLocalFilterCurrency(filterCurrency);
    setLocalFilterLanguage(filterLanguage);
    setLocalFilterTitle(filterTitle);
    setLocalFilterListedurum(filterListedurum); 
  }, [searchTerm, filterDomain, filterStatus, filterCurrency, filterLanguage, filterTitle, filterListedurum]); 


  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-gray-500 mt-2">Loading data...</p>
      </div>
    );
  }

  // --- FİLTRE KONTROLLERİ (Değişiklik yok) ---
  const filterControls = (
    <div className="p-4 border-b border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Scraped Data ({totalRecords.toLocaleString()} records)
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(allData)}
            disabled={allData.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:bg-gray-400"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => exportToJSON(allData)}
            disabled={allData.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:bg-gray-400"
          >
            <FileJson className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Genel Arama..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            title="Tüm sütunlarda (veya) arar: Domain, Başlık, Tarih, Para Birimi, Dil"
          />
        </div>

        <input
          type="text"
          placeholder="Filtrele: Ürün Başlığı..."
          value={localFilterTitle}
          onChange={(e) => setLocalFilterTitle(e.target.value)}
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
          placeholder="Filtrele: Dil..."
          value={localFilterLanguage}
          onChange={(e) => setLocalFilterLanguage(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <input
          type="text"
          placeholder="Filtrele: Para Birimi..."
          value={localFilterCurrency}
          onChange={(e) => setLocalFilterCurrency(e.target.value)}
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

        {(localSearchTerm || localFilterDomain || localFilterStatus !== 'all' ||
          localFilterCurrency || localFilterLanguage || localFilterTitle ||
          localFilterListedurum !== 'all'
         ) && (
          <button
            onClick={handleFilterClear}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
          >
            Filtreleri Temizle
          </button>
        )}
      </div>
    </div>
  );
  
  if (!isLoading && totalRecords === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filterControls}
        <div className="p-8 text-center">
          <p className="text-gray-500">
            {searchTerm || filterDomain || filterStatus !== 'all' ||
             filterCurrency || filterLanguage || filterTitle ||
             filterListedurum !== 'all'
              ? 'Filtrelerinizle eşleşen kayıt bulunamadı.'
              : 'No data available. Start a scraping job to see results.'
            }
          </p>
        </div>
      </div>
    );
  }

  // --- TBODY VE THEAD GÜNCELLENDİ (Yeni CSV sütunları eklendi) ---
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {filterControls}

      {/* Tablonun yatayda kaydırılabilir olması için div eklendi */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1600px]"> {/* Minimum genişlik ayarlandı */}
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Domain
              </th>
              
              {/* --- YENİ SÜTUN BAŞLIKLARI --- */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Niche
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ciro
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trafik
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ürün Sayısı
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                App
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Theme
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ad Link
              </th>
              {/* --- BİTTİ --- */}

              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Currency
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Language
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Products
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İnceleyen
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Liselensin mi?
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.date}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  <a
                    href={`https://${row.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {row.domain}
                  </a>
                </td>
                
                {/* --- YENİ SÜTUN VERİLERİ --- */}
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.niche || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.ciro || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.trafik || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.product_count ?? '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.app || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.theme || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate" title={row.adlink || undefined}>
                  {row.adlink || '-'}
                </td>
                {/* --- BİTTİ --- */}

                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.currency || '-'}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  {row.language || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    row.product_details?.status === 'open'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {row.product_details?.status?.toUpperCase() || 'BİLİNMİYOR'}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate" title={row.product_details?.title}>
                  {row.product_details?.title || '-'}
                </td>
                
                <td className="px-4 py-4 py-3">
                  {row.product_details?.status === 'open' && row.product_details?.images?.length > 0 ? (
                    <div className="flex gap-2">
                      {row.product_details.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <a
                            href={img}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View full image"
                          >
                            <img
                              src={img}
                              alt={`Product ${idx + 1}`}
                              className="w-12 h-12 rounded object-cover border border-gray-200 group-hover:border-blue-500 transition-colors cursor-pointer"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect fill="%23f0f0f0" width="48" height="48"/%3E%3Ctext x="50%25" y="50%25" font-size="12" fill="%23999" text-anchor="middle" dy=".3em"%3EError%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <img
                              src={img}
                              alt="Product preview"
                              className="hidden lg:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[300px] h-[300px] object-cover rounded-md shadow-lg border-4 border-white z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">
                      {row.product_details?.status === 'closed' ? 'KAPALI' : 'No images'}
                    </span>
                  )}
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.inceleyen || '-'}
                </td>
                <td className="px-4 py-4 text-center">
                  <ListingCheckbox
                    rowId={row.id}
                    initialValue={row.listedurum}
                    currentUser={currentUser}
                  />
                </td>
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
    </div>
  );
}