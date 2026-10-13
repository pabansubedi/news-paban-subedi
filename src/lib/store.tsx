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
      return saved ? JSON.parse(saved) : INITIAL_USERS;
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

  // Total visitors & live count
  const [totalVisitors, setTotalVisitors] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nepal_news_total_visitors_v2');
      return saved ? parseInt(saved, 10) : 124850;
    } catch {
      return 124850;
    }
  });
  const [onlineVisitors] = useState<number>(() => 42 + Math.floor(Math.random() * 15));

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

  // Staff Login (strictly handled internally, never leaking demo passwords)
  const loginAs = (role: UserRole, email?: string, name?: string) => {
    const matched = users.find((u) => (email && u.email.toLowerCase() === email.toLowerCase()) || u.role === role) || {
      id: `user-${role}-custom`,
      user_id: `usr_${role}`,
      role,
      full_name: name || (role === 'super_admin' ? 'पवन सुवेदी (Paban Subedi)' : role === 'editor' ? 'सम्पादक (Editor)' : 'संवाददाता (Reporter)'),
      email: email || `${role}@pabansubedi.com.np`,
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

  // Site Settings
  const updateSiteSettings = (newSettings: Partial<SiteSettings>) => {
    setSiteSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage settings write error', e);
      }
      return updated;
    });
  };

  // Categories
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
  };

  const updateCategory = (id: string, updatedFields: Partial<Category>) => {
    const updated = categories.map((cat) => (cat.id === id ? { ...cat, ...updatedFields } : cat));
    setCategories(updated);
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }
  };

  const deleteCategory = (id: string) => {
    const updated = categories.filter((cat) => cat.id !== id);
    setCategories(updated);
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }
  };

  // Posts
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
    return newPost;
  };

  const updatePost = (id: string, fields: Partial<Post>) => {
    const updated = posts.map((p) => {
      if (p.id === id) {
        const nowIso = new Date().toISOString();
        const willPublish = fields.status === 'published' && p.status !== 'published';
        return {
          ...p,
          ...fields,
          updated_at: nowIso,
          published_at: willPublish ? nowIso : fields.published_at !== undefined ? fields.published_at : p.published_at
        };
      }
      return p;
    });
    setPosts(updated);
    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }
  };

  const deletePost = (id: string) => {
    const updated = posts.filter((p) => p.id !== id);
    setPosts(updated);
    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }
  };

  const changePostStatus = (id: string, status: PostStatus, approverName?: string) => {
    const nowIso = new Date().toISOString();
    const updated = posts.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          status,
          editor_name: approverName || p.editor_name || currentUser.full_name,
          published_at: status === 'published' ? (p.published_at || nowIso) : null,
          updated_at: nowIso
        };
      }
      return p;
    });
    setPosts(updated);
    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }
  };

  const incrementViews = (id: string) => {
    const updated = posts.map((p) => (p.id === id ? { ...p, views: (p.views || 0) + 1 } : p));
    setPosts(updated);
    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }
  };

  // Ads
  const updateAd = (id: string, adFields: Partial<Advertisement>) => {
    const updated = ads.map((ad) => (ad.id === id ? { ...ad, ...adFields } : ad));
    setAds(updated);
    try {
      localStorage.setItem(ADS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }
  };

  const recordAdClick = (id: string) => {
    const updated = ads.map((ad) => (ad.id === id ? { ...ad, clicks_count: (ad.clicks_count || 0) + 1 } : ad));
    setAds(updated);
    try {
      localStorage.setItem(ADS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }
  };

  // Comments
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
