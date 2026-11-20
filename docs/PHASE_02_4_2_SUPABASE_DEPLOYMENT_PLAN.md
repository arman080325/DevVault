# DevVault — Phase 02.4.2: Remote Supabase Deployment Plan

**Target Migration:** `supabase/migrations/008_advanced_filtering.sql`  
**Target Supabase Hostname:** `jjzwpydspnhpoxhckeko.supabase.co`  
**Date:** November 20, 2026  
**Status:** Readiness Verified (Pending User Authorization)  
**Execution Mode:** Manual execution via Supabase SQL Editor  

---

## 1. Pre-Deployment Configuration & Target Verification

### 1.1 Supabase Target Verification
- **Project URL Hostname:** `jjzwpydspnhpoxhckeko.supabase.co`
- **Application Environment Configuration:** Confirmed in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **Target Project Parity:** Matches the verified remote Supabase database from Phase 02.4.1 (Migration 007 and authenticated search).
- **Authentication Client:** `getBrowserSupabase()` in `src/lib/supabase/client.ts` is configured using `@supabase/ssr` / `@supabase/supabase-js`.
- **Database Inspection Method:** Supabase Dashboard SQL Editor (and Table Editor). All client queries strictly enforce Row Level Security (RLS) via the anonymous client key.

### 1.2 Database Backup & Checkpoint Recommendation
- **Recommended Checkpoint:**
  Because Migration 008 explicitly drops the legacy 4-argument `search_user_resources` function and alters function signatures, taking a snapshot or reviewing the rollback script before execution is recommended.
  - If using Supabase Pro/Team: verify automated daily backup or point-in-time recovery (PITR) is healthy.
  - If using Supabase Free: the rollback SQL provided in Section 6 can restore the exact Migration 007 function signature within seconds.

---

## 2. Migration Architectural Audit

### 2.1 Table & Column Names Verification
All table and column references in `008_advanced_filtering.sql` were cross-checked against production migrations `002_create_resources.sql`, `003_create_collections.sql`, `004_create_tags.sql`, and `007_search_indexes.sql`:
- `public.resources`: Verified `id`, `user_id`, `title`, `original_url`, `normalized_url`, `description`, `thumbnail_url`, `source_domain`, `platform`, `category`, `status`, `personal_notes`, `read_time`, `author_name`, `is_pinned`, `is_favorite`, `progress`, `created_at`, `updated_at`, `explored_at`, `search_vector`.
- `public.collections`: Verified `id`, `user_id`, `name`.
- `public.collection_resources`: Verified `collection_id`, `resource_id`.
- `public.tags`: Verified `id`, `user_id`, `name`.
- `public.resource_tags`: Verified `resource_id`, `tag_id`.

### 2.2 Signature Transition & PostgREST Compatibility
- **Dropped Function:**
  ```sql
  DROP FUNCTION IF EXISTS public.search_user_resources(TEXT, TEXT, TEXT, TEXT);
  ```
  Drops the 4-argument function created in Migration 007. This eliminates PostgREST resolution ambiguity (`PGRST204: Could not choose a best candidate function`) when calling `search_user_resources`.
- **New Function:**
  ```sql
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
    filter_bookmarked BOOLEAN DEFAULT NULL
  )
  ```
  Every parameter is defaulted to `NULL`, allowing PostgREST callers to supply any arbitrary subset of named arguments.
- **Return Type:** Returns table of 21 columns matching `public.resources` plus `rank REAL`.

### 2.3 Security, Multi-Tenancy & RLS Isolation
- Declared with `SECURITY INVOKER` and `STABLE`.
- Enforces strict user tenant boundary: `WHERE r.user_id = auth.uid()`.
- Collection join checks `c.user_id = auth.uid()`.
- Multi-tag relational subquery checks `t.user_id = auth.uid()`.
- Free-text search subqueries check `t.user_id = auth.uid()` and `c.user_id = auth.uid()`.
- Grants `EXECUTE` on the 11-argument function to both `authenticated` and `anon` roles.

### 2.4 Multi-Tag Relational AND Semantics
- Evaluates distinct lowercase tag matches against total distinct requested non-empty tags:
  ```sql
  (SELECT count(DISTINCT lower(t.name)) FROM ... WHERE lower(t.name) = ANY(...)) = (SELECT count(DISTINCT lower(req_tag)) FROM unnest(filter_tags) ...)
  ```
- Prevents resource row multiplication and guarantees strict AND semantics.

### 2.5 Migration Idempotency
- Uses `CREATE INDEX IF NOT EXISTS`.
- Uses `DROP FUNCTION IF EXISTS`.
- Uses `CREATE OR REPLACE FUNCTION`.
- The migration can be safely re-run without errors or duplicate side-effects.

---

## 3. Remote Deployment Instructions (Supabase SQL Editor)

To apply Migration 008:

1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and navigate to project `jjzwpydspnhpoxhckeko`.
2. In the left-hand navigation, click **SQL Editor**.
3. Click **New query** (or press `Ctrl+N`).
4. Paste the entire content of [supabase/migrations/008_advanced_filtering.sql](file:///c:/Users/arman/Downloads/Projects/DevVault/supabase/migrations/008_advanced_filtering.sql).
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
6. Confirm that the execution status reports: `Success. No rows returned`.

---

## 4. Post-Migration Verification SQL

Execute the following verification script in the Supabase SQL Editor immediately after running Migration 008:

```sql
-- 1. Verify Helper Indexes Exist
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_res_tags_resource_id',
    'idx_tags_name_lower',
    'idx_collections_name_lower',
    'idx_resources_search_vector'
  );

-- 2. Verify search_user_resources Function Signature & Security Invoker
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_type,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END AS volatility
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'search_user_resources';

-- 3. Verify Only One search_user_resources Signature Exists (No 4-argument overload)
SELECT
  count(*) AS function_overload_count
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'search_user_resources';
-- Expected result: 1 (confirming 4-arg function was dropped and replaced)

-- 4. Verify Execution Permissions
SELECT
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'search_user_resources';
-- Expected result: EXECUTE granted to 'authenticated' and 'anon'
```

---

## 5. Live Authenticated & RLS Testing Plan

Once Migration 008 is verified via SQL:

### 5.1 Authenticated Application Tests
1. Start DevVault dev server (`npm run dev`).
2. Log in using the existing authenticated account (`armankhan082020@gmail.com`).
3. Open Developer Tools -> Network tab and filter for `/rpc/search_user_resources`.
4. Perform the following searches in the Library view:
   - **Multi-Tag AND Test:** Select tags `["React", "Architecture"]`. Inspect the RPC payload:
     `{"filter_tags":["React","Architecture"], ...}`.
     Confirm returned resources contain both tags.
   - **Collection Filter Test:** Select collection `Frontend inspiration`. Inspect RPC payload:
     `{"filter_collection":"Frontend inspiration", ...}`.
     Confirm returned resources belong to that shelf.
   - **Bookmark Toggle Test:** Toggle "Bookmarked only". Inspect RPC payload:
     `{"filter_bookmarked":true, ...}`.
     Confirm returned resources have `is_favorite = true` OR `is_pinned = true`.
   - **Date Preset Test:** Select "Past 7 days" (`"7d"`). Inspect RPC payload:
     `{"filter_date_from":"2026-11-13T...", ...}`.
     Confirm only recent resources are returned.
   - **Combined Search Test:** Type `"guide"` with "Category: Animation" and "Status: Exploring". Confirm multi-dimensional composition returns accurate results.
5. Confirm RPC response status is `200 OK` (no silent PostgREST fallback).

### 5.2 RLS Cross-User Isolation Verification
1. Verify in Network response that all items returned have `user_id` matching the authenticated user's session ID (`auth.uid()`).
2. Verify that unauthenticated requests (local/demo mode) fall back cleanly to `searchLocalCache()` without making unauthenticated remote calls that return zero rows.

---

## 6. Rollback Considerations & Emergency Script

If rollback is ever required, execute the following script in the Supabase SQL Editor to restore the Migration 007 4-parameter signature:

```sql
-- ROLLBACK SCRIPT: Restore Migration 007 Function Signature

-- 1. Drop 11-parameter function
DROP FUNCTION IF EXISTS public.search_user_resources(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], BOOLEAN, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN
);

-- 2. Restore 4-parameter function from 007_search_indexes.sql
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
    )
  ORDER BY
    CASE
      WHEN search_query IS NOT NULL AND trim(search_query) <> ''
      THEN ts_rank_cd(r.search_vector, websearch_to_tsquery('english', search_query))
      ELSE 0.0::REAL
    END DESC,
    r.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.search_user_resources(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_user_resources(TEXT, TEXT, TEXT, TEXT) TO anon;
```
*(Note: Because `resource-service.ts` includes defensive client-side matcher filtering and PostgREST fallback, the application will continue to function normally even if rolled back to the 4-argument signature).*
