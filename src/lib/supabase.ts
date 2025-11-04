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

export interface ProductData {
  images: string[];
  status: 'open' | 'closed';
  error?: string;
}

export interface ScrapedData {
  id: string;
  job_id: string;
  date: string;
  domain: string;
  currency: string;
  language: string;
  products: ProductData;
  created_at: string;
}
