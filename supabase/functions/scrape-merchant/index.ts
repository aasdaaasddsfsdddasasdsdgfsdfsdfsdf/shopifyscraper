import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

// --- ProductData ARAYÜZÜ GÜNCELLENDİ ---
interface ProductData {
  title: string;
  images: string[];
  status: 'open' | 'closed';
  error?: string;
}

interface ScrapedRecord {
  date: string;
  domain: string;
  currency: string;
  language: string;
  products: ProductData;
}

// --- fetchProductImages GÜNCELLENDİ (title eklendi) ---
async function fetchProductImages(domain: string): Promise<ProductData> {
  try {
    const url = `https://${domain}/products.json?limit=10`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return {
        title: '',
        images: [],
        status: 'closed',
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const images: string[] = [];
    let title = '';

    if (data.products && Array.isArray(data.products) && data.products.length > 0) {
      const firstProduct = data.products[0];
      
      // Ürün başlığını al
      title = firstProduct.title || '';

      if (firstProduct.images && Array.isArray(firstProduct.images)) {
        for (let i = 0; i < Math.min(3, firstProduct.images.length); i++) {
          const img = firstProduct.images[i];
          if (img && img.src) {
            images.push(img.src);
          }
        }
      }
    }

    return {
      title, // Title eklendi
      images,
      status: 'open',
    };
  } catch (error) {
    return {
      title: '',
      images: [],
      status: 'closed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function scrapeDate(dateStr: string): Promise<ScrapedRecord[]> {
  const url = `https://www.merchantgenius.io/shop/date/${dateStr}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const records: ScrapedRecord[] = [];
    const seenDomains = new Set<string>();

    let blockMatch;
    BLOG_BLOCK_RE.lastIndex = 0;
    while ((blockMatch = BLOG_BLOCK_RE.exec(html)) !== null) {
      const block = blockMatch[1];

      let domain = '';
      const hrefM = HREF_DOMAIN_RE.exec(block);
      if (hrefM) {
        domain = cleanDomain(hrefM[1]);
      } else {
        const typeM = TYPE_TEXT_RE.exec(block);
        if (typeM) {
          domain = cleanDomain(typeM[1]);
        } else {
          const fb = DOMAIN_FALLBACK_RE.exec(block);
          if (fb) domain = cleanDomain(fb[1]);
        }
      }

      if (!domain || seenDomains.has(domain)) continue;

      let currency = '';
      let language = '';

      const paren = PAREN_LANG_RE.exec(block);
      if (paren) {
        currency = (paren[1] || '').toUpperCase();
        language = (paren[2] || '').trim();
      } else {
        const flag = FLAG_RE.exec(block);
        if (flag) {
          currency = (flag[1] || '').toUpperCase();
        }
      }

      seenDomains.add(domain);

      // Bu fonksiyon artık 'title' içeren productData döndürecek
      const productData = await fetchProductImages(domain);

      records.push({
        date: dateStr,
        domain,
        currency,
        language,
        products: productData,
      });
    }

    return records;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { date } = await req.json();

    if (!date) {
      return new Response(
        JSON.stringify({ error: 'Date parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const records = await scrapeDate(date);

    return new Response(JSON.stringify({ data: records }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});