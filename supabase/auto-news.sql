-- ==============================================================================
-- AUTO NEWS (RSS aggregator)   (safe to re-run)
-- Run in Supabase -> SQL Editor, BEFORE the first auto-news run.
-- ==============================================================================

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS source_name   TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS source_url    TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_aggregated BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_posts_aggregated ON public.posts (is_aggregated, published_at DESC);

-- CHECK: should return 3 rows
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'posts'
  AND column_name IN ('source_name', 'source_url', 'is_aggregated');
