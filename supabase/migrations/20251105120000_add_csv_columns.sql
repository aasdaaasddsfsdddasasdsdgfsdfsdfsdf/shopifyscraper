/*
  Migration: CSV importu için yeni mağaza detay sütunlarını ekler

  Bu sütunlar `scraped_data` tablosuna eklenir, çünkü hepsi 
  doğrudan mağazanın (domain) kendisiyle ilgilidir.
*/

-- Ciro (Gelir) - Metin olarak tutmak daha güvenlidir (örn: "$10k")
ALTER TABLE scraped_data
ADD COLUMN IF NOT EXISTS ciro text;

-- Reklam Linki
ALTER TABLE scraped_data
ADD COLUMN IF NOT EXISTS adlink text;

-- Niş (Kategori)
ALTER TABLE scraped_data
ADD COLUMN IF NOT EXISTS niche text;

-- Ürün Sayısı
ALTER TABLE scraped_data
ADD COLUMN IF NOT EXISTS product_count integer;

-- Trafik (Metin olarak, "1.2M" gibi değerler için)
ALTER TABLE scraped_data
ADD COLUMN IF NOT EXISTS trafik text;

-- Kullandığı App'ler (Uygulamalar)
ALTER TABLE scraped_data
ADD COLUMN IF NOT EXISTS app text;

-- Tema
ALTER TABLE scraped_data
ADD COLUMN IF NOT EXISTS theme text;

-- Filtreleme için potansiyel indeksler
CREATE INDEX IF NOT EXISTS idx_scraped_data_niche ON scraped_data(niche);
CREATE INDEX IF NOT EXISTS idx_scraped_data_app ON scraped_data(app);
CREATE INDEX IF NOT EXISTS idx_scraped_data_theme ON scraped_data(theme);