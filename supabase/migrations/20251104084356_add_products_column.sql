/*
  # Add Products Column to Scraped Data

  1. Changes
    - Remove source_url column (no longer needed)
    - Add products column to store JSON array of product images
    - Each product entry contains up to 3 image URLs or error status

  2. New Column
    - `products` (jsonb) - Array of product objects with structure:
      - `images`: array of image URLs (max 3)
      - `status`: 'open' or 'closed' if /products.json endpoint fails
      - `error`: error message if applicable
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraped_data' AND column_name = 'source_url'
  ) THEN
    ALTER TABLE scraped_data DROP COLUMN source_url;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraped_data' AND column_name = 'products'
  ) THEN
    ALTER TABLE scraped_data ADD COLUMN products jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;