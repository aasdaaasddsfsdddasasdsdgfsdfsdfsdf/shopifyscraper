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

// ... (Supabase kurulumu aynı kalıyor)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- DEĞİŞİKLİK: Yeni inceleyenler eklendi ---
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

// ... (StatsData ve ReviewerStat arayüzleri aynı kalıyor)
interface StatsData {
  toplam: number;
  tr: number;
  usd: number;
  eu: number;
}
interface ReviewerStat {
  name: string;
  count: number;
}

// ... (Export fonksiyonları, ListingDropdown, ImageModal, StatsCard aynı kalıyor - Kısaltıldı) ...
// (Buradaki kodlarda bir değişiklik yok, previous context'ten aynen korunmalıdır)
// ...

// --- EXPORT VE YARDIMCI FONKSİYONLARIN YERİNE GEÇEN YER TUTUCULAR ---
function escapeCSV(value: string | null | undefined | number | boolean): string { if (value === null || value === undefined) return ''; const stringValue = String(value); if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) { return `"${stringValue.replace(/"/g, '""')}"`; } return stringValue; }
function downloadFile(content: string, filename: string, mimeType: string): void { const blob = new Blob([content], { type: mimeType }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); }
export function exportToCSV(data: ScrapedData[]): void { if (data.length === 0) return; const headers = [ 'date', 'domain', 'niche', 'ciro', 'trafik', 'product_count', 'app', 'theme', 'adlink', 'Currency', 'language', 'Durum', 'title', 'image1', 'image2', 'image3', 'product_error', 'listedurum', 'inceleyen', 'pazar' ]; const csvRows = [headers.join(',')]; for (const row of data) { const values = [ row.date, escapeCSV(row.domain), escapeCSV(row.niche), escapeCSV(row.ciro), escapeCSV(row.trafik), escapeCSV(row.product_count), escapeCSV(row.app), escapeCSV(row.theme), escapeCSV(row.adlink), escapeCSV(row["Currency"]), escapeCSV(row.language), escapeCSV(row["Durum"]), escapeCSV(row.title), escapeCSV(row.image1), escapeCSV(row.image2), escapeCSV(row.image3), escapeCSV(row.product_error), String(row.listedurum), escapeCSV(row.inceleyen), escapeCSV(row.pazar), ]; csvRows.push(values.join(',')); } const csvContent = csvRows.join('\n'); downloadFile(csvContent, 'scraped-data.csv', 'text/csv'); }
export function exportToJSON(data: ScrapedData[]): void { const jsonData = data.map(row => ({ date: row.date, domain: row.domain, niche: row.niche, ciro: row.ciro, trafik: row.trafik, product_count: row.product_count, app: row.app, theme: row.theme, adlink: row.adlink, Currency: row["Currency"], language: row.language, listedurum: row.listedurum, inceleyen: row.inceleyen, status: row["Durum"], title: row.title, image1: row.image1, image2: row.image2, image3: row.image3, product_error: row.product_error, pazar: row.pazar, })); const jsonContent = JSON.stringify(jsonData, null, 2); downloadFile(jsonContent, 'scraped-data.json', 'application/json'); }

// --- ListingDropdown (Optimistic Locking ile) ---
interface ListingDropdownProps { rowId: string; initialValue: boolean | null; currentUser: string; initialInceleyen: string | null; }
const ListingDropdown = memo(({ rowId, initialValue, currentUser, initialInceleyen }: ListingDropdownProps) => { const [currentValue, setCurrentValue] = useState(initialValue); const [isLoading, setIsLoading] = useState(false); useEffect(() => { setCurrentValue(initialValue); }, [initialValue]); const getValueAsString = (val: boolean | null): string => { if (val === true) return "true"; if (val === false) return "false"; return "unset"; }; const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => { if (!currentUser) { alert('Lütfen işlem yapmadan önce "İnceleyen Kişi" seçimi yapın.'); e.target.value = getValueAsString(currentValue); return; } constRP newValueString = e.target.value; let newValue: boolean | null; if (newValueString === "true") { newValue = true; } else if (newValueString === "false") { newValue = false; } else { newValue = null; } setIsLoading(true); setCurrentValue(newValue); const isUnassigning = newValue === null; const updateObject = { listedurum: newValue, inceleyen: isUnassigning ? null : currentUser }; let updateQuery = supabase .from('scraped_data') .update(updateObject, { count: 'exact' }) .eq('id', rowId); if (initialInceleyen === null) { updateQuery = updateQuery.is('inceleyen', null); } else { updateQuery = updateQuery.eq('inceleyen', initialInceleyen); } const { error, count } = await updateQuery; if (error) { console.error('Update error:', error); setCurrentValue(initialValue); alert(`Hata: ${error.message}`); } else if (count === 0 && !error) { console.warn('Update failed: Optimistic lock violation.'); setCurrentValue(initialValue); alert('Hata: Bu kaydın durumu siz işlem yapmadan önce başka bir kullanıcı tarafından değiştirildi. Sayfa güncelleniyor.'); } setIsLoading(false); }; constRv selectValue = getValueAsString(currentValue); return ( <div className="flex items-center justify-center"> {isLoading ? (<Loader2 className="w-4 h-4 animate-spin text-blue-500" />) : ( <select value={selectValue} onChange={handleChange} disabled={!currentUser} className={`w-28 px-2 py-1 border rounded-md text-sm font-medium ${ !currentUser ? 'cursor-not-allowed opacity-50 bg-gray-100' : 'cursor-pointer' } ${ selectValue === 'true' ? 'bg-green-100 text-green-800 border-green-200' : selectValue === 'false' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gray-100 text-gray-700 border-gray-200' }`} title={!currentUser ? 'İşlem yapmak için inceleyen kişi seçmelisiniz' : 'Listeleme durumunu değiştir'} > <option value="unset">Seçim Yapın</option> <option value="true">Evet</option> <option value="false">Hayır</option> </select> )} </div> ); });

// --- Diğer Bileşenler ---
interface ImageModalProps { imageUrl: string; onClose: () => void; }
const ImageModal = memo(({ imageUrl, onClose }: ImageModalProps) => { return ( <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 transition-opacity duration-300"> <div onClick={(e) => e.stopPropagation()} className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl"> <img src={imageUrl} alt="Büyük ürün görseli" className="object-contain w-full h-auto max-h-[90vh] rounded-lg" /> <button onClick={onClose} className="absolute -top-4 -right-4 z-10 p-2 bg-white rounded-full text-gray-700 hover:bg-gray-200 transition-colors shadow-lg" title="Kapat"> <X className="w-6 h-6" /> </button> </div> </div> ); });
interface StatsCardProps { title: string; value: number; icon: React.ElementType; color: string; isLoading: boolean;Rq valuePrefix?: string; }
const StatsCard = ({ title, value, icon: Icon, color, isLoading, valuePrefix }: StatsCardProps) => ( <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center gap-4"> <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}> <Icon className="w-6 h-6 text-white" /> </div> <div> <div className="text-sm font-medium text-gray-500">{title}</div> {isLoading ? ( <Loader2 className="w-6 h-6 animate-spin text-gray-400 mt-1" /> ) : ( <div className="text-2xl font-bold text-gray-900">{valuePrefix}{value.toLocaleString()}</div> )} </div> </div> );
interface StatsCardsProps { stats: StatsData | null; isLoading: boolean; }
const StatsCards = ({ stats, isLoading }: StatsCardsProps) => ( <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4"> <StatsCard title="Toplam İnceleme" value={stats?.toplam ?? 0} icon={CheckSquare} color="bg-blue-500" isLoading={isLoading} /> <StatsCard title="TR Pazarı" value={stats?.tr ?? 0} icon={Briefcase} color="bg-red-500" isLoading={isLoading} valuePrefix="₺" /> <StatsCard title="USD Pazarı" value={stats?.usd ?? 0} icon={DollarSign} color="bg-green-500" isLoading={isLoading} valuePrefix="$" /> <StatsCard title="EU Pazarı (EUR)" value={stats?.eu ?? 0} icon={Euro} color="bg-yellow-500" isLoading={isLoading} valuePrefix="€" /> </div> );

// --- DataTable Bileşeni Import Ediliyor ---
import { DataTable } from './components/DataTable';

// =================================================================================
// 5. ANA APP BİLEŞENİ
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
  // DEĞİŞİKLİK: searchTerm kaldırıldı, filterPazar eklendi, filterListedurum tipi genişletildi
  // const [searchTerm, setSearchTerm] = useState(''); // KALDIRILDI
  const [filterPazar, setFilterPazar] = useState(''); // EKLENDİ
  const [filterDomain, setFilterDomain] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all'); 
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterTitle, setFilterTitle] = useState('');
  
  // DEĞİŞİKLİK: 'null' tipi eklendi (Boş/Atama Yapılmayanlar için)
  const [filterListedurum, setFilterListedurum] = useState<'all' | 'true' | 'false' | 'null'>('all');
  
  const [filterNiche, setFilterNiche] = useState('');
  const [filterCiro, setFilterCiro] = useState('');
  const [filterTrafik, setFilterTrafik] = useState('');
  const [filterProductCount, setFilterProductCount] = useState<number | ''>('');
  const [filterApp, setFilterApp] = useState('');
  const [filterTheme, setFilterTheme] = useState('');
  const [filterInceleyen, setFilterInceleyen] = useState<'all' | string>('all');

  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  // İstatistik Yükleme
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

    // Filtreler...
    if (filterDomain) pageQuery = pageQuery.ilike('domain', `%${filterDomain}%`);
    // DEĞİŞİKLİK: Pazar filtresi eklendi
    if (filterPazar) pageQuery = pageQuery.ilike('pazar', `%${filterPazar}%`);
    
    if (filterStatus !== 'all') pageQuery = pageQuery.eq('"Durum"', filterStatus); 
    if (filterCurrency) pageQuery = pageQuery.ilike('"Currency"', `%${filterCurrency}%`); 
    if (filterLanguage) pageQuery = pageQuery.ilike('language', `%${filterLanguage}%`);
    if (filterTitle) pageQuery = pageQuery.ilike('title', `%${filterTitle}%`); 
    
    // DEĞİŞİKLİK: filterListedurum mantığı güncellendi
    if (filterListedurum !== 'all') {
      if (filterListedurum === 'true') {
        pageQuery = pageQuery.eq('listedurum', true);
      } else if (filterListedurum === 'false') {
        // Sadece 'Hayır' seçilenler (false)
        pageQuery = pageQuery.eq('listedurum', false);
      } else if (filterListedurum === 'null') {
        // Yeni: Sadece 'Boş' (null) olanlar - Atama yapılmayanlar
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

    // DEĞİŞİKLİK: searchTerm kaldırıldı
    // if (searchTerm) { ... }

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

    // Export için tüm veri sorgusu (Aynı filtreler uygulanmalı)
    let allDataQuery = supabase.from('scraped_data').select('*');

    if (filterDomain) allDataQuery = allDataQuery.ilike('domain', `%${filterDomain}%`);
    if (filterPazar) allDataQuery = allDataQuery.ilike('pazar', `%${filterPazar}%`); // Pazar Eklendi
    if (filterStatus !== 'all') allDataQuery = allDataQuery.eq('"Durum"', filterStatus);  
    if (filterCurrency) allDataQuery = allDataQuery.ilike('"Currency"', `%${filterCurrency}%`); 
    if (filterLanguage) allDataQuery = allDataQuery.ilike('language', `%${filterLanguage}%`);
    if (filterTitle) allDataQuery = allDataQuery.ilike('title', `%${filterTitle}%`); 
    
    // Listeleme mantığı güncellemesi (Export için)
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
    
    // if (searchTerm) { ... } // Kaldırıldı

    const { data: fullData } = await allDataQuery
      .order('date', { ascending: false })
      .order('domain', { ascending: true });
    
    setAllData(fullData as ScrapedData[] || []);
    setIsLoading(false);

  }, [
    /* searchTerm kaldırıldı */ filterPazar, filterDomain, filterStatus, filterCurrency, filterLanguage, 
    filterTitle, filterListedurum, filterNiche, filterCiro, filterTrafik, 
    filterProductCount, filterApp, filterTheme, filterInceleyen
  ]); 
  
  
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
  
  useEffect(() => {
    loadGridData(1);
    loadStatsData();
  }, [loadGridData, loadStatsData]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    loadGridData(1); 
    loadStatsData(); 
  }, [
    /* searchTerm kaldırıldı */ filterPazar, filterDomain, filterStatus, filterCurrency, filterLanguage, 
    filterTitle, filterListedurum, filterNiche, filterCiro, filterTrafik, 
    filterProductCount, filterApp, filterTheme, filterInceleyen
  ]); 
  
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
          
          // DEĞİŞİKLİK: searchTerm kaldırıldı, filterPazar eklendi
          // searchTerm={searchTerm} setSearchTerm={setSearchTerm}
          searchTerm="" setSearchTerm={() => {}} // Dummy props
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