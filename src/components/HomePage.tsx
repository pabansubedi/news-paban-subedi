import React, { useState } from 'react';
import { useNewsApp } from '../lib/store';
import { AdBanner } from './AdBanner';
import { toNepaliDigits, getNepaliDate } from '../lib/nepaliDate';
import { Post } from '../types';
import {
  Clock,
  Eye,
  Flame,
  TrendingUp,
  Sparkles,
  ChevronRight,
  BookOpen,
  Share2,
  ArrowUpRight,
  Check
} from 'lucide-react';

interface HomePageProps {
  categoryFilter?: string;
  searchQuery?: string;
}

export const HomePage: React.FC<HomePageProps> = ({ categoryFilter, searchQuery }) => {
  const { posts, categories, navigateTo, siteSettings } = useNewsApp();
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // ONLY show posts that are approved & published by Admin!
  const publishedPosts = posts.filter((p) => p.status === 'published');

  // Filter by category or search query if requested
  const filteredPosts = publishedPosts.filter((post) => {
    if (categoryFilter) {
      const cat = categories.find((c) => c.slug === categoryFilter);
      if (cat && post.category_id !== cat.id) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title.toLowerCase().includes(q);
      const matchExcerpt = post.excerpt.toLowerCase().includes(q);
      const matchContent = post.content.toLowerCase().includes(q);
      if (!matchTitle && !matchExcerpt && !matchContent) return false;
    }
    return true;
  });

  // Hero Lead Post (Featured or first breaking post)
  const heroPost = filteredPosts.find((p) => p.is_featured) || filteredPosts[0];

  // Secondary Leads (up to 3 other posts)
  const secondaryLeadPosts = filteredPosts
    .filter((p) => !heroPost || p.id !== heroPost.id)
    .slice(0, 3);

  // Trending Posts (sorted by views)
  const trendingPosts = [...publishedPosts]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const getCategory = (catId: string) => categories.find((c) => c.id === catId);

  const formatPublishDate = (dateStr: string | null) => {
    if (!dateStr) return 'भर्खरै';
    const dateObj = new Date(dateStr);
    const nepali = getNepaliDate(dateObj);
    return `${nepali.dayName}, ${toNepaliDigits(nepali.day)} ${nepali.monthName}`;
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/news/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Category or Search Result Header */}
      {(categoryFilter || searchQuery) && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
              {categoryFilter ? 'विधा अनुसार नतिजा' : 'खोज नतिजा'}
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {categoryFilter
                ? categories.find((c) => c.slug === categoryFilter)?.name || categoryFilter
                : `"${searchQuery}" को नतिजा (${toNepaliDigits(filteredPosts.length)})`}
            </h2>
          </div>
          <button
            onClick={() => navigateTo('home')}
            className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
          >
            सबै समाचार हेर्नुहोस् (Reset)
          </button>
        </div>
      )}

      {/* 1. HERO LEAD NEWS SECTION */}
      {heroPost ? (
        <section className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Lead Story (Left 8 Cols) */}
            <div className="lg:col-span-8">
              <article
                onClick={() => navigateTo('article', heroPost.slug)}
                className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition duration-300"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={heroPost.featured_image}
                    alt={heroPost.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition duration-500"
                  />
                  {heroPost.is_breaking && (
                    <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-extrabold px-3 py-1.5 rounded-md shadow-md flex items-center gap-1.5 animate-pulse">
                      <Flame className="w-3.5 h-3.5" />
                      <span>ताजा ब्रेकिङ</span>
                    </div>
                  )}
                  {getCategory(heroPost.category_id) && (
                    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-xs text-white text-xs font-semibold px-2.5 py-1 rounded">
                      {getCategory(heroPost.category_id)?.name}
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {/* Clean byline: strictly 'News Paban Subedi', no author personal name */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                    <span className="font-bold text-red-600 dark:text-red-400">
                      News Paban Subedi
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatPublishDate(heroPost.published_at)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {toNepaliDigits(heroPost.views)} पटक पढिएको
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                    {heroPost.title}
                  </h2>

                  <p className="mt-3 text-slate-600 dark:text-slate-300 text-base leading-relaxed line-clamp-3">
                    {heroPost.excerpt}
                  </p>

                  {/* Hero Quick Share Bar */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"
                  >
                    <span className="font-semibold flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <Share2 className="w-3.5 h-3.5 text-red-600" />
                      <span>सेयर:</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/news/' + heroPost.slug)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] transition"
                        title="Facebook मा सेयर गर्नुहोस्"
                      >
                        फेसबुक
                      </a>
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(heroPost.title + ' ' + window.location.origin + '/news/' + heroPost.slug)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-[10px] transition"
                        title="WhatsApp मा सेयर गर्नुहोस्"
                      >
                        ह्वाट्सएप
                      </a>
                      <button
                        onClick={() => handleCopyLink(heroPost.slug)}
                        className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[10px] cursor-pointer transition flex items-center gap-1"
                        title="लिंक कपि गर्नुहोस्"
                      >
                        {copiedSlug === heroPost.slug ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>कपि भयो!</span>
                          </>
                        ) : (
                          <span>लिंक कपि</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            {/* Secondary Lead Stack (Right 4 Cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-red-600">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-red-600" />
                  <span>विशेष मुख्य समाचार</span>
                </h3>
              </div>

              {secondaryLeadPosts.map((post) => (
                <article
                  key={post.id}
                  onClick={() => navigateTo('article', post.slug)}
                  className="group cursor-pointer bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition flex gap-3.5 items-start"
                >
                  <div className="relative w-28 h-20 sm:w-32 sm:h-22 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    {getCategory(post.category_id) && (
                      <span className="absolute bottom-1 left-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        {getCategory(post.category_id)?.name}
                      </span>
                    )}
                  </div>

                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition leading-snug">
                      {post.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatPublishDate(post.published_at)}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            कुनै प्रकाशित समाचार भेटिएन।
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            प्रशासकले समाचार स्वीकृत (Approve) गरेपछि मात्र यहाँ सार्वजनिक रूपमा देखिनेछ।
          </p>
        </div>
      )}

      {/* 2. AD ZONE: BELOW MAIN BREAKING / HERO SECTION */}
      <AdBanner slot="below_hero" />

      {/* 3. MAIN CONTENT BODY: 2 COLUMN (Grid + Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8">
        {/* Left Column (8 Cols): Category Sections & Grid */}
        <div className="lg:col-span-8 space-y-10">
          {/* Section: राजनीति (Politics) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-red-600 pb-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600"></span>
                <span>राजनीति</span>
                <span className="text-xs text-slate-400 font-normal">| Politics</span>
              </h3>
              <button
                onClick={() => navigateTo('category', 'politics')}
                className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-0.5 hover:underline cursor-pointer"
              >
                <span>सबै हेर्नुहोस्</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {publishedPosts
                .filter((p) => p.category_id === 'cat-politics')
                .slice(0, 4)
                .map((post) => (
                  <article
                    key={post.id}
                    onClick={() => navigateTo('article', post.slug)}
                    className="cursor-pointer group bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-md transition"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-base text-slate-900 dark:text-white line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                        {post.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-red-600 dark:text-red-400">News Paban Subedi</span>
                        <span>{toNepaliDigits(post.views)} भ्युज</span>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </div>

          {/* Section: अर्थतन्त्र र व्यापार (Economy) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-blue-600 pb-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                <span>अर्थतन्त्र & बजार</span>
                <span className="text-xs text-slate-400 font-normal">| Economy</span>
              </h3>
              <button
                onClick={() => navigateTo('category', 'economy')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 hover:underline cursor-pointer"
              >
                <span>सबै हेर्नुहोस्</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {publishedPosts
                .filter((p) => p.category_id === 'cat-economy')
                .slice(0, 4)
                .map((post) => (
                  <article
                    key={post.id}
                    onClick={() => navigateTo('article', post.slug)}
                    className="cursor-pointer group bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-md transition"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-base text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {post.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-red-600 dark:text-red-400">News Paban Subedi</span>
                        <span>{toNepaliDigits(post.views)} भ्युज</span>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </div>

          {/* Section: खेलकुद (Sports) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-amber-500 pb-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span>खेलकुद</span>
                <span className="text-xs text-slate-400 font-normal">| Sports</span>
              </h3>
              <button
                onClick={() => navigateTo('category', 'sports')}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 hover:underline cursor-pointer"
              >
                <span>सबै हेर्नुहोस्</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {publishedPosts
                .filter((p) => p.category_id === 'cat-sports')
                .slice(0, 3)
                .map((post) => (
                  <article
                    key={post.id}
                    onClick={() => navigateTo('article', post.slug)}
                    className="cursor-pointer group bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-md transition"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>
                    <div className="p-3">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-amber-600 transition">
                        {post.title}
                      </h4>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        {toNepaliDigits(post.views)} पटक पढिएको
                      </span>
                    </div>
                  </article>
                ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar (4 Cols) */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Ad Location 3: Sidebar Top Box (300x250) */}
          <AdBanner slot="sidebar_top" />

          {/* Trending / Most Read Widget */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <TrendingUp className="w-5 h-5 text-red-600" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                धेरै पढिएका समाचार (Trending)
              </h3>
            </div>

            <div className="space-y-4">
              {trendingPosts.map((post, idx) => (
                <div
                  key={post.id}
                  onClick={() => navigateTo('article', post.slug)}
                  className="flex gap-3 cursor-pointer group items-start pb-3 border-b border-slate-100 dark:border-slate-800/80 last:border-0 last:pb-0"
                >
                  <span className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-extrabold text-sm flex items-center justify-center shrink-0 border border-red-200 dark:border-red-900/50">
                    {toNepaliDigits(idx + 1)}
                  </span>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-red-600 transition">
                      {post.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                      <Eye className="w-3 h-3" />
                      {toNepaliDigits(post.views)} भ्युज
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Editorial & Opinion Spotlight */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-5 shadow-lg border border-slate-800">
            <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded">
              सम्पादकीय / विचार
            </span>
            <h4 className="text-lg font-bold mt-3 leading-snug">
              नेपालको जलविद्युत र हरित ऊर्जा: क्षेत्रीय समृद्धिको वास्तविक आधारशिला
            </h4>
            <p className="text-xs text-slate-400 mt-2 line-clamp-3">
              १० हजार मेगावाट बिजुली छिमेकी देशहरूमा निर्यात गर्ने सम्झौताले नेपालको व्यापार घाटा सन्तुलनमा ल्याउने सुनौलो अवसर दिएको छ।
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">
                — {siteSettings.editor_in_chief}
              </span>
              <button
                onClick={() => navigateTo('article', 'opinion-nepal-clean-hydropower-green-economy')}
                className="text-xs text-red-400 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>विस्तृत पढ्नुहोस्</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Portal Verification Info */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>नेपाल डिजिटल प्रेस प्रमाणीकरण</span>
            </div>
            <p>
              यो पोर्टल <strong>{siteSettings.subdomain}</strong> का लागि आधिकारिक रूपमा सिर्जना गरिएको हो।
            </p>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <span>आधिकारिक प्रकाशन:</span>
              <strong className="text-red-600 dark:text-red-400">News Paban Subedi</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
