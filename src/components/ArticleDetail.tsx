import React, { useState, useEffect } from 'react';
import { useNewsApp } from '../lib/store';
import { AdBanner } from './AdBanner';
import { toNepaliDigits, getNepaliDate } from '../lib/nepaliDate';
import {
  Volume2,
  VolumeX,
  Printer,
  Share2,
  Facebook,
  Twitter,
  MessageSquare,
  Clock,
  Eye,
  User,
  ArrowLeft,
  Calendar,
  Check,
  Send,
  Sparkles,
  Bookmark,
  Share,
  Flame,
  Copy
} from 'lucide-react';

interface ArticleDetailProps {
  slug: string;
}

// Article body syntax (one block per paragraph, blocks are separated by an empty line):
//   ![photo caption](https://...)   inline photo        https://youtu.be/xxxxxxxxxxx   YouTube video
//   ## Sub heading                  heading             > quoted text                  quote
const YT_RE = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})(?:[&?#]\S*)?$/;
const IMG_RE = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/;

export const ArticleDetail: React.FC<ArticleDetailProps> = ({ slug }) => {
  const {
    posts,
    allPosts,
    categories,
    comments,
    addComment,
    incrementViews,
    siteSettings,
    navigateTo,
    currentRole,
    postsLoaded
  } = useNewsApp();

  // Direct links must never expose drafts / pending / rejected posts to readers
  const found = (currentRole !== 'public' ? allPosts : posts).find((p) => p.slug === slug);
  const post = found && (found.status === 'published' || currentRole !== 'public') ? found : undefined;
  const [copied, setCopied] = useState(false);
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentTrap, setCommentTrap] = useState(''); // hidden field: only bots fill it
  const [commentSuccess, setCommentSuccess] = useState(false);

  // Audio / TTS state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  // Increment view count on mount
  useEffect(() => {
    if (post && post.status === 'published') {
      incrementViews(post.id);
    }
  }, [post?.id]);

  // Page title + share/SEO meta tags follow the article (real URL per news)
  useEffect(() => {
    if (!post) return;
    const prevTitle = document.title;
    document.title = `${post.title} | ${siteSettings.site_title}`;
    const restore: Array<() => void> = [];
    const setTag = (selector: string, create: () => HTMLElement, attr: string, value: string) => {
      let el = document.head.querySelector(selector) as HTMLElement | null;
      const existed = !!el;
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      const old = el.getAttribute(attr);
      el.setAttribute(attr, value);
      restore.push(() => {
        if (!existed) el!.remove();
        else if (old !== null) el!.setAttribute(attr, old);
      });
    };
    const meta = (key: 'name' | 'property', name: string) => () => {
      const m = document.createElement('meta');
      m.setAttribute(key, name);
      return m;
    };
    const url = `${window.location.origin}/news/${encodeURIComponent(post.slug)}`;
    const desc = (post.excerpt || post.content || '').replace(/\s+/g, ' ').slice(0, 160);
    setTag('meta[name="description"]', meta('name', 'description'), 'content', desc);
    setTag('meta[property="og:title"]', meta('property', 'og:title'), 'content', post.title);
    setTag('meta[property="og:description"]', meta('property', 'og:description'), 'content', desc);
    setTag('meta[property="og:url"]', meta('property', 'og:url'), 'content', url);
    setTag('meta[property="og:type"]', meta('property', 'og:type'), 'content', 'article');
    if (post.featured_image && /^https?:/i.test(post.featured_image)) {
      setTag('meta[property="og:image"]', meta('property', 'og:image'), 'content', post.featured_image);
    }
    setTag('link[rel="canonical"]', () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    }, 'href', url);
    return () => {
      document.title = prevTitle;
      restore.forEach((fn) => fn());
    };
  }, [post?.slug, post?.title]);

  // Reader tools: font size (remembered) + reading progress bar
  const [fontScale, setFontScale] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem('np_font_scale') || '1');
      return v >= 0.85 && v <= 1.5 ? v : 1;
    } catch {
      return 1;
    }
  });
  const changeFont = (delta: number) => {
    const next = Math.min(1.5, Math.max(0.85, Math.round((fontScale + delta) * 100) / 100));
    setFontScale(next);
    try {
      localStorage.setItem('np_font_scale', String(next));
    } catch {}
  };
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [post?.id]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!post && !postsLoaded) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center text-slate-500 dark:text-slate-400 text-sm">
        समाचार लोड हुँदैछ...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          समाचार फेला परेन।
        </h2>
        <p className="text-slate-500 mt-2 text-sm">
          तपाईंले खोज्नुभएको समाचार हटाइएको वा उपलब्ध नभएको हुन सक्छ।
        </p>
        <button
          onClick={() => navigateTo('home')}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold"
        >
          गृहपृष्ठमा फर्कनुहोस्
        </button>
      </div>
    );
  }

  const category = categories.find((c) => c.id === post.category_id);
  const postComments = comments.filter((c) => c.post_id === post.id && c.is_approved);
  const relatedPosts = posts
    .filter((p) => p.status === 'published' && p.category_id === post.category_id && p.id !== post.id)
    .slice(0, 3);

  // Nepali Date
  const publishDateObj = post.published_at ? new Date(post.published_at) : new Date(post.created_at);
  const nepaliDate = getNepaliDate(publishDateObj);

  // Text-To-Speech handler using Web Speech API
  const handleToggleAudio = () => {
    if (!('speechSynthesis' in window)) {
      alert('माफ गर्नुहोस्, तपाईंको ब्राउजरमा Text-to-Speech समर्थित छैन।');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      window.speechSynthesis.cancel();
      // photos / video links / markup must not be read aloud
      const spoken = post.content
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/^(?:https?:\/\/)\S+$/gm, '')
        .replace(/^(##\s+|>\s?)/gm, '');
      const textToRead = `${post.title}. ${spoken}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = speechRate;
      utterance.lang = 'ne-NP';

      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt || post.title,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share canceled or not supported', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentText.trim()) return;
    if (commentTrap) return; // a bot filled the hidden field
    try {
      const last = Number(localStorage.getItem('np_last_comment') || 0);
      if (Date.now() - last < 30000) {
        alert('कृपया ३० सेकेन्डपछि फेरि प्रयास गर्नुहोस्।');
        return;
      }
      localStorage.setItem('np_last_comment', String(Date.now()));
    } catch {}
    addComment(post.id, commentName.trim().slice(0, 60), commentText.trim().slice(0, 1000));
    setCommentName('');
    setCommentText('');
    setCommentSuccess(true);
    setTimeout(() => setCommentSuccess(false), 4000);
  };

  // Splitting content into paragraphs for in-article ad injection
  const paragraphs = post.content.split('\n\n').filter((p) => p.trim());

  const renderBlock = (raw: string) => {
    const block = raw.trim();
    const img = IMG_RE.exec(block);
    if (img) {
      return (
        <figure className="my-2">
          <img loading="lazy" decoding="async" src={img[2]} alt={img[1]} className="w-full rounded-xl" />
          {img[1] && (
            <figcaption className="mt-2 text-sm text-center text-slate-500 dark:text-slate-400">{img[1]}</figcaption>
          )}
        </figure>
      );
    }
    const yt = YT_RE.exec(block);
    if (yt) {
      return (
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${yt[1]}`}
            title="YouTube video"
            loading="lazy"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      );
    }
    if (block.startsWith('## ')) {
      return <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white break-words">{block.slice(3)}</h2>;
    }
    if (block.startsWith('>')) {
      return (
        <blockquote className="border-l-4 border-red-600 pl-4 italic text-slate-700 dark:text-slate-300 break-words">
          {block.replace(/^>\s?/gm, '')}
        </blockquote>
      );
    }
    return <p className="leading-relaxed break-words">{raw}</p>;
  };

  return (
    <article className="max-w-4xl mx-auto px-4 py-8 article-print-container">
      <div
        className="fixed top-0 left-0 h-1 bg-red-600 z-[60] no-print"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />
      {/* Back button & Category badge */}
      <div className="flex items-center justify-between gap-4 mb-4 no-print">
        <button
          onClick={() => navigateTo('home')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>सबै समाचारमा फर्कनुहोस्</span>
        </button>

        {category && (
          <button
            onClick={() => navigateTo('category', category.slug)}
            className="text-xs font-bold px-3 py-1 rounded-full text-white shadow-xs"
            style={{ backgroundColor: category.color || '#dc2626' }}
          >
            {category.name}
          </button>
        )}
      </div>

      {/* Print-only Watermark & Header */}
      <div className="hidden print-only mb-6 border-b-2 border-black pb-4 text-center">
        <h1 className="text-2xl font-bold">{siteSettings.site_title}</h1>
        <p className="text-xs">{siteSettings.subdomain} | {siteSettings.office_address}</p>
        <p className="text-xs font-bold mt-1">प्रकाशित मिति: {nepaliDate.formattedNepali}</p>
      </div>

      {/* Title */}
      <h1 className="break-words text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
        {post.title}
      </h1>

      {/* Sub-header / Excerpt */}
      {post.excerpt && (
        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 font-medium mt-4 leading-relaxed border-l-4 border-red-600 pl-4 py-1 italic bg-red-50/40 dark:bg-red-950/20 rounded-r-lg">
          {post.excerpt}
        </p>
      )}

      {/* Author Byline & Date Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-4 my-6 border-y border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-rose-800 flex items-center justify-center text-white font-black text-xs shadow-xs border border-red-500">
            NP
          </div>
          <div>
            <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>News Paban Subedi</span>
              <span className="text-[10px] bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-300 px-1.5 py-0.2 rounded font-bold">
                आधिकारिक
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>सम्पादकीय डेस्क (News Desk)</span>
              <span>•</span>
              <span>news.pabansubedi.com.np</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-4 h-4 text-red-600" />
            {nepaliDate.formattedNepali}
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <Eye className="w-4 h-4 text-blue-600" />
            {toNepaliDigits(post.views)} भ्युज
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <Clock className="w-4 h-4 text-amber-600" />
            {toNepaliDigits(post.read_time_mins || 3)} मिनेट पढ्ने समय
          </span>
        </div>
      </div>

      {/* AUDIO / TEXT-TO-SPEECH PLAYER BAR */}
      <div className="no-print mb-6 p-4 rounded-xl bg-gradient-to-r from-red-50 to-amber-50 dark:from-slate-900 dark:to-slate-800 border border-red-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleAudio}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white shadow-md transition-transform hover:scale-105 cursor-pointer ${
              isPlayingAudio ? 'bg-amber-600 animate-pulse' : 'bg-red-600 hover:bg-red-700'
            }`}
            title="समाचार सुन्नुहोस्"
          >
            {isPlayingAudio ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>समाचार सुन्नुहोस् (Listen to Audio News)</span>
              {isPlayingAudio && (
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.2 rounded-full font-bold">
                  बज्दैछ...
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              नेपाली आवाजमा समाचार सुन्न अडियो प्लेयर प्रयोग गर्नुहोस्।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">गति:</span>
          {[0.8, 1.0, 1.2].map((rate) => (
            <button
              key={rate}
              onClick={() => setSpeechRate(rate)}
              className={`px-2 py-1 rounded text-xs font-semibold ${
                speechRate === rate
                  ? 'bg-red-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Featured Image & Caption */}
      <figure className="mb-8">
        <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-100 dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-800">
          <img loading="lazy" decoding="async"
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          {post.is_breaking && (
            <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-extrabold px-3 py-1 rounded-md shadow flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              <span>ताजा ब्रेकिङ</span>
            </div>
          )}
        </div>
        {post.image_caption && (
          <figcaption className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center italic">
            तस्बिर: {post.image_caption}
          </figcaption>
        )}
      </figure>

      {/* Action Buttons: Full Social Share Suite, Print, Copy */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 mb-8 no-print">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1 flex items-center gap-1">
            <Share2 className="w-3.5 h-3.5 text-red-600" />
            <span>सेयर गर्नुहोस्:</span>
          </span>

          {/* Facebook */}
          <button
            onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
            className="px-2.5 py-1.5 rounded-lg bg-[#1877F2] hover:bg-[#166fe5] text-white transition text-xs flex items-center gap-1 font-semibold cursor-pointer shadow-2xs"
            title="Facebook मा सेयर गर्नुहोस्"
          >
            <Facebook className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">फेसबुक</span>
          </button>

          {/* Twitter / X */}
          <button
            onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`, '_blank')}
            className="px-2.5 py-1.5 rounded-lg bg-black hover:bg-slate-800 text-white transition text-xs flex items-center gap-1 font-semibold cursor-pointer shadow-2xs"
            title="Twitter / X मा सेयर गर्नुहोस्"
          >
            <Twitter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ट्विटर</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(post.title + ' ' + window.location.href)}`, '_blank')}
            className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white transition text-xs flex items-center gap-1 font-semibold cursor-pointer shadow-2xs"
            title="WhatsApp मा सेयर गर्नुहोस्"
          >
            <span className="font-bold">WA</span>
            <span className="hidden sm:inline">ह्वाट्सएप</span>
          </button>

          {/* Viber */}
          <button
            onClick={() => window.open(`viber://forward?text=${encodeURIComponent(post.title + ' ' + window.location.href)}`, '_blank')}
            className="px-2.5 py-1.5 rounded-lg bg-[#7360F2] hover:bg-[#6652e6] text-white transition text-xs flex items-center gap-1 font-semibold cursor-pointer shadow-2xs"
            title="Viber मा सेयर गर्नुहोस्"
          >
            <span className="font-bold">V</span>
            <span className="hidden sm:inline">भाइबर</span>
          </button>

          {/* Telegram */}
          <button
            onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`, '_blank')}
            className="px-2.5 py-1.5 rounded-lg bg-[#229ED9] hover:bg-[#1f8ec4] text-white transition text-xs flex items-center gap-1 font-semibold cursor-pointer shadow-2xs"
            title="Telegram मा सेयर गर्नुहोस्"
          >
            <Send className="w-3 h-3" />
            <span className="hidden sm:inline">टेलिग्राम</span>
          </button>

          {/* Native Mobile Share / More */}
          <button
            onClick={handleNativeShare}
            className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition text-xs flex items-center gap-1 font-semibold cursor-pointer"
            title="अन्य माध्यमबाट सेयर गर्नुहोस्"
          >
            <Share className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
            <span className="hidden sm:inline">थप</span>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition text-xs flex items-center gap-1 font-semibold cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'लिंक कपि भयो!' : 'लिंक'}</span>
          </button>
        </div>

        {/* Reader font size */}
        <div className="flex items-center gap-1" aria-label="अक्षरको आकार">
          <button
            type="button"
            onClick={() => changeFont(-0.1)}
            className="px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            title="अक्षर सानो"
          >
            A−
          </button>
          <button
            type="button"
            onClick={() => changeFont(0.1)}
            className="px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            title="अक्षर ठूलो"
          >
            A+
          </button>
        </div>

        {/* Print Article & PDF Button */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-sm cursor-pointer ml-auto"
        >
          <Printer className="w-4 h-4" />
          <span>प्रिन्ट / PDF</span>
        </button>
      </div>

      {/* ARTICLE BODY PARAGRAPHS WITH IN-ARTICLE AD INJECTION */}
      <div
        style={{ fontSize: `${1.125 * fontScale}rem` }}
        className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-slate-800 dark:text-slate-200 text-lg leading-relaxed font-normal"
      >
        {paragraphs.map((para, index) => (
          <React.Fragment key={index}>
            {renderBlock(para)}
            {/* Ad Location 4: Inside Article Detail Page (Between paragraphs, after 2nd paragraph) */}
            {index === 1 && (
              <div className="no-print">
                <AdBanner slot="in_article" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 no-print">
          <span className="text-xs font-bold text-slate-500">ट्यागहरू:</span>
          {post.tags.map((tag, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => navigateTo('tag', tag)}
              className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:border-red-400 hover:text-red-600 cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Print Footer Watermark */}
      <div className="hidden print-only mt-12 pt-6 border-t border-slate-400 text-xs text-center">
        <p>प्रतिलिपि अधिकार © {siteSettings.site_title}. {siteSettings.subdomain}</p>
        <p>यो समाचार अनलाइन पोर्टलबाट प्रिन्ट गरिएको हो।</p>
      </div>

      {/* COMMENTS SECTION */}
      <section className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 no-print">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 text-red-600" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            प्रतिक्रियाहरू ({toNepaliDigits(postComments.length)})
          </h3>
        </div>

        {/* Comment form */}
        <form onSubmit={handleCommentSubmit} className="mb-8 p-5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            तपाईंको विचार व्यक्त गर्नुहोस् (Add Comment)
          </h4>
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={commentTrap}
            onChange={(e) => setCommentTrap(e.target.value)}
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              placeholder="तपाईंको पूरा नाम *"
              required
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="आफ्नो मर्यादित टिप्पणी यहाँ लेख्नुहोस्..."
            rows={3}
            required
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-600"
          ></textarea>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>प्रतिक्रिया पठाउनुहोस्</span>
            </button>
            {commentSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                {siteSettings.comments_need_approval
                  ? '✓ तपाईंको प्रतिक्रिया प्राप्त भयो। सम्पादकले स्वीकृत गरेपछि देखिन्छ।'
                  : '✓ तपाईंको प्रतिक्रिया सफलतापूर्वक दर्ता भयो!'}
              </span>
            )}
          </div>
        </form>

        {/* Existing comments list */}
        <div className="space-y-4">
          {postComments.length === 0 ? (
            <p className="text-xs text-slate-500 italic">पहिलो प्रतिक्रिया लेख्ने व्यक्ति बन्नुहोस्।</p>
          ) : (
            postComments.map((c) => (
              <div
                key={c.id}
                className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <strong className="text-slate-900 dark:text-white font-bold">{c.author_name}</strong>
                  <span>{new Date(c.created_at).toLocaleDateString('ne-NP')}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {c.content}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* RELATED NEWS */}
      {relatedPosts.length > 0 && (
        <section className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 no-print">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-red-600" />
            <span>सम्बन्धित समाचार (Related News)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedPosts.map((rel) => (
              <div
                key={rel.id}
                onClick={() => navigateTo('article', rel.slug)}
                className="cursor-pointer group bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-md transition"
              >
                <div className="aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img loading="lazy" decoding="async"
                    src={rel.featured_image}
                    alt={rel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                </div>
                <div className="p-3">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-red-600 transition">
                    {rel.title}
                  </h4>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    {toNepaliDigits(rel.views)} पटक पढिएको
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
