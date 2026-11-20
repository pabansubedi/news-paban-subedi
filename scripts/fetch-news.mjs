// Auto news fetcher. Runs in GitHub Actions every 10 minutes (see .github/workflows/auto-news.yml).
//
// For every portal in news-sources.mjs it reads the public RSS feed and saves, for each new item:
//   title + short excerpt + photo link + a link back to the original article + the source name.
// It does NOT copy full article text (copyright): readers click "पूरा समाचार" to read at the source.
//
// Needs:  SUPABASE_SERVICE_ROLE_KEY   (GitHub repo -> Settings -> Secrets -> Actions)
// Optional: SUPABASE_URL (otherwise read from src/lib/supabase.ts)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SOURCES } from './news-sources.mjs';

const cfgFile = fs.readFileSync(path.resolve('src/lib/supabase.ts'), 'utf8');
const SUPABASE_URL = (process.env.SUPABASE_URL || /url:\s*'([^']+)'/.exec(cfgFile)?.[1] || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_PER_FEED = Number(process.env.MAX_PER_FEED || 8);     // newest items taken from each portal per run
const MAX_AGE_HOURS = Number(process.env.MAX_AGE_HOURS || 36);  // older items are ignored
const KEEP_HOURS = Number(process.env.KEEP_HOURS || 48);        // auto-news older than this is deleted
const MAX_KEEP = Number(process.env.MAX_KEEP || 600);           // never keep more than this many auto-news

if (!SUPABASE_URL || !KEY) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
  process.exit(1);
}

const UA = 'Mozilla/5.0 (compatible; NewsPabanSubediBot/1.0; +https://news.pabansubedi.com.np)';

// ---------- small helpers ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };
const decodeEntities = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENT[e.toLowerCase()] ?? m;
  });
const unCdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
const stripHtml = (s) =>
  decodeEntities(decodeEntities(unCdata(s)).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
const tag = (block, name) => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(block);
  return m ? unCdata(m[1]).trim() : '';
};
const allTags = (block, name) => [...block.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'gi'))].map((m) => stripHtml(m[1]));
const attr = (str, name) => new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(str)?.[1] || '';
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '') + '…');

async function get(url, accept = '*/*') {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

// ---------- RSS / Atom parsing ----------
function parseFeed(xml) {
  const blocks = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  const items = [];
  for (const b of blocks) {
    let link = stripHtml(tag(b, 'link'));
    if (!link) {
      const lk = [...b.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
      const alt = lk.find((l) => !/rel=["'](?!alternate)/i.test(l)) || lk[0];
      link = alt ? attr(alt, 'href') : '';
    }
    if (!link) link = stripHtml(tag(b, 'guid'));
    const title = stripHtml(tag(b, 'title'));
    if (!/^https?:\/\//i.test(link) || !title) continue;

    const rawDesc = tag(b, 'content:encoded') || tag(b, 'description') || tag(b, 'summary') || tag(b, 'content');
    const descHtml = decodeEntities(unCdata(rawDesc));
    let excerpt = stripHtml(rawDesc);
    // some feeds put the title (or "The post X appeared first on Y") in the description
    excerpt = excerpt.replace(/The post .* appeared first on .*$/i, '').trim();
    if (excerpt.toLowerCase() === title.toLowerCase()) excerpt = '';

    const media = b.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*>/gi) || [];
    let image = '';
    for (const m of media) {
      const u = attr(m, 'url');
      const t = attr(m, 'type');
      if (u && (!t || t.startsWith('image') || /\.(jpe?g|png|webp)(\?|$)/i.test(u))) { image = u; break; }
    }
    if (!image) image = /<img[^>]+src=["']([^"']+)["']/i.exec(descHtml)?.[1] || '';

    const dateStr = tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published') || tag(b, 'updated');
    let date = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(date.getTime())) date = new Date();
    if (date.getTime() > Date.now()) date = new Date(); // feeds with wrong/future time

    items.push({ title, link, excerpt: clip(excerpt, 260), image: /^https?:\/\//i.test(image) ? image : '', date, cats: allTags(b, 'category') });
  }
  return items;
}

async function loadItems(src) {
  const tried = [];
  const tryFeed = async (u) => {
    try {
      const items = parseFeed(await get(u, 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'));
      if (items.length) return items;
      tried.push(`${u} (no items)`);
    } catch (e) {
      tried.push(`${u} (${e.message})`);
    }
    return null;
  };
  for (const u of src.feeds || []) {
    const items = await tryFeed(u);
    if (items) return { items, feed: u };
  }
  // auto-discover the feed from the homepage <link rel="alternate" type="application/rss+xml">
  try {
    const html = await get(src.site, 'text/html');
    const links = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map((m) => m[0])
      .filter((l) => /type=["']application\/(rss|atom)\+xml["']/i.test(l))
      .map((l) => attr(l, 'href'))
      .filter(Boolean)
      .map((h) => new URL(decodeEntities(h), src.site).href);
    for (const u of [...new Set(links)].slice(0, 3)) {
      if ((src.feeds || []).includes(u)) continue;
      const items = await tryFeed(u);
      if (items) return { items, feed: u };
    }
    if (!links.length) tried.push(`${src.site} (no RSS link found)`);
  } catch (e) {
    tried.push(`${src.site} (${e.message})`);
  }
  return { items: [], error: tried.join('; ') };
}

// ---------- category guess ----------
const RULES = [
  ['sports', /खेल|क्रिकेट|फुटबल|भलिबल|sport|cricket|football/i],
  ['entertainment', /मनोरञ्जन|फिल्म|कलाकार|गायक|गायिका|सिनेमा|entertain|film|movie|celebrit/i],
  ['tech', /प्रविधि|मोबाइल|साइबर|technolog|\btech\b|software|smartphone|\bAI\b/i],
  ['opinion', /विचार|सम्पादकीय|विश्लेषण|\bopinion|editorial|\bviews?\b/i],
  ['world', /अन्तर्राष्ट्रिय|विश्व|\bworld\b|international|global/i],
  ['economy', /अर्थ|बैंक|शेयर|नेप्से|लगानी|बजार|मूल्य|economy|business|\bbank|nepse|\bshare\b|finance|market/i],
  ['politics', /राजनीति|प्रधानमन्त्री|संसद|निर्वाचन|कांग्रेस|एमाले|माओवादी|politic|parliament|election|minister/i]
];
function guessCategory(item, def) {
  const hay = item.cats.join(' ') + ' ' + item.title;
  for (const [slug, re] of RULES) if (re.test(hay)) return slug;
  return def;
}

// ---------- Supabase REST ----------
const H = { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json' };
async function sb(pathAndQuery, init = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const text = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const cats = await sb('categories?select=id,slug');
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
  const minTime = Date.now() - MAX_AGE_HOURS * 3600e3;

  const results = await Promise.allSettled(SOURCES.map((s) => loadItems(s)));
  const rows = [];
  const seen = new Set();
  results.forEach((res, i) => {
    const src = SOURCES[i];
    if (res.status !== 'fulfilled' || !res.value.items.length) {
      console.log(`✗ ${src.name}: ${res.status === 'fulfilled' ? res.value.error : res.reason}`);
      return;
    }
    const fresh = res.value.items
      .filter((it) => it.date.getTime() >= minTime)
      .sort((a, b) => b.date - a.date)
      .slice(0, MAX_PER_FEED);
    console.log(`✓ ${src.name}: ${fresh.length} fresh / ${res.value.items.length} in feed  (${res.value.feed})`);
    for (const it of fresh) {
      const slug = 'src-' + crypto.createHash('sha1').update(it.link).digest('hex').slice(0, 14);
      if (seen.has(slug)) continue;
      seen.add(slug);
      rows.push({
        title: it.title,
        slug,
        content: it.excerpt || it.title,
        excerpt: it.excerpt,
        summary: it.excerpt,
        featured_image: it.image,
        image_caption: '',
        category_id: catId[guessCategory(it, src.cat)] || catId[src.cat] || null,
        author_id: null,
        author_name: src.name,
        status: 'published',
        published_at: it.date.toISOString(),
        read_time_mins: 1,
        tags: [src.name],
        is_breaking: false,
        is_featured: false,
        source_name: src.name,
        source_url: it.link,
        is_aggregated: true
      });
    }
  });

  // insert only NEW items (existing ones are left untouched: views / admin edits are safe)
  let added = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const out = await sb('posts?on_conflict=slug&select=id', {
      method: 'POST',
      headers: { prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(rows.slice(i, i + 100))
    });
    added += out?.length || 0;
  }
  console.log(`\nAdded ${added} new news (checked ${rows.length}).`);

  // clean-up: delete old auto-news, then keep only the newest MAX_KEEP
  const cutoff = new Date(Date.now() - KEEP_HOURS * 3600e3).toISOString();
  await sb(`posts?is_aggregated=eq.true&published_at=lt.${encodeURIComponent(cutoff)}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } });
  const extra = await sb(`posts?is_aggregated=eq.true&select=id&order=published_at.desc&offset=${MAX_KEEP}&limit=1000`);
  if (extra?.length) {
    await sb(`posts?id=in.(${extra.map((p) => p.id).join(',')})`, { method: 'DELETE', headers: { prefer: 'return=minimal' } });
    console.log(`Removed ${extra.length} extra old auto-news.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
