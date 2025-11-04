import { useState, useEffect, useCallback } from 'react';
import { DateRangeForm } from './components/DateRangeForm';
import { JobProgress } from './components/JobProgress';
import { DataTable } from './components/DataTable';
import { supabase, ScrapeJob, ScrapedData } from './lib/supabase';
import { scrapeDate, addDays, formatDate, saveRecords, updateJobProgress } from './lib/scraper';
import { Database, UserCheck } from 'lucide-react';
import { CsvImporter } from './components/CsvImporter'; 

const ITEMS_PER_PAGE = 50;
const REVIEWERS = ['Efkan', 'Mert', 'Furkan'];

function App() {
  const [currentJob, setCurrentJob] = useState<ScrapeJob | null>(null);
  const [isScrapingActive, setIsScrapingActive] = useState(false);
  const [currentProgress, setCurrentProgress] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  
  const [data, setData] = useState<ScrapedData[]>([]);
  const [allData, setAllData] = useState<ScrapedData[]>([]); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // --- FİLTRE STATE'LERİ GÜNCELLENDİ ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterTitle, setFilterTitle] = useState('');
  const [filterListedurum, setFilterListedurum] = useState<'all' | 'true' | 'false'>('all');
  
  // --- YENİ FİLTRE STATE'LERİ EKLENDİ ---
  const [filterNiche, setFilterNiche] = useState('');
  const [filterCiro, setFilterCiro] = useState('');
  const [filterTrafik, setFilterTrafik] = useState('');
  const [filterProductCount, setFilterProductCount] = useState<number | ''>('');
  const [filterApp, setFilterApp] = useState('');
  const [filterTheme, setFilterTheme] = useState('');
  // --- BİTTİ ---

  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  // --- loadGridData GÜNCELLENDİ (Tüm yeni filtreler eklendi) ---
  const loadGridData = useCallback(async (page: number) => {
    const offset = (page - 1) * ITEMS_PER_PAGE;

    let pageQuery = supabase
      .from('scraped_data')
      .select('*, product_details(*)', { count: 'exact' }); 

    // Mevcut Filtreler
    if (filterDomain) pageQuery = pageQuery.ilike('domain', `%${filterDomain}%`);
    if (filterStatus !== 'all') pageQuery = pageQuery.eq('product_details.status', filterStatus);
    if (filterCurrency) pageQuery = pageQuery.ilike('currency', `%${filterCurrency}%`);
    if (filterLanguage) pageQuery = pageQuery.ilike('language', `%${filterLanguage}%`);
    if (filterTitle) pageQuery = pageQuery.ilike('product_details.title', `%${filterTitle}%`);
    if (filterListedurum !== 'all') {
      pageQuery = pageQuery.eq('listedurum', filterListedurum === 'true');
    }

    // --- YENİ FİLTRELER UYGULANDI ---
    if (filterNiche) pageQuery = pageQuery.ilike('niche', `%${filterNiche}%`);
    if (filterCiro) pageQuery = pageQuery.ilike('ciro', `%${filterCiro}%`);
    if (filterTrafik) pageQuery = pageQuery.ilike('trafik', `%${filterTrafik}%`);
    if (filterProductCount !== '') {
      pageQuery = pageQuery.gte('product_count', filterProductCount); // X'ten büyük veya eşit
    }
    if (filterApp) pageQuery = pageQuery.ilike('app', `%${filterApp}%`);
    if (filterTheme) pageQuery = pageQuery.ilike('theme', `%${filterTheme}%`);
    // --- BİTTİ ---

    if (searchTerm) {
      // Genel aramaya yeni sütunlar da eklenebilir, şimdilik ana sütunlar kalıyor
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

    // --- Dışa Aktarım Sorgusu (Güncellendi) ---
    let allDataQuery = supabase
      .from('scraped_data')
      .select('*, product_details(*)');

    // Tüm filtreleri dışa aktarım sorgusuna da uygula
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

  }, [
    searchTerm, filterDomain, filterStatus, filterCurrency, filterLanguage, 
    filterTitle, filterListedurum, filterNiche, filterCiro, filterTrafik, 
    filterProductCount, filterApp, filterTheme
  ]); 
  // --- YÜKLEME SONU ---
  
  const loadLatestJob = useCallback(async (jobToResume?: ScrapeJob) => {
    const { data: jobs, error } = await supabase
      .from('scrape_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading job:', error);
      return;
    }
    const jobToLoad = jobToResume || jobs;
    if (jobToLoad) {
      setCurrentJob(jobToLoad); 
      if (jobToLoad.status === 'in_progress') {
        setIsScrapingActive(true);
        if (jobToResume) {
          resumeScraping(jobToResume);
        } else if (jobs && jobs.status === 'in_progress') {
           resumeScraping(jobs);
        }
      }
    }
  }, []); 

  
  useEffect(() => {
    loadLatestJob(); 
    loadGridData(1);  
  }, []); // Sadece ilk yüklemede

  
  // Filtreler değiştiğinde 1. sayfaya dön
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [
    searchTerm, filterDomain, filterStatus, filterCurrency, filterLanguage, 
    filterTitle, filterListedurum, filterNiche, filterCiro, filterTrafik, 
    filterProductCount, filterApp, filterTheme
  ]); 

  
  // Sayfa veya filtreler (loadGridData) değiştiğinde veriyi yükle
  useEffect(() => {
    loadGridData(currentPage);
  }, [currentPage, loadGridData]); 


  const getTodayDateStr = (): string => {
    const today = new Date();
    return formatDate(today);
  };

  const resumeScraping = async (job: ScrapeJob) => {
    try {
      const startDate = new Date(job.processing_date);
      const today = new Date(getTodayDateStr());
      const endDate = new Date(job.end_date) > today ? today : new Date(job.end_date);
      let totalRecords = job.total_records;

      for (let dt = startDate; dt <= endDate; dt = addDays(dt, 1)) {
        const dateStr = formatDate(dt);
        setCurrentProgress(dateStr);

        const records = await scrapeDate(dateStr);
        if (records.length > 0) {
          await saveRecords(job.id, records); 
          totalRecords += records.length;
        }

        const nextDate = addDays(dt, 1);
        const status = nextDate > endDate ? 'completed' : 'in_progress';

        await updateJobProgress(
          job.id,
          formatDate(nextDate <= endDate ? nextDate : dt),
          status,
          totalRecords
        );

        const { data: updatedJob } = await supabase
          .from('scrape_jobs')
          .select('*')
          .eq('id', job.id)
          .maybeSingle();

        if (updatedJob) {
          setCurrentJob(updatedJob);
        }
        
        await loadGridData(currentPage);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setIsScrapingActive(false);
      setCurrentProgress('');
    } catch (error) {
      console.error('Scraping error:', error);
      await updateJobProgress(job.id, job.processing_date, 'failed', job.total_records);
      setIsScrapingActive(false);
      setCurrentProgress('');
    }
  };

  const handleStartScraping = async (startDate: string, endDate: string) => {
    try {
      setIsScrapingActive(true);
      const today = getTodayDateStr();
      const finalEndDate = new Date(endDate) > new Date(today) ? today : endDate;

      const { data: newJob, error: jobError } = await supabase
        .from('scrape_jobs')
        .insert({
          start_date: startDate,
          end_date: finalEndDate,
          processing_date: startDate,
          status: 'in_progress',
          total_records: 0,
        })
        .select()
        .single();

      if (jobError || !newJob) {
        throw new Error('Failed to create job');
      }

      setCurrentJob(newJob);
      setCurrentPage(1); 
      const start = new Date(startDate);
      const end = new Date(finalEndDate);
      let totalRecords = 0;

      for (let dt = start; dt <= end; dt = addDays(dt, 1)) {
        const dateStr = formatDate(dt);
        setCurrentProgress(dateStr);

        const records = await scrapeDate(dateStr);
        if (records.length > 0) {
          await saveRecords(newJob.id, records);
          totalRecords += records.length;
        }

        const nextDate = addDays(dt, 1);
        const status = nextDate > end ? 'completed' : 'in_progress';

        await updateJobProgress(
          newJob.id,
          formatDate(nextDate <= end ? nextDate : dt),
          status,
          totalRecords
        );

        const { data: updatedJob } = await supabase
          .from('scrape_jobs')
          .select('*')
          .eq('id', newJob.id)
          .maybeSingle();

        if (updatedJob) {
          setCurrentJob(updatedJob);
        }
        
        await loadGridData(1); 
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setIsScrapingActive(false);
      setCurrentProgress('');
    } catch (error) {
      console.error('Error starting scraping:', error);
      setIsScrapingActive(false);
      setCurrentProgress('');
    }
  };
  
  const handleContinueFromLast = async () => {
    if (!currentJob) return;
    try {
      setIsScrapingActive(true);
      const today = getTodayDateStr();
      const { data: updatedJob, error } = await supabase
        .from('scrape_jobs')
        .update({
          end_date: today,
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentJob.id)
        .select()
        .single();
      if (error || !updatedJob) {
        throw new Error('Failed to update job');
      }
      loadLatestJob(updatedJob); 
    } catch (error) {
      console.error('Error continuing scraping:', error);
      setIsScrapingActive(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handleImportComplete = () => {
    console.log("İçe aktarma tamamlandı, grid yenileniyor...");
    setIsImporting(false);
    loadGridData(1); 
  };

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
            <h1 className="text-3xl font-bold text-gray-900">MerchantGenius Scraper</h1>
          </div>
          <p className="text-gray-600">
            Automated data extraction with resume capability, product image fetching, and export features
          </p>
        </div>

        {userSelector}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 space-y-4">
            <CsvImporter 
              onImportComplete={handleImportComplete}
              setIsImporting={setIsImporting}
              disabled={isScrapingActive || isImporting}
            />
            
            <DateRangeForm 
              onSubmit={handleStartScraping} 
              disabled={isScrapingActive || isImporting} 
            />

            {currentJob && currentJob.status === 'completed' && (
              <button
                onClick={handleContinueFromLast}
                disabled={isScrapingActive || isImporting} 
                className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Database className="w-5 h-5" />
                Continue from Last Date to Today
              </button>
            )}
          </div>
          <div>
            <JobProgress job={currentJob} currentProgress={currentProgress} />
          </div>
        </div>

        <DataTable
          data={data}
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
          allData={allData} 
          
          currentUser={currentUser} 
          
          // Tüm filtreleri DataTable'a yolla
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

