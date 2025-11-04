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

// YENİ: ProductDetails arayüzü (product_details tablosu için)
export interface ProductDetails {
  id: string;
  scraped_data_id: string;
  status: 'open' | 'closed';
  title: string; // Title eklendi
  images: string[];
  error?: string;
  created_at: string;
}

// GÜNCELLENDİ: ScrapedData arayüzü
export interface ScrapedData {
  id: string;
  job_id: string;
  date: string;
  domain: string;
  currency: string;
  language: string;
  created_at: string;
  
  // 'products' alanı 'product_details' ile değiştirildi
  product_details: ProductDetails; 
}