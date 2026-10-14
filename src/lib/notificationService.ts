/**
 * Push Notification Service & Real-Time Reader Alert System
 * Dedicated to: News Paban Subedi (news.pabansubedi.com.np)
 * Features:
 * - Native Web Push Notification API support
 * - Pleasant Web Audio API Chime synthesizer (Zero external file dependencies)
 * - In-app real-time interactive toast alert for breaking & published articles
 * - Multi-tab broadcast via BroadcastChannel & LocalStorage events
 * - Supabase push_subscriptions persistence
 */

import { supabase } from './supabase';

export interface NotificationSettings {
  enabled: boolean;
  breakingOnly: boolean;
  soundEnabled: boolean;
}

const SETTINGS_KEY = 'news_paban_notification_prefs_v1';
const SUBSCRIBERS_KEY = 'news_paban_push_subscriber_id';

export const getNotificationPreferences = (): NotificationSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return {
    enabled: true,
    breakingOnly: false,
    soundEnabled: true
  };
};

export const saveNotificationPreferences = (prefs: NotificationSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(prefs));
  } catch {}
};

/**
 * Pleasant modern notification chime synthesized directly using the Web Audio API
 */
export const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Tone 1: Gentle high bell
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.55);

    // Tone 2: Harmonic ring
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.08); // D6
    gain2.gain.setValueAtTime(0.12, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.7);
  } catch {
    // Graceful fallback if audio is not permitted by user gesture policy
  }
};

/**
 * Request system notification permission & register reader in Supabase
 */
export const requestPushPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      // Register subscriber in Supabase push_subscriptions
      try {
        let subId = localStorage.getItem(SUBSCRIBERS_KEY);
        if (!subId) {
          subId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          localStorage.setItem(SUBSCRIBERS_KEY, subId);
        }
        await supabase.from('push_subscriptions').upsert({
          endpoint: subId,
          user_agent: navigator.userAgent,
          is_active: true,
          subscribed_at: new Date().toISOString()
        }, { onConflict: 'endpoint' });
      } catch {}
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Multi-tab communication channel for instantaneous alert delivery
 */
let pushChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    pushChannel = new BroadcastChannel('news_paban_push_channel');
    pushChannel.onmessage = (e) => {
      if (e.data?.type === 'NEW_ARTICLE_ALERT') {
        renderLocalArticleAlert(e.data.article, false);
      }
    };
  }
} catch {}

/**
 * Internal helper to trigger sounds, native notifications and in-app toasts
 */
const renderLocalArticleAlert = (
  article: {
    title: string;
    slug: string;
    featured_image?: string;
    is_breaking?: boolean;
  },
  broadcastToOtherTabs: boolean = true
) => {
  const prefs = getNotificationPreferences();
  if (!prefs.enabled) return;
  if (prefs.breakingOnly && !article.is_breaking) return;

  // 1. Play chime if sound enabled
  if (prefs.soundEnabled) {
    playNotificationChime();
  }

  // 2. Browser native push notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(
        article.is_breaking ? '🚨 ताजा ब्रेकिङ न्युज - News Paban Subedi' : '📰 ताजा समाचार - News Paban Subedi',
        {
          body: article.title,
          icon: article.featured_image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=200&q=80',
          tag: article.slug,
          requireInteraction: false
        }
      );
      notif.onclick = () => {
        window.focus();
        window.location.hash = `#article-${article.slug}`;
        window.dispatchEvent(new CustomEvent('news_navigate_article', { detail: { slug: article.slug } }));
        notif.close();
      };
    } catch {}
  }

  // 3. Dispatch in-app interactive toast alert
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('news_push_alert', {
        detail: {
          id: `notif-${Date.now()}`,
          title: article.title,
          slug: article.slug,
          image: article.featured_image,
          is_breaking: article.is_breaking,
          time: new Date().toLocaleTimeString('ne-NP', { hour: '2-digit', minute: '2-digit' })
        }
      })
    );
  }

  // 4. Broadcast across other tabs if applicable
  if (broadcastToOtherTabs && pushChannel) {
    try {
      pushChannel.postMessage({ type: 'NEW_ARTICLE_ALERT', article });
    } catch {}
  }
};

/**
 * Trigger article notification to active window & other tabs
 */
export const notifyNewArticlePublished = (article: {
  title: string;
  slug: string;
  featured_image?: string;
  is_breaking?: boolean;
}) => {
  renderLocalArticleAlert(article, true);
};
