/*
  Migration: 'scraped_data' tablosundaki 'domain' sütununa UNIQUE kısıtlaması ekler.
  
  HATA DÜZELTMESİ: CsvImporter'daki 'onConflict: "domain"' komutunun 
  "no unique... constraint" hatasını çözmek için bu gereklidir.

  1.  (ÖNLEM) Mükerrer kayıtları temizler. 'domain' başına en yeni 
      (created_at) kaydı tutar, eskileri siler.
  2.  'domain' sütununa UNIQUE kısıtlamasını (constraint) ekler.
*/

-- 1. Mükerrer kayıtları temizle (en yeni olanı tut)
DELETE FROM scraped_data a
WHERE a.ctid <> (
   SELECT max(b.ctid)
   FROM scraped_data b
   WHERE a.domain = b.domain
);

-- 2. 'domain' sütununa UNIQUE kısıtlamasını ekle
-- (Eğer daha önce eklendiyse hata vermemesi için 'IF NOT EXISTS' kontrolü)
ALTER TABLE scraped_data
ADD CONSTRAINT scraped_data_domain_key UNIQUE (domain);
