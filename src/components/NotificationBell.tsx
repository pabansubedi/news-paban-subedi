import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Volume2, VolumeX, Flame, X, ArrowRight } from 'lucide-react';
import {
  NotificationSettings,
  getNotificationPreferences,
  saveNotificationPreferences,
  requestPushPermission,
  playNotificationChime
} from '../lib/notificationService';
import { useNewsApp } from '../lib/store';

interface ToastAlert {
  id: string;
  title: string;
  slug: string;
  image?: string;
  is_breaking?: boolean;
  time: string;
}

export const NotificationBell: React.FC = () => {
  const { navigateTo } = useNewsApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationPreferences);
  const [permissionState, setPermissionState] = useState<string>('default');
  const [activeToast, setActiveToast] = useState<ToastAlert | null>(null);
  const [showPromptBanner, setShowPromptBanner] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
      const dismissed = localStorage.getItem('news_push_prompt_dismissed_v1');
      if (Notification.permission === 'default' && !dismissed) {
        // Show after 3.5 seconds of initial reading
        const t = setTimeout(() => setShowPromptBanner(true), 3500);
        return () => clearTimeout(t);
      }
    }
  }, []);

  const handleDismissPrompt = () => {
    setShowPromptBanner(false);
    try {
      localStorage.setItem('news_push_prompt_dismissed_v1', 'true');
    } catch {}
  };

  const handleAcceptPrompt = async () => {
    handleDismissPrompt();
    const granted = await requestPushPermission();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
    const updated = { ...settings, enabled: true };
    setSettings(updated);
    saveNotificationPreferences(updated);
    playNotificationChime();
  };

  // Listen to news_push_alert events
  useEffect(() => {
    const handlePushAlert = (e: any) => {
      const data = e.detail as ToastAlert;
      setActiveToast(data);
    };

    const handleNavigate = (e: any) => {
      if (e.detail?.slug) {
        navigateTo('article', e.detail.slug);
      }
    };

    window.addEventListener('news_push_alert', handlePushAlert);
    window.addEventListener('news_navigate_article', handleNavigate);
    return () => {
      window.removeEventListener('news_push_alert', handlePushAlert);
      window.removeEventListener('news_navigate_article', handleNavigate);
    };
  }, [navigateTo]);

  // Auto-dismiss toast after 8 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 8500);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const handleToggleEnable = async () => {
    const nextState = !settings.enabled;
    if (nextState) {
      const granted = await requestPushPermission();
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermissionState(Notification.permission);
      }
      const updated = { ...settings, enabled: true };
      setSettings(updated);
      saveNotificationPreferences(updated);
      playNotificationChime();
    } else {
      const updated = { ...settings, enabled: false };
      setSettings(updated);
      saveNotificationPreferences(updated);
    }
  };

  const handleToggleSound = () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(updated);
    saveNotificationPreferences(updated);
    if (updated.soundEnabled) {
      playNotificationChime();
    }
  };

  const handleToggleBreakingOnly = () => {
    const updated = { ...settings, breakingOnly: !settings.breakingOnly };
    setSettings(updated);
    saveNotificationPreferences(updated);
  };

  return (
    <>
      {/* 1. BELL BUTTON IN HEADER */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`relative p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
            settings.enabled
              ? 'text-amber-400 hover:text-amber-300 hover:bg-slate-800'
              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
          }`}
          title="ताजा समाचार नोटिफिकेसन अलर्ट (Push Notifications)"
          aria-label="Push Notifications"
        >
          {settings.enabled ? (
            <BellRing className="w-4 h-4 text-amber-400 animate-bounce duration-1000" />
          ) : (
            <Bell className="w-4 h-4 text-slate-400" />
          )}

          {/* Active green dot */}
          {settings.enabled && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-900"></span>
          )}
        </button>

        {/* 2. NOTIFICATION SETTINGS DROPDOWN */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 p-4 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    ताजा समाचार नोटिफिकेसन
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    नयाँ समाचार प्रकाशित हुँदा तत्काल सूचना
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDropdownOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle Switch */}
            <div className="py-3 space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    नोटिफिकेसन सक्रिय (Enabled)
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {permissionState === 'granted'
                      ? 'ब्राउजर पुस नोटिफिकेसन अनुमतित'
                      : 'सिस्टम अलर्ट तथा इन-एप सूचना'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleEnable}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    settings.enabled ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      settings.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sound alert toggle */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  {settings.soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>सूचना आवाज (Sound Alert):</span>
                </span>
                <button
                  onClick={handleToggleSound}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                    settings.soundEnabled
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  }`}
                >
                  {settings.soundEnabled ? 'अन (ON)' : 'अफ (OFF)'}
                </button>
              </div>

              {/* Breaking only filter */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>ब्रेकिङ न्युज मात्र:</span>
                </span>
                <button
                  onClick={handleToggleBreakingOnly}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                    settings.breakingOnly
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  }`}
                >
                  {settings.breakingOnly ? 'हो (Breaking Only)' : 'सबै समाचार'}
                </button>
              </div>
            </div>

            {/* Real-time status indicator */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>प्रत्यक्ष प्रसारण सक्रिय</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">news.pabansubedi.com.np</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. FLOATING REAL-TIME PUSH TOAST ALERT (TOP-RIGHT CORNER) */}
      {activeToast && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-5 z-50 sm:max-w-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl border-2 border-red-600 dark:border-red-500 p-4 animate-in slide-in-from-top-4 duration-300 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse">
                <Flame className="w-3 h-3 text-amber-300" />
                {activeToast.is_breaking ? 'ताजा ब्रेकिङ न्युज' : 'नयाँ समाचार'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {activeToast.time}
              </span>
            </div>
            <button
              onClick={() => setActiveToast(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3">
            {activeToast.image && (
              <img
                src={activeToast.image}
                alt=""
                className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
              />
            )}
            <div className="flex-1 min-w-0">
              <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                {activeToast.title}
              </h5>
            </div>
          </div>

          <button
            onClick={() => {
              navigateTo('article', activeToast.slug);
              setActiveToast(null);
            }}
            className="w-full py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-red-600/30 cursor-pointer"
          >
            <span>अहिले पढ्नुहोस् (Read Article)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. READER PUSH NOTIFICATION SUBSCRIPTION PROMPT BANNER */}
      {showPromptBanner && !settings.enabled && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-5 z-40 sm:max-w-sm bg-white dark:bg-slate-900 border-2 border-red-500 rounded-2xl shadow-2xl p-4 text-slate-900 dark:text-white animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm">
                <BellRing className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs font-black tracking-tight text-slate-900 dark:text-white">
                  News Paban Subedi अलर्ट
                </h4>
                <p className="text-[10px] text-red-600 dark:text-red-400 font-bold">
                  ताजा तथा ब्रेकिङ न्युज नोटिफिकेसन
                </p>
              </div>
            </div>
            <button
              onClick={handleDismissPrompt}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-md cursor-pointer"
              title="बन्द गर्नुहोस्"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 my-3 leading-relaxed">
            नेपाल र विश्वका ताजा, ब्रेकिङ तथा महत्त्वपूर्ण समाचारहरू प्रकाशित हुनासाथ तुरुन्त नोटिफिकेसन प्राप्त गर्नुहोस्।
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleAcceptPrompt}
              className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-red-600/30 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>सूचना खोल्नुहोस् (Enable)</span>
            </button>
            <button
              onClick={handleDismissPrompt}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
            >
              पछि
            </button>
          </div>
        </div>
      )}
    </>
  );
};
