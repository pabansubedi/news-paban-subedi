/**
 * News Paban Subedi - Full-Stack Production News Portal
 * news.pabansubedi.com.np
 */

import React, { useEffect } from 'react';
import { NewsAppProvider, useNewsApp } from './lib/store';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { ArticleDetail } from './components/ArticleDetail';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { DocsView } from './components/DocsView';

const MainLayout: React.FC = () => {
  const { currentRoute, siteSettings, posts } = useNewsApp();

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
          <DocsView />
        )}
      </main>

      <Footer />
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
