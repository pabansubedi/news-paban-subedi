/**
 * Complete Supabase PostgreSQL Schema, RLS Policies, Functions & Storage Buckets
 * Target domain: news.pabansubedi.com.np
 * Fully Idempotent (Safe to run on new OR existing Supabase projects)
 */

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- NEWS PABAN SUBEDI (news.pabansubedi.com.np) - COMPLETE DATABASE & RLS SCHEMA
-- Target Database: Supabase PostgreSQL (Production-Ready)
-- Note: This script is 100% idempotent and can be safely re-run at any time.
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
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_en TEXT,
    slug TEXT UNIQUE NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#dc2626',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#dc2626';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS order_index INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_categories_order ON public.categories(order_index ASC);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- ------------------------------------------------------------------------------
-- 5. POSTS / ARTICLES TABLE
-- Complete Editorial Workflow: Draft -> Pending Review -> Approved/Published
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image TEXT NOT NULL,
    image_caption TEXT,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    editor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_caption TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS editor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_breaking BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS read_time_mins INT DEFAULT 3;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS audio_url TEXT;

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
    facebook_url TEXT,
    twitter_url TEXT,
    youtube_url TEXT,
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
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS breaking_news_ticker TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS is_ticker_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS ticker_speed INTEGER NOT NULL DEFAULT 85;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS total_visitors BIGINT DEFAULT 124850;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS online_visitors INT DEFAULT 48;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Insert initial singleton row if empty
INSERT INTO public.site_settings (id, site_title)
VALUES ('00000000-0000-0000-0000-000000000001', 'News Paban Subedi | न्युज पवन सुवेदी')
ON CONFLICT (id) DO NOTHING;

-- Populate defaults if columns were null
UPDATE public.site_settings
SET 
    site_title = COALESCE(site_title, 'News Paban Subedi | न्युज पवन सुवेदी'),
    meta_description = COALESCE(meta_description, 'News Paban Subedi (news.pabansubedi.com.np) - नेपालको अग्रणी अनलाइन समाचार पोर्टल।'),
    subdomain = COALESCE(subdomain, 'news.pabansubedi.com.np'),
    ticker_speed = COALESCE(ticker_speed, 85),
    is_ticker_active = COALESCE(is_ticker_active, TRUE),
    office_address = COALESCE(office_address, 'अनामनगर, काठमाडौँ, नेपाल'),
    contact_email = COALESCE(contact_email, 'pabansubedi128@gmail.com')
WHERE id = '00000000-0000-0000-0000-000000000001';

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
-- 9. HELPER FUNCTIONS & TRIGGERS
-- ------------------------------------------------------------------------------

-- Function to check current user role from auth.uid()
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role_type AS $$
DECLARE
    v_role user_role_type;
BEGIN
    SELECT role INTO v_role FROM public.users_profile WHERE user_id = auth.uid();
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Atomic Post View Counter increment function (prevents race conditions)
CREATE OR REPLACE FUNCTION public.increment_post_views(target_slug TEXT)
RETURNS BIGINT AS $$
DECLARE
    new_views BIGINT;
BEGIN
    UPDATE public.posts
    SET views = views + 1
    WHERE slug = target_slug
    RETURNING views INTO new_views;
    RETURN new_views;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Ad Click Counter increment
CREATE OR REPLACE FUNCTION public.increment_ad_clicks(target_id UUID)
RETURNS BIGINT AS $$
DECLARE
    new_clicks BIGINT;
BEGIN
    UPDATE public.advertisements
    SET clicks_count = clicks_count + 1
    WHERE id = target_id
    RETURNING clicks_count INTO new_clicks;
    RETURN new_clicks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users_profile (user_id, full_name, role, avatar)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        COALESCE((new.raw_user_meta_data->>'role')::user_role_type, 'reporter'),
        new.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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

DROP TRIGGER IF EXISTS set_posts_updated_at ON public.posts;
CREATE TRIGGER set_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES (Safe Drop & Recreate)
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

DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profile;
CREATE POLICY "Users can update own profile"
ON public.users_profile FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admin can update any profile" ON public.users_profile;
CREATE POLICY "Super admin can update any profile"
ON public.users_profile FOR ALL
TO authenticated
USING (public.get_auth_role() = 'super_admin');

-- ------------------------------------------------------------------------------
-- RLS: CATEGORIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories"
ON public.categories FOR SELECT
USING (is_active = true OR public.get_auth_role() IN ('super_admin', 'editor'));

DROP POLICY IF EXISTS "Admin & Editor manage categories" ON public.categories;
CREATE POLICY "Admin & Editor manage categories"
ON public.categories FOR ALL
TO authenticated
USING (public.get_auth_role() IN ('super_admin', 'editor'))
WITH CHECK (public.get_auth_role() IN ('super_admin', 'editor'));

-- ------------------------------------------------------------------------------
-- RLS: POSTS (APPROVAL WORKFLOW ENFORCEMENT)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published posts" ON public.posts;
CREATE POLICY "Public can view published posts"
ON public.posts FOR SELECT
USING (
    status = 'published'
    OR (
        auth.role() = 'authenticated' AND (
            author_id = auth.uid() OR
            public.get_auth_role() IN ('editor', 'super_admin')
        )
    )
);

DROP POLICY IF EXISTS "Reporters can insert posts" ON public.posts;
CREATE POLICY "Reporters can insert posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (
    author_id = auth.uid() AND
    (
        public.get_auth_role() = 'super_admin' OR
        (public.get_auth_role() IN ('reporter', 'editor') AND status IN ('draft', 'pending'))
    )
);

DROP POLICY IF EXISTS "Reporters can update own drafts" ON public.posts;
CREATE POLICY "Reporters can update own drafts"
ON public.posts FOR UPDATE
TO authenticated
USING (
    author_id = auth.uid() AND
    (status IN ('draft', 'pending') OR public.get_auth_role() IN ('editor', 'super_admin'))
)
WITH CHECK (
    (public.get_auth_role() = 'super_admin') OR
    (public.get_auth_role() = 'editor' AND status IN ('draft', 'pending', 'published')) OR
    (public.get_auth_role() = 'reporter' AND status IN ('draft', 'pending'))
);

DROP POLICY IF EXISTS "Super Admin manage all posts" ON public.posts;
CREATE POLICY "Super Admin manage all posts"
ON public.posts FOR DELETE
TO authenticated
USING (public.get_auth_role() = 'super_admin');

-- ------------------------------------------------------------------------------
-- RLS: ADVERTISEMENTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active ads" ON public.advertisements;
CREATE POLICY "Public can view active ads"
ON public.advertisements FOR SELECT
USING (is_active = true OR public.get_auth_role() = 'super_admin');

DROP POLICY IF EXISTS "Super Admin manage ads" ON public.advertisements;
CREATE POLICY "Super Admin manage ads"
ON public.advertisements FOR ALL
TO authenticated
USING (public.get_auth_role() = 'super_admin')
WITH CHECK (public.get_auth_role() = 'super_admin');

-- ------------------------------------------------------------------------------
-- RLS: SITE SETTINGS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings;
CREATE POLICY "Public can view site settings"
ON public.site_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Super Admin update site settings" ON public.site_settings;
CREATE POLICY "Super Admin update site settings"
ON public.site_settings FOR ALL
TO authenticated
USING (public.get_auth_role() = 'super_admin')
WITH CHECK (public.get_auth_role() = 'super_admin');

-- ------------------------------------------------------------------------------
-- RLS: COMMENTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public view approved comments" ON public.comments;
CREATE POLICY "Public view approved comments"
ON public.comments FOR SELECT
USING (is_approved = true OR public.get_auth_role() IN ('super_admin', 'editor'));

DROP POLICY IF EXISTS "Public insert comments" ON public.comments;
CREATE POLICY "Public insert comments"
ON public.comments FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin & Editor moderate comments" ON public.comments;
CREATE POLICY "Admin & Editor moderate comments"
ON public.comments FOR ALL
TO authenticated
USING (public.get_auth_role() IN ('super_admin', 'editor'));

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

-- Storage RLS: Authenticated users can upload images
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('news-images', 'branding', 'notices'));
`;
