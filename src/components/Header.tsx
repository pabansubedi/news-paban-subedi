import React, { useState, useEffect } from 'react';
import { useNewsApp } from '../lib/store';
import { getNepaliDate, formatTimeNepali, toNepaliDigits } from '../lib/nepaliDate';
import { AdBanner } from './AdBanner';
import { NotificationBell } from './NotificationBell';
import {
  Calendar,
  Clock,
  Moon,
  Sun,
  Search,
  Radio,
  Flame,
  Menu,
  X,
  Users,
  Lock,
  Shield,
  LogOut,
  User
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    siteSettings,
    categories,
    posts,
    currentRoute,
    navigateTo,
    isDarkMode,
    toggleDarkMode,
    totalVisitors,
    onlineVisitors,
    currentRole,
    currentUser,
    setAdminLoginModalOpen,
    logoutStaff
  } = useNewsApp();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Nepali Date & Nepal Standard Time Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const nepaliDate = getNepaliDate(currentTime);
  const formattedTime = formatTimeNepali(currentTime);

  // Active categories for navigation
  const activeCategories = categories.filter((c) => c.is_active);

  // Published breaking or top posts for the running ticker
  const tickerItems = posts
    .filter((p) => p.status === 'published')
    .slice(0, 10);

  const scrollDuration = siteSettings.ticker_speed || 85;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigateTo('home', searchQuery.trim());
      setSearchOpen(false);
    }
  };

  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* 1. TOP UTILITY BAR (Live Nepali Date, Nepal Standard Time & Visitor Stats) */}
      <div className="bg-slate-950 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Live Bikram Sambat Date & Live Clock */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium text-amber-400">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{nepaliDate.formattedNepali}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 text-[11px]">नेपाल समय:</span>
              <span className="font-semibold text-slate-200">{formattedTime}</span>
            </div>
            {/* Live Visitor Count in Header */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-700 text-slate-300 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                अनलाइन: <strong>{toNepaliDigits(onlineVisitors)}</strong>
              </span>
              <span className="text-slate-400">
                | कुल पाठक: <strong>{toNepaliDigits(totalVisitors.toLocaleString())}+</strong>
              </span>
            </div>
          </div>

          {/* Right: Push Notification Bell, Staff Login / CMS Panel & Dark Mode toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />

            {currentRole === 'public' ? (
              <button
                onClick={() => setAdminLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-amber-300 hover:text-amber-200 transition text-[11px] font-semibold cursor-pointer"
                title="कर्मचारी तथा सम्पादक लगइन"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>लगइन (Staff)</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => navigateTo('admin')}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950 hover:bg-red-900 border border-red-800 text-amber-300 text-[11px] font-bold transition cursor-pointer"
                  title="सम्पादकीय प्यानलमा जानुहोस्"
                >
                  <Shield className="w-3 h-3 text-red-400" />
                  <span>CMS Panel</span>
                </button>
                <button
                  onClick={logoutStaff}
                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                  title="लगआउट गर्नुहोस्"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={toggleDarkMode}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 text-[11px]"
              aria-label="Toggle Dark Mode"
              title={isDarkMode ? 'लाइट मोडमा जानुहोस्' : 'डार्क मोडमा जानुहोस्'}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">लाइट</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">डार्क</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. BREAKING NEWS TICKER (Right to Left Smooth Running Animation with Clickable Headlines) */}
      {siteSettings.is_ticker_active && (
        <div className="bg-red-700 text-white text-xs sm:text-sm py-1.5 px-3 sm:px-4 overflow-hidden shadow-inner border-y border-red-800">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            {/* Pulsing Badge */}
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider bg-red-950 px-3 py-1 rounded-md text-[11px] shrink-0 shadow-xs z-10 select-none border border-red-800/60">
              <Radio className="w-3.5 h-3.5 animate-pulse text-amber-300" />
              <span>ताजा अपडेट</span>
            </div>

            {/* Clickable Right-to-Left Running Marquee (Smooth & Calm, Pauses on Hover) */}
            <div
              className="overflow-hidden whitespace-nowrap w-full relative group cursor-pointer"
              title="माउस राख्दा समाचार रोकिन्छ • क्लिक गर्दा समाचार खुल्छ"
            >
              <div
                className="animate-marquee-rtl inline-flex items-center py-0.5 tracking-wide group-hover:[animation-play-state:paused]"
                style={{ animationDuration: `${scrollDuration}s` }}
              >
                {/* SET 1 */}
                <div className="inline-flex items-center shrink-0">
                  {tickerItems.map((post) => (
                    <button
                      key={`t1-${post.id}`}
                      onClick={() => navigateTo('article', post.slug)}
                      className="inline-flex items-center gap-2 text-white hover:text-amber-200 font-bold text-xs sm:text-sm px-4 cursor-pointer transition-colors group/item shrink-0"
                      title={`"${post.title}" पढ्न क्लिक गर्नुहोस्`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 group-hover/item:scale-125 transition-transform shrink-0"></span>
                      <span className="group-hover/item:underline underline-offset-4 decoration-amber-300">
                        {post.title}
                      </span>
                    </button>
                  ))}

                  {siteSettings.breaking_news_ticker && (
                    <span className="inline-flex items-center gap-2 text-amber-100 text-xs sm:text-sm px-4 font-semibold shrink-0">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                      <span>{siteSettings.breaking_news_ticker}</span>
                    </span>
                  )}
                </div>

                {/* SET 2 (Duplicate for seamless continuous loop) */}
                <div className="inline-flex items-center shrink-0" aria-hidden="true">
                  {tickerItems.map((post) => (
                    <button
                      key={`t2-${post.id}`}
                      onClick={() => navigateTo('article', post.slug)}
                      className="inline-flex items-center gap-2 text-white hover:text-amber-200 font-bold text-xs sm:text-sm px-4 cursor-pointer transition-colors group/item shrink-0"
                      title={`"${post.title}" पढ्न क्लिक गर्नुहोस्`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 group-hover/item:scale-125 transition-transform shrink-0"></span>
                      <span className="group-hover/item:underline underline-offset-4 decoration-amber-300">
                        {post.title}
                      </span>
                    </button>
                  ))}

                  {siteSettings.breaking_news_ticker && (
                    <span className="inline-flex items-center gap-2 text-amber-100 text-xs sm:text-sm px-4 font-semibold shrink-0">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                      <span>{siteSettings.breaking_news_ticker}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN LOGO MASTHEAD & HEADER TOP AD (728x90) */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Dynamic Logo & Portal Title: News Paban Subedi */}
        <div
          onClick={() => navigateTo('home')}
          className="cursor-pointer flex items-center gap-3.5 group select-none"
        >
          {/* Logo image or Emblem Crest */}
          {siteSettings.logo_url ? (
            <img
              src={isDarkMode && siteSettings.logo_dark_url ? siteSettings.logo_dark_url : siteSettings.logo_url}
              alt={siteSettings.site_title}
              className="h-12 sm:h-14 md:h-16 max-w-[160px] sm:max-w-[200px] object-contain rounded-lg group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-red-600 via-rose-700 to-red-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-600/25 group-hover:scale-105 transition-transform shrink-0">
              <Flame className="w-7 h-7 text-amber-300" />
              <div className="absolute -bottom-1 -right-1 bg-blue-900 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white text-white">
                NP
              </div>
            </div>
          )}

          {/* Typography: News Paban Subedi & न्युज पवन सुवेदी */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                News Paban Subedi
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                न्युज पवन सुवेदी
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {siteSettings.subdomain}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 hidden sm:block">
              {siteSettings.tagline}
            </p>
          </div>
        </div>

        {/* Ad Location 1: Header Top Banner (728x90) */}
        <div className="w-full md:w-auto flex justify-center">
          <AdBanner slot="header_top" />
        </div>
      </div>

      {/* 4. PRIMARY NAVIGATION CATEGORIES BAR */}
      <nav className="bg-red-600 dark:bg-slate-950 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white hover:bg-red-700 dark:hover:bg-slate-900 rounded"
            aria-label="Open Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Desktop Categories */}
          <div className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto py-1 scrollbar-none">
            <button
              onClick={() => navigateTo('home')}
              className={`px-3.5 py-2 text-sm font-bold tracking-wide rounded transition whitespace-nowrap cursor-pointer ${
                currentRoute.page === 'home' && !currentRoute.param
                  ? 'bg-red-800 dark:bg-red-700 text-white shadow-inner'
                  : 'text-white/90 hover:bg-red-700/80 dark:hover:bg-slate-800'
              }`}
            >
              गृहपृष्ठ (Home)
            </button>

            {activeCategories.map((category) => {
              const isSelected =
                currentRoute.page === 'category' && currentRoute.param === category.slug;
              return (
                <button
                  key={category.id}
                  onClick={() => navigateTo('category', category.slug)}
                  className={`px-3.5 py-2 text-sm font-semibold rounded transition whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-red-800 dark:bg-red-700 text-white shadow-inner'
                      : 'text-white/90 hover:bg-red-700/80 dark:hover:bg-slate-800'
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>

          {/* Search Action */}
          <div className="flex items-center gap-2 py-1.5">
            {/* Search Toggle */}
            <div className="relative">
              {searchOpen ? (
                <form onSubmit={handleSearchSubmit} className="flex items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="समाचार खोज्नुहोस्..."
                    className="w-44 sm:w-60 bg-white text-slate-900 text-xs px-3 py-1.5 rounded-l-md outline-none focus:ring-2 focus:ring-amber-400"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="bg-amber-400 text-slate-900 px-2 py-1.5 rounded-r-md text-xs font-bold hover:bg-amber-300 cursor-pointer"
                  >
                    खोज्नुहोस्
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    className="ml-1 p-1 text-white hover:text-amber-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-1.5 rounded hover:bg-red-700 dark:hover:bg-slate-800 text-white transition cursor-pointer"
                  title="समाचार खोज्नुहोस्"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-red-700 dark:bg-slate-900 px-4 py-3 border-t border-red-800 dark:border-slate-800 space-y-1">
            <button
              onClick={() => {
                navigateTo('home');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 px-3 text-sm font-bold text-white hover:bg-red-800 rounded"
            >
              गृहपृष्ठ (Home)
            </button>
            {activeCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  navigateTo('category', category.slug);
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-1.5 px-3 text-sm text-white/90 hover:bg-red-800 rounded"
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </nav>
    </header>
  );
};
