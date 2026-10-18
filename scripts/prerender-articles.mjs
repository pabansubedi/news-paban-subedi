// Runs in GitHub Actions after `npm run build`. Generates, inside dist/:
//   news/<slug>/index.html      one page per published article (own title/description/image
//                               in <head>, so Facebook / WhatsApp / Viber / Google show a
//                               proper share preview; they do NOT run JavaScript)
//   category/<slug>/index.html  same for category pages
//   sitemap.xml                 for Google
//   rss.xml                     RSS 2.0 feed (readers, Google News, aggregators)
//
// Posts that are not live yet (draft / pending / scheduled for later) are never included.
// If Supabase cannot be reached this only warns: it never fails the deploy.
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://news.pabansubedi.com.np';
const SITE_NAME = 'News Paban Subedi';
const DIST = path.resolve('dist');
const DEFAULT_IMAGE = `${SITE}/og-default.jpg`; // used when a news has no usable photo

const cfgFile = fs.readFileSync(path.resolve('src/lib/supabase.ts'), 'utf8');
const SUPABASE_URL = process.env.SUPABASE_URL || /url:\s*'([^']+)'/.exec(cfgFile)?.[1];
const SUPABASE_KEY = process.env.SUPABASE_KEY || /key:\s*'([^']+)'/.exec(cfgFile)?.[1];

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const safeSegment = (s) => !!s && !/[\/\\?#]/.test(s) && !s.includes('..');
const mimeOf = (u) => (/\.png(\?|$)/i.test(u) ? 'image/png' : /\.webp(\?|$)/i.test(u) ? 'image/webp' : /\.gif(\?|$)/i.test(u) ? 'image/gif' : 'image/jpeg');

// Facebook / WhatsApp show NO photo at all when the og:image is WebP, over 8 MB, blocked
// (hotlink protection) or gone. So a photo is only used when it really is a reachable JPEG / PNG / GIF;
// otherwise the default share image is used and a preview is never empty.
async function usableImage(url) {
  try {
    const r = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
      headers: { 'user-agent': 'facebookexternalhit/1.1' }
    });
    const type = (r.headers.get('content-type') || '').toLowerCase();
    const size = Number(r.headers.get('content-length') || 0);
    return r.ok && /^image\/(jpe?g|png|gif)/.test(type) && size < 8 * 1024 * 1024;
  } catch {
    return false;
  }
}

async function checkAll(urls) {
  const ok = new Map();
  const queue = [...new Set(urls)];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (queue.length) {
        const u = queue.pop();
        ok.set(u, await usableImage(u));
      }
    })
  );
  return ok;
}

async function get(table, query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: { apikey: SUPABASE_KEY } });
  if (!res.ok) throw new Error(`${table}: Supabase answered ${res.status}`);
  return res.json();
}

// copy of dist/index.html with page specific <head> tags
function pageHtml(template, { title, desc, url, image, type }) {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:type" content=")[^"]*(")/, `$1${type}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`);
  const img = image || DEFAULT_IMAGE;
  html = html
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(img)}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${esc(img)}$2`);
  // the 1200x630 size is only true for our own default image
  if (img !== DEFAULT_IMAGE) {
    html = html.replace(/\s*<meta property="og:image:(width|height)"[^>]*>/g, '');
  }
  return html.replace('</head>', `    <link rel="canonical" href="${esc(url)}" />\n  </head>`);
}

function write(rel, content) {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return console.warn('[prerender] Supabase config not found, skipping.');
  const indexPath = path.join(DIST, 'index.html');
  if (!fs.existsSync(indexPath)) return console.warn('[prerender] dist/index.html missing, skipping.');
  const template = fs.readFileSync(indexPath, 'utf8');

  const rows = await get(
    'posts',
    'select=slug,title,excerpt,summary,featured_image,published_at,created_at,updated_at,category_id' +
      '&status=eq.published&order=published_at.desc&limit=1000'
  );
  let categories = [];
  try {
    categories = await get('categories', 'select=slug,name,name_en&is_active=eq.true&order=order_index.asc');
  } catch (e) {
    console.warn('[prerender] categories skipped:', e.message);
  }

  const now = Date.now();
  const live = rows.filter(
    (p) => (!p.published_at || new Date(p.published_at).getTime() <= now) && safeSegment(p.slug)
  );

  // which photos can really be used as share image
  const photoOk = await checkAll(live.map((p) => p.featured_image).filter((u) => /^https?:\/\//i.test(u || '')));
  const badPhotos = [...photoOk.values()].filter((v) => !v).length;
  if (badPhotos) console.warn(`[prerender] ${badPhotos} photo(s) are not usable as share image (not JPEG/PNG, blocked or missing): default image used.`);

  // ---- article pages
  for (const p of live) {
    const desc = String(p.excerpt || p.summary || p.title).replace(/\s+/g, ' ').trim().slice(0, 160);
    const image = photoOk.get(p.featured_image) ? p.featured_image : '';
    write(
      path.join('news', p.slug, 'index.html'),
      pageHtml(template, {
        title: `${p.title} | ${SITE_NAME}`,
        desc,
        url: `${SITE}/news/${encodeURIComponent(p.slug)}`,
        image,
        type: 'article'
      })
    );
  }

  // ---- category pages
  const cats = categories.filter((c) => safeSegment(c.slug));
  for (const c of cats) {
    write(
      path.join('category', c.slug, 'index.html'),
      pageHtml(template, {
        title: `${c.name} | ${SITE_NAME}`,
        desc: `${c.name} सम्बन्धी ताजा समाचार र विश्लेषण - ${SITE_NAME}`,
        url: `${SITE}/category/${encodeURIComponent(c.slug)}`,
        image: '',
        type: 'website'
      })
    );
  }

  // ---- sitemap.xml
  const iso = (d) => new Date(d).toISOString();
  const urls = [
    `<url><loc>${SITE}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
    ...cats.map((c) => `<url><loc>${esc(`${SITE}/category/${encodeURIComponent(c.slug)}`)}</loc><changefreq>hourly</changefreq><priority>0.7</priority></url>`),
    ...live.map(
      (p) =>
        `<url><loc>${esc(`${SITE}/news/${encodeURIComponent(p.slug)}`)}</loc>` +
        `<lastmod>${iso(p.updated_at || p.published_at || p.created_at || now)}</lastmod>` +
        `<changefreq>daily</changefreq><priority>0.8</priority></url>`
    )
  ];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

  // ---- rss.xml (newest 50)
  const items = live.slice(0, 50).map((p) => {
    const link = `${SITE}/news/${encodeURIComponent(p.slug)}`;
    const desc = String(p.excerpt || p.summary || '').replace(/\s+/g, ' ').trim();
    const image = /^https?:\/\//i.test(p.featured_image || '') ? p.featured_image : '';
    return (
      `<item><title>${esc(p.title)}</title><link>${esc(link)}</link>` +
      `<guid isPermaLink="true">${esc(link)}</guid>` +
      `<pubDate>${new Date(p.published_at || p.created_at || now).toUTCString()}</pubDate>` +
      `<description>${esc(desc)}</description>` +
      (image ? `<enclosure url="${esc(image)}" type="${mimeOf(image)}" length="0" />` : '') +
      `</item>`
    );
  });
  write(
    'rss.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n` +
      `<title>${esc(SITE_NAME)}</title><link>${SITE}/</link>` +
      `<description>सत्य, तथ्य र निष्पक्ष पत्रकारिताको संवाहक</description><language>ne</language>` +
      `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n${items.join('\n')}\n</channel></rss>\n`
  );

  console.log(`[prerender] ${live.length} article page(s), ${cats.length} category page(s), sitemap.xml, rss.xml.`);
}

main().catch((e) => console.warn('[prerender] failed (site still deploys):', e?.message || e));
