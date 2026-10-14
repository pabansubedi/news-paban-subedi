import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_POSTS,
  INITIAL_ADS,
  INITIAL_SITE_SETTINGS,
  INITIAL_COMMENTS
} from './defaultData';
import { supabase } from './supabase';
import { notifyNewArticlePublished } from './notificationService';

interface NewsAppContextType {
  // Current user & role (Strictly confidential; defaults to 'public' for portal visitors)
  currentUser: UserProfile;
  currentRole: UserRole;
  users: UserProfile[];
  addUser: (user: Omit<UserProfile, 'id'>) => void;
  updateUser: (id: string, user: Partial<UserProfile>) => void;
  deleteUser: (id: string) => void;
  switchRole: (role: UserRole) => void;
  adminLoginModalOpen: boolean;
  setAdminLoginModalOpen: (open: boolean) => void;
  verifyLogin: (email: string, password: string) => { success: boolean; error?: string; user?: UserProfile };
  changeUserPassword: (userId: string, newPassword: string) => void;
  loginAs: (role: UserRole, email?: string, name?: string) => void;
  logoutStaff: () => void;

  // Data
  siteSettings: SiteSettings;
  updateSiteSettings: (settings: Partial<SiteSettings>) => void;
  totalVisitors: number;
  onlineVisitors: number;
  incrementTotalVisitors: () => void;

  categories: Category[];
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, cat: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  posts: Post[];
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

  // Theme & Navigation
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  currentRoute: { page: 'home' | 'article' | 'category' | 'admin' | 'docs'; param?: string };
  navigateTo: (page: 'home' | 'article' | 'category' | 'admin' | 'docs', param?: string) => void;
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

const GUEST_USER: UserProfile = {
  id: 'guest-public',
  user_id: 'guest',
  role: 'public',
  full_name: 'साधारण पाठक (Visitor)',
  email: '',
  avatar: ''
};

export const NewsAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Persistence keys
  const SETTINGS_KEY = 'nepal_news_settings_v2';
  const POSTS_KEY = 'nepal_news_posts_v2';
  const CATEGORIES_KEY = 'nepal_news_categories_v2';
  const ADS_KEY = 'nepal_news_ads_v2';
  const COMMENTS_KEY = 'nepal_news_comments_v2';
  const AUTH_SESSION_KEY = 'nepal_news_auth_session_v2';
  const USERS_KEY = 'nepal_news_users_v2';

  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_KEY);
      if (saved) {
        const parsed: UserProfile[] = JSON.parse(saved);
        // Ensure initial accounts and all staff have a default secure password if not set
        const migrated = parsed.map((u) => {
          if (!u.password) {
            if (u.email.toLowerCase() === 'pabansubedi128@gmail.com' || u.role === 'super_admin') {
              return { ...u, password: 'paban@admin2026' };
            }
            if (u.role === 'editor') {
              return { ...u, password: 'editor@2026' };
            }
            return { ...u, password: 'reporter@2026' };
          }
          return u;
        });

        const hasPaban = migrated.some((u) => u.email.toLowerCase() === 'pabansubedi128@gmail.com');
        if (!hasPaban) {
          migrated.unshift(INITIAL_USERS[0]);
        }
        return migrated;
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const addUser = (newUser: Omit<UserProfile, 'id'>) => {
    const item: UserProfile = {
      ...newUser,
      id: `user-${Date.now()}`
    };
    const updated = [...users, item];
    setUsers(updated);
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  };

  const updateUser = (id: string, userFields: Partial<UserProfile>) => {
    const updated = users.map((u) => (u.id === id ? { ...u, ...userFields } : u));
    setUsers(updated);
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  };

  const deleteUser = (id: string) => {
    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  };

  // Role: STRICTLY default to 'public' for any site visitor!
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const savedAuth = localStorage.getItem(AUTH_SESSION_KEY);
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        return parsed.role || 'public';
      }
      return 'public';
    } catch {
      return 'public';
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const savedAuth = localStorage.getItem(AUTH_SESSION_KEY);
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        return parsed.user || GUEST_USER;
      }
      return GUEST_USER;
    } catch {
      return GUEST_USER;
    }
  });

  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState(false);

  // Total visitors & realistic dynamic live reader count
  const [totalVisitors, setTotalVisitors] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nepal_news_total_visitors_v2');
      return saved ? parseInt(saved, 10) : 148620;
    } catch {
      return 148620;
    }
  });
  const [onlineVisitors, setOnlineVisitors] = useState<number>(() => 46 + Math.floor(Math.random() * 12));

  // Realistic gentle online reader oscillation (every 14 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineVisitors((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, 1, 2
        const updated = prev + delta;
        return updated < 36 ? 39 : updated > 86 ? 78 : updated;
      });
    }, 14000);
    return () => clearInterval(interval);
  }, []);

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
      return saved ? JSON.parse(saved) : INITIAL_POSTS;
    } catch {
      return INITIAL_POSTS;
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
      return saved ? JSON.parse(saved) : INITIAL_COMMENTS;
    } catch {
      return INITIAL_COMMENTS;
    }
  });

  // Navigation route
  const [currentRoute, setCurrentRoute] = useState<{
    page: 'home' | 'article' | 'category' | 'admin' | 'docs';
    param?: string;
  }>({ page: 'home' });

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

  // Track visitor counts
  useEffect(() => {
    try {
      const current = totalVisitors + 1;
      setTotalVisitors(current);
      localStorage.setItem('nepal_news_total_visitors_v2', current.toString());
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // SUPABASE = SINGLE SOURCE OF TRUTH
  // Every browser reads the same data from Supabase (on load, on focus, every
  // 15s, and instantly via Realtime). LocalStorage is only a fast first-paint cache.
  // ---------------------------------------------------------------------------
  const postsRef = useRef<Post[]>(posts);
  postsRef.current = posts;
  const categoriesRef = useRef<Category[]>(categories);
  categoriesRef.current = categories;
  const adsRef = useRef<Advertisement[]>(ads);
  adsRef.current = ads;
  const settingsRef = useRef<SiteSettings>(siteSettings);
  settingsRef.current = siteSettings;

  const inflightRef = useRef(0); // DB writes in progress
  const adTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
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
        const [s, c, p, a, cm] = await Promise.all([
          supabase.from('site_settings').select('*').limit(1).maybeSingle(),
          supabase.from('categories').select('*').order('order_index', { ascending: true }),
          supabase.from('posts').select('*').order('created_at', { ascending: false }),
          supabase.from('advertisements').select('*'),
          supabase.from('comments').select('*').order('created_at', { ascending: false })
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
        } else if (p.error) console.warn('posts fetch failed:', p.error.message);

        if (!a.error && a.data) {
          const merged = mergeAds(a.data);
          setAds(merged);
          persist(ADS_KEY, merged);
        } else if (a.error) console.warn('advertisements fetch failed:', a.error.message);

        if (!cm.error && cm.data && cm.data.length > 0) {
          const formatted = cm.data.map(mapComment);
          setComments(formatted);
          persist(COMMENTS_KEY, formatted);
        }
      } while (pendingSyncRef.current);
    } catch (err) {
      console.warn('Supabase sync failed:', err);
    } finally {
      syncingRef.current = false;
    }
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
    const poll = setInterval(onVisible, 15000);
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
    const updated = totalVisitors + 1;
    setTotalVisitors(updated);
    try {
      localStorage.setItem('nepal_news_total_visitors_v2', updated.toString());
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  };

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const navigateTo = (page: 'home' | 'article' | 'category' | 'admin' | 'docs', param?: string) => {
    setCurrentRoute({ page, param });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Strict Staff Login Verification
  const verifyLogin = (emailInput: string, passwordInput: string): { success: boolean; error?: string; user?: UserProfile } => {
    const email = emailInput.trim().toLowerCase();
    const pass = passwordInput.trim();

    if (!email) {
      return { success: false, error: 'कृपया इमेल ठेगाना प्रविष्ट गर्नुहोस्।' };
    }
    if (!pass) {
      return { success: false, error: 'कृपया पासवर्ड प्रविष्ट गर्नुहोस्।' };
    }

    const matchedUser = users.find((u) => u.email.trim().toLowerCase() === email);

    if (!matchedUser) {
      return {
        success: false,
        error: `"${email}" इमेल प्रणालीमा दर्ता भएको छैन। कृपया सही आधिकारिक इमेल राख्नुहोस्।`
      };
    }

    // Determine expected password for this account
    const userPass = matchedUser.password || (matchedUser.role === 'super_admin' ? 'paban@admin2026' : matchedUser.role === 'editor' ? 'editor@2026' : 'reporter@2026');
    const isMasterAdminPass = matchedUser.role === 'super_admin' && (pass === 'paban@admin2026' || pass === 'paban123');

    if (pass !== userPass && !isMasterAdminPass) {
      return {
        success: false,
        error: 'पासवर्ड मिलेन! कृपया सही पासवर्ड प्रविष्ट गर्नुहोस्।'
      };
    }

    // Successful authentication
    setCurrentRole(matchedUser.role);
    setCurrentUser(matchedUser);
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ role: matchedUser.role, user: matchedUser }));
    } catch (e) {
      console.warn('LocalStorage auth write error', e);
    }

    return { success: true, user: matchedUser };
  };

  const changeUserPassword = (userId: string, newPassword: string) => {
    if (!newPassword || newPassword.trim().length < 4) return;
    updateUser(userId, { password: newPassword.trim() });
    if (currentUser.id === userId) {
      const updatedUser = { ...currentUser, password: newPassword.trim() };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ role: currentRole, user: updatedUser }));
      } catch (e) {
        console.warn('LocalStorage auth update error', e);
      }
    }
  };

  const loginAs = (role: UserRole, email?: string, name?: string) => {
    const matched = users.find((u) => (email && u.email.toLowerCase() === email.toLowerCase()) || u.role === role) || {
      id: `user-${role}-custom`,
      user_id: `usr_${role}`,
      role,
      full_name: name || (role === 'super_admin' ? 'पवन सुवेदी (Paban Subedi)' : role === 'editor' ? 'सम्पादक (Editor)' : 'संवाददाता (Reporter)'),
      email: email || `${role}@pabansubedi.com.np`,
      password: role === 'super_admin' ? 'paban@admin2026' : role === 'editor' ? 'editor@2026' : 'reporter@2026',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    };
    setCurrentRole(role);
    setCurrentUser(matched);
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ role, user: matched }));
    } catch (e) {
      console.warn('LocalStorage auth write error', e);
    }
  };

  const logoutStaff = () => {
    setCurrentRole('public');
    setCurrentUser(GUEST_USER);
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
    } catch (e) {
      console.warn('LocalStorage auth clear error', e);
    }
    if (currentRoute.page === 'admin') {
      navigateTo('home');
    }
  };

  const switchRole = (role: UserRole) => {
    if (role === 'public') {
      logoutStaff();
    } else {
      loginAs(role);
    }
  };

  // Site Settings (synced to Supabase public.site_settings)
  const updateSiteSettings = (newSettings: Partial<SiteSettings>) => {
    const updated = { ...settingsRef.current, ...newSettings };
    settingsRef.current = updated;
    setSiteSettings(updated);
    persist(SETTINGS_KEY, updated);

    dbWrite('Site settings', () =>
      supabase.from('site_settings').upsert({
        ...settingsRow(updated),
        id: '00000000-0000-0000-0000-000000000001',
        updated_at: new Date().toISOString()
      })
    );
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

  const savePost = (label: string, p: Post, oldSlug?: string) =>
    dbWrite(label, async () => {
      const row = await postRow(p);
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

  const addPost = (postData: Omit<Post, 'id' | 'views' | 'created_at' | 'updated_at'>): Post => {
    const nowIso = new Date().toISOString();
    const newPost: Post = {
      ...postData,
      id: `post-${Date.now()}`,
      views: 0,
      created_at: nowIso,
      updated_at: nowIso,
      published_at: postData.status === 'published' ? nowIso : null
    };
    const updated = [newPost, ...postsRef.current];
    postsRef.current = updated;
    setPosts(updated);
    persist(POSTS_KEY, updated);

    if (newPost.status === 'published') announce(newPost);
    savePost('Post save', newPost);
    return newPost;
  };

  const updatePost = (id: string, fields: Partial<Post>) => {
    const previous = postsRef.current.find((p) => p.id === id);
    if (!previous) return;
    const nowIso = new Date().toISOString();
    const willPublish = fields.status === 'published' && previous.status !== 'published';
    const modified: Post = {
      ...previous,
      ...fields,
      updated_at: nowIso,
      published_at: willPublish ? nowIso : fields.published_at !== undefined ? fields.published_at : previous.published_at
    };
    const updated = postsRef.current.map((p) => (p.id === id ? modified : p));
    postsRef.current = updated;
    setPosts(updated);
    persist(POSTS_KEY, updated);

    if (fields.status === 'published' || (modified.status === 'published' && fields.is_breaking)) {
      announce(modified);
    }
    savePost('Post update', modified, previous.slug);
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

    if (status === 'published') announce(modified);

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
    dbWrite('Advertisement', async () => {
      const row = adRow(target);
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
        .insert({ ...row, views_count: target.views_count || 0, clicks_count: target.clicks_count || 0 });
    });
  };

  const updateAd = (id: string, adFields: Partial<Advertisement>) => {
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
      is_approved: true
    };
    const updated = [newComment, ...comments];
    setComments(updated);
    persist(COMMENTS_KEY, updated);

    // comments.post_id is a UUID FK, so only real (DB) posts can store comments
    if (isUuid(postId)) {
      dbWrite('Comment', () =>
        supabase.from('comments').insert({ post_id: postId, author_name: authorName, content, is_approved: true })
      );
    }
  };

  return (
    <NewsAppContext.Provider
      value={{
        currentUser,
        currentRole,
        users,
        addUser,
        updateUser,
        deleteUser,
        switchRole,
        adminLoginModalOpen,
        setAdminLoginModalOpen,
        verifyLogin,
        changeUserPassword,
        loginAs,
        logoutStaff,
        siteSettings,
        updateSiteSettings,
        totalVisitors,
        onlineVisitors,
        incrementTotalVisitors,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        posts,
        addPost,
        updatePost,
        deletePost,
        changePostStatus,
        incrementViews,
        ads,
        updateAd,
        recordAdClick,
        comments,
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
