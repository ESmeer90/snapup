/**
 * Vercel Serverless Function: /api/og
 * 
 * Serves proper Open Graph meta tags to social media crawlers for listing URLs.
 * When WhatsApp/Facebook/Twitter/LinkedIn crawl a SnapUp listing link, they hit
 * this endpoint which returns a minimal HTML page with correct og:title, og:image,
 * og:description tags — enabling rich link previews.
 * 
 * Non-crawler requests are redirected to the SPA.
 * 
 * Query params:
 *   ?listing=UUID  — The listing ID to generate OG tags for
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://iorzfbaxvpcklbyngtpi.databasepad.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjAxNGM2MzYxLWI5NDEtNDExYy1hZDEwLTAwNDNkYzY5YmVlNSJ9.eyJwcm9qZWN0SWQiOiJpb3J6ZmJheHZwY2tsYnluZ3RwaSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzcxNTA0MTQwLCJleHAiOjIwODY4NjQxNDAsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.hBQcO_RotG83sLEKXoOt4ltMws42yRsBufc8aDIsO7Y';
const BASE_URL = 'https://snapup.co.za';
const DEFAULT_OG_IMAGE = 'https://d64gsuwffb70l.cloudfront.net/699701f2f91939597c7a986c_1772033228455_a0d42141.jpg';

// Crawler user-agent patterns
const CRAWLER_PATTERNS = [
  'facebookexternalhit',
  'Facebot',
  'WhatsApp',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Googlebot',
  'bingbot',
  'Pinterestbot',
  'vkShare',
  'Applebot',
  'redditbot',
  'Embedly',
  'Quora Link Preview',
  'Showyoubot',
  'outbrain',
  'W3C_Validator',
  'rogerbot',
  'Screaming Frog',
];

function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return CRAWLER_PATTERNS.some(pattern => ua.includes(pattern.toLowerCase()));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatZAR(amount: number): string {
  return 'R ' + amount.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userAgent = req.headers['user-agent'] || '';
  const listingId = req.query.listing as string;

  // If no listing ID or not a crawler, redirect to SPA
  if (!listingId) {
    return res.redirect(302, BASE_URL);
  }

  if (!isCrawler(userAgent)) {
    return res.redirect(302, `${BASE_URL}/?listing=${listingId}`);
  }

  try {
    // Fetch listing data from Supabase using REST API
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?id=eq.${listingId}&select=id,title,price,description,location,province,condition,images,status,created_at,updated_at,user_id,category_id,seller_name:profiles!listings_user_id_fkey(full_name),category_name:categories!listings_category_id_fkey(name)`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Accept': 'application/json',
        }
      }
    );

    const listings = await response.json();
    const listing = listings?.[0];

    if (!listing) {
      // Listing not found — return default OG tags
      return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(
        generateHtml({
          title: 'SnapUp - Buy & Sell in South Africa',
          description: "South Africa's trusted online marketplace. Buy and sell electronics, vehicles, fashion, furniture and more.",
          image: DEFAULT_OG_IMAGE,
          url: BASE_URL,
          type: 'website',
        })
      );
    }

    const price = formatZAR(listing.price || 0);
    const condition = listing.condition === 'new' ? 'Brand New' :
                      listing.condition === 'like_new' ? 'Like New' :
                      listing.condition === 'good' ? 'Good' :
                      listing.condition === 'fair' ? 'Fair' : 'Used';
    const imageUrl = listing.images?.[0] || DEFAULT_OG_IMAGE;
    const categoryName = listing.category_name?.name || '';
    const sellerName = listing.seller_name?.full_name || 'Seller';
    const listingUrl = `${BASE_URL}/?listing=${listing.id}`;

    const ogTitle = `${listing.title} - ${price} | SnapUp`;
    const ogDescription = `${price} · ${condition}${categoryName ? ' · ' + categoryName : ''} · ${listing.province || listing.location || 'South Africa'}${listing.description ? ' — ' + truncate(listing.description, 150) : ''}`;

    const html = generateHtml({
      title: ogTitle,
      description: ogDescription,
      image: imageUrl,
      url: listingUrl,
      type: 'product',
      price: listing.price,
      currency: 'ZAR',
      availability: listing.status === 'active' ? 'instock' : 'oos',
      condition,
      sellerName,
      categoryName,
      listingTitle: listing.title,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(html);

  } catch (error) {
    console.error('OG handler error:', error);
    // Return default OG tags on error
    return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(
      generateHtml({
        title: 'SnapUp - Buy & Sell in South Africa',
        description: "South Africa's trusted online marketplace.",
        image: DEFAULT_OG_IMAGE,
        url: `${BASE_URL}/?listing=${listingId}`,
        type: 'website',
      })
    );
  }
}

interface OgParams {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  price?: number;
  currency?: string;
  availability?: string;
  condition?: string;
  sellerName?: string;
  categoryName?: string;
  listingTitle?: string;
}

function generateHtml(params: OgParams): string {
  const { title, description, image, url, type, price, currency, availability, condition, sellerName, categoryName, listingTitle } = params;

  const productMeta = type === 'product' && price ? `
    <meta property="product:price:amount" content="${(price / 1).toFixed(2)}" />
    <meta property="product:price:currency" content="${currency || 'ZAR'}" />
    ${availability ? `<meta property="product:availability" content="${availability}" />` : ''}
    ${condition ? `<meta property="product:condition" content="${escapeHtml(condition)}" />` : ''}
    ${categoryName ? `<meta property="product:category" content="${escapeHtml(categoryName)}" />` : ''}
  ` : '';

  const jsonLd = type === 'product' && price ? `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "${escapeHtml(listingTitle || title)}",
      "description": "${escapeHtml(description)}",
      "image": "${escapeHtml(image)}",
      "url": "${escapeHtml(url)}",
      ${categoryName ? `"category": "${escapeHtml(categoryName)}",` : ''}
      ${condition ? `"itemCondition": "https://schema.org/${condition === 'Brand New' ? 'NewCondition' : 'UsedCondition'}",` : ''}
      "offers": {
        "@type": "Offer",
        "price": "${price.toFixed(2)}",
        "priceCurrency": "ZAR",
        "availability": "https://schema.org/${availability === 'instock' ? 'InStock' : 'OutOfStock'}",
        "seller": {
          "@type": "Person",
          "name": "${escapeHtml(sellerName || 'Seller')}"
        },
        "itemCondition": "https://schema.org/${condition === 'Brand New' ? 'NewCondition' : 'UsedCondition'}"
      }
    }
    </script>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en-ZA" prefix="og: https://ogp.me/ns# product: https://ogp.me/ns/product#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Primary Meta Tags -->
  <title>${escapeHtml(title)}</title>
  <meta name="title" content="${escapeHtml(title)}" />
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${escapeHtml(url)}" />

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="${type === 'product' ? 'product' : 'website'}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="og:site_name" content="SnapUp" />
  <meta property="og:locale" content="en_ZA" />
  ${productMeta}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${escapeHtml(url)}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(title)}" />

  ${jsonLd}

  <!-- Redirect non-crawlers to SPA (fallback) -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
  <p><a href="${escapeHtml(url)}">View on SnapUp</a></p>
</body>
</html>`;
}
