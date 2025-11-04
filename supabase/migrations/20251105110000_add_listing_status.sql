/*
  Migration: "Liselensin mi?" ve "İnceleyen" sütunlarını ekler

  1.  `scraped_data` tablosuna `listedurum` (boolean) ekler.
      Varsayılan (default) değeri `false` olarak ayarlar.
  2.  `scraped_data` tablosuna `inceleyen` (text) ekler.
      Bu sütun kimin onayladığını tutar (Efkan, Mert, Furkan).
  3.  Filtreleme performansını artırmak için iki yeni sütuna da
      indeks (index) ekler.
*/

-- 1. "Liselensin mi?" sütununu ekle
ALTER TABLE scraped_data
ADD COLUMN IF NOT EXISTS listedurum boolean DEFAULT false;

-- 2. "İnceleyen" sütununu ekle
ALTER TABLE scraped_data
ADD COLUMN IF NOT EXISTS inceleyen text;

-- 3. İndeksleri oluştur
CREATE INDEX IF NOT EXISTS idx_scraped_data_listedurum
  ON scraped_data(listedurum);

CREATE INDEX IF NOT EXISTS idx_scraped_data_inceleyen
  ON scraped_data(inceleyen);