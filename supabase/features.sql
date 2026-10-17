-- ==============================================================================
-- COMMENT MODERATION + SCHEDULED PUBLISH   (safe to re-run)
-- Run in Supabase -> SQL Editor.  Run AFTER staff-auth.sql.
-- Run it BEFORE you deploy the new code (the code saves a new settings column).
-- ==============================================================================

-- 1. "hold new comments until a moderator approves" switch (Admin -> टिप्पणी tab)
ALTER TABLE public.site_settings
    ADD COLUMN IF NOT EXISTS comments_need_approval BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. when the switch is ON, a reader's new comment starts hidden (readers cannot override it)
CREATE OR REPLACE FUNCTION public.comments_apply_moderation()
RETURNS TRIGGER AS $$
DECLARE
    need BOOLEAN;
BEGIN
    SELECT comments_need_approval INTO need FROM public.site_settings LIMIT 1;
    IF COALESCE(need, FALSE) AND public.get_auth_role() NOT IN ('super_admin', 'editor') THEN
        NEW.is_approved := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS comments_moderation ON public.comments;
CREATE TRIGGER comments_moderation
    BEFORE INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.comments_apply_moderation();

-- 3. scheduled posts: a "published" post whose time has not come is hidden from readers
--    (also through the API, not only on the website)
DROP POLICY IF EXISTS posts_select ON public.posts;
CREATE POLICY posts_select ON public.posts FOR SELECT USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= NOW()))
    OR public.get_auth_role() IN ('super_admin', 'editor')
    OR (public.get_auth_role() = 'reporter' AND author_id = auth.uid())
);

-- 4. editors can fix a typo in a LIVE news (it stays published); only a Super Admin can
--    publish a news that is not live yet
DROP POLICY IF EXISTS posts_update ON public.posts;
CREATE POLICY posts_update ON public.posts FOR UPDATE
USING (
    public.get_auth_role() IN ('super_admin', 'editor')
    OR (public.get_auth_role() = 'reporter' AND author_id = auth.uid())
)
WITH CHECK (
    public.get_auth_role() = 'super_admin'
    OR (public.get_auth_role() = 'editor' AND status IN ('draft', 'pending', 'rejected', 'published'))
    OR (public.get_auth_role() = 'reporter' AND author_id = auth.uid() AND status IN ('draft', 'pending'))
);

CREATE OR REPLACE FUNCTION public.posts_guard_publish()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published'
       AND OLD.status IS DISTINCT FROM 'published'
       AND auth.uid() IS NOT NULL
       AND public.get_auth_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Only a Super Admin can publish a post';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS posts_publish_guard ON public.posts;
CREATE TRIGGER posts_publish_guard
    BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.posts_guard_publish();

-- CHECK: should show the column and the policy
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'site_settings' AND column_name = 'comments_need_approval';
SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'posts_select';
