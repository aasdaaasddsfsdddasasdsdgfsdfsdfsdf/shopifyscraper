/*
  Migration: Product verilerini normalize et (ayrı tablo)

  1.  `product_details` adında yeni bir tablo oluşturur.
      (NOT: `title` sütunu, uygulama arayüzünde istendiği için eklendi.)
  2.  `scraped_data.products` JSONB sütunundaki (status, title, images, error)
      verilerini bu yeni tabloya taşır.
  3.  `scraped_data.id` -> `product_details.scraped_data_id` arasında
      1'e 1 (UNIQUE) bir Foreign Key ilişkisi kurar.
  4.  Yeni tablo için RLS (Satır Seviyesi Güvenlik) ve ilkeleri etkinleştirir.
  5.  Performans için gerekli indeksleri ekler.
*/

-- 1. Yeni product_details tablosunu oluştur
CREATE TABLE IF NOT EXISTS product_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- scraped_data tablosuna 1'e 1 ilişki (UNIQUE)
  -- Ana kayıt silinirse (ON DELETE CASCADE), bu kayıt da silinir.
  scraped_data_id uuid NOT NULL UNIQUE REFERENCES scraped_data(id) ON DELETE CASCADE,
  
  -- JSONB'den alınan alanlar
  status text NOT NULL,
  title text, -- 'title' alanı eklendi
  images text[] DEFAULT ARRAY[]::text[],
  error text,
  
  created_at timestamptz DEFAULT now()
);

-- 2. Mevcut Verileri JSONB'den Yeni Tabloya Taşı
-- Bu sorgu, scraped_data'daki her satırı okur,
-- 'products' JSONB'sini ayrıştırır ve 'product_details'e yazar.
INSERT INTO product_details (
  scraped_data_id,
  status,
  title, -- 'title' alanı eklendi
  error,
  images
)
SELECT
  id, -- scraped_data.id
  products->>'status',
  products->>'title', -- 'title' alanı eklendi
  products->>'error',
  
  -- JSONB içindeki string dizisini ('["url1", "url2"]')
  -- PostgreSQL text dizisine ('{url1, url2}') çevirir
  CASE
    WHEN products->'images' IS NOT NULL AND jsonb_typeof(products->'images') = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(products->'images'))
    ELSE ARRAY[]::text[]
  END
FROM
  scraped_data
WHERE
  products IS NOT NULL 
  AND jsonb_typeof(products) = 'object'
  AND products ? 'status'
ON CONFLICT (scraped_data_id) DO NOTHING; -- Migrasyonun tekrar çalıştırılmasına karşı koruma


-- 3. RLS ve Politikaları Etkinleştir
ALTER TABLE product_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product details"
  ON product_details FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create product details"
  ON product_details FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update product details"
  ON product_details FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete product details"
  ON product_details FOR DELETE
  USING (true);

-- 4. İndeksleri Ekle
CREATE INDEX IF NOT EXISTS idx_product_details_scraped_data_id 
  ON product_details(scraped_data_id);

CREATE INDEX IF NOT EXISTS idx_product_details_status 
  ON product_details(status);

-- 'title' alanına göre filtreleme için indeks
CREATE INDEX IF NOT EXISTS idx_product_details_title 
  ON product_details(title text_pattern_ops);


-- 5. (ÖNEMLİ - OPSİYONEL) Eski Sütunu Sil
-- Veri geçişinin başarılı olduğunu ve uygulamanızın
-- yeni yapıyla çalıştığını doğruladıktan sonra,
-- 'products' sütununu 'scraped_data' tablosundan kaldırabilirsiniz.
/*
ALTER TABLE scraped_data DROP COLUMN products;
*/