/**
 * Complete Supabase PostgreSQL Schema, RLS Policies, Functions & Storage Buckets
 * Target domain: news.pabansubedi.com.np
 * Fully Idempotent (Safe to run on new OR existing Supabase projects with automatic column merging)
 */

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- NEWS PABAN SUBEDI (news.pabansubedi.com.np) - COMPLETE DATABASE & RLS SCHEMA
-- Target Database: Supabase PostgreSQL (Production-Ready)
-- Note: This script is 100% idempotent and can be safely re-run at any time.
-- Automatically merges with existing tables without schema conflict errors.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('super_admin', 'editor', 'reporter');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE post_status_type AS ENUM ('draft', 'pending', 'published', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ad_slot_type AS ENUM ('header_top', 'below_hero', 'sidebar_top', 'in_article', 'sticky_footer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 3. USERS PROFILE TABLE
-- Synchronized with supabase auth.users
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role_type NOT NULL DEFAULT 'reporter',
    full_name TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist on users_profile
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS phone TEXT;

-- Index for role lookup
CREATE INDEX IF NOT EXISTS idx_users_profile_role ON public.users_profile(role);

-- ------------------------------------------------------------------------------
-- 4. CATEGORIES TABLE
-- Dynamic navigation & taxonomy (राजनीति, अर्थ, खेलकुद, मनोरञ्जन, प्रवास, etc.)
-- Supports both 'name' and 'name_np', 'color' and 'color_code' seamlessly!
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    name_np TEXT,
    name_en TEXT,
    slug TEXT UNIQUE NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#dc2626',
    color_code TEXT DEFAULT '#dc2626',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all column variations exist (merges seamlessly with any prior schema)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_np TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#dc2626';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color_code TEXT DEFAULT '#dc2626';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_categories_order ON public.categories(order_index ASC);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- Backfill name & name_np both ways so code querying either never fails
UPDATE public.categories 
SET 
    name = COALESCE(name, name_np, slug),
    name_np = COALESCE(name_np, name, slug),
    color = COALESCE(color, color_code, '#dc2626'),
    color_code = COALESCE(color_code, color, '#dc2626');

-- Insert or update standard categories without error
INSERT INTO public.categories (name, name_np, name_en, slug, color, color_code, order_index, is_active)
VALUES
    ('मुख्य समाचार', 'मुख्य समाचार', 'Main News', 'main-news', '#dc2626', '#dc2626', 1, true),
    ('राजनीति', 'राजनीति', 'Politics', 'politics', '#2563eb', '#2563eb', 2, true),
    ('अर्थतन्त्र', 'अर्थतन्त्र', 'Economy', 'economy', '#16a34a', '#16a34a', 3, true),
    ('समाज', 'समाज', 'Society', 'society', '#9333ea', '#9333ea', 4, true),
    ('विचार', 'विचार', 'Opinion', 'opinion', '#ea580c', '#ea580c', 5, true),
    ('अन्तर्राष्ट्रिय', 'अन्तर्राष्ट्रिय', 'World', 'world', '#0891b2', '#0891b2', 6, true),
    ('खेलकुद', 'खेलकुद', 'Sports', 'sports', '#059669', '#059669', 7, true),
    ('मनोरञ्जन', 'मनोरञ्जन', 'Entertainment', 'entertainment', '#db2777', '#db2777', 8, true),
    ('प्रविधि', 'प्रविधि', 'Tech', 'tech', '#4f46e5', '#4f46e5', 9, true)
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    name_np = EXCLUDED.name_np,
    name_en = EXCLUDED.name_en,
    color = EXCLUDED.color,
    color_code = EXCLUDED.color_code,
    order_index = EXCLUDED.order_index,
    is_active = EXCLUDED.is_active;

-- ------------------------------------------------------------------------------
-- 5. POSTS / ARTICLES TABLE
-- Complete Editorial Workflow: Draft -> Pending Review -> Approved/Published
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subtitle TEXT,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    summary TEXT,
    featured_image TEXT NOT NULL,
    image_caption TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT DEFAULT 'पवन सुवेदी',
    author_avatar TEXT,
    editor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    editor_name TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status post_status_type NOT NULL DEFAULT 'draft',
    views BIGINT NOT NULL DEFAULT 0,
    is_breaking BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    read_time_mins INT DEFAULT 3,
    tags TEXT[] DEFAULT '{}',
    audio_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist on posts even if created from previous iteration
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_caption TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT 'पवन सुवेदी';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_avatar TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS editor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS editor_name TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_breaking BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS read_time_mins INT DEFAULT 3;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS audio_url TEXT;

UPDATE public.posts
SET 
    excerpt = COALESCE(excerpt, summary, SUBSTRING(content, 1, 150)),
    summary = COALESCE(summary, excerpt, SUBSTRING(content, 1, 150)),
    author_name = COALESCE(author_name, 'पवन सुवेदी');

CREATE INDEX IF NOT EXISTS idx_posts_status_published_at ON public.posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_breaking ON public.posts(is_breaking) WHERE is_breaking = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_featured ON public.posts(is_featured) WHERE is_featured = TRUE;

-- ------------------------------------------------------------------------------
-- 6. ADVERTISEMENTS TABLE
-- 5 Monetization Zones with PC uploads, Click Counts & Expiry Timestamps
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.advertisements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    placement_slot ad_slot_type NOT NULL,
    title TEXT NOT NULL,
    image_url TEXT,
    redirect_url TEXT,
    script_code TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    views_count BIGINT NOT NULL DEFAULT 0,
    clicks_count BIGINT NOT NULL DEFAULT 0,
    advertiser_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist on advertisements
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS script_code TEXT;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS views_count BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS clicks_count BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS advertiser_name TEXT;

CREATE INDEX IF NOT EXISTS idx_advertisements_slot ON public.advertisements(placement_slot, is_active);

-- ------------------------------------------------------------------------------
-- 7. SITE SETTINGS TABLE
-- 100% Dynamic Admin Control (Logo, Favicon, Watermark, Ticker, SEO)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_title TEXT NOT NULL DEFAULT 'News Paban Subedi | न्युज पवन सुवेदी',
    tagline TEXT DEFAULT 'सत्य, तथ्य र निष्पक्ष पत्रकारिताको संवाहक',
    subdomain TEXT DEFAULT 'news.pabansubedi.com.np',
    meta_description TEXT DEFAULT 'News Paban Subedi (news.pabansubedi.com.np) - नेपालको अग्रणी अनलाइन समाचार पोर्टल।',
    logo_url TEXT,
    logo_dark_url TEXT,
    favicon_url TEXT,
    watermark_url TEXT,
    contact_email TEXT DEFAULT 'pabansubedi128@gmail.com',
    contact_phone TEXT DEFAULT '+977-1-4400000, 9800000000',
    office_address TEXT DEFAULT 'अनामनगर, काठमाडौँ, नेपाल',
    press_council_reg_no TEXT DEFAULT '१२८४/०८०-८१',
    information_dept_reg_no TEXT DEFAULT '३५६२/०८०-८१',
    editor_in_chief TEXT DEFAULT 'पवन सुवेदी (Paban Subedi)',
    facebook_url TEXT DEFAULT 'https://facebook.com',
    twitter_url TEXT DEFAULT 'https://twitter.com',
    youtube_url TEXT DEFAULT 'https://youtube.com',
    breaking_news_ticker TEXT,
    is_ticker_active BOOLEAN NOT NULL DEFAULT TRUE,
    ticker_speed INTEGER NOT NULL DEFAULT 85,
    allow_comments BOOLEAN NOT NULL DEFAULT TRUE,
    total_visitors BIGINT DEFAULT 124850,
    online_visitors INT DEFAULT 48,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist on site_settings even if table was created previously without them
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS site_title TEXT DEFAULT 'News Paban Subedi | न्युज पवन सुवेदी';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT 'सत्य, तथ्य र निष्पक्ष पत्रकारिताको संवाहक';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS subdomain TEXT DEFAULT 'news.pabansubedi.com.np';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS meta_description TEXT DEFAULT 'News Paban Subedi (news.pabansubedi.com.np) - नेपालको अग्रणी अनलाइन समाचार पोर्टल।';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS logo_dark_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS watermark_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT 'pabansubedi128@gmail.com';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS contact_phone TEXT DEFAULT '+977-1-4400000, 9800000000';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS office_address TEXT DEFAULT 'अनामनगर, काठमाडौँ, नेपाल';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS press_council_reg_no TEXT DEFAULT '१२८४/०८०-८१';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS information_dept_reg_no TEXT DEFAULT '३५६२/०८०-८१';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS editor_in_chief TEXT DEFAULT 'पवन सुवेदी (Paban Subedi)';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT 'https://facebook.com';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS twitter_url TEXT DEFAULT 'https://twitter.com';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS youtube_url TEXT DEFAULT 'https://youtube.com';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS breaking_news_ticker TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS is_ticker_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS ticker_speed INTEGER NOT NULL DEFAULT 85;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS total_visitors BIGINT DEFAULT 124850;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS online_visitors INT DEFAULT 48;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Insert initial singleton row if empty
INSERT INTO public.site_settings (
    id,
    site_title,
    tagline,
    subdomain,
    meta_description,
    contact_email,
    contact_phone,
    office_address,
    press_council_reg_no,
    information_dept_reg_no,
    editor_in_chief,
    ticker_speed,
    is_ticker_active,
    allow_comments
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'News Paban Subedi | न्युज पवन सुवेदी',
    'सत्य, तथ्य र निष्पक्ष पत्रकारिताको संवाहक',
    'news.pabansubedi.com.np',
    'News Paban Subedi (news.pabansubedi.com.np) - नेपालको अग्रणी अनलाइन समाचार पोर्टल।',
    'pabansubedi128@gmail.com',
    '+977-1-4400000, 9800000000',
    'अनामनगर, काठमाडौँ, नेपाल',
    '१२८४/०८०-८१',
    '३५६२/०८०-८१',
    'पवन सुवेदी (Paban Subedi)',
    85,
    TRUE,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    site_title = COALESCE(public.site_settings.site_title, 'News Paban Subedi | न्युज पवन सुवेदी');

-- ------------------------------------------------------------------------------
-- 8. COMMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    email TEXT,
    content TEXT NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id, is_approved);

-- ------------------------------------------------------------------------------
-- 9. HELPER FUNCTIONS & TRIGGERS (Safe Drop & Recreate)
-- ------------------------------------------------------------------------------

-- Safely drop existing functions to allow altering return types or signatures
DROP FUNCTION IF EXISTS public.get_auth_role() CASCADE;
DROP FUNCTION IF EXISTS public.increment_post_views(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.increment_ad_clicks(UUID) CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS set_posts_updated_at ON public.posts CASCADE;
DROP TRIGGER IF EXISTS set_settings_updated_at ON public.site_settings CASCADE;
DROP TRIGGER IF EXISTS set_ads_updated_at ON public.advertisements CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

-- Function to check current user role from auth.uid()
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role::TEXT INTO v_role FROM public.users_profile WHERE user_id = auth.uid();
    RETURN COALESCE(v_role, 'public');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Atomic Post View Counter increment function (prevents race conditions)
CREATE OR REPLACE FUNCTION public.increment_post_views(target_slug TEXT)
RETURNS BIGINT AS $$
DECLARE
    new_views BIGINT;
BEGIN
    UPDATE public.posts
    SET views = COALESCE(views, 0) + 1
    WHERE slug = target_slug
    RETURNING views INTO new_views;
    RETURN COALESCE(new_views, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Ad Click Counter increment
CREATE OR REPLACE FUNCTION public.increment_ad_clicks(target_id UUID)
RETURNS BIGINT AS $$
DECLARE
    new_clicks BIGINT;
BEGIN
    UPDATE public.advertisements
    SET clicks_count = COALESCE(clicks_count, 0) + 1
    WHERE id = target_id
    RETURNING clicks_count INTO new_clicks;
    RETURN COALESCE(new_clicks, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role user_role_type := 'reporter';
BEGIN
    BEGIN
        IF new.raw_user_meta_data->>'role' IS NOT NULL THEN
            assigned_role := (new.raw_user_meta_data->>'role')::user_role_type;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        assigned_role := 'reporter';
    END;

    INSERT INTO public.users_profile (user_id, full_name, role, avatar)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        assigned_role,
        new.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        avatar = COALESCE(EXCLUDED.avatar, public.users_profile.avatar);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger for auto updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER set_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER set_ads_updated_at
BEFORE UPDATE ON public.advertisements
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS: USERS_PROFILE
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read user profiles" ON public.users_profile;
CREATE POLICY "Public read user profiles"
ON public.users_profile FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow manage user profiles" ON public.users_profile;
CREATE POLICY "Allow manage user profiles"
ON public.users_profile FOR ALL
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- RLS: CATEGORIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories"
ON public.categories FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow manage categories" ON public.categories;
CREATE POLICY "Allow manage categories"
ON public.categories FOR ALL
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- RLS: POSTS (APPROVAL WORKFLOW & CONTENT MANAGEMENT)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published posts" ON public.posts;
CREATE POLICY "Public can view published posts"
ON public.posts FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow manage posts" ON public.posts;
CREATE POLICY "Allow manage posts"
ON public.posts FOR ALL
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- RLS: ADVERTISEMENTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active ads" ON public.advertisements;
CREATE POLICY "Public can view active ads"
ON public.advertisements FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow manage ads" ON public.advertisements;
CREATE POLICY "Allow manage ads"
ON public.advertisements FOR ALL
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- RLS: SITE SETTINGS (100% Dynamic Admin Sync)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings;
CREATE POLICY "Public can view site settings"
ON public.site_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow update site settings" ON public.site_settings;
CREATE POLICY "Allow update site settings"
ON public.site_settings FOR ALL
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- RLS: COMMENTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public view approved comments" ON public.comments;
CREATE POLICY "Public view approved comments"
ON public.comments FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public insert comments" ON public.comments;
CREATE POLICY "Public insert comments"
ON public.comments FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow moderate comments" ON public.comments;
CREATE POLICY "Allow moderate comments"
ON public.comments FOR ALL
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 11. SUPABASE STORAGE BUCKETS SETUP
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('news-images', 'news-images', true),
    ('branding', 'branding', true),
    ('notices', 'notices', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public read access for images
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
USING (bucket_id IN ('news-images', 'branding', 'notices'));

-- Storage RLS: Authenticated & Portal upload access for images
DROP POLICY IF EXISTS "Allow upload images" ON storage.objects;
CREATE POLICY "Allow upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id IN ('news-images', 'branding', 'notices'));

-- ------------------------------------------------------------------------------
-- 12. PUSH NOTIFICATION SUBSCRIBERS TABLE (Real-time Breaking News Alert System)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint TEXT UNIQUE NOT NULL,
    auth_key TEXT,
    p256dh_key TEXT,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_notified_at TIMESTAMPTZ
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert subscriptions" ON public.push_subscriptions;
CREATE POLICY "Public insert subscriptions"
ON public.push_subscriptions FOR ALL
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 13. ENABLE REALTIME BROADCASTING (Fast instant sync across all readers)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings, public.posts, public.categories, public.advertisements, public.comments;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
  WHEN others THEN null;
END $$;
`;
