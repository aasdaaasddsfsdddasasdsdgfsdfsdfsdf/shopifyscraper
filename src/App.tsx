import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Database, Loader2, ChevronLeft, ChevronRight, ExternalLink, Flag
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  "Durum": string | null;
  title: string | null;
  product_error: string | null;
  image1: string | null;
  image2: string | null;
  image3: string | null;

  pazar: string | null;
}

const COUNTRY_MAP: { [key: string]: string } = {
  'DE': 'Almanya',
  'FR': 'Fransa',
  'IT': 'İtalya',
  'ES': 'İspanya',
  'NL': 'Hollanda',
  'BE': 'Belçika',
  'AT': 'Avusturya',
  'PL': 'Polonya',
  'SE': 'İsveç',
  'DK': 'Danimarka',
  'FI': 'Finlandiya',
  'NO': 'Norveç',
  'IE': 'İrlanda',
  'PT': 'Portekiz',
  'GR': 'Yunanistan',
  'CH': 'İsviçre',
  'CZ': 'Çek Cumhuriyeti',
  'RO': 'Romanya',
  'HU': 'Macaristan',
  'LU': 'Lüksemburg',
};

interface ProductCardProps {
  product: ScrapedData;
  showCountryBadge?: boolean;
}

function ProductCard({ product, showCountryBadge }: ProductCardProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const images = [product.image1, product.image2, product.image3].filter(Boolean) as string[];
  const mainImage = images[selectedImageIndex] || '';

  const countryCode = product.pazar?.toUpperCase() || '';

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col h-full border border-gray-700">
      <div className="relative aspect-square bg-gray-700 overflow-hidden">
        {mainImage ? (
          <img
            src={mainImage}
            alt={product.title || 'Product'}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23374151" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" font-size="20" fill="%239ca3af" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            No Image
          </div>
        )}

        {showCountryBadge && countryCode && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-lg backdrop-blur-sm">
            <Flag className="w-3.5 h-3.5" />
            {countryCode}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        {images.length > 1 && (
          <div className="flex gap-2 mb-4">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                  selectedImageIndex === idx
                    ? 'border-blue-500 shadow-lg'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <img
                  src={img}
                  alt={`Product ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23374151" width="64" height="64"/%3E%3C/svg%3E';
                  }}
                />
              </button>
            ))}
          </div>
        )}

        <a
          href={`https://${product.domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 mb-2 truncate block"
        >
          {product.domain}
        </a>

        <h3 className="text-white font-semibold text-base mb-3 line-clamp-2 min-h-[3rem] flex-grow">
          {product.title || product.domain}
        </h3>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Ürün Sayısı</span>
            <span className="text-white font-bold text-lg">{product.product_count || '0'}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Aylık Trafik</span>
            <span className="text-blue-400 font-bold text-lg">{product.trafik || '-'}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Tahmini Satış ($)</span>
            <span className="text-green-400 font-bold text-lg">{product.ciro || '-'}</span>
          </div>
        </div>

        {product.niche && (
          <div className="mb-3">
            <span className="inline-block px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs font-medium">
              Niş: {product.niche}
            </span>
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-3 border-t border-gray-700">
          <a
            href={`https://${product.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Git
          </a>
          {product.adlink && (
            <a
              href={product.adlink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Library
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<'TRY' | 'USD' | 'EUR'>('TRY');
  const [products, setProducts] = useState<ScrapedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [filterNiche, setFilterNiche] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterTitle, setFilterTitle] = useState('');
  const [filterCiroMin, setFilterCiroMin] = useState('');
  const [filterCiroMax, setFilterCiroMax] = useState('');

  const ITEMS_PER_PAGE = 25;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  const loadProducts = useCallback(async (currency: string, page: number) => {
    setIsLoading(true);
    const offset = (page - 1) * ITEMS_PER_PAGE;

    try {
      let query = supabase
        .from('scraped_data')
        .select('*', { count: 'exact' })
        .eq('"Currency"', currency)
        .eq('listedurum', true)
        .eq('"Durum"', 'open');

      if (filterNiche) {
        query = query.ilike('niche', `%${filterNiche}%`);
      }
      if (filterDomain) {
        query = query.ilike('domain', `%${filterDomain}%`);
      }
      if (filterTitle) {
        query = query.ilike('title', `%${filterTitle}%`);
      }
      if (filterCiroMin) {
        const minVal = parseFloat(filterCiroMin);
        if (!isNaN(minVal)) {
          query = query.gte('ciro', minVal);
        }
      }
      if (filterCiroMax) {
        const maxVal = parseFloat(filterCiroMax);
        if (!isNaN(maxVal)) {
          query = query.lte('ciro', maxVal);
        }
      }

      const { data, error, count } = await query
        .order('date', { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      if (error) {
        console.error('Error loading products:', error);
        setProducts([]);
        setTotalRecords(0);
      } else {
        setProducts(data as ScrapedData[] || []);
        setTotalRecords(count || 0);
      }
    } catch (error) {
      console.error('Error:', error);
      setProducts([]);
      setTotalRecords(0);
    }

    setIsLoading(false);
  }, [filterNiche, filterDomain, filterTitle, filterCiroMin, filterCiroMax]);

  useEffect(() => {
    loadProducts(activeTab, currentPage);
  }, [activeTab, currentPage, loadProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterNiche, filterDomain, filterTitle, filterCiroMin, filterCiroMax]);

  useEffect(() => {
    const channel = supabase
      .channel('product-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scraped_data' },
        () => {
          loadProducts(activeTab, currentPage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProducts, activeTab, currentPage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-[1920px] mx-auto px-6 py-8">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-8">
            <Database className="w-10 h-10 text-blue-500" />
            <h1 className="text-4xl font-bold text-white">Roasell Ürün Galerisi</h1>
          </div>

          <div className="flex gap-3 bg-gray-800 p-2 rounded-xl border border-gray-700 mb-8">
            <button
              onClick={() => setActiveTab('TRY')}
              className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                activeTab === 'TRY'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              TR Pazarı
            </button>
            <button
              onClick={() => setActiveTab('USD')}
              className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                activeTab === 'USD'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              USD Pazarı
            </button>
            <button
              onClick={() => setActiveTab('EUR')}
              className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                activeTab === 'EUR'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              EU Pazarı
            </button>
          </div>

          <div className="w-full max-w-4xl bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Niş Ara</label>
                <input
                  type="text"
                  placeholder="Örn: elektronik"
                  value={filterNiche}
                  onChange={(e) => setFilterNiche(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Domain Ara</label>
                <input
                  type="text"
                  placeholder="Örn: amazon"
                  value={filterDomain}
                  onChange={(e) => setFilterDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Ürün Ara</label>
                <input
                  type="text"
                  placeholder="Örn: şarj cihazı"
                  value={filterTitle}
                  onChange={(e) => setFilterTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Min. Satış ($)</label>
                <input
                  type="number"
                  placeholder="Minimum"
                  value={filterCiroMin}
                  onChange={(e) => setFilterCiroMin(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max. Satış ($)</label>
                <input
                  type="number"
                  placeholder="Maksimum"
                  value={filterCiroMax}
                  onChange={(e) => setFilterCiroMax(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setFilterNiche('');
                setFilterDomain('');
                setFilterTitle('');
                setFilterCiroMin('');
                setFilterCiroMax('');
              }}
              className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition"
            >
              Filtreleri Temizle
            </button>
          </div>

          {!isLoading && (
            <p className="text-gray-400 text-lg">
              Toplam {totalRecords} ürün bulundu
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-400 text-lg">Ürünler yükleniyor...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <p className="text-gray-400 text-xl">Henüz listelenen ürün bulunmamaktadır.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-8">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showCountryBadge={activeTab === 'EUR'}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 py-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-6 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Önceki
                </button>

                <span className="text-gray-300 font-medium text-lg">
                  Sayfa {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-6 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
                >
                  Sonraki
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
