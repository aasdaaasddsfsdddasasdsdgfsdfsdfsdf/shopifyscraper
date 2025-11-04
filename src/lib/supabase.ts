import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ScrapeJob {
  id: string;
  start_date: string;
  end_date: string;
  processing_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  total_records: number;
  created_at: string;
  updated_at: string;
}

export interface ProductDetails {
  id: string;
  scraped_data_id: string;
  status: 'open' | 'closed';
  title: string;
  images: string[];
  error?: string;
  created_at: string;
}

// --- GÜNCELLENDİ: ScrapedData arayüzü ---
export interface ScrapedData {
  id: string;
  job_id: string;
  date: string;
  domain: string;
  currency: string;
  language: string;
  created_at: string;
  
  product_details: ProductDetails; 
  
  listedurum: boolean;
  inceleyen: string | null;
  
  // --- YENİ CSV SÜTUNLARI EKLENDİ ---
  ciro: string | null;
  adlink: string | null;
  niche: string | null;
  product_count: number | null;
  trafik: string | null;
  app: string | null;
  theme: string | null;
}