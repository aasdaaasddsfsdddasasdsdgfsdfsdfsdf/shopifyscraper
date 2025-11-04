import { useState, useEffect } from 'react'; // useState ve useEffect import et
import { ChevronLeft, ChevronRight, Download, FileJson, Search, Loader2, Filter } from 'lucide-react'; // Filter ikonunu ekle
import { ScrapedData } from '../lib/supabase';
import { exportToCSV, exportToJSON } from '../lib/export';

interface DataTableProps {
  data: ScrapedData[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  allData: ScrapedData[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterDomain: string;
  setFilterDomain: (value: string) => void;
  filterStatus: 'all' | 'open' | 'closed';
  setFilterStatus: (value: 'all' | 'open' | 'closed') => void;
}

export function DataTable({
  data,
  currentPage,
  totalPages,
  totalRecords,
  onPageChange,
  allData,
  isLoading,
  searchTerm,
  setSearchTerm,
  filterDomain,
  setFilterDomain,
  filterStatus,
  setFilterStatus
}: DataTableProps) {
  
  // --- YENİ: Lokal Filtre State'leri ---
  // Input'ları kontrol etmek için 'lokal' state'ler.
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [localFilterDomain, setLocalFilterDomain] = useState(filterDomain);
  const [localFilterStatus, setLocalFilterStatus] = useState(filterStatus);

  // --- YENİ: Filtreleri Uygulama Fonksiyonu ---
  // "Filtrele" butonuna basıldığında App.tsx'teki asıl state'leri günceller.
  const handleFilterApply = () => {
    setSearchTerm(localSearchTerm);
    setFilterDomain(localFilterDomain);
    setFilterStatus(localFilterStatus);
    // App.tsx'teki useEffect (sayfa 1'e dönme) ve
    // loadGridData'nın tetiklenmesi bu sayede gerçekleşir.
  };

  // --- YENİ: Filtreleri Temizleme Fonksiyonu ---
  const handleFilterClear = () => {
    setLocalSearchTerm('');
    setLocalFilterDomain('');
    setLocalFilterStatus('all');
    // Veritabanı sorgusunu tetiklemek için App.tsx'teki state'leri de temizle
    setSearchTerm('');
    setFilterDomain('');
    setFilterStatus('all');
  };

  // --- YENİ: Prop Senkronizasyonu ---
  // Eğer filtreler App.tsx tarafında (örn. yeni scrape) sıfırlanırsa,
  // bu bileşendeki lokal state'lerin de sıfırlanmasını sağlar.
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
    setLocalFilterDomain(filterDomain);
    setLocalFilterStatus(filterStatus);
  }, [searchTerm, filterDomain, filterStatus]);


  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-gray-500 mt-2">Loading data...</p>
      </div>
    );
  }

  if (!isLoading && totalRecords === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200 text-center">
        <p className="text-gray-500">No data available. Start a scraping job to see results.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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

        {/* Layout'u 5 sütuna (md:grid-cols-5) güncelledik */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by domain, title..."
              value={localSearchTerm} // LOKAL state'i kullan
              onChange={(e) => setLocalSearchTerm(e.target.value)} // LOKAL state'i güncelle
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <input
            type="text"
            placeholder="Filter by domain..."
            value={localFilterDomain} // LOKAL state'i kullan
            onChange={(e) => setLocalFilterDomain(e.target.value)} // LOKAL state'i güncelle
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <select
            value={localFilterStatus} // LOKAL state'i kullan
            onChange={(e) => setLocalFilterStatus(e.target.value as 'all' | 'open' | 'closed')} // LOKAL state'i güncelle
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          {/* YENİ: Filtrele Butonu */}
          <button
            onClick={handleFilterApply}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtrele
          </button>

          {/* Temizle Butonu (onClick değişti) */}
          {(searchTerm || filterDomain || filterStatus !== 'all') && (
            <button
              onClick={handleFilterClear} // YENİ fonksiyonu kullan
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ... (Tablonun geri kalanı (<div>, <table>, <thead>, <tbody>, <Pagination>) aynı) ... */}
      
      <div className="">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Domain
              </th>
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
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.currency || '-'}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  {row.language || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    row.products.status === 'open'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {row.products.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate" title={row.products.title}>
                  {row.products.title || '-'}
                </td>
                
                <td className="px-4 py-4 py-3">
                  {row.products.status === 'open' && row.products.images.length > 0 ? (
                    <div className="flex gap-2">
                      {row.products.images.map((img, idx) => (
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
                              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[300px] h-[300px] object-cover rounded-md shadow-lg border-4 border-white z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">
                      {row.products.status === 'closed' ? 'KAPALI' : 'No images'}
                    </span>
                  )}
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