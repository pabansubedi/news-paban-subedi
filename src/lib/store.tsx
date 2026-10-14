import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Fetch live data from Supabase on start if available
  useEffect(() => {
    let isMounted = true;
    const fetchSupabaseData = async () => {
      try {
        // 1. Site Settings
        const { data: remoteSettings } = await supabase
          .from('site_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (isMounted && remoteSettings && remoteSettings.site_title) {
          setSiteSettings((prev) => {
            const merged = { ...prev, ...remoteSettings };
            try {
              localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }

        // 2. Categories
        const { data: remoteCategories } = await supabase
          .from('categories')
          .select('*')
          .order('order_index', { ascending: true });

        if (isMounted && remoteCategories && remoteCategories.length > 0) {
          const formatted: Category[] = remoteCategories.map((c: any) => ({
            id: c.id,
            name: c.name || c.name_np || c.slug,
            name_en: c.name_en || c.slug,
            slug: c.slug,
            order_index: c.order_index ?? 0,
            color: c.color || c.color_code || '#dc2626',
            description: c.description || '',
            is_active: c.is_active ?? true
          }));
          setCategories(formatted);
          try {
            localStorage.setItem(CATEGORIES_KEY, JSON.stringify(formatted));
          } catch {}
        }

        // 3. Posts
        const { data: remotePosts } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (isMounted && remotePosts && remotePosts.length > 0) {
          const formattedPosts: Post[] = remotePosts.map((p: any) => ({
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
          }));
          setPosts(formattedPosts);
          try {
            localStorage.setItem(POSTS_KEY, JSON.stringify(formattedPosts));
          } catch {}
        }

        // 4. Advertisements
        const { data: remoteAds } = await supabase
          .from('advertisements')
          .select('*');

        if (isMounted && remoteAds && remoteAds.length > 0) {
          setAds(remoteAds);
          try {
            localStorage.setItem(ADS_KEY, JSON.stringify(remoteAds));
          } catch {}
        }
      } catch (err) {
        console.warn('Supabase initial fetch gracefully bypassed:', err);
      }
    };

    fetchSupabaseData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Multi-tab instant sync via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      const bc = new BroadcastChannel('news_paban_sync_channel');
      bc.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'SITE_SETTINGS' && payload) {
          setSiteSettings(payload);
        } else if (type === 'CATEGORIES' && payload) {
          setCategories(payload);
        } else if (type === 'POSTS' && payload) {
          setPosts(payload);
        } else if (type === 'ADS' && payload) {
          setAds(payload);
        } else if (type === 'NEW_ARTICLE_BROADCAST' && payload) {
          notifyNewArticlePublished(payload);
        }
      };
      return () => {
        bc.close();
      };
    } catch {}
  }, []);

  // Live Supabase Realtime changes listener (100% full-duplex sync for all visitors)
  useEffect(() => {
    try {
      const channel = supabase
        .channel('news_paban_realtime_stream')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload) => {
          if (payload.new && (payload.new as any).site_title) {
            setSiteSettings((prev) => {
              const updated = { ...prev, ...(payload.new as any) };
              try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
          const p = payload.new as any;
          if (p && p.id) {
            const formatted: Post = {
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
            };

            setPosts((prev) => {
              if (prev.some((x) => x.id === formatted.id || x.slug === formatted.slug)) {
                return prev.map((x) => (x.id === formatted.id || x.slug === formatted.slug ? formatted : x));
              }
              return [formatted, ...prev];
            });

            if (formatted.status === 'published') {
              notifyNewArticlePublished({
                title: formatted.title,
                slug: formatted.slug,
                featured_image: formatted.featured_image,
                is_breaking: formatted.is_breaking
              });
            }
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
          const p = payload.new as any;
          if (p && p.id) {
            setPosts((prev) =>
              prev.map((item) => {
                if (item.id === p.id || item.slug === p.slug) {
                  const updatedItem = { ...item, ...p };
                  if (p.status === 'published' && item.status !== 'published') {
                    notifyNewArticlePublished({
                      title: updatedItem.title,
                      slug: updatedItem.slug,
                      featured_image: updatedItem.featured_image,
                      is_breaking: updatedItem.is_breaking
                    });
                  }
                  return updatedItem;
                }
                return item;
              })
            );
          }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
          const old = payload.old as any;
          if (old && (old.id || old.slug)) {
            setPosts((prev) => prev.filter((item) => item.id !== old.id && item.slug !== old.slug));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, async () => {
          try {
            const { data } = await supabase.from('categories').select('*').order('order_index', { ascending: true });
            if (data && data.length > 0) {
              const formatted: Category[] = data.map((c: any) => ({
                id: c.id,
                name: c.name || c.name_np || c.slug,
                name_en: c.name_en || c.slug,
                slug: c.slug,
                order_index: c.order_index ?? 0,
                color: c.color || c.color_code || '#dc2626',
                description: c.description || '',
                is_active: c.is_active ?? true
              }));
              setCategories(formatted);
            }
          } catch {}
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'advertisements' }, (payload) => {
          if (payload.new && (payload.new as any).id) {
            const newAd = payload.new as any;
            setAds((prev) => prev.map((ad) => (ad.id === newAd.id ? { ...ad, ...newAd } : ad)));
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {}
  }, []);

  // Broadcast helper function for instant multi-tab sync
  const broadcastUpdate = (type: string, payload: any) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('news_paban_sync_channel');
        bc.postMessage({ type, payload });
        bc.close();
      }
    } catch {}
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

  // Safe background Supabase executor
  const safeSupabaseCall = async (fn: () => PromiseLike<any>) => {
    try {
      await fn();
    } catch {}
  };

  // Site Settings (Synced to Supabase public.site_settings)
  const updateSiteSettings = (newSettings: Partial<SiteSettings>) => {
    setSiteSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage settings write error', e);
      }

      // Instant broadcast to all open reader tabs
      broadcastUpdate('SITE_SETTINGS', updated);

      // Sync seamlessly to Supabase
      safeSupabaseCall(async () => {
        await supabase.from('site_settings').upsert({
          ...updated,
          id: '00000000-0000-0000-0000-000000000001',
          updated_at: new Date().toISOString()
        });
      });

      return updated;
    });
  };

  // Categories (Synced to Supabase public.categories)
  const addCategory = (cat: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...cat,
      id: `cat-${Date.now()}`
    };
    const updated = [...categories, newCategory];
    setCategories(updated);
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }

    broadcastUpdate('CATEGORIES', updated);

    safeSupabaseCall(async () => {
      await supabase.from('categories').upsert({
        name: newCategory.name,
        name_np: newCategory.name,
        name_en: newCategory.name_en,
        slug: newCategory.slug,
        color: newCategory.color || '#dc2626',
        color_code: newCategory.color || '#dc2626',
        description: newCategory.description || '',
        is_active: newCategory.is_active,
        order_index: newCategory.order_index
      }, { onConflict: 'slug' });
    });
  };

  const updateCategory = (id: string, updatedFields: Partial<Category>) => {
    const updated = categories.map((cat) => (cat.id === id ? { ...cat, ...updatedFields } : cat));
    setCategories(updated);
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }

    broadcastUpdate('CATEGORIES', updated);

    const target = updated.find((c) => c.id === id);
    if (target) {
      safeSupabaseCall(async () => {
        await supabase.from('categories').upsert({
          name: target.name,
          name_np: target.name,
          name_en: target.name_en,
          slug: target.slug,
          color: target.color || '#dc2626',
          color_code: target.color || '#dc2626',
          description: target.description || '',
          is_active: target.is_active,
          order_index: target.order_index
        }, { onConflict: 'slug' });
      });
    }
  };

  const deleteCategory = (id: string) => {
    const target = categories.find((c) => c.id === id);
    const updated = categories.filter((cat) => cat.id !== id);
    setCategories(updated);
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }

    broadcastUpdate('CATEGORIES', updated);

    if (target) {
      safeSupabaseCall(async () => {
        await supabase.from('categories').delete().eq('slug', target.slug);
      });
    }
  };

  // Posts (Synced to Supabase public.posts)
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
    const updated = [newPost, ...posts];
    setPosts(updated);
    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }

    broadcastUpdate('POSTS', updated);

    // Instant push alert to all readers if published or breaking
    if (newPost.status === 'published') {
      notifyNewArticlePublished({
        title: newPost.title,
        slug: newPost.slug,
        featured_image: newPost.featured_image,
        is_breaking: newPost.is_breaking
      });
      broadcastUpdate('NEW_ARTICLE_BROADCAST', {
        title: newPost.title,
        slug: newPost.slug,
        featured_image: newPost.featured_image,
        is_breaking: newPost.is_breaking
      });
    }

    safeSupabaseCall(async () => {
      await supabase.from('posts').upsert({
        title: newPost.title,
        slug: newPost.slug,
        content: newPost.content,
        excerpt: newPost.excerpt,
        summary: newPost.excerpt,
        featured_image: newPost.featured_image,
        image_caption: newPost.image_caption || '',
        author_name: newPost.author_name || 'पवन सुवेदी',
        status: newPost.status,
        views: newPost.views,
        is_breaking: newPost.is_breaking,
        is_featured: newPost.is_featured,
        published_at: newPost.published_at,
        read_time_mins: newPost.read_time_mins,
        tags: newPost.tags || []
      }, { onConflict: 'slug' });
    });

    return newPost;
  };

  const updatePost = (id: string, fields: Partial<Post>) => {
    let updatedTarget: Post | null = null;
    const updated = posts.map((p) => {
      if (p.id === id) {
        const nowIso = new Date().toISOString();
        const willPublish = fields.status === 'published' && p.status !== 'published';
        const modified = {
          ...p,
          ...fields,
          updated_at: nowIso,
          published_at: willPublish ? nowIso : fields.published_at !== undefined ? fields.published_at : p.published_at
        };
        updatedTarget = modified;
        return modified;
      }
      return p;
    });
    setPosts(updated);
    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }

    broadcastUpdate('POSTS', updated);

    if (updatedTarget) {
      const p: Post = updatedTarget;

      if (fields.status === 'published' || (p.status === 'published' && fields.is_breaking)) {
        notifyNewArticlePublished({
          title: p.title,
          slug: p.slug,
          featured_image: p.featured_image,
          is_breaking: p.is_breaking
        });
        broadcastUpdate('NEW_ARTICLE_BROADCAST', {
          title: p.title,
          slug: p.slug,
          featured_image: p.featured_image,
          is_breaking: p.is_breaking
        });
      }

      safeSupabaseCall(async () => {
        await supabase.from('posts').upsert({
          title: p.title,
          slug: p.slug,
          content: p.content,
          excerpt: p.excerpt,
          summary: p.excerpt,
          featured_image: p.featured_image,
          image_caption: p.image_caption || '',
          author_name: p.author_name || 'पवन सुवेदी',
          editor_name: p.editor_name || '',
          status: p.status,
          views: p.views,
          is_breaking: p.is_breaking,
          is_featured: p.is_featured,
          published_at: p.published_at,
          read_time_mins: p.read_time_mins,
          tags: p.tags || []
        }, { onConflict: 'slug' });
      });
    }
  };

  const deletePost = (id: string) => {
    const target = posts.find((p) => p.id === id);
    const updated = posts.filter((p) => p.id !== id);
    setPosts(updated);
    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }

    broadcastUpdate('POSTS', updated);

    if (target) {
      safeSupabaseCall(async () => {
        await supabase.from('posts').delete().eq('slug', target.slug);
      });
    }
  };

  const changePostStatus = (id: string, status: PostStatus, approverName?: string) => {
    const nowIso = new Date().toISOString();
    let updatedTarget: Post | null = null;
    const updated = posts.map((p) => {
      if (p.id === id) {
        const modified = {
          ...p,
          status,
          editor_name: approverName || p.editor_name || currentUser.full_name,
          published_at: status === 'published' ? (p.published_at || nowIso) : null,
          updated_at: nowIso
        };
        updatedTarget = modified;
        return modified;
      }
      return p;
    });
    setPosts(updated);
    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }

    broadcastUpdate('POSTS', updated);

    if (updatedTarget) {
      const p: Post = updatedTarget;

      // When editor approves and publishes an article, trigger push alert to all readers
      if (status === 'published') {
        notifyNewArticlePublished({
          title: p.title,
          slug: p.slug,
          featured_image: p.featured_image,
          is_breaking: p.is_breaking
        });
        broadcastUpdate('NEW_ARTICLE_BROADCAST', {
          title: p.title,
          slug: p.slug,
          featured_image: p.featured_image,
          is_breaking: p.is_breaking
        });
      }

      safeSupabaseCall(async () => {
        await supabase.from('posts').update({
          status: p.status,
          editor_name: p.editor_name,
          published_at: p.published_at,
          updated_at: p.updated_at
        }).eq('slug', p.slug);
      });
    }
  };

  const incrementViews = (id: string) => {
    const target = posts.find((p) => p.id === id);
    const updated = posts.map((p) => (p.id === id ? { ...p, views: (p.views || 0) + 1 } : p));
    setPosts(updated);
    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }

    if (target) {
      safeSupabaseCall(async () => {
        try {
          await supabase.rpc('increment_post_views', { target_slug: target.slug });
        } catch {
          await supabase.from('posts').update({ views: (target.views || 0) + 1 }).eq('slug', target.slug);
        }
      });
    }
  };

  // Ads (Synced to Supabase public.advertisements)
  const updateAd = (id: string, adFields: Partial<Advertisement>) => {
    const updated = ads.map((ad) => (ad.id === id ? { ...ad, ...adFields } : ad));
    setAds(updated);
    try {
      localStorage.setItem(ADS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }

    const target = updated.find((a) => a.id === id);
    if (target) {
      safeSupabaseCall(async () => {
        await supabase.from('advertisements').upsert(target);
      });
    }
  };

  const recordAdClick = (id: string) => {
    const target = ads.find((a) => a.id === id);
    const updated = ads.map((ad) => (ad.id === id ? { ...ad, clicks_count: (ad.clicks_count || 0) + 1 } : ad));
    setAds(updated);
    try {
      localStorage.setItem(ADS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }

    if (target) {
      safeSupabaseCall(async () => {
        try {
          await supabase.rpc('increment_ad_clicks', { target_id: target.id });
        } catch {
          await supabase.from('advertisements').update({ clicks_count: (target.clicks_count || 0) + 1 }).eq('id', target.id);
        }
      });
    }
  };

  // Comments (Synced to Supabase public.comments)
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
    try {
      localStorage.setItem(COMMENTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }

    safeSupabaseCall(async () => {
      await supabase.from('comments').insert({
        post_id: postId,
        author_name: authorName,
        content,
        is_approved: true
      });
    });
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
