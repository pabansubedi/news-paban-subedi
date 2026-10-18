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

// Heavy staff-only screens are split into their own files and downloaded only when opened
const AdminDashboard = React.lazy(() =>
  import('./components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const DocsView = React.lazy(() => import('./components/DocsView').then((m) => ({ default: m.DocsView })));
const lazyFallback = (
  <div className="max-w-md mx-auto px-4 py-20 text-center text-sm text-slate-500">लोड हुँदैछ...</div>
);

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

/**
 * Opens when a staff member follows the "reset password" link from their e-mail.
 */
const PasswordRecoveryModal: React.FC = () => {
  const { changeUserPassword } = useNewsApp();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener('news-password-recovery', h);
    return () => window.removeEventListener('news-password-recovery', h);
  }, []);

  if (!open) return null;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await changeUserPassword(value);
    if (res.ok) {
      setOpen(false);
      setValue('');
    } else {
      setMsg(res.error || 'पासवर्ड बदल्न सकिएन।');
    }
  };
  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm space-y-3 shadow-2xl">
        <h3 className="font-extrabold text-slate-900 dark:text-white">नयाँ पासवर्ड राख्नुहोस्</h3>
        <input
          type="password"
          autoFocus
          required
          minLength={6}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="कम्तिमा ६ अक्षर"
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
        />
        {msg && <p className="text-xs text-red-600">{msg}</p>}
        <button type="submit" className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold">
          सुरक्षित गर्नुहोस्
        </button>
      </form>
    </div>
  );
};

/**
 * /admin is now a real URL, so a visitor can open it directly.
 * Staff-only: everyone else gets the login prompt instead of the dashboard.
 */
const AdminGate: React.FC = () => {
  const { currentRole, authReady, setAdminLoginModalOpen } = useNewsApp();
  // wait until the saved login is restored, else a logged-in admin reloading /admin
  // would see the login box for a moment
  useEffect(() => {
    if (authReady && currentRole === 'public') setAdminLoginModalOpen(true);
  }, [authReady, currentRole]);
  if (!authReady) {
    return <div className="max-w-md mx-auto px-4 py-20 text-center text-sm text-slate-500">लोड हुँदैछ...</div>;
  }
  if (currentRole !== 'public') return <React.Suspense fallback={lazyFallback}><AdminDashboard /></React.Suspense>;
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">स्टाफ लगइन आवश्यक छ</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">यो पृष्ठ केवल अधिकृत कर्मचारीका लागि हो।</p>
      <button
        onClick={() => setAdminLoginModalOpen(true)}
        className="mt-5 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold"
      >
        लगइन गर्नुहोस्
      </button>
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
    } else if (currentRoute.page === 'tag' && currentRoute.param) {
      document.title = `#${currentRoute.param} - ${siteSettings.site_title}`;
    } else if (currentRoute.page === 'admin') {
      document.title = `CMS Admin Panel - ${siteSettings.site_title}`;
    } else if (currentRoute.page === 'docs') {
      document.title = `Supabase & Next.js Architecture - ${siteSettings.site_title}`;
    } else {
      document.title = `${siteSettings.site_title} | ${siteSettings.tagline}`;
    }

    // Dynamic Favicon update
  }, [currentRoute, siteSettings, posts]);

  // Favicon chosen in Admin -> Site settings (the default one stays if it cannot be loaded)
  useEffect(() => {
    const url = siteSettings.favicon_url;
    if (!url) return;
    const probe = new Image();
    probe.onload = () => {
      document.querySelectorAll("link[rel~='icon']").forEach((l) => l.remove());
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = url;
      const type = url.startsWith('data:')
        ? url.slice(5, url.indexOf(';'))
        : /\.svg(\?|$)/i.test(url)
          ? 'image/svg+xml'
          : /\.png(\?|$)/i.test(url)
            ? 'image/png'
            : /\.(jpe?g)(\?|$)/i.test(url)
              ? 'image/jpeg'
              : /\.ico(\?|$)/i.test(url)
                ? 'image/x-icon'
                : '';
      if (type) link.type = type;
      document.head.appendChild(link);
    };
    probe.src = url;
  }, [siteSettings.favicon_url]);

  // Global copy attribution across the portal
  useEffect(() => {
    const handleGlobalCopy = (e: ClipboardEvent) => {
      // never touch copying inside the admin panel or from form fields
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (window.location.pathname.startsWith('/admin')) return;
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

        {currentRoute.page === 'tag' && currentRoute.param && (
          <HomePage tagFilter={currentRoute.param} />
        )}

        {currentRoute.page === 'article' && currentRoute.param && (
          <ArticleDetail slug={currentRoute.param} />
        )}

        {currentRoute.page === 'admin' && <AdminGate />}

        {currentRoute.page === 'docs' && (
          currentRole === 'super_admin' ? (
            <React.Suspense fallback={lazyFallback}><DocsView /></React.Suspense>
          ) : (
            <HomePage />
          )
        )}
      </main>

      <Footer />
      <SyncErrorBanner />
      <PasswordRecoveryModal />
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
