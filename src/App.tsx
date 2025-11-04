import { useState, useEffect, useCallback } from 'react';
import { DateRangeForm } from './components/DateRangeForm';
import { JobProgress } from './components/JobProgress';
import { DataTable } from './components/DataTable';
import { supabase, ScrapeJob, ScrapedData } from './lib/supabase';
import { scrapeDate, addDays, formatDate, saveRecords, updateJobProgress } from './lib/scraper';
import { Database } from 'lucide-react';

const ITEMS_PER_PAGE = 50;

function App() {
  const [currentJob, setCurrentJob] = useState<ScrapeJob | null>(null);
  const [isScrapingActive, setIsScrapingActive] = useState(false);
  const [currentProgress, setCurrentProgress] = useState('');
  
  const [data, setData] = useState<ScrapedData[]>([]);
  const [allData, setAllData] = useState<ScrapedData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');

  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  const loadGridData = useCallback(async (page: number) => {
    setIsLoading(true);
    const offset = (page - 1) * ITEMS_PER_PAGE;

    try {
      let pageQuery = supabase
        .from('scraped_data')
        .select('*', { count: 'exact' });

      if (filterDomain) {
        pageQuery = pageQuery.ilike('domain', `%${filterDomain}%`);
      }
      if (filterStatus !== 'all') {
        pageQuery = pageQuery.eq('products->>status', filterStatus);
      }
      if (searchTerm) {
        // --- DÜZELTME BURADA ---
        // date sütunu `date` tipinde olduğu için `ilike` kullanmadan önce
        // `::text` ile metne dönüştürülmesi gerekiyor.
        const searchConditions = `domain.ilike.%${searchTerm}%,products->>title.ilike.%${searchTerm}%,date::text.ilike.%${searchTerm}%,currency.ilike.%${searchTerm}%,language.ilike.%${searchTerm}%`;
        pageQuery = pageQuery.or(searchConditions);
      }

      const { data: pageData, error: dataError, count } = await pageQuery
        .order('date', { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      if (dataError) throw dataError;

      setData(pageData || []);
      setTotalRecords(count || 0);

      let allDataQuery = supabase
        .from('scraped_data')
        .select('*');

      if (filterDomain) {
        allDataQuery = allDataQuery.ilike('domain', `%${filterDomain}%`);
      }
      if (filterStatus !== 'all') {
        allDataQuery = allDataQuery.eq('products->>status', filterStatus);
      }
      if (searchTerm) {
        // Düzeltme burada da uygulanıyor
        const searchConditions = `domain.ilike.%${searchTerm}%,products->>title.ilike.%${searchTerm}%,date::text.ilike.%${searchTerm}%,currency.ilike.%${searchTerm}%,language.ilike.%${searchTerm}%`;
        allDataQuery = allDataQuery.or(searchConditions);
      }

      const { data: fullData, error: allDataError } = await allDataQuery.order('date', { ascending: false });

      if (allDataError) throw allDataError;
      
      setAllData(fullData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setData([]);
      setTotalRecords(0);
      setAllData([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, filterDomain, filterStatus]); // Bağımlılıklar doğru

  const loadLatestJob = useCallback(async (jobToResume?: ScrapeJob) => {
    // ... (değişiklik yok)
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
  }, []); // resumeScraping bağımlılığı kaldırıldı

  useEffect(() => {
    loadLatestJob();
    loadGridData(1);
  }, []); // Sadece mount'ta

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, filterDomain, filterStatus]);

  useEffect(() => {
    if (!isLoading) { // İlk yüklemeyi (mount) tekrar tetiklememek için
      loadGridData(currentPage);
    }
  }, [currentPage, loadGridData]); // loadGridData filtreler değişince değişir


  const getTodayDateStr = (): string => {
    // ... (değişiklik yok)
    const today = new Date();
    return formatDate(today);
  };

  const resumeScraping = async (job: ScrapeJob) => {
    // ... (değişiklik yok)
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
    // ... (değişiklik yok)
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
      
      setSearchTerm('');
      setFilterDomain('');
      setFilterStatus('all');

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
        
        if (currentPage === 1) {
          await loadGridData(1);
        } else {
          setCurrentPage(1); // Bu, useEffect'i tetikler
        }

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
    // ... (değişiklik yok)
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <div className="space-y-4">
              <DateRangeForm onSubmit={handleStartScraping} disabled={isScrapingActive} />

              {currentJob && currentJob.status === 'completed' && (
                <button
                  onClick={handleContinueFromLast}
                  disabled={isScrapingActive}
                  className="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Database className="w-5 h-5" />
                  Continue from Last Date to Today
                </button>
              )}
            </div>
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
          isLoading={isLoading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterDomain={filterDomain}
          setFilterDomain={setFilterDomain}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
        />
      </div>
    </div>
  );
}

export default App;