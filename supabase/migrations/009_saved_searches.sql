-- DevVault Migration: 009_saved_searches.sql
-- Saved Searches persistence for multi-dimensional filter presets and sorting preferences
-- Version: Phase 02.4.3 (Stage 3)

-- ============================================================================
-- 1. Table: public.saved_searches
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  search_query TEXT,
  platform TEXT,
  category TEXT,
  status TEXT,
  collection TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  is_favorite BOOLEAN,
  is_pinned BOOLEAN,
  is_bookmarked BOOLEAN,
  date_preset TEXT,
  date_from TIMESTAMPTZ,
  date_to TIMESTAMPTZ,
  sort_order TEXT NOT NULL DEFAULT 'recent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Unique constraint: Unique saved search names per user
  CONSTRAINT uq_user_saved_search_name UNIQUE (user_id, name),

  -- Check constraint: Name must not be empty or purely whitespace, and maximum 100 characters
  CONSTRAINT chk_saved_searches_name_length CHECK (length(trim(name)) >= 1 AND length(name) <= 100),

  -- Check constraint: Valid sort order supporting all 6 Stage 2 options + legacy title
  CONSTRAINT chk_saved_searches_sort_order CHECK (
    sort_order IN ('recent', 'oldest', 'title-asc', 'title-desc', 'updated', 'relevance', 'title')
  ),

  -- Check constraint: Valid date preset matching application presets
  CONSTRAINT chk_saved_searches_date_preset CHECK (
    date_preset IS NULL OR date_preset IN ('all', 'today', '7d', '30d', 'year')
  ),

  -- Check constraint: Chronological date boundaries when both boundaries are supplied
  CONSTRAINT chk_saved_searches_date_bounds CHECK (
    date_from IS NULL OR date_to IS NULL OR date_from <= date_to
  )
);

-- ============================================================================
-- 2. Performance and Ordering Indexes
-- ============================================================================

-- Fast lookup of user's saved searches and foreign key reference optimization
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id
  ON public.saved_searches(user_id);

-- Ordering by most recently used for views menu dropdown and quick-access shelves
CREATE INDEX IF NOT EXISTS idx_saved_searches_last_used
  ON public.saved_searches(user_id, last_used_at DESC);

-- ============================================================================
-- 3. Automatic updated_at Trigger
-- ============================================================================

-- Re-uses the project-wide public.handle_updated_at() trigger function from Migration 001.
-- Note: last_used_at is maintained explicitly by the application only when a search is opened.
DROP TRIGGER IF EXISTS on_saved_searches_updated_at ON public.saved_searches;
CREATE TRIGGER on_saved_searches_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 4. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Users can only read their own saved searches
DROP POLICY IF EXISTS "Users can view their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can view their own saved searches"
  ON public.saved_searches FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT Policy: Users can only insert saved searches for themselves
DROP POLICY IF EXISTS "Users can insert their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can insert their own saved searches"
  ON public.saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE Policy: Users can only update their own saved searches
DROP POLICY IF EXISTS "Users can update their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can update their own saved searches"
  ON public.saved_searches FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE Policy: Users can only delete their own saved searches
DROP POLICY IF EXISTS "Users can delete their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can delete their own saved searches"
  ON public.saved_searches FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. Privileges and Security Roles
-- ============================================================================

-- Explicitly revoke all privileges from PostgreSQL PUBLIC pseudo-role first
REVOKE ALL ON TABLE public.saved_searches FROM PUBLIC;

-- Explicitly revoke all privileges from unauthenticated (anon) role
REVOKE ALL ON TABLE public.saved_searches FROM anon;

-- Grant full CRUD capabilities strictly to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_searches TO authenticated;
