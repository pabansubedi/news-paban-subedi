import React, { useState } from 'react';
import { useNewsApp } from '../lib/store';
import { AdPlacementSlot } from '../types';
import { X, Info } from 'lucide-react';

interface AdBannerProps {
  slot: AdPlacementSlot;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ slot, className = '' }) => {
  const { ads, recordAdClick, currentRole, navigateTo } = useNewsApp();
  const [closed, setClosed] = useState(false);

  const now = new Date();
  const ad = ads.find((a) => {
    if (a.placement_slot !== slot || !a.is_active) return false;
    // Check start date if configured
    if (a.start_date && new Date(a.start_date) > now) return false;
    // Check end/expiry date if configured
    if (a.end_date && new Date(a.end_date + 'T23:59:59') < now) return false;
    return true;
  });

  if (closed || !ad) {
    // For normal visitors, render clean empty space with zero visual disruption
    if (currentRole === 'super_admin' && !closed) {
      return (
        <div className={`border-2 border-dashed border-amber-300 dark:border-amber-700/50 bg-amber-50/60 dark:bg-amber-950/20 p-2 text-center rounded text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 ${className}`}>
          <Info className="w-3.5 h-3.5 text-amber-600" />
          <span>[विज्ञापन स्थान: <strong>{slot}</strong>] हाल कुनै सक्रिय वा म्याद नसकिएको विज्ञापन छैन।</span>
          <button
            onClick={() => navigateTo('admin')}
            className="underline text-red-600 dark:text-red-400 font-semibold cursor-pointer"
          >
            विज्ञापन व्यवस्थापन
          </button>
        </div>
      );
    }
    return null;
  }

  const handleAdClick = () => {
    recordAdClick(ad.id);
  };

  // Sticky footer format
  if (slot === 'sticky_footer') {
    return (
      <aside aria-label="सम्बन्धित विज्ञापन" className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 shadow-2xl p-2 flex items-center justify-center no-print">
        <div className="relative max-w-4xl w-full flex items-center justify-between gap-4">
          <div className="text-[10px] text-slate-400 tracking-wider font-semibold uppercase hidden sm:block">
            विज्ञापन
          </div>
          <a
            href={ad.redirect_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleAdClick}
            className="flex-1 flex items-center justify-center overflow-hidden max-h-16 rounded group"
          >
            {ad.script_code ? (
              <div className="max-w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: ad.script_code }} />
            ) : (
              <img
                src={ad.image_url}
                alt={ad.title}
                className="max-h-14 object-contain mx-auto transition-transform group-hover:scale-102"
              />
            )}
          </a>
          <button
            onClick={() => setClosed(true)}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="विज्ञापन बन्द गर्नुहोस्"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // Header 728x90 format
  if (slot === 'header_top') {
    return (
      <div className={`relative flex flex-col items-center justify-center ${className}`}>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mb-1">
          - विज्ञापन (७२८ x ९०) -
        </div>
        <a
          href={ad.redirect_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAdClick}
          className="block w-full max-w-[728px] overflow-hidden rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:opacity-95 transition shadow-xs group"
        >
          {ad.script_code ? (
            <div className="max-w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: ad.script_code }} />
          ) : (
            <div className="relative aspect-[728/90] w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              <img
                src={ad.image_url}
                alt={ad.title}
                className="h-full w-full object-cover transition-transform group-hover:scale-101"
              />
            </div>
          )}
        </a>
      </div>
    );
  }

  // Sidebar 300x250 Box format
  if (slot === 'sidebar_top') {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center uppercase tracking-wider font-semibold">
          - प्रायोजित विज्ञापन (३०० x २५०) -
        </div>
        <a
          href={ad.redirect_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAdClick}
          className="block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition group"
        >
          {ad.script_code ? (
            <div className="max-w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: ad.script_code }} />
          ) : (
            <div className="aspect-[300/250] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <img
                src={ad.image_url}
                alt={ad.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-103"
              />
            </div>
          )}
        </a>
      </div>
    );
  }

  // In-article Banner
  if (slot === 'in_article') {
    return (
      <div className={`my-8 py-3 border-y border-slate-100 dark:border-slate-800 text-center ${className}`}>
        <div className="text-[10px] text-slate-400 font-medium mb-1">
          - विज्ञापन -
        </div>
        <a
          href={ad.redirect_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAdClick}
          className="block max-w-2xl mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs hover:opacity-95 transition"
        >
          {ad.script_code ? (
            <div className="max-w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: ad.script_code }} />
          ) : (
            <img
              src={ad.image_url}
              alt={ad.title}
              className="w-full max-h-40 object-cover"
            />
          )}
        </a>
      </div>
    );
  }

  // Below Hero Banner (Full width)
  return (
    <div className={`my-6 w-full ${className}`}>
      <div className="text-[10px] text-slate-400 text-center mb-1 font-medium">
        - विज्ञापन -
      </div>
      <a
        href={ad.redirect_url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleAdClick}
        className="block w-full max-w-5xl mx-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs hover:opacity-95 transition"
      >
        {ad.script_code ? (
          <div className="max-w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: ad.script_code }} />
        ) : (
          <div className="h-28 sm:h-36 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <img
              src={ad.image_url}
              alt={ad.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </a>
    </div>
  );
};
