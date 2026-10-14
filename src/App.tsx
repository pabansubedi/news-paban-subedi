/**
 * News Paban Subedi - Full-Stack Production News Portal
 * news.pabansubedi.com.np
 */

import React, { useEffect, useState } from 'react';
import { NewsAppProvider, useNewsApp } from './lib/store';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { ArticleDetail } from './components/ArticleDetail';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { DocsView } from './components/DocsView';

/**
 * Shows a visible warning to logged-in staff when a change could NOT be saved to Supabase
 * (before, such failures were swallowed silently and other browsers never got the change).
 */
const SyncErrorBanner: React.FC = () => {
  const { currentRole } = useNewsApp();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => setMessage((e as CustomEvent<string>).detail);
    window.addEventListener('news-sync-error', handler);
    return () => window.removeEventListener('news-sync-error', handler);
  }, []);

  if (!message || currentRole === 'public') return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] max-w-xl w-[92%] bg-red-600 text-white text-sm rounded-xl shadow-2xl p-4 flex items-start gap-3">
      <span className="flex-1 break-words">⚠️ {message}</span>
      <button onClick={() => setMessage(null)} className="font-bold px-2" aria-label="Close">✕</button>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { currentRoute, siteSettings, posts, currentRole } = useNewsApp();

  // Dynamic SEO & Title sync based on active view
  useEffect(() => {
    if (currentRoute.page === 'article' && currentRoute.param) {
      const activePost = posts.find((p) => p.slug === currentRoute.param);
      if (activePost) {
        document.title = `${activePost.title} - ${siteSettings.site_title}`;
      }
    } else if (currentRoute.page === 'category' && currentRoute.param) {
      document.title = `${currentRoute.param} - ${siteSettings.site_title}`;
    } else if (currentRoute.page === 'admin') {
      document.title = `CMS Admin Panel - ${siteSettings.site_title}`;
    } else if (currentRoute.page === 'docs') {
      document.title = `Supabase & Next.js Architecture - ${siteSettings.site_title}`;
    } else {
      document.title = `${siteSettings.site_title} | ${siteSettings.tagline}`;
    }

    // Dynamic Favicon update
    if (siteSettings.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = siteSettings.favicon_url;
    }
  }, [currentRoute, siteSettings, posts]);

  // Global copy attribution across the portal
  useEffect(() => {
    const handleGlobalCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) return;
      const text = selection.toString();
      const currentUrl = window.location.href;
      const attribution = `\n\n--------------------------------------------\nस्रोत: News Paban Subedi (${currentUrl})\nप्रतिलिपि अधिकार © News Paban Subedi | सर्वाधिकार सुरक्षित।`;
      e.clipboardData?.setData('text/plain', text + attribution);
      e.preventDefault();
    };

    document.addEventListener('copy', handleGlobalCopy);
    return () => document.removeEventListener('copy', handleGlobalCopy);
  }, []);

  // Schema.org Structured Data (JSON-LD) for News Media
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: siteSettings.site_title,
    url: `https://${siteSettings.subdomain}`,
    logo: siteSettings.logo_url || `https://${siteSettings.subdomain}/logo.png`,
    description: siteSettings.meta_description,
    founder: {
      '@type': 'Person',
      name: siteSettings.editor_in_chief
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: siteSettings.contact_phone,
      contactType: 'editorial',
      email: siteSettings.contact_email
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Header />

      <main className="flex-1">
        {currentRoute.page === 'home' && (
          <HomePage searchQuery={currentRoute.param} />
        )}

        {currentRoute.page === 'category' && (
          <HomePage categoryFilter={currentRoute.param} />
        )}

        {currentRoute.page === 'article' && currentRoute.param && (
          <ArticleDetail slug={currentRoute.param} />
        )}

        {currentRoute.page === 'admin' && (
          <AdminDashboard />
        )}

        {currentRoute.page === 'docs' && (
          currentRole === 'super_admin' ? (
            <DocsView />
          ) : (
            <HomePage />
          )
        )}
      </main>

      <Footer />
      <SyncErrorBanner />
    </div>
  );
};

export default function App() {
  return (
    <NewsAppProvider>
      <MainLayout />
    </NewsAppProvider>
  );
}
