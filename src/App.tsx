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
  
  // Data ve Filtre State'leri
  const [data, setData] = useState<ScrapedData[]>([]);
  const [allData, setAllData] = useState<ScrapedData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filtre state'leri DataTable'dan buraya taşındı
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');

  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  // Veri yükleme fonksiyonu (DİNAMİK FİLTRELİ)
  const loadJobData = useCallback(async (jobId: string, page: number) => {
    const offset = (page - 1) * ITEMS_PER_PAGE;

    // --- 1. Filtrelenmiş ve Sayfalanmış Veri Sorgusu ---
    let pageQuery = supabase
      .from('scraped_data')
      .select('*', { count: 'exact' })
      .eq('job_id', jobId);

    // Filtreleri dinamik olarak uygula
    if (filterDomain) {
      pageQuery = pageQuery.ilike('domain', `%${filterDomain}%`);
    }
    if (filterStatus !== 'all') {
      // products JSON kolonundaki 'status' anahtarına göre filtrele
      pageQuery = pageQuery.eq('products->>status', filterStatus);
    }
    if (searchTerm) {
      // Birden fazla alanda arama yapmak için .or() kullan
      const searchConditions = `domain.ilike.%${searchTerm}%,products->>title.ilike.%${searchTerm}%,date.ilike.%${searchTerm}%,currency.ilike.%${searchTerm}%,language.ilike.%${searchTerm}%`;
      pageQuery = pageQuery.or(searchConditions);
    }

    // Sayfalama ve sıralamayı uygula
    const { data: pageData, error: dataError, count } = await pageQuery
      .order('date', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (dataError) {
      console.error('Error loading data:', dataError);
      setData([]);
      setTotalRecords(0);
    } else {
      setData(pageData || []);
      setTotalRecords(count || 0);
    }

    // --- 2. Dışa Aktarım için Tüm Veri Sorgusu (filtresiz) ---
    // Bu, export işlevinin mevcut haliyle çalışmasını sağlar
    const { data: fullData } = await supabase
      .from('scraped_data')
      .select('*')
      .eq('job_id', jobId)
      .order('date', { ascending: false });

    setAllData(fullData || []);

  }, [searchTerm, filterDomain, filterStatus]); // Filtreler değiştiğinde bu fonksiyon yeniden oluşur

  // Sadece en son işi yükler (veri yüklemez)
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
      setCurrentJob(jobToLoad); // Bu, veri yükleme useEffect'ini tetikler

      if (jobToLoad.status === 'in_progress') {
        setIsScrapingActive(true);
        // resumeScraping'i doğrudan çağırmak yerine jobToResume kontrolü yap
        if (jobToResume) {
          resumeScraping(jobToResume);
        } else if (jobs && jobs.status === 'in_progress') {
           resumeScraping(jobs);
        }
      }
    }
  }, []); // resumeScraping'i bağımlılıktan çıkarabiliriz, çünkü o anlık çağrılıyor

  // Sadece component mount edildiğinde en son işi bul
  useEffect(() => {
    loadLatestJob();
  }, []); // Sadece mount'ta çalışır

  // Filtreler değiştiğinde 1. sayfaya dön
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, filterDomain, filterStatus]);

  // Veri yükleme için ana useEffect
  // currentJob, currentPage veya loadJobData (filtreler yüzünden) değiştiğinde çalışır
  useEffect(() => {
    if (currentJob) {
      loadJobData(currentJob.id, currentPage);
    }
  }, [currentJob, currentPage, loadJobData]);


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
          setCurrentJob(updatedJob); // Bu, useEffect'i tetikleyerek veriyi yeniden yükler
        }
        
        // loadJobData'yı manuel çağırmaya gerek yok,
        // setCurrentJob ve useEffect halledecek
        
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

      setCurrentJob(newJob); // Veri yükleme useEffect'ini tetikler
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
        
        // Manuel veri yüklemesi yerine state güncellemesine güven
        // await loadJobData(newJob.id, 1); 

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

      // Sadece job'ı set et, resumeScraping'i loadLatestJob'un yapmasına izin ver
      loadLatestJob(updatedJob);

    } catch (error) {
      console.error('Error continuing scraping:', error);
      setIsScrapingActive(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // useEffect [currentPage] değiştiği için veriyi otomatik yükleyecektir
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
          // Filtre state'lerini ve setter'ları prop olarak yolla
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