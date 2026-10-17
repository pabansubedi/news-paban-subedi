// OPTIONAL - instant share previews (Facebook / WhatsApp / Viber ...) the moment a news is published.
//
// Without this, a new news gets its own preview page only at the next GitHub Actions run
// (every 30 min). This Worker answers share-bots with the real title / description / photo
// read live from Supabase. Normal visitors are not touched.
//
// Needs: the domain proxied by Cloudflare (orange cloud) + a Worker route:
//        news.pabansubedi.com.np/news/*
// Worker variables (Settings -> Variables): SUPABASE_URL, SUPABASE_KEY  (the public publishable key)
const BOTS = /facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Viber|Slackbot|Discordbot|Pinterest|SkypeUriPreview|Googlebot|bingbot/i;
const SITE = 'https://news.pabansubedi.com.np';
const DEFAULT_IMAGE = `${SITE}/og-default.jpg`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/news\/([^/]+)\/?$/);
    if (!m || !BOTS.test(request.headers.get('user-agent') || '')) return fetch(request);

    try {
      const slug = decodeURIComponent(m[1]);
      const api =
        `${env.SUPABASE_URL}/rest/v1/posts?select=title,excerpt,summary,featured_image,published_at` +
        `&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`;
      const rows = await (await fetch(api, { headers: { apikey: env.SUPABASE_KEY } })).json();
      const post = Array.isArray(rows) ? rows[0] : null;
      if (!post || (post.published_at && new Date(post.published_at) > new Date())) return fetch(request);

      const title = `${post.title} | News Paban Subedi`;
      const desc = String(post.excerpt || post.summary || post.title).replace(/\s+/g, ' ').trim().slice(0, 160);
      const image = /^https?:\/\//i.test(post.featured_image || '') ? post.featured_image : DEFAULT_IMAGE;
      const pageUrl = `${SITE}/news/${encodeURIComponent(slug)}`;

      const shell = await fetch(`${SITE}/`, { headers: { 'user-agent': 'og-worker' } });
      const set = (value) => ({ element: (e) => e.setAttribute('content', value) });
      const rewritten = new HTMLRewriter()
        .on('title', { element: (e) => e.setInnerContent(title) })
        .on('meta[name="description"]', set(desc))
        .on('meta[property="og:title"]', set(title))
        .on('meta[property="og:description"]', set(desc))
        .on('meta[property="og:type"]', set('article'))
        .on('meta[property="og:url"]', set(pageUrl))
        .on('meta[property="og:image"]', set(image))
        .on('meta[name="twitter:title"]', set(title))
        .on('meta[name="twitter:description"]', set(desc))
        .on('meta[name="twitter:image"]', set(image))
        .on('head', {
          element: (e) => {
            e.append(`<link rel="canonical" href="${pageUrl.replace(/"/g, '&quot;')}" />`, { html: true });
          }
        })
        .transform(shell);

      return new Response(rewritten.body, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' }
      });
    } catch {
      return fetch(request);
    }
  }
};
