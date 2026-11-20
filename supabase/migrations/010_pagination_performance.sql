-- DevVault Migration: 010_pagination_performance.sql
-- Performance & Scalability Optimization: Composite indexes, relational join indexes,
-- and pagination-ready RPC support for high-volume vaults.

-- ============================================================================
-- 1. COMPOSITE INDEXES FOR FAST ORDERING & FILTERING
-- ============================================================================

-- B-Tree composite index on (user_id, created_at DESC, id DESC)
-- Eliminates explicit Sort nodes for library views ordered by recency.
CREATE INDEX IF NOT EXISTS idx_resources_user_created_at_id
  ON public.resources(user_id, created_at DESC, id DESC);

-- B-Tree index on (user_id, updated_at DESC, id DESC)
-- Accelerates recently updated sort order queries.
CREATE INDEX IF NOT EXISTS idx_resources_user_updated_at_id
  ON public.resources(user_id, updated_at DESC, id DESC)
  WHERE updated_at IS NOT NULL;

-- B-Tree index on (user_id, platform)
-- Accelerates platform-filtered queries (e.g. GitHub, YouTube, Articles).
CREATE INDEX IF NOT EXISTS idx_resources_user_platform
  ON public.resources(user_id, platform);

-- B-Tree index on (user_id, category)
-- Accelerates category-filtered queries (e.g. Development, Design, Architecture).
CREATE INDEX IF NOT EXISTS idx_resources_user_category
  ON public.resources(user_id, category);

-- B-Tree index on (user_id, status)
-- Accelerates status-filtered queries (e.g. To explore, Exploring, Completed).
CREATE INDEX IF NOT EXISTS idx_resources_user_status
  ON public.resources(user_id, status);

-- Partial index on bookmarked resources (is_favorite OR is_pinned)
CREATE INDEX IF NOT EXISTS idx_resources_user_bookmarked
  ON public.resources(user_id)
  WHERE (is_favorite = TRUE OR is_pinned = TRUE);

-- ============================================================================
-- 2. RELATIONAL JUNCTION INDEXES FOR COLLECTIONS & TAGS
-- ============================================================================

-- Index on collection_resources(resource_id)
-- Dramatically speeds up relational collection subqueries and junction joins.
CREATE INDEX IF NOT EXISTS idx_col_res_resource_id
  ON public.collection_resources(resource_id);

-- Index on collection_resources(collection_id, resource_id)
-- Speeds up shelf member lookups.
CREATE INDEX IF NOT EXISTS idx_col_res_collection_resource
  ON public.collection_resources(collection_id, resource_id);

-- Index on resource_tags(tag_id, resource_id)
-- Speeds up multi-tag intersection queries.
CREATE INDEX IF NOT EXISTS idx_res_tags_tag_resource
  ON public.resource_tags(tag_id, resource_id);

-- ============================================================================
-- 3. SAVED SEARCHES PERFORMANCE INDEX
-- ============================================================================

-- Composite index on saved_searches for instant dropdown and recency resolution.
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_last_used
  ON public.saved_searches(user_id, last_used_at DESC NULLS LAST, created_at DESC);

-- ============================================================================
-- 4. PAGINATION-ENABLED SEARCH RPC FUNCTION
-- ============================================================================

-- Drop 11-parameter function if re-defining with page_limit and page_offset
-- Preserves backwards compatibility by providing defaults: page_limit = NULL, page_offset = NULL
DROP FUNCTION IF EXISTS public.search_user_resources(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], BOOLEAN, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN
);

CREATE OR REPLACE FUNCTION public.search_user_resources(
  search_query TEXT DEFAULT NULL,
  filter_platform TEXT DEFAULT NULL,
  filter_category TEXT DEFAULT NULL,
  filter_status TEXT DEFAULT NULL,
  filter_collection TEXT DEFAULT NULL,
  filter_tags TEXT[] DEFAULT NULL,
  filter_favorite BOOLEAN DEFAULT NULL,
  filter_pinned BOOLEAN DEFAULT NULL,
  filter_date_from TIMESTAMPTZ DEFAULT NULL,
  filter_date_to TIMESTAMPTZ DEFAULT NULL,
  filter_bookmarked BOOLEAN DEFAULT NULL,
  page_limit INTEGER DEFAULT NULL,
  page_offset INTEGER DEFAULT NULL
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
  rank REAL,
  total_count BIGINT
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  WITH matching AS (
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
      END AS rank,
      COUNT(*) OVER() AS total_count
    FROM public.resources r
    WHERE r.user_id = auth.uid()
      -- Direct column filters
      AND (filter_platform IS NULL OR filter_platform = 'All' OR r.platform ILIKE filter_platform)
      AND (filter_category IS NULL OR filter_category = 'All' OR r.category ILIKE filter_category)
      AND (filter_status IS NULL OR filter_status = 'All' OR r.status ILIKE filter_status)
      AND (filter_favorite IS NULL OR r.is_favorite = filter_favorite)
      AND (filter_pinned IS NULL OR r.is_pinned = filter_pinned)
      AND (
        filter_bookmarked IS NULL
        OR (filter_bookmarked IS TRUE AND (r.is_favorite = TRUE OR r.is_pinned = TRUE))
        OR (filter_bookmarked IS FALSE AND r.is_favorite = FALSE AND r.is_pinned = FALSE)
      )
      -- Date boundaries
      AND (filter_date_from IS NULL OR r.created_at >= filter_date_from)
      AND (filter_date_to IS NULL OR r.created_at <= filter_date_to)
      -- Relational Collection Filter (matches name or collection UUID)
      AND (
        filter_collection IS NULL
        OR filter_collection = 'All'
        OR trim(filter_collection) = ''
        OR EXISTS (
          SELECT 1
          FROM public.collection_resources cr
          JOIN public.collections c ON c.id = cr.collection_id
          WHERE cr.resource_id = r.id
            AND c.user_id = auth.uid()
            AND (
              c.name ILIKE trim(filter_collection)
              OR c.id::text = trim(filter_collection)
            )
        )
      )
      -- Relational Multi-Tag Filter (AND semantics: resource must possess all requested tags)
      AND (
        filter_tags IS NULL
        OR cardinality(filter_tags) = 0
        OR (
          SELECT count(DISTINCT lower(t.name))
          FROM public.resource_tags rt
          JOIN public.tags t ON t.id = rt.tag_id
          WHERE rt.resource_id = r.id
            AND t.user_id = auth.uid()
            AND lower(t.name) = ANY(
              SELECT lower(unnest(filter_tags))
            )
        ) = (
          SELECT count(DISTINCT lower(req_tag))
          FROM unnest(filter_tags) AS req_tag
          WHERE trim(req_tag) <> ''
        )
      )
      -- Free-Text & Full-Text Search
      AND (
        search_query IS NULL
        OR trim(search_query) = ''
        OR r.search_vector @@ websearch_to_tsquery('english', search_query)
        OR r.title ILIKE '%' || trim(search_query) || '%'
        OR r.original_url ILIKE '%' || trim(search_query) || '%'
        OR r.personal_notes ILIKE '%' || trim(search_query) || '%'
        -- Relational match on tags in keyword query
        OR EXISTS (
          SELECT 1
          FROM public.resource_tags rt
          JOIN public.tags t ON t.id = rt.tag_id
          WHERE rt.resource_id = r.id
            AND t.user_id = auth.uid()
            AND t.name ILIKE '%' || trim(search_query) || '%'
        )
        -- Relational match on collection shelves in keyword query
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
      r.created_at DESC,
      r.id DESC
  )
  SELECT *
  FROM matching
  LIMIT COALESCE(page_limit, 500)
  OFFSET COALESCE(page_offset, 0);
$$;

-- ============================================================================
-- 5. PERMISSIONS
-- ============================================================================

REVOKE ALL ON FUNCTION public.search_user_resources(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], BOOLEAN, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, INTEGER, INTEGER
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.search_user_resources(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], BOOLEAN, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, INTEGER, INTEGER
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.search_user_resources(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], BOOLEAN, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, INTEGER, INTEGER
) TO anon;
