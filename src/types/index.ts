export type UserRole = 'super_admin' | 'editor' | 'reporter' | 'public';

export interface UserProfile {
  id: string;
  user_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  avatar: string;
  password?: string;
  bio?: string;
  phone?: string;
}

export interface Category {
  id: string;
  name: string; // e.g. "राजनीति"
  name_en: string; // e.g. "Politics"
  slug: string; // e.g. "politics"
  order_index: number;
  description?: string;
  color?: string;
  is_active: boolean;
}

export type PostStatus = 'draft' | 'pending' | 'published' | 'rejected';

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image: string;
  image_caption?: string;
  category_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  editor_name?: string;
  status: PostStatus;
  views: number;
  is_breaking: boolean;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  read_time_mins: number;
  tags?: string[];
  audio_url?: string;
}

export type AdPlacementSlot = 
  | 'header_top'       // 728x90 Header Top Banner
  | 'below_hero'       // Below Main Breaking News / Hero Section
  | 'sidebar_top'      // 300x250 Sidebar Top Box
  | 'in_article'       // Inside Article Detail Page (Between paragraphs)
  | 'sticky_footer';   // Sticky Bottom Footer Banner

export interface Advertisement {
  id: string;
  placement_slot: AdPlacementSlot;
  title: string;
  image_url: string;
  redirect_url: string;
  script_code?: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  views_count: number;
  clicks_count: number;
  advertiser_name?: string;
}

export interface SiteSettings {
  id: string;
  site_title: string;
  tagline: string;
  subdomain: string;
  meta_description: string;
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
  watermark_url: string;
  contact_email: string;
  contact_phone: string;
  office_address: string;
  press_council_reg_no: string;
  information_dept_reg_no: string;
  editor_in_chief: string;
  facebook_url: string;
  twitter_url: string;
  youtube_url: string;
  breaking_news_ticker: string;
  is_ticker_active: boolean;
  ticker_speed?: number; // Ticker scroll speed in seconds (e.g. 85s for smooth calm reading)
  allow_comments: boolean;
  total_visitors?: number;
  online_visitors?: number;
  updated_at?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_name: string;
  content: string;
  created_at: string;
  is_approved: boolean;
}
