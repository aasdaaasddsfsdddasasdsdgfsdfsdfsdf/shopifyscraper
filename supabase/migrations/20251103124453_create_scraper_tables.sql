/*
  # MerchantGenius Scraper Database Schema

  1. New Tables
    - `scrape_jobs`
      - `id` (uuid, primary key) - Unique job identifier
      - `start_date` (date) - Start date for scraping range
      - `end_date` (date) - End date for scraping range
      - `processing_date` (date) - Current processing date for resume capability
      - `status` (text) - Job status: 'pending', 'in_progress', 'completed', 'failed'
      - `total_records` (integer) - Total number of records scraped
      - `created_at` (timestamptz) - Job creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `scraped_data`
      - `id` (uuid, primary key) - Unique record identifier
      - `job_id` (uuid, foreign key) - Reference to scrape_jobs
      - `date` (date) - Scraped date
      - `domain` (text) - Website domain
      - `currency` (text) - Currency code (USD, EUR, etc.)
      - `language` (text) - Language
      - `source_url` (text) - Original source URL
      - `created_at` (timestamptz) - Record creation timestamp
  
  2. Security
    - Enable RLS on both tables
    - Add policies for public access (since this is a scraping tool)
  
  3. Indexes
    - Add indexes for performance on frequently queried columns
*/

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  processing_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_records integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scraped_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  date date NOT NULL,
  domain text NOT NULL,
  currency text DEFAULT '',
  language text DEFAULT '',
  source_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scrape jobs"
  ON scrape_jobs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create scrape jobs"
  ON scrape_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update scrape jobs"
  ON scrape_jobs FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete scrape jobs"
  ON scrape_jobs FOR DELETE
  USING (true);

CREATE POLICY "Anyone can view scraped data"
  ON scraped_data FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create scraped data"
  ON scraped_data FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update scraped data"
  ON scraped_data FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete scraped data"
  ON scraped_data FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_scraped_data_job_id ON scraped_data(job_id);
CREATE INDEX IF NOT EXISTS idx_scraped_data_date ON scraped_data(date);
CREATE INDEX IF NOT EXISTS idx_scraped_data_domain ON scraped_data(domain);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created_at ON scrape_jobs(created_at DESC);