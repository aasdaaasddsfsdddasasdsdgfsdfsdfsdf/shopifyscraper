import { supabase } from './supabase';

export interface ScrapedRecord {
  date: string;
  domain: string;
  currency: string;
  language: string;
  source_url: string;
}

const BLOG_BLOCK_RE = /<div\s+class="blogContent">([\s\S]*?)<\/div>/gi;
const HREF_DOMAIN_RE = /href="\/shop\/url\/([^"]+)"/i;
const TYPE_TEXT_RE = /<span[^>]*class="typeText"[^>]*>([^<]+)<\/span>/i;
const PAREN_LANG_RE = /\(\s*([A-Za-z]{3})\s*\/\s*([^)]+?)\s*\)/i;
const FLAG_RE = /<img[^>]*src="\/flags\/([a-z]{3})\.png"/i;
const DOMAIN_FALLBACK_RE = /([a-z0-9\-\.]+\.(?:com|net|org|shop|store|co|ca|io|online|site|shopify\.com))/gi;

function cleanDomain(raw: string): string {
  if (!raw) return '';
  let s = String(raw).trim();
  s = s.replace(/^https?:\/\//i, '')
       .replace(/^\/\//, '')
       .replace(/^www\./i, '')
       .replace(/[.,;:()<>\s]+$/g, '');
  const slash = s.indexOf('/');
  if (slash >= 0) s = s.substring(0, slash);
  return s.toLowerCase();
}

export async function scrapeDate(dateStr: string): Promise<ScrapedRecord[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/scrape-merchant`;

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ date: dateStr }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error(`Error scraping ${dateStr}:`, error);
    throw error;
  }
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function saveRecords(jobId: string, records: ScrapedRecord[]) {
  if (records.length === 0) return;

  const dataToInsert = records.map(r => ({
    job_id: jobId,
    date: r.date,
    domain: r.domain,
    currency: r.currency,
    language: r.language,
    source_url: r.source_url,
  }));

  const { error } = await supabase
    .from('scraped_data')
    .insert(dataToInsert);

  if (error) {
    throw new Error(`Failed to save records: ${error.message}`);
  }
}

export async function updateJobProgress(
  jobId: string,
  processingDate: string,
  status: string,
  totalRecords: number
) {
  const { error } = await supabase
    .from('scrape_jobs')
    .update({
      processing_date: processingDate,
      status,
      total_records: totalRecords,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to update job: ${error.message}`);
  }
}
