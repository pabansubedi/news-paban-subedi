// Vercel serverless function: share-bots (Facebook, WhatsApp, Viber, Telegram, X, LinkedIn ...)
// that open /news/<slug> get the REAL title / description / photo of that news, read live
// from Supabase, so the preview is right the moment a news is published (no rebuild needed).
// Normal visitors never reach this file (see the rewrite rules in vercel.json).
const SITE = 'https://news.pabansubedi.com.np';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sjuhibdipqznpedphptu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_NlZ7AdufiBB7fauxDe6uJw_jnrfpO7h'; // public key
const DEFAULT_IMAGE = `${SITE}/og-default.jpg`;

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

async function shell(req) {
  // the normal single-page-app html (the request carries a non-bot user-agent on purpose)
  const r = await fetch(`https://${req.headers.host}/`, { headers: { 'user-agent': 'og-function' } });
  return r.text();
}

export default async function handler(req, res) {
  let slug = String(req.query.slug || '');
  try {
    slug = decodeURIComponent(slug);
  } catch {}

  let html = '';
  try {
    html = await shell(req);
    const api =
      `${SUPABASE_URL}/rest/v1/posts?select=title,excerpt,summary,featured_image,published_at` +
      `&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`;
    const rows = await (await fetch(api, { headers: { apikey: SUPABASE_KEY } })).json();
    const post = Array.isArray(rows) ? rows[0] : null;

    if (post && !(post.published_at && new Date(post.published_at) > new Date())) {
      const title = `${post.title} | News Paban Subedi`;
      const desc = String(post.excerpt || post.summary || post.title).replace(/\s+/g, ' ').trim().slice(0, 160);
      const image = /^https?:\/\//i.test(post.featured_image || '') ? post.featured_image : DEFAULT_IMAGE;
      const url = `${SITE}/news/${encodeURIComponent(slug)}`;

      html = html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
        .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
        .replace(/(<meta property="og:type" content=")[^"]*(")/, `$1article$2`)
        .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
        .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(image)}$2`)
        .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
        .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
        .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${esc(image)}$2`);
      if (image !== DEFAULT_IMAGE) {
        html = html.replace(/\s*<meta property="og:image:(width|height)"[^>]*>/g, '');
      }
      html = html.replace('</head>', `    <link rel="canonical" href="${esc(url)}" />\n  </head>`);
    }
  } catch {
    /* fall through: whatever html we have (or the plain notice below) is still better than an error */
  }

  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(html || '<!doctype html><title>News Paban Subedi</title>');
}
