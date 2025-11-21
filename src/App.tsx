import { useState, useEffect, useCallback, memo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Database, Loader2, 
  CheckSquare,
  DollarSign, 
  Euro, 
  Briefcase 
} from 'lucide-react';
import { DataTable } from './components/DataTable';

// =================================================================================
// 1. SUPABASE KURULUMU
// =================================================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SABİT LİSTE (YENİ İSİMLER EKLENDİ)
const REVIEWERS = ['Efkan', 'Mert Tufan', 'Furkan', 'Simay', 'Talha', 'Selçuk', 'Gürkan', 'Sefa'];

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

interface StatsData {
  toplam: number;
  tr: number;
  usd: number;
  eu: number;
}

export interface ReviewerStat {
  name: string;
  count: number;
}

// =================================================================================
// 2. YARDIMCI BİLEŞENLER (STATS CARD & EXPORT)
// =================================================================================

// Export fonksiyonları DataTable içinde veya harici utils'de tutulabilir, 
// ancak App içinde tutarlılık için basitçe yer alabilirler.
// (Burada kod karmaşasını önlemek için export fonksiyonlarını sadeleştirdim, 
// asıl mantık DataTable componentinde veya lib/export.ts'de olmalıdır)

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  isLoading: boolean;
  valuePrefix?: string; 
}

const StatsCard = ({ title, value, icon: Icon, color, isLoading, valuePrefix }: StatsCardProps) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <div className="text-sm font-medium text-gray-500">{title}</div>
      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mt-1" />
      ) : (
        <div className="text-2xl font-bold text-gray-900">{valuePrefix}{value.toLocaleString()}</div> 
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
      title="TR Pazarı"
      value={stats?.tr ?? 0}
      icon={Briefcase}
      color="bg-red-500"
      isLoading={isLoading}
      valuePrefix="₺"
    />
    <StatsCard
      title="USD Pazarı"
      value={stats?.usd ?? 0}
      icon={DollarSign}
      color="bg-green-500"
      isLoading={isLoading}
      valuePrefix="$"
    />
    <StatsCard
      title="EU Pazarı (EUR)"
      value={stats?.eu ?? 0}
      icon={Euro}
      color="bg-yellow-500"
      isLoading={isLoading}
      valuePrefix="€"
    />
  </div>
);

// =================================================================================
// 3. ANA APP BİLEŞENİ
// =================================================================================

const ITEMS_PER_PAGE = 50;

function App() {
  const [currentUser, setCurrentUser] = useState('');
  
  const [data, setData] = useState<ScrapedData[]>([]);
  const [allData, setAllData] = useState<ScrapedData[]>([]); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Stats State
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [reviewerStats, setReviewerStats] = useState<ReviewerStat[]>([]); 
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // --- Filtre State'leri ---
  // 'searchTerm' KALDIRILDI
  const [filterPazar, setFilterPazar] = useState(''); // YENİ EKLENDİ
  const [filterDomain, setFilterDomain] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all'); 
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterTitle, setFilterTitle] = useState('');
  
  // 'null' (Boş) durumu eklendi
  const [filterListedurum, setFilterListedurum] = useState<'all' | 'true' | 'false' | 'null'>('all');
  
  const [filterNiche, setFilterNiche] = useState('');
  const [filterCiro, setFilterCiro] = useState('');
  const [filterTrafik, setFilterTrafik] = useState('');
  const [filterProductCount, setFilterProductCount] = useState<number | ''>('');
  const [filterApp, setFilterApp] = useState('');
  const [filterTheme, setFilterTheme] = useState('');
  const [filterInceleyen, setFilterInceleyen] = useState<'all' | string>('all');

  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  // --- İstatistik Yükleme Fonksiyonu ---
  const loadStatsData = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const toplamQuery = supabase.from('scraped_data').select('id', { count: 'exact', head: true }).not('listedurum', 'is', null);
      const trQuery = supabase.from('scraped_data').select('id', { count: 'exact', head: true }).not('listedurum', 'is', null).eq('"Currency"', 'TRY');
      const usdQuery = supabase.from('scraped_data').select('id', { count: 'exact', head: true }).not('listedurum', 'is', null).eq('"Currency"', 'USD');
      const euQuery = supabase.from('scraped_data').select('id', { count: 'exact', head: true }).not('listedurum', 'is', null).eq('"Currency"', 'EUR');

      const reviewerCountPromises = REVIEWERS.map(name =>
        supabase
          .from('scraped_data')
          .select('id', { count: 'exact', head: true })
          .eq('inceleyen', name)
          .not('listedurum', 'is', null)
      );
      
      const [toplamRes, trRes, usdRes, euRes, ...reviewerResults] = await Promise.all([
        toplamQuery, trQuery, usdQuery, euQuery, ...reviewerCountPromises
      ]);

      setStatsData({
        toplam: toplamRes.count || 0,
        tr: trRes.count || 0,
        usd: usdRes.count || 0,
        eu: euRes.count || 0,
      });
      
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
  }, []); 


  // --- Veri Yükleme Fonksiyonu ---
  const loadGridData = useCallback(async (page: number) => {
    setIsLoading(true);
    const offset = (page - 1) * ITEMS_PER_PAGE;

    let pageQuery = supabase
      .from('scraped_data')
      .select('*', { count: 'exact' }); 

    // Filtreler Uygulanıyor
    if (filterDomain) pageQuery = pageQuery.ilike('domain', `%${filterDomain}%`);
    
    // Pazar Filtresi (YENİ)
    if (filterPazar) pageQuery = pageQuery.ilike('pazar', `%${filterPazar}%`);
    
    if (filterStatus !== 'all') pageQuery = pageQuery.eq('"Durum"', filterStatus); 
    if (filterCurrency) pageQuery = pageQuery.ilike('"Currency"', `%${filterCurrency}%`); 
    if (filterLanguage) pageQuery = pageQuery.ilike('language', `%${filterLanguage}%`);
    if (filterTitle) pageQuery = pageQuery.ilike('title', `%${filterTitle}%`); 
    
    // Listeleme Durumu Filtresi (GÜNCELLENDİ)
    if (filterListedurum !== 'all') {
      if (filterListedurum === 'true') {
        pageQuery = pageQuery.eq('listedurum', true);
      } else if (filterListedurum === 'false') {
        pageQuery = pageQuery.eq('listedurum', false);
      } else if (filterListedurum === 'null') {
        // Boş (Atanmamış) olanları getir
        pageQuery = pageQuery.is('listedurum', null);
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

    // NOT: searchTerm sorgusu kaldırıldı.

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

    // Export için tüm veriyi çeken sorgu (Sayfalama olmadan)
    let allDataQuery = supabase.from('scraped_data').select('*');
    
    // Aynı filtreler export sorgusuna da uygulanmalı
    if (filterDomain) allDataQuery = allDataQuery.ilike('domain', `%${filterDomain}%`);
    if (filterPazar) allDataQuery = allDataQuery.ilike('pazar', `%${filterPazar}%`);
    if (filterStatus !== 'all') allDataQuery = allDataQuery.eq('"Durum"', filterStatus);  
    if (filterCurrency) allDataQuery = allDataQuery.ilike('"Currency"', `%${filterCurrency}%`); 
    if (filterLanguage) allDataQuery = allDataQuery.ilike('language', `%${filterLanguage}%`);
    if (filterTitle) allDataQuery = allDataQuery.ilike('title', `%${filterTitle}%`); 
    
    if (filterListedurum !== 'all') {
       if (filterListedurum === 'true') {
        allDataQuery = allDataQuery.eq('listedurum', true);
      } else if (filterListedurum === 'false') {
        allDataQuery = allDataQuery.eq('listedurum', false);
      } else if (filterListedurum === 'null') {
        allDataQuery = allDataQuery.is('listedurum', null);
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
    
    const { data: fullData } = await allDataQuery
      .order('date', { ascending: false })
      .order('domain', { ascending: true });
    
    setAllData(fullData as ScrapedData[] || []);
    setIsLoading(false);

  }, [
    filterPazar, filterDomain, filterStatus, filterCurrency, filterLanguage, 
    filterTitle, filterListedurum, filterNiche, filterCiro, filterTrafik, 
    filterProductCount, filterApp, filterTheme, filterInceleyen
  ]); 
  
  
  // Veritabanı Değişikliklerini Dinle (Realtime)
  useEffect(() => {
    const channel = supabase
      .channel('scraped-data-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scraped_data' }, 
        (payload) => {
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

  
  // Filtreler değiştiğinde sayfayı 1'e çek ve veriyi yeniden yükle
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    loadGridData(1); 
    loadStatsData(); 
  }, [
    filterPazar, filterDomain, filterStatus, filterCurrency, filterLanguage, 
    filterTitle, filterListedurum, filterNiche, filterCiro, filterTrafik, 
    filterProductCount, filterApp, filterTheme, filterInceleyen
  ]); 
  
  // Sayfa değiştiğinde veri yükle
  useEffect(() => {
    loadGridData(currentPage);
  }, [currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Roasell Veri Filtreleme ve Yönetme Arayüzü </h1>
          </div>
        </div>

        {/* Veri Kartları */}
        <StatsCards stats={statsData} isLoading={isStatsLoading} />

        <DataTable
          data={data}
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
          allData={allData} 
          isLoading={isLoading}
          
          currentUser={currentUser} 
          setCurrentUser={setCurrentUser}
          reviewerStats={reviewerStats}
          isStatsLoading={isStatsLoading}
          reviewers={REVIEWERS}
          
          // --- Filtre Propsları ---
          // searchTerm kaldırıldı
          filterPazar={filterPazar} setFilterPazar={setFilterPazar}
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