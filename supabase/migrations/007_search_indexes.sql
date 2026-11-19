-- DevVault Migration: 007_search_indexes.sql
-- Full-Text Search indexing and query capabilities for resources

-- 1. Add generated tsvector column to public.resources
-- Weights:
--   'A' = Title (highest relevance)
--   'B' = Category, Platform
--   'C' = Description, Personal Notes
--   'D' = Source Domain, Original URL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resources'
      AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE public.resources
    ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(category, '') || ' ' || coalesce(platform, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(description, '') || ' ' || coalesce(personal_notes, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(source_domain, '') || ' ' || coalesce(original_url, '')), 'D')
    ) STORED;
  END IF;
END $$;

-- 2. GIN Index on the search_vector column for sub-millisecond retrieval
CREATE INDEX IF NOT EXISTS idx_resources_search_vector
  ON public.resources USING gin(search_vector);

-- 3. Additional B-Tree indexes for fast partial matching
CREATE INDEX IF NOT EXISTS idx_resources_title_lower
  ON public.resources(lower(title));

CREATE INDEX IF NOT EXISTS idx_resources_notes_lower
  ON public.resources(lower(personal_notes))
  WHERE personal_notes IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resources_url_lower
  ON public.resources(lower(original_url))
  WHERE original_url IS NOT NULL;

-- 4. Search RPC function: search_user_resources
-- Enforces Row-Level Security via SECURITY INVOKER and explicit user_id = auth.uid() check
CREATE OR REPLACE FUNCTION public.search_user_resources(
  search_query TEXT DEFAULT NULL,
  filter_platform TEXT DEFAULT NULL,
  filter_category TEXT DEFAULT NULL,
  filter_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  original_url TEXT,
  normalized_url TEXT,
  description TEXT,
  thumbnail_url TEXT,
  source_domain TEXT,
  platform TEXT,
  category TEXT,
  status TEXT,
  personal_notes TEXT,
  read_time TEXT,
  author_name TEXT,
  is_pinned BOOLEAN,
  is_favorite BOOLEAN,
  progress INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  explored_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT
    r.id,
    r.user_id,
    r.title,
    r.original_url,
    r.normalized_url,
    r.description,
    r.thumbnail_url,
    r.source_domain,
    r.platform,
    r.category,
    r.status,
    r.personal_notes,
    r.read_time,
    r.author_name,
    r.is_pinned,
    r.is_favorite,
    r.progress,
    r.created_at,
    r.updated_at,
    r.explored_at,
    CASE
      WHEN search_query IS NOT NULL AND trim(search_query) <> ''
      THEN ts_rank_cd(r.search_vector, websearch_to_tsquery('english', search_query))
      ELSE 0.0::REAL
    END AS rank
  FROM public.resources r
  WHERE r.user_id = auth.uid()
    AND (filter_platform IS NULL OR filter_platform = 'All' OR r.platform ILIKE filter_platform)
    AND (filter_category IS NULL OR filter_category = 'All' OR r.category ILIKE filter_category)
    AND (filter_status IS NULL OR filter_status = 'All' OR r.status ILIKE filter_status)
    AND (
      search_query IS NULL
      OR trim(search_query) = ''
      OR r.search_vector @@ websearch_to_tsquery('english', search_query)
      OR r.title ILIKE '%' || trim(search_query) || '%'
      OR r.original_url ILIKE '%' || trim(search_query) || '%'
      OR r.personal_notes ILIKE '%' || trim(search_query) || '%'
      -- Relational match on tags
      OR EXISTS (
        SELECT 1
        FROM public.resource_tags rt
        JOIN public.tags t ON t.id = rt.tag_id
        WHERE rt.resource_id = r.id
          AND t.user_id = auth.uid()
          AND t.name ILIKE '%' || trim(search_query) || '%'
      )
      -- Relational match on collection shelves
      OR EXISTS (
        SELECT 1
        FROM public.collection_resources cr
        JOIN public.collections c ON c.id = cr.collection_id
        WHERE cr.resource_id = r.id
          AND c.user_id = auth.uid()
          AND c.name ILIKE '%' || trim(search_query) || '%'
      )
    )
  ORDER BY
    CASE
      WHEN search_query IS NOT NULL AND trim(search_query) <> ''
      THEN ts_rank_cd(r.search_vector, websearch_to_tsquery('english', search_query))
      ELSE 0.0::REAL
    END DESC,
    r.created_at DESC;
$$;
