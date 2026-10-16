-- ==============================================================================
-- NEWS PABAN SUBEDI - STAFF LOGIN (Supabase Auth) + SECURITY   (safe to re-run)
-- Run in Supabase -> SQL Editor.  Needs the base tables from the first schema.
-- ORDER:  1) Authentication -> Users -> Add user  (your e-mail + a NEW strong password,
--            tick "Auto Confirm User")
--         2) put THAT e-mail in section 7 at the bottom of this script (replace YOUR_ADMIN_EMAIL)
--         3) run this whole script
-- ==============================================================================

-- ---------- 1. COLUMNS / TABLES ----------
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.posts ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.posts ALTER COLUMN editor_id DROP NOT NULL;
ALTER TABLE public.posts ALTER COLUMN approved_by DROP NOT NULL;
ALTER TABLE public.posts ALTER COLUMN category_id DROP NOT NULL;

-- Real visitor counter (separate table so counting does NOT trigger realtime refreshes)
CREATE TABLE IF NOT EXISTS public.site_stats (
    id INT PRIMARY KEY DEFAULT 1,
    total_visitors BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT site_stats_single_row CHECK (id = 1)
);
INSERT INTO public.site_stats (id, total_visitors)
SELECT 1, 0
ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;

-- ---------- 2. ROLE HELPER + FUNCTIONS ----------
-- Role of the logged-in user (only ACTIVE staff profiles count)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
    SELECT COALESCE(
        (SELECT role::TEXT FROM public.users_profile WHERE user_id = auth.uid() AND is_active = TRUE LIMIT 1),
        'public'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- New auth users become INACTIVE reporters. The role in signup metadata is IGNORED,
-- so nobody can sign up as admin. A Super Admin activates / promotes them.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users_profile (user_id, full_name, role, avatar, email, is_active)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'reporter',
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.email,
        FALSE
    )
    ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Profiles for users that already exist in Authentication
INSERT INTO public.users_profile (user_id, full_name, role, email, is_active)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email), 'reporter', u.email, FALSE
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.users_profile p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

-- Visitor counter (+1 per browser session, called by the website)
CREATE OR REPLACE FUNCTION public.increment_site_visitors()
RETURNS BIGINT AS $$
DECLARE
    v BIGINT;
BEGIN
    UPDATE public.site_stats SET total_visitors = total_visitors + 1 WHERE id = 1
    RETURNING total_visitors INTO v;
    RETURN COALESCE(v, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.increment_site_visitors() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_post_views(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ad_clicks(UUID) TO anon, authenticated;

-- ---------- 3. TABLE PRIVILEGES ----------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON
    public.posts, public.categories, public.advertisements, public.site_settings, public.comments
FROM anon;
REVOKE ALL ON public.users_profile FROM anon;

GRANT SELECT ON
    public.posts, public.categories, public.advertisements, public.site_settings,
    public.comments, public.site_stats
TO anon;
GRANT INSERT ON public.comments, public.push_subscriptions TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.posts, public.categories, public.advertisements, public.site_settings,
    public.comments, public.push_subscriptions
TO authenticated;
GRANT SELECT ON public.site_stats TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.users_profile TO authenticated;

-- ---------- 4. ROW LEVEL SECURITY (replaces every old "USING (true)" policy) ----------
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT policyname, tablename FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('users_profile','categories','posts','advertisements',
                            'site_settings','comments','push_subscriptions','site_stats')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- site_stats: everyone may read the counter
CREATE POLICY site_stats_select ON public.site_stats FOR SELECT USING (true);

-- users_profile: own row, or Super Admin sees/manages all. Rows are created only by the trigger.
CREATE POLICY profiles_select ON public.users_profile FOR SELECT
    USING (user_id = auth.uid() OR public.get_auth_role() = 'super_admin');
CREATE POLICY profiles_update ON public.users_profile FOR UPDATE
    USING (public.get_auth_role() = 'super_admin')
    WITH CHECK (public.get_auth_role() = 'super_admin');
CREATE POLICY profiles_delete ON public.users_profile FOR DELETE
    USING (public.get_auth_role() = 'super_admin');

-- categories: public read; Super Admin / Editor manage
CREATE POLICY categories_select ON public.categories FOR SELECT USING (true);
CREATE POLICY categories_insert ON public.categories FOR INSERT
    WITH CHECK (public.get_auth_role() IN ('super_admin', 'editor'));
CREATE POLICY categories_update ON public.categories FOR UPDATE
    USING (public.get_auth_role() IN ('super_admin', 'editor'))
    WITH CHECK (public.get_auth_role() IN ('super_admin', 'editor'));
CREATE POLICY categories_delete ON public.categories FOR DELETE
    USING (public.get_auth_role() IN ('super_admin', 'editor'));

-- posts: readers only see PUBLISHED posts
CREATE POLICY posts_select ON public.posts FOR SELECT USING (
    status = 'published'
    OR public.get_auth_role() IN ('super_admin', 'editor')
    OR (public.get_auth_role() = 'reporter' AND author_id = auth.uid())
);
-- only Super Admin can publish; Editor / Reporter can only save draft / pending
CREATE POLICY posts_insert ON public.posts FOR INSERT WITH CHECK (
    public.get_auth_role() = 'super_admin'
    OR (public.get_auth_role() IN ('editor', 'reporter') AND status IN ('draft', 'pending'))
);
CREATE POLICY posts_update ON public.posts FOR UPDATE
USING (
    public.get_auth_role() IN ('super_admin', 'editor')
    OR (public.get_auth_role() = 'reporter' AND author_id = auth.uid())
)
WITH CHECK (
    public.get_auth_role() = 'super_admin'
    OR (public.get_auth_role() = 'editor' AND status IN ('draft', 'pending', 'rejected'))
    OR (public.get_auth_role() = 'reporter' AND author_id = auth.uid() AND status IN ('draft', 'pending'))
);
CREATE POLICY posts_delete ON public.posts FOR DELETE
    USING (public.get_auth_role() = 'super_admin');

-- advertisements: public read; Super Admin manages
CREATE POLICY ads_select ON public.advertisements FOR SELECT USING (true);
CREATE POLICY ads_insert ON public.advertisements FOR INSERT WITH CHECK (public.get_auth_role() = 'super_admin');
CREATE POLICY ads_update ON public.advertisements FOR UPDATE
    USING (public.get_auth_role() = 'super_admin') WITH CHECK (public.get_auth_role() = 'super_admin');
CREATE POLICY ads_delete ON public.advertisements FOR DELETE USING (public.get_auth_role() = 'super_admin');

-- site_settings: public read; Super Admin writes
CREATE POLICY settings_select ON public.site_settings FOR SELECT USING (true);
CREATE POLICY settings_insert ON public.site_settings FOR INSERT WITH CHECK (public.get_auth_role() = 'super_admin');
CREATE POLICY settings_update ON public.site_settings FOR UPDATE
    USING (public.get_auth_role() = 'super_admin') WITH CHECK (public.get_auth_role() = 'super_admin');

-- comments: public sees approved; anyone may post (length-limited); staff moderate
CREATE POLICY comments_select ON public.comments FOR SELECT
    USING (is_approved = TRUE OR public.get_auth_role() IN ('super_admin', 'editor'));
CREATE POLICY comments_insert ON public.comments FOR INSERT
    WITH CHECK (char_length(content) BETWEEN 1 AND 2000 AND char_length(author_name) BETWEEN 1 AND 80);
CREATE POLICY comments_update ON public.comments FOR UPDATE
    USING (public.get_auth_role() IN ('super_admin', 'editor'))
    WITH CHECK (public.get_auth_role() IN ('super_admin', 'editor'));
CREATE POLICY comments_delete ON public.comments FOR DELETE
    USING (public.get_auth_role() IN ('super_admin', 'editor'));

-- push subscribers: anyone can subscribe; only Super Admin can read / remove
CREATE POLICY push_insert ON public.push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY push_select ON public.push_subscriptions FOR SELECT USING (public.get_auth_role() = 'super_admin');
CREATE POLICY push_delete ON public.push_subscriptions FOR DELETE USING (public.get_auth_role() = 'super_admin');

-- ---------- 5. STORAGE (image uploads need a logged-in staff member) ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true), ('branding', 'branding', true), ('notices', 'notices', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload images" ON storage.objects;
DROP POLICY IF EXISTS "np_public_read" ON storage.objects;
DROP POLICY IF EXISTS "np_staff_upload" ON storage.objects;
DROP POLICY IF EXISTS "np_admin_delete" ON storage.objects;

CREATE POLICY "np_public_read" ON storage.objects FOR SELECT
    USING (bucket_id IN ('news-images', 'branding', 'notices'));
CREATE POLICY "np_staff_upload" ON storage.objects FOR INSERT WITH CHECK (
    (bucket_id IN ('news-images', 'notices') AND public.get_auth_role() IN ('super_admin', 'editor', 'reporter'))
    OR (bucket_id = 'branding' AND public.get_auth_role() = 'super_admin')
);
CREATE POLICY "np_admin_delete" ON storage.objects FOR DELETE
    USING (bucket_id IN ('news-images', 'branding', 'notices') AND public.get_auth_role() = 'super_admin');

-- ---------- 6. REALTIME (each table separately, so one failure cannot hide the others) ----------
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['posts','categories','advertisements','site_settings','comments']
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        EXCEPTION
            WHEN duplicate_object THEN NULL;
            WHEN undefined_object THEN NULL;
        END;
    END LOOP;
END $$;

-- ---------- 7. MAKE YOURSELF SUPER ADMIN ----------
-- (requires the user to exist in Authentication -> Users first)
UPDATE public.users_profile
SET role = 'super_admin',
    is_active = TRUE
WHERE email = 'YOUR_ADMIN_EMAIL';   -- <-- replace with the e-mail you added in step 1

-- ---------- CHECKS ----------
-- should list exactly one row, role super_admin, is_active true:
SELECT email, role, is_active FROM public.users_profile ORDER BY created_at;
-- should list 5 tables:
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' ORDER BY tablename;
