import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  UserProfile,
  Category,
  Post,
  Advertisement,
  SiteSettings,
  Comment,
  UserRole,
  PostStatus
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_POSTS,
  INITIAL_ADS,
  INITIAL_SITE_SETTINGS,
  INITIAL_COMMENTS
} from './defaultData';
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_CONFIG } from './supabase';
import { notifyNewArticlePublished } from './notificationService';

export interface NewStaffInput {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  bio?: string;
  avatar?: string;
}

interface NewsAppContextType {
  // Current user & role (Strictly confidential; defaults to 'public' for portal visitors)
  currentUser: UserProfile;
  currentRole: UserRole;
  authReady: boolean; // saved login has been checked
  users: UserProfile[];
  addUser: (user: NewStaffInput) => Promise<{ ok: boolean; error?: string; needsConfirm?: boolean }>;
  updateUser: (id: string, user: Partial<UserProfile>) => void;
  deleteUser: (id: string) => void;
  adminLoginModalOpen: boolean;
  setAdminLoginModalOpen: (open: boolean) => void;
  verifyLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  changeUserPassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  logoutStaff: () => void;

  // Data
  siteSettings: SiteSettings;
  updateSiteSettings: (settings: Partial<SiteSettings>) => void;
  postsLoaded: boolean;
  totalVisitors: number;
  onlineVisitors: number;
  incrementTotalVisitors: () => void;

  categories: Category[];
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, cat: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  posts: Post[]; // what READERS may see (scheduled posts are hidden until their time)
  allPosts: Post[]; // everything this login can see (admin panel)
  addPost: (post: Omit<Post, 'id' | 'views' | 'created_at' | 'updated_at'>) => Post;
  updatePost: (id: string, post: Partial<Post>) => void;
  deletePost: (id: string) => void;
  changePostStatus: (id: string, status: PostStatus, approverName?: string) => void;
  incrementViews: (id: string) => void;

  ads: Advertisement[];
  updateAd: (id: string, ad: Partial<Advertisement>) => void;
  recordAdClick: (id: string) => void;

  comments: Comment[];
  addComment: (postId: string, authorName: string, content: string) => void;
  updateCommentApproval: (id: string, approved: boolean) => void;
  deleteComment: (id: string) => void;

  // Theme & Navigation
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  currentRoute: { page: 'home' | 'article' | 'category' | 'tag' | 'admin' | 'docs'; param?: string };
  navigateTo: (page: 'home' | 'article' | 'category' | 'tag' | 'admin' | 'docs', param?: string) => void;
}

const NewsAppContext = createContext<NewsAppContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Helpers: DB row <-> app model
// ---------------------------------------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v?: string | null): v is string => !!v && UUID_RE.test(v);

const stripNulls = (obj: Record<string, any>) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined));

const mapCategory = (c: any): Category => ({
  id: c.id,
  name: c.name || c.name_np || c.slug,
  name_en: c.name_en || c.slug,
  slug: c.slug,
  order_index: c.order_index ?? 0,
  color: c.color || c.color_code || '#dc2626',
  description: c.description || '',
  is_active: c.is_active ?? true
});

const mapPost = (p: any): Post => ({
  id: p.id,
  title: p.title,
  slug: p.slug,
  content: p.content,
  excerpt: p.excerpt || p.summary || '',
  featured_image: p.featured_image,
  image_caption: p.image_caption || '',
  category_id: p.category_id,
  author_id: p.author_id || 'usr_super_admin',
  author_name: p.author_name || 'पवन सुवेदी',
  author_avatar: p.author_avatar || '',
  editor_name: p.editor_name || '',
  status: p.status || 'published',
  views: Number(p.views) || 0,
  is_breaking: !!p.is_breaking,
  is_featured: !!p.is_featured,
  published_at: p.published_at,
  created_at: p.created_at || new Date().toISOString(),
  updated_at: p.updated_at || new Date().toISOString(),
  read_time_mins: p.read_time_mins || 3,
  tags: p.tags || [],
  audio_url: p.audio_url || ''
});

const mapComment = (c: any): Comment => ({
  id: c.id,
  post_id: c.post_id,
  author_name: c.author_name,
  content: c.content,
  created_at: c.created_at,
  is_approved: c.is_approved ?? true
});

const mapAd = (a: any): Advertisement => ({
  id: a.id,
  placement_slot: a.placement_slot,
  title: a.title || '',
  image_url: a.image_url || '',
  redirect_url: a.redirect_url || '',
  script_code: a.script_code || '',
  is_active: a.is_active ?? true,
  start_date: a.start_date ? String(a.start_date).slice(0, 10) : '',
  end_date: a.end_date ? String(a.end_date).slice(0, 10) : '',
  views_count: Number(a.views_count) || 0,
  clicks_count: Number(a.clicks_count) || 0,
  advertiser_name: a.advertiser_name || ''
});

// Start from the 5 default slots, override each slot with what is saved in the DB
const mergeAds = (rows: any[]): Advertisement[] => {
  const bySlot = new Map<string, Advertisement>();
  INITIAL_ADS.forEach((a) => bySlot.set(a.placement_slot, a));
  rows.forEach((r) => bySlot.set(r.placement_slot, mapAd(r)));
  return Array.from(bySlot.values());
};

// Only real DB columns, and '' dates -> null (empty string breaks timestamptz columns)
const adRow = (a: Advertisement) => ({
  placement_slot: a.placement_slot,
  title: a.title || '',
  image_url: a.image_url || '',
  redirect_url: a.redirect_url || '',
  script_code: a.script_code || '',
  is_active: a.is_active,
  start_date: a.start_date || null,
  end_date: a.end_date || null,
  advertiser_name: a.advertiser_name || ''
});

const settingsRow = (s: SiteSettings) => {
  const { id, updated_at, total_visitors, online_visitors, ...rest } = s as any;
  return rest;
};

// A post is live for readers when it is published AND its publish time has come
export const isPostLive = (p: Post, now: number = Date.now()): boolean =>
  p.status === 'published' && (!p.published_at || new Date(p.published_at).getTime() <= now);

const mapProfile = (r: any, fallbackEmail = ''): UserProfile => ({
  id: r.id,
  user_id: r.user_id,
  role: r.role,
  full_name: r.full_name || r.email || fallbackEmail,
  email: r.email || fallbackEmail,
  avatar: r.avatar || '',
  bio: r.bio || undefined,
  phone: r.phone || undefined,
  is_active: !!r.is_active
});

const GUEST_USER: UserProfile = {
  id: 'guest-public',
  user_id: 'guest',
  role: 'public',
  full_name: 'साधारण पाठक (Visitor)',
  email: '',
  avatar: ''
};

// ---------------------------------------------------------------------------
// Real URLs: /news/<slug>, /category/<slug>, /admin, /docs  (History API).
// GitHub Pages serves 404.html (= index.html) for deep links, and the build
// pre-renders every published article (see scripts/prerender-articles.mjs).
// ---------------------------------------------------------------------------
type Page = 'home' | 'article' | 'category' | 'tag' | 'admin' | 'docs';
type Route = { page: Page; param?: string };

const pathFor = (page: Page, param?: string): string => {
  switch (page) {
    case 'article':
      return param ? `/news/${encodeURIComponent(param)}` : '/';
    case 'category':
      return param ? `/category/${encodeURIComponent(param)}` : '/';
    case 'tag':
      return param ? `/tag/${encodeURIComponent(param)}` : '/';
    case 'admin':
      return '/admin';
    case 'docs':
      return '/docs';
    default:
      return param ? `/?q=${encodeURIComponent(param)}` : '/';
  }
};

const parseLocation = (): Route => {
  try {
    const { pathname, search } = window.location;
    const parts = pathname.split('/').filter(Boolean).map((x) => decodeURIComponent(x));
    if (parts[0] === 'news' && parts[1]) return { page: 'article', param: parts[1] };
    if (parts[0] === 'category' && parts[1]) return { page: 'category', param: parts[1] };
    if (parts[0] === 'tag' && parts[1]) return { page: 'tag', param: parts[1] };
    if (parts[0] === 'admin') return { page: 'admin' };
    if (parts[0] === 'docs') return { page: 'docs' };
    const q = new URLSearchParams(search).get('q');
    return q ? { page: 'home', param: q } : { page: 'home' };
  } catch {
    return { page: 'home' };
  }
};

export const NewsAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Persistence keys
  const SETTINGS_KEY = 'nepal_news_settings_v2';
  const POSTS_KEY = 'nepal_news_posts_v3'; // v3: drops cached demo news
  const CATEGORIES_KEY = 'nepal_news_categories_v2';
  const ADS_KEY = 'nepal_news_ads_v3'; // v3: drops cached demo ads
  const COMMENTS_KEY = 'nepal_news_comments_v3';
  // Staff identity comes ONLY from Supabase Auth (see "STAFF LOGIN" below).
  // The old fake login kept plaintext passwords in LocalStorage: wipe them.
  useEffect(() => {
    try {
      localStorage.removeItem('nepal_news_auth_session_v2');
      localStorage.removeItem('nepal_news_users_v2');
    } catch {}
  }, []);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>('public');
  const [currentUser, setCurrentUser] = useState<UserProfile>(GUEST_USER);
  const [authReady, setAuthReady] = useState(false);

  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState(false);

  // REAL visitor counter (Supabase site_stats; +1 per browser session) and
  // REAL online readers (Supabase Realtime presence). No more fake numbers.
  const [totalVisitors, setTotalVisitors] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('news_total_visitors_v3');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const [onlineVisitors, setOnlineVisitors] = useState<number>(1);
  const [postsLoaded, setPostsLoaded] = useState(false);

  // Site Settings
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.site_title || parsed.site_title.includes('नेपाल खबर २४')) {
          parsed.site_title = 'News Paban Subedi | न्युज पवन सुवेदी';
        }
        return { ...INITIAL_SITE_SETTINGS, ...parsed };
      }
      return INITIAL_SITE_SETTINGS;
    } catch {
      return INITIAL_SITE_SETTINGS;
    }
  });

  // Categories
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_KEY);
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  // Posts
  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem(POSTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Advertisements
  const [ads, setAds] = useState<Advertisement[]>(() => {
    try {
      const saved = localStorage.getItem(ADS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_ADS;
    } catch {
      return INITIAL_ADS;
    }
  });

  // Comments
  const [comments, setComments] = useState<Comment[]>(() => {
    try {
      const saved = localStorage.getItem(COMMENTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Navigation route
  const [currentRoute, setCurrentRoute] = useState<Route>(() => parseLocation());

  // Theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nepal_news_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nepal_news_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nepal_news_theme', 'light');
    }
  }, [isDarkMode]);

  // Real visitor counter: +1 once per browser session (server side, atomic)
  useEffect(() => {
    (async () => {
      try {
        if (sessionStorage.getItem('np_visit_counted')) return;
        const { data, error } = await supabase.rpc('increment_site_visitors');
        if (!error && data !== null && data !== undefined) {
          sessionStorage.setItem('np_visit_counted', '1');
          const n = Number(data) || 0;
          setTotalVisitors(n);
          try {
            localStorage.setItem('news_total_visitors_v3', String(n));
          } catch {}
        }
      } catch {}
    })();
  }, []);

  // Real "online readers": everyone connected to this Realtime channel right now
  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;
    try {
      const key = `r-${Math.random().toString(36).slice(2, 10)}`;
      ch = supabase.channel('news_paban_online_readers', { config: { presence: { key } } });
      ch.on('presence', { event: 'sync' }, () => {
        setOnlineVisitors(Math.max(1, Object.keys(ch!.presenceState()).length));
      }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await ch!.track({ at: Date.now() });
      });
    } catch {}
    return () => {
      if (ch) supabase.removeChannel(ch);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // SUPABASE = SINGLE SOURCE OF TRUTH
  // Every browser reads the same data from Supabase (on load, on focus, every
  // 15s, and instantly via Realtime). LocalStorage is only a fast first-paint cache.
  // ---------------------------------------------------------------------------
  const roleRef = useRef(currentRole);
  roleRef.current = currentRole;
  const postsRef = useRef<Post[]>(posts);
  postsRef.current = posts;
  const categoriesRef = useRef<Category[]>(categories);
  categoriesRef.current = categories;
  const adsRef = useRef<Advertisement[]>(ads);
  adsRef.current = ads;
  const settingsRef = useRef<SiteSettings>(siteSettings);
  settingsRef.current = siteSettings;

  // Scheduled posts (published + future time) stay hidden from readers until their time comes
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const visiblePosts = useMemo(
    () => posts.filter((p) => p.status !== 'published' || isPostLive(p, nowTick)),
    [posts, nowTick]
  );

  const inflightRef = useRef(0); // DB writes in progress
  const adTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const adImageDirtyRef = useRef<Record<string, boolean>>({}); // ad image changed since last save
  const syncingRef = useRef(false);
  const pendingSyncRef = useRef(false);

  const isBusy = () => inflightRef.current > 0 || Object.keys(adTimersRef.current).length > 0;

  const persist = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }
  };

  const syncFromSupabase = useCallback(async () => {
    if (syncingRef.current) {
      pendingSyncRef.current = true;
      return;
    }
    syncingRef.current = true;
    try {
      do {
        pendingSyncRef.current = false;
        const [s, c, p, a, cm, st] = await Promise.all([
          supabase.from('site_settings').select('*').limit(1).maybeSingle(),
          supabase.from('categories').select('*').order('order_index', { ascending: true }),
          supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(1000),
          supabase.from('advertisements').select('*'),
          supabase.from('comments').select('*').order('created_at', { ascending: false }).limit(500),
          supabase.from('site_stats').select('total_visitors').eq('id', 1).maybeSingle()
        ]);

        // A write is in progress: its completion will trigger a fresh sync, so
        // don't let this (older) snapshot overwrite the admin's newest change.
        if (isBusy()) return;

        if (!s.error && s.data && s.data.site_title) {
          const clean = stripNulls(s.data);
          setSiteSettings((prev) => {
            const merged = { ...prev, ...clean };
            persist(SETTINGS_KEY, merged);
            return merged;
          });
        } else if (s.error) console.warn('site_settings fetch failed:', s.error.message);

        if (!c.error && c.data && c.data.length > 0) {
          const formatted = c.data.map(mapCategory);
          setCategories(formatted);
          persist(CATEGORIES_KEY, formatted);
        } else if (c.error) console.warn('categories fetch failed:', c.error.message);

        // Posts: the database is the truth, even when it is empty
        // (so a deleted post disappears from every browser).
        if (!p.error && p.data) {
          const formatted = p.data.map(mapPost);
          setPosts(formatted);
          persist(POSTS_KEY, formatted);
          setPostsLoaded(true);
        } else if (p.error) console.warn('posts fetch failed:', p.error.message);

        if (!a.error && a.data) {
          const merged = mergeAds(a.data);
          setAds(merged);
          persist(ADS_KEY, merged);
        } else if (a.error) console.warn('advertisements fetch failed:', a.error.message);

        if (!cm.error && cm.data) {
          const formatted = cm.data.map(mapComment);
          setComments(formatted);
          persist(COMMENTS_KEY, formatted);
        }

        if (!st.error && st.data) {
          const n = Number(st.data.total_visitors) || 0;
          setTotalVisitors(n);
          try {
            localStorage.setItem('news_total_visitors_v3', String(n));
          } catch {}
        }
      } while (pendingSyncRef.current);
    } catch (err) {
      console.warn('Supabase sync failed:', err);
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // Never keep the article page on 'loading' forever if Supabase is unreachable
  useEffect(() => {
    const t = setTimeout(() => setPostsLoaded(true), 6000);
    return () => clearTimeout(t);
  }, []);

  // Sync on load, when the tab becomes visible/focused again, when the network
  // comes back, and every 15 seconds as a safety net.
  useEffect(() => {
    syncFromSupabase();
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncFromSupabase();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onVisible);
    // staff re-check every 15 s, readers every 60 s (Realtime pushes changes instantly anyway)
    let tick = 0;
    const poll = setInterval(() => {
      tick++;
      if (roleRef.current !== 'public' || tick % 4 === 0) onVisible();
    }, 15000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onVisible);
      clearInterval(poll);
    };
  }, [syncFromSupabase]);

  // Supabase Realtime: any change in any table => refetch (debounced).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(syncFromSupabase, 400);
    };
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel('news_paban_db_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, schedule)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, schedule)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'advertisements' }, schedule)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, schedule)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
          // Push alert for readers when a post newly goes live
          const p = payload.new as any;
          if (
            (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
            p?.status === 'published' &&
            (!p.published_at || new Date(p.published_at).getTime() <= Date.now()) &&
            !postsRef.current.some((x) => x.slug === p.slug && x.status === 'published')
          ) {
            notifyNewArticlePublished({
              title: p.title,
              slug: p.slug,
              featured_image: p.featured_image,
              is_breaking: !!p.is_breaking
            });
          }
          schedule();
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscribe failed (polling still active):', e);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [syncFromSupabase]);

  // Runs a DB write, REPORTS failures (they used to be swallowed silently),
  // and re-syncs from the database when all writes have finished.
  const dbWrite = async (label: string, fn: () => PromiseLike<any>) => {
    inflightRef.current++;
    try {
      const res: any = await fn();
      if (res?.error) throw res.error;
      return true;
    } catch (e: any) {
      const msg = e?.message || e?.details || String(e);
      console.error(`[Supabase] ${label} failed:`, e);
      window.dispatchEvent(
        new CustomEvent('news-sync-error', {
          detail: `"${label}" Supabase मा save भएन: ${msg}`
        })
      );
      return false;
    } finally {
      inflightRef.current--;
      if (!isBusy()) syncFromSupabase();
    }
  };

  // Local category ids (e.g. "cat-123") are not UUIDs; find the real DB id by slug.
  const resolveCategoryUuid = async (localId: string): Promise<string | null> => {
    if (isUuid(localId)) return localId;
    const cat = categoriesRef.current.find((c) => c.id === localId);
    if (!cat) return null;
    const { data } = await supabase.from('categories').select('id').eq('slug', cat.slug).maybeSingle();
    return data?.id ?? null;
  };

  const incrementTotalVisitors = () => {
    /* counted on the server once per session (see effect above) */
  };

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const navigateTo = (page: Page, param?: string) => {
    setCurrentRoute({ page, param });
    try {
      const path = pathFor(page, param);
      if (window.location.pathname + window.location.search !== path) {
        window.history.pushState({}, '', path);
      }
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Browser back / forward buttons
  useEffect(() => {
    const onPop = () => setCurrentRoute(parseLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ---------------------------------------------------------------------------
  // STAFF LOGIN = Supabase Auth.
  // No e-mail or password exists in this code, the repo or the browser storage.
  // Role + "active" flag come from public.users_profile (RLS: your own row, or every
  // row if you are Super Admin). Passwords are stored hashed by Supabase, so nobody,
  // not even the admin, can read them; the admin can only send a reset link.
  // ---------------------------------------------------------------------------
  const setGuest = () => {
    setCurrentRole('public');
    setCurrentUser(GUEST_USER);
    setUsers([]);
  };

  const refreshUsers = async () => {
    const { data, error } = await supabase.from('users_profile').select('*').order('created_at', { ascending: true });
    if (!error && data) setUsers(data.map((r: any) => mapProfile(r)));
  };

  const loadProfile = async (authUser: { id: string; email?: string | null } | null): Promise<UserProfile | null> => {
    if (!authUser) {
      setGuest();
      return null;
    }
    const { data, error } = await supabase.from('users_profile').select('*').eq('user_id', authUser.id).maybeSingle();
    if (error || !data || !data.is_active) {
      setGuest();
      return null;
    }
    const profile = mapProfile(data, authUser.email || '');
    setCurrentRole(profile.role);
    setCurrentUser(profile);
    if (profile.role === 'super_admin') refreshUsers();
    return profile;
  };

  // Restore the session on page load + follow login / logout / password-recovery events
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user ?? null;
      const profile = await loadProfile(user);
      if (user && !profile) supabase.auth.signOut(); // a login without staff access is not kept
    }).catch(() => {}).finally(() => setAuthReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') window.dispatchEvent(new CustomEvent('news-password-recovery'));
      // never await Supabase calls directly inside this callback (can deadlock): defer
      setTimeout(() => {
        loadProfile(session?.user ?? null);
      }, 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // staff see drafts / pending posts, readers do not: re-fetch whenever the role changes
  const roleSyncReady = useRef(false);
  useEffect(() => {
    if (!roleSyncReady.current) {
      roleSyncReady.current = true; // the first sync already happens on load
      return;
    }
    syncFromSupabase();
  }, [currentRole]);

  const verifyLogin = async (emailInput: string, passwordInput: string) => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return { success: false, error: 'कृपया इमेल ठेगाना प्रविष्ट गर्नुहोस्।' };
    if (!passwordInput) return { success: false, error: 'कृपया पासवर्ड प्रविष्ट गर्नुहोस्।' };

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: passwordInput });
    if (error || !data.user) {
      if ((error?.message || '').toLowerCase().includes('not confirmed')) {
        return { success: false, error: 'इमेल पुष्टि भएको छैन। इमेलमा आएको लिङ्क थिचेर पुष्टि गर्नुहोस्।' };
      }
      // same message for "no such user" and "wrong password": do not reveal which e-mails exist
      return { success: false, error: 'इमेल वा पासवर्ड मिलेन।' };
    }
    const profile = await loadProfile(data.user);
    if (!profile) {
      await supabase.auth.signOut();
      return { success: false, error: 'यो खाता सक्रिय छैन वा स्टाफ अनुमति छैन। सुपर एडमिनसँग सम्पर्क गर्नुहोस्।' };
    }
    return { success: true };
  };

  const logoutStaff = () => {
    supabase.auth.signOut().catch(() => {});
    setGuest();
    if (currentRoute.page === 'admin') {
      navigateTo('home');
    }
  };

  // Super Admin creates a staff login. A separate, non-persistent client is used so the
  // new account does not replace YOUR session.
  const addUser = async (input: NewStaffInput) => {
    if (currentRole !== 'super_admin') {
      return { ok: false, error: 'केवल सुपर एडमिनले मात्र कर्मचारी थप्न सक्छ।' };
    }
    const temp = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const { data, error } = await temp.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.full_name } }
    });
    if (error) return { ok: false, error: error.message };
    const created = data.user;
    if (!created || (created.identities && created.identities.length === 0)) {
      return { ok: false, error: 'यो इमेल पहिले नै दर्ता भइसकेको छ।' };
    }
    // the database trigger made an INACTIVE reporter profile: set the real role and activate it
    const ok = await dbWrite('Staff add', () =>
      supabase
        .from('users_profile')
        .update({
          role: input.role,
          full_name: input.full_name,
          phone: input.phone || null,
          bio: input.bio || null,
          avatar: input.avatar || null,
          is_active: true
        })
        .eq('user_id', created.id)
    );
    await refreshUsers();
    if (!ok) return { ok: false, error: 'खाता बन्यो तर भूमिका सेट हुन सकेन। सूचीमा गएर भूमिका फेरि छान्नुहोस्।' };
    return { ok: true, needsConfirm: !data.session };
  };

  const updateUser = (id: string, fields: Partial<UserProfile>) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    if (target.user_id === currentUser.user_id && (fields.is_active === false || (fields.role && fields.role !== 'super_admin'))) {
      window.dispatchEvent(new CustomEvent('news-sync-error', { detail: 'आफ्नै सुपर एडमिन भूमिका वा पहुँच हटाउन मिल्दैन।' }));
      return;
    }
    const row: Record<string, any> = {};
    (['role', 'full_name', 'phone', 'bio', 'avatar', 'is_active'] as const).forEach((k) => {
      if (fields[k] !== undefined) row[k] = fields[k];
    });
    if (Object.keys(row).length === 0) return;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...fields } : u)));
    dbWrite('Staff update', () => supabase.from('users_profile').update(row).eq('id', id)).then(() => refreshUsers());
  };

  // Removes the staff PROFILE (= all access). The bare login stays in Supabase ->
  // Authentication -> Users, where it can be deleted too.
  const deleteUser = (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target || target.user_id === currentUser.user_id) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    dbWrite('Staff remove', () => supabase.from('users_profile').delete().eq('id', id));
  };

  const changeUserPassword = async (newPassword: string) => {
    if (newPassword.length < 6) return { ok: false, error: 'पासवर्ड कम्तिमा ६ अक्षरको हुनुपर्छ।' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? { ok: false, error: error.message } : { ok: true };
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin`
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  };

  // Site Settings (synced to Supabase public.site_settings)
  const SETTINGS_ROW_ID = '00000000-0000-0000-0000-000000000001';
  const updateSiteSettings = (newSettings: Partial<SiteSettings>) => {
    // send ONLY what changed: the whole row also holds the logo / favicon / watermark and
    // re-sending them on every save made the request huge and the database timed out
    const prev = settingsRef.current;
    const changed: Record<string, any> = {};
    (Object.keys(newSettings) as (keyof SiteSettings)[]).forEach((k) => {
      if (JSON.stringify(newSettings[k]) !== JSON.stringify(prev[k])) changed[k as string] = newSettings[k];
    });
    if (Object.keys(changed).length === 0) return;

    const updated = { ...prev, ...newSettings };
    settingsRef.current = updated;
    setSiteSettings(updated);
    persist(SETTINGS_KEY, updated);

    dbWrite('Site settings', async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('site_settings')
        .update({ ...settingsRow(changed as SiteSettings), updated_at: now })
        .eq('id', SETTINGS_ROW_ID)
        .select('id');
      if (error) return { error };
      if (data && data.length > 0) return {};
      // first ever save: the row does not exist yet
      return supabase.from('site_settings').insert({ ...settingsRow(updated), id: SETTINGS_ROW_ID, updated_at: now });
    });
  };

  // Categories (synced to Supabase public.categories)
  const categoryRow = (c: Category) => ({
    name: c.name,
    name_np: c.name,
    name_en: c.name_en,
    slug: c.slug,
    color: c.color || '#dc2626',
    color_code: c.color || '#dc2626',
    description: c.description || '',
    is_active: c.is_active,
    order_index: c.order_index
  });

  const addCategory = (cat: Omit<Category, 'id'>) => {
    const newCategory: Category = { ...cat, id: `cat-${Date.now()}` };
    const updated = [...categoriesRef.current, newCategory];
    categoriesRef.current = updated;
    setCategories(updated);
    persist(CATEGORIES_KEY, updated);

    dbWrite('Category add', () =>
      supabase.from('categories').upsert(categoryRow(newCategory), { onConflict: 'slug' })
    );
  };

  const updateCategory = (id: string, updatedFields: Partial<Category>) => {
    const previous = categoriesRef.current.find((c) => c.id === id);
    const updated = categoriesRef.current.map((cat) => (cat.id === id ? { ...cat, ...updatedFields } : cat));
    categoriesRef.current = updated;
    setCategories(updated);
    persist(CATEGORIES_KEY, updated);

    const target = updated.find((c) => c.id === id);
    if (target) {
      dbWrite('Category update', () =>
        // if the slug was renamed, update the old row instead of creating a duplicate
        previous && previous.slug !== target.slug
          ? supabase.from('categories').update(categoryRow(target)).eq('slug', previous.slug)
          : supabase.from('categories').upsert(categoryRow(target), { onConflict: 'slug' })
      );
    }
  };

  const deleteCategory = (id: string) => {
    const target = categoriesRef.current.find((c) => c.id === id);
    const updated = categoriesRef.current.filter((cat) => cat.id !== id);
    categoriesRef.current = updated;
    setCategories(updated);
    persist(CATEGORIES_KEY, updated);

    if (target) {
      dbWrite('Category delete', () => supabase.from('categories').delete().eq('slug', target.slug));
    }
  };

  // Posts (synced to Supabase public.posts)
  const postRow = async (p: Post) => ({
    title: p.title,
    slug: p.slug,
    content: p.content,
    excerpt: p.excerpt,
    summary: p.excerpt,
    featured_image: p.featured_image || '',
    image_caption: p.image_caption || '',
    category_id: await resolveCategoryUuid(p.category_id), // was missing before -> category lost in other browsers
    author_id: isUuid(p.author_id) ? p.author_id : null,
    author_name: p.author_name || 'पवन सुवेदी',
    author_avatar: p.author_avatar || null,
    editor_name: p.editor_name || '',
    status: p.status,
    is_breaking: p.is_breaking,
    is_featured: p.is_featured,
    published_at: p.published_at,
    read_time_mins: p.read_time_mins,
    tags: p.tags || [],
    audio_url: p.audio_url || null
  });

  const savePost = (label: string, p: Post, oldSlug?: string, isNew = false, previous?: Post) =>
    dbWrite(label, async () => {
      const row: Record<string, any> = await postRow(p);
      if (isNew) return supabase.from('posts').insert(row);
      if (previous) {
        // an unchanged photo (old posts may still hold a multi-MB base64 photo) is not re-sent
        const partial = { ...row };
        if (previous.featured_image === p.featured_image) delete partial.featured_image;
        const { data, error } = await supabase.from('posts').update(partial).eq('slug', previous.slug).select('id');
        if (error) return { error };
        if (data && data.length > 0) return {};
        return supabase.from('posts').insert(row); // the row was deleted elsewhere: re-create it
      }
      return oldSlug && oldSlug !== p.slug
        ? supabase.from('posts').update(row).eq('slug', oldSlug) // slug renamed: don't create a duplicate
        : supabase.from('posts').upsert(row, { onConflict: 'slug' });
    });

  const announce = (p: Post) =>
    notifyNewArticlePublished({
      title: p.title,
      slug: p.slug,
      featured_image: p.featured_image,
      is_breaking: p.is_breaking
    });

  // Two news must never share one slug (the second would overwrite the first)
  const uniqueSlug = (base: string, ignoreId?: string) => {
    const clean = (base || '').trim() || `news-${Date.now().toString().slice(-6)}`;
    const taken = new Set(postsRef.current.filter((p) => p.id !== ignoreId).map((p) => p.slug));
    if (!taken.has(clean)) return clean;
    let i = 2;
    while (taken.has(`${clean}-${i}`)) i++;
    return `${clean}-${i}`;
  };

  const addPost = (postData: Omit<Post, 'id' | 'views' | 'created_at' | 'updated_at'>): Post => {
    const nowIso = new Date().toISOString();
    const newPost: Post = {
      ...postData,
      slug: uniqueSlug(postData.slug),
      id: `post-${Date.now()}`,
      views: 0,
      created_at: nowIso,
      updated_at: nowIso,
      published_at: postData.status === 'published' ? postData.published_at || nowIso : null
    };
    const updated = [newPost, ...postsRef.current];
    postsRef.current = updated;
    setPosts(updated);
    persist(POSTS_KEY, updated);

    if (isPostLive(newPost)) announce(newPost);
    savePost('Post save', newPost, undefined, true);
    return newPost;
  };

  const updatePost = (id: string, fields: Partial<Post>) => {
    const previous = postsRef.current.find((p) => p.id === id);
    if (!previous) return;
    const nowIso = new Date().toISOString();
    const willPublish = fields.status === 'published' && previous.status !== 'published';
    const nextStatus = fields.status ?? previous.status;
    let publishedAt = previous.published_at;
    if (nextStatus === 'published') {
      publishedAt = fields.published_at || (previous.status === 'published' ? previous.published_at : null) || nowIso;
    } else if (fields.status) {
      publishedAt = null;
    }
    const modified: Post = {
      ...previous,
      ...fields,
      slug: fields.slug !== undefined ? uniqueSlug(fields.slug, id) : previous.slug,
      updated_at: nowIso,
      published_at: publishedAt
    };
    const updated = postsRef.current.map((p) => (p.id === id ? modified : p));
    postsRef.current = updated;
    setPosts(updated);
    persist(POSTS_KEY, updated);

    // alert readers only when a news GOES LIVE (not on every later edit)
    const becameBreaking = !!fields.is_breaking && !previous.is_breaking;
    if (isPostLive(modified) && (willPublish || becameBreaking)) {
      announce(modified);
    }
    savePost('Post update', modified, previous.slug, false, previous);
  };

  const deletePost = (id: string) => {
    const target = postsRef.current.find((p) => p.id === id);
    const updated = postsRef.current.filter((p) => p.id !== id);
    postsRef.current = updated;
    setPosts(updated);
    persist(POSTS_KEY, updated);

    if (target) {
      dbWrite('Post delete', () => supabase.from('posts').delete().eq('slug', target.slug));
    }
  };

  const changePostStatus = (id: string, status: PostStatus, approverName?: string) => {
    const previous = postsRef.current.find((p) => p.id === id);
    if (!previous) return;
    const nowIso = new Date().toISOString();
    const modified: Post = {
      ...previous,
      status,
      editor_name: approverName || previous.editor_name || currentUser.full_name,
      published_at: status === 'published' ? previous.published_at || nowIso : null,
      updated_at: nowIso
    };
    const updated = postsRef.current.map((p) => (p.id === id ? modified : p));
    postsRef.current = updated;
    setPosts(updated);
    persist(POSTS_KEY, updated);

    if (isPostLive(modified)) announce(modified);

    dbWrite('Post status', () =>
      supabase
        .from('posts')
        .update({
          status: modified.status,
          editor_name: modified.editor_name,
          published_at: modified.published_at,
          updated_at: modified.updated_at
        })
        .eq('slug', modified.slug)
    );
  };

  const incrementViews = (id: string) => {
    const target = postsRef.current.find((p) => p.id === id);
    if (!target) return;

    // count one view per article per browser session (refresh / re-open must not inflate it)
    try {
      const seen: string[] = JSON.parse(sessionStorage.getItem('np_viewed') || '[]');
      if (seen.includes(target.slug)) return;
      seen.push(target.slug);
      sessionStorage.setItem('np_viewed', JSON.stringify(seen));
    } catch {}

    const updated = postsRef.current.map((p) => (p.id === id ? { ...p, views: (p.views || 0) + 1 } : p));
    postsRef.current = updated;
    setPosts(updated);
    persist(POSTS_KEY, updated);

    // Silent background counter (no error banner, no re-sync)
    (async () => {
      try {
        const { error } = await supabase.rpc('increment_post_views', { target_slug: target.slug });
        if (error) {
          await supabase.from('posts').update({ views: (target.views || 0) + 1 }).eq('slug', target.slug);
        }
      } catch {}
    })();
  };

  // Ads (synced to Supabase public.advertisements)
  // NOTE: default ads have ids like "ad-1" (not UUIDs). The old code upserted that id
  // into a UUID column, so EVERY ad change failed silently. Now we match by slot.
  const writeAd = (adId: string) => {
    const target = adsRef.current.find((a) => a.id === adId);
    if (!target) return;
    const imageChanged = !!adImageDirtyRef.current[adId];
    dbWrite('Advertisement', async () => {
      const row: Record<string, any> = adRow(target);
      if (!imageChanged) delete row.image_url; // do not re-send a big unchanged image
      if (isUuid(target.id)) {
        return supabase.from('advertisements').update(row).eq('id', target.id);
      }
      const { data: existing, error } = await supabase
        .from('advertisements')
        .select('id')
        .eq('placement_slot', target.placement_slot)
        .limit(1)
        .maybeSingle();
      if (error) return { error };
      if (existing?.id) return supabase.from('advertisements').update(row).eq('id', existing.id);
      return supabase
        .from('advertisements')
        .insert({ ...adRow(target), views_count: target.views_count || 0, clicks_count: target.clicks_count || 0 });
    }).then((ok) => {
      if (ok) delete adImageDirtyRef.current[adId];
    });
  };

  const updateAd = (id: string, adFields: Partial<Advertisement>) => {
    if (adFields.image_url !== undefined) adImageDirtyRef.current[id] = true;
    const updated = adsRef.current.map((ad) => (ad.id === id ? { ...ad, ...adFields } : ad));
    adsRef.current = updated;
    setAds(updated);
    persist(ADS_KEY, updated);

    // Debounce: the admin form calls this on every keystroke
    if (adTimersRef.current[id]) clearTimeout(adTimersRef.current[id]);
    adTimersRef.current[id] = setTimeout(() => {
      delete adTimersRef.current[id];
      writeAd(id);
    }, 700);
  };

  const recordAdClick = (id: string) => {
    const target = adsRef.current.find((a) => a.id === id);
    const updated = adsRef.current.map((ad) => (ad.id === id ? { ...ad, clicks_count: (ad.clicks_count || 0) + 1 } : ad));
    adsRef.current = updated;
    setAds(updated);
    persist(ADS_KEY, updated);

    if (target && isUuid(target.id)) {
      (async () => {
        try {
          const { error } = await supabase.rpc('increment_ad_clicks', { target_id: target.id });
          if (error) {
            await supabase.from('advertisements').update({ clicks_count: (target.clicks_count || 0) + 1 }).eq('id', target.id);
          }
        } catch {}
      })();
    }
  };

  // Comments (synced to Supabase public.comments)
  const addComment = (postId: string, authorName: string, content: string) => {
    const newComment: Comment = {
      id: `comm-${Date.now()}`,
      post_id: postId,
      author_name: authorName,
      content,
      created_at: new Date().toISOString(),
      is_approved: !settingsRef.current.comments_need_approval
    };
    const updated = [newComment, ...comments];
    setComments(updated);
    persist(COMMENTS_KEY, updated);

    // comments.post_id is a UUID FK, so only real (DB) posts can store comments
    if (isUuid(postId)) {
      dbWrite('Comment', () =>
        supabase.from('comments').insert({ post_id: postId, author_name: authorName, content, is_approved: newComment.is_approved })
      );
    }
  };

  const updateCommentApproval = (id: string, approved: boolean) => {
    const updated = comments.map((c) => (c.id === id ? { ...c, is_approved: approved } : c));
    setComments(updated);
    persist(COMMENTS_KEY, updated);
    if (isUuid(id)) {
      dbWrite('Comment moderation', () => supabase.from('comments').update({ is_approved: approved }).eq('id', id));
    }
  };

  const deleteComment = (id: string) => {
    const updated = comments.filter((c) => c.id !== id);
    setComments(updated);
    persist(COMMENTS_KEY, updated);
    if (isUuid(id)) {
      dbWrite('Comment delete', () => supabase.from('comments').delete().eq('id', id));
    }
  };

  return (
    <NewsAppContext.Provider
      value={{
        currentUser,
        currentRole,
        authReady,
        users,
        addUser,
        updateUser,
        deleteUser,
        adminLoginModalOpen,
        setAdminLoginModalOpen,
        verifyLogin,
        changeUserPassword,
        sendPasswordReset,
        logoutStaff,
        siteSettings,
        updateSiteSettings,
        postsLoaded,
        totalVisitors,
        onlineVisitors,
        incrementTotalVisitors,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        posts: visiblePosts,
        allPosts: posts,
        addPost,
        updatePost,
        deletePost,
        changePostStatus,
        incrementViews,
        ads,
        updateAd,
        recordAdClick,
        comments,
        updateCommentApproval,
        deleteComment,
        addComment,
        isDarkMode,
        toggleDarkMode,
        currentRoute,
        navigateTo
      }}
    >
      {children}
    </NewsAppContext.Provider>
  );
};

export const useNewsApp = (): NewsAppContextType => {
  const context = useContext(NewsAppContext);
  if (!context) {
    throw new Error('useNewsApp must be used within a NewsAppProvider');
  }
  return context;
};
