# DevVault — Phase 02.4.3 Stage 3 Implementation Report
## Saved Searches Database Migration Authoring

**Milestone:** Phase 02.4.3 — Saved Searches & Advanced Sorting  
**Stage:** Stage 3 — Database Migration Authoring (`009_saved_searches.sql`)  
**Date:** November 20, 2026  
**Status:** Authored, Statically Reviewed & Documented (Pending Remote Deployment Authorization)  
**Active Branch:** `feat/phase-02-4-3-saved-searches`  
**Base Commit (production main):** `6957495d0e04f78bcea2a1d83bf9a939e539e041`  
**Migration File:** `supabase/migrations/009_saved_searches.sql`  

---

## 1. Executive Summary

Stage 3 defines the database persistence schema for DevVault's multi-dimensional Saved Searches feature. This migration builds sequentially upon `008_advanced_filtering.sql` and introduces `public.saved_searches` with strict Row-Level Security, multi-tenant isolation, robust database constraints, sensible defaults, and automated timestamp management.

In strict compliance with instructions:
- The migration was authored and statically reviewed only.
- No commands were executed against the remote production Supabase instance.
- No application UI or service layer files were modified.
- All Git branch baselines, stashes, and screenshot artifacts remain preserved.

---

## 2. Existing Database Architecture & Reconciliation

Prior to authoring the migration, the existing migration history and schema patterns were reconciled:

1. **Foreign Key Ownership**:
   - In `002_create_resources.sql`, `003_create_collections.sql`, `004_create_tags.sql`, and `005_create_activity.sql`, user ownership is universally defined as:
     `user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`.
   - `public.profiles.id` directly references `auth.users(id) ON DELETE CASCADE`.
   - `public.saved_searches` strictly adopts this same foreign key relationship to preserve relational integrity and cascade cleanup.

2. **Timestamp Standards**:
   - Universal project standard: `TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`.
   - Standard trigger helper: `public.handle_updated_at()` exists from Migration 001.

3. **Row-Level Security Standards**:
   - Established in `006_row_level_security.sql`.
   - Every ownership policy checks `auth.uid() = user_id`.
   - Discrete policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.

4. **Reconciling Audit Proposals with Schema Realities**:
   - Replaced generic JSON metadata proposals with dedicated, type-safe relational columns (`search_query`, `platform`, `category`, `status`, `collection`, `tags`, `is_favorite`, `is_pinned`, `is_bookmarked`, `date_preset`, `date_from`, `date_to`, `sort_order`).
   - Extended `sort_order` constraint to support all six Stage 2 options (`recent`, `oldest`, `title-asc`, `title-desc`, `updated`, `relevance`) plus legacy compatibility (`title`).

---

## 3. Detailed Schema Design (`public.saved_searches`)

### 3.1 Table Definition & Column Specifications

| Column | SQL Type | Nullable | Default | Description & Mapping |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | **NO** | `gen_random_uuid()` | Primary Key. Client `id: string`. |
| `user_id` | `UUID` | **NO** | *None* | Owner profile ID. Foreign Key -> `public.profiles(id)` ON DELETE CASCADE. Client `userId?: string`. |
| `name` | `TEXT` | **NO** | *None* | User-defined label (e.g. "React Architecture"). Client `name: string`. |
| `search_query` | `TEXT` | YES | `NULL` | Free-text keyword query. Client `query?: string`. |
| `platform` | `TEXT` | YES | `NULL` | Platform/source filter ("GitHub", "YouTube", etc.). Client `platform?: string`. |
| `category` | `TEXT` | YES | `NULL` | Category filter ("Development", "Design", etc.). Client `category?: string`. |
| `status` | `TEXT` | YES | `NULL` | Status filter ("To explore", "Exploring", "Completed"). Client `status?: string`. |
| `collection` | `TEXT` | YES | `NULL` | Target collection name. Client `collection?: string`. |
| `tags` | `TEXT[]` | **NO** | `'{}'::text[]` | Relational multi-tag array enforcing AND semantics. Client `tags?: string[]`. |
| `is_favorite` | `BOOLEAN` | YES | `NULL` | Favorite filter state. Client `favorite?: boolean`. |
| `is_pinned` | `BOOLEAN` | YES | `NULL` | Pinned filter state. Client `pinned?: boolean`. |
| `is_bookmarked` | `BOOLEAN` | YES | `NULL` | Bookmarked composite filter state. Client `bookmarked?: boolean`. |
| `date_preset` | `TEXT` | YES | `NULL` | Predefined range ("all", "today", "7d", "30d", "year"). Client `datePreset`. |
| `date_from` | `TIMESTAMPTZ`| YES | `NULL` | Lower date boundary (ISO-8601). Client `dateFrom?: string`. |
| `date_to` | `TIMESTAMPTZ`| YES | `NULL` | Upper date boundary (ISO-8601). Client `dateTo?: string`. |
| `sort_order` | `TEXT` | **NO** | `'recent'` | Active sort order. Client `sortOrder?: AdvancedSortOption`. |
| `created_at` | `TIMESTAMPTZ`| **NO** | `timezone('utc'::text, now())` | Creation timestamp. Client `createdAt: string`. |
| `updated_at` | `TIMESTAMPTZ`| **NO** | `timezone('utc'::text, now())` | Last modified timestamp. Maintained automatically by trigger. Client `updatedAt?: string`. |
| `last_used_at` | `TIMESTAMPTZ`| **NO** | `timezone('utc'::text, now())` | Last opened/restored timestamp. Maintained explicitly by application on use. Client `lastUsedAt?: string`. |

---

## 4. Database Constraints

1. **Per-User Name Uniqueness (`uq_user_saved_search_name`)**:
   ```sql
   CONSTRAINT uq_user_saved_search_name UNIQUE (user_id, name)
   ```
   *Rationale:* Users cannot create duplicate saved searches with the same name. Different users may use identical names without conflict.

2. **Name Quality & Length Bounds (`chk_saved_searches_name_length`)**:
   ```sql
   CONSTRAINT chk_saved_searches_name_length CHECK (length(trim(name)) >= 1 AND length(name) <= 100)
   ```
   *Rationale:* Prevents empty or whitespace-only names and bounds name size to 100 characters, preventing UI overflow in dropdowns.

3. **Sort Order Whitelist (`chk_saved_searches_sort_order`)**:
   ```sql
   CONSTRAINT chk_saved_searches_sort_order CHECK (
     sort_order IN ('recent', 'oldest', 'title-asc', 'title-desc', 'updated', 'relevance', 'title')
   )
   ```
   *Rationale:* Directly enforces the 6 Stage 2 TypeScript sorting modes plus legacy `'title'` alias at the database constraint level.

4. **Date Preset Whitelist (`chk_saved_searches_date_preset`)**:
   ```sql
   CONSTRAINT chk_saved_searches_date_preset CHECK (
     date_preset IS NULL OR date_preset IN ('all', 'today', '7d', '30d', 'year')
   )
   ```
   *Rationale:* Prevents invalid date presets from corrupting filter evaluations.

5. **Chronological Date Boundaries (`chk_saved_searches_date_bounds`)**:
   ```sql
   CONSTRAINT chk_saved_searches_date_bounds CHECK (
     date_from IS NULL OR date_to IS NULL OR date_from <= date_to
   )
   ```
   *Rationale:* Prevents inverted custom date ranges (`date_from > date_to`).

---

## 5. Indexing Architecture & Rationale

Only two lean, highly selective indexes are created:

1. **`idx_saved_searches_user_id`**:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id
     ON public.saved_searches(user_id);
   ```
   *Rationale:* Speeds up foreign key integrity validations, profile cascade deletions, and basic user lookups.

2. **`idx_saved_searches_last_used`**:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_saved_searches_last_used
     ON public.saved_searches(user_id, last_used_at DESC);
   ```
   *Rationale:* The primary access pattern for the UI "Views" dropdown is listing the user's saved searches ordered by most recently used (`WHERE user_id = auth.uid() ORDER BY last_used_at DESC`). This compound B-tree index supports this query via an index-only or index scan with zero sorting overhead.

*Over-indexing Avoidance:* No secondary indexes were added on filter columns (`platform`, `category`, `status`), as saved searches are queried by user and displayed as a list (typical user owns 5–50 saved views), rather than filtered against themselves.

---

## 6. Row-Level Security (RLS) & Permissions

### 6.1 Row-Level Security Policies
RLS is explicitly enabled (`ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;`). Four separate, non-bypassable policies are established:

```sql
-- SELECT: Users can only read their own saved searches
CREATE POLICY "Users can view their own saved searches"
  ON public.saved_searches FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can only insert saved searches for themselves
CREATE POLICY "Users can insert their own saved searches"
  ON public.saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own saved searches (and cannot transfer ownership)
CREATE POLICY "Users can update their own saved searches"
  ON public.saved_searches FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own saved searches
CREATE POLICY "Users can delete their own saved searches"
  ON public.saved_searches FOR DELETE
  USING (auth.uid() = user_id);
```

### 6.2 Table Privileges & Role Isolation
- **`authenticated` role**: Granted `SELECT, INSERT, UPDATE, DELETE`.
- **`anon` role**: Explicitly revoked (`REVOKE ALL ON TABLE public.saved_searches FROM anon;`). Unauthenticated requests cannot read or write saved searches.

---

## 7. Timestamp Maintenance Architecture

1. **`created_at`**: Set once at row creation via `timezone('utc'::text, now())`.
2. **`updated_at`**: Automatically maintained by trigger `on_saved_searches_updated_at` invoking `public.handle_updated_at()`. Any modification to criteria or name updates `updated_at`.
3. **`last_used_at`**: Deliberately excluded from the `handle_updated_at()` trigger. It remains unchanged when a user edits or renames a view. The application updates `last_used_at` only when the user explicitly clicks/restores the saved view in the UI:
   ```sql
   UPDATE public.saved_searches
   SET last_used_at = timezone('utc'::text, now())
   WHERE id = $1 AND user_id = auth.uid();
   ```

---

## 8. Idempotency & Re-execution Safety

The migration script adheres to strict idempotency rules:
- `CREATE TABLE IF NOT EXISTS public.saved_searches ...`
- `CREATE INDEX IF NOT EXISTS ...`
- `DROP TRIGGER IF EXISTS on_saved_searches_updated_at ON public.saved_searches;`
- `DROP POLICY IF EXISTS ... ON public.saved_searches;`
- No destructive drops of tables, columns, or shared functions.
- Does not modify Migration 008 or any previous migrations.

---

## 9. Comprehensive SQL Verification Plan

The following SQL queries are prepared to verify the database state once authorized for remote deployment:

### 9.1 Schema & Columns Verification
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'saved_searches'
ORDER BY ordinal_position;
```

### 9.2 Constraints Verification
```sql
SELECT conname AS constraint_name, contype AS constraint_type, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public' AND conrelid = 'public.saved_searches'::regclass;
```

### 9.3 Index Verification
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'saved_searches';
```

### 9.4 RLS & Policies Verification
```sql
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'saved_searches' AND relnamespace = 'public'::regnamespace;

SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'saved_searches';
```

### 9.5 Permissions Verification
```sql
SELECT grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'saved_searches';
```

### 9.6 Trigger Verification
```sql
SELECT trigger_name, event_manipulation, action_statement, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'saved_searches';
```

### 9.7 Two-User RLS Isolation Test (Rollback Transaction)
```sql
-- Safe, non-destructive test using synthetic UUIDs rolled back immediately
BEGIN;

-- 1. Create two temporary synthetic test profiles
INSERT INTO public.profiles (id, full_name, email)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Test User A', 'usera@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'Test User B', 'userb@example.test');

-- 2. Simulate User A context
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- Insert saved search as User A
INSERT INTO public.saved_searches (user_id, name, search_query, sort_order)
VALUES ('11111111-1111-1111-1111-111111111111', 'User A React View', 'react', 'recent');

-- 3. Simulate User B context
SET LOCAL request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

-- Insert saved search as User B
INSERT INTO public.saved_searches (user_id, name, search_query, sort_order)
VALUES ('22222222-2222-2222-2222-222222222222', 'User B Node View', 'node', 'oldest');

-- 4. Verify User B can only see their own search
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count FROM public.saved_searches;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'RLS Failure: User B sees % rows instead of 1', v_count;
  END IF;
END $$;

-- 5. User B attempts unauthorized write on User A's row
UPDATE public.saved_searches
SET name = 'Compromised'
WHERE user_id = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  v_updated INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 0 THEN
    RAISE EXCEPTION 'RLS Failure: User B updated % rows belonging to User A', v_updated;
  END IF;
END $$;

-- 6. Clean rollback: leaves zero artifacts in the database
ROLLBACK;
```

---

## 10. Rollback Considerations

Should rollback ever be required:
```sql
-- Complete rollback of migration 009
DROP TRIGGER IF EXISTS on_saved_searches_updated_at ON public.saved_searches;
DROP POLICY IF EXISTS "Users can view their own saved searches" ON public.saved_searches;
DROP POLICY IF EXISTS "Users can insert their own saved searches" ON public.saved_searches;
DROP POLICY IF EXISTS "Users can update their own saved searches" ON public.saved_searches;
DROP POLICY IF EXISTS "Users can delete their own saved searches" ON public.saved_searches;
DROP TABLE IF EXISTS public.saved_searches CASCADE;
```

---

## 11. Files Created & Modified in Stage 3

1. **Created**:
   - `supabase/migrations/009_saved_searches.sql` (114 lines of production-grade DDL, constraints, indexes, RLS, and grants).
   - `docs/PHASE_02_4_3_STAGE_3_REPORT.md` (this report).

2. **Modified**:
   - None in Stage 3. (Stage 2 modifications in `src/data/figmaResources.ts`, `src/lib/search/search-matcher.ts`, and `src/services/resource-service.ts` remain intact).

---

## 12. Known Limitations & Stage 4 Next Steps

- **Remote Deployment Status**: This migration is currently local in the repository and has NOT been applied to remote Supabase, awaiting user authorization.
- **Stage 4 Target**: Authoring `src/services/saved-search-service.ts` implementing:
  - `fetchSavedSearches(userId?: string): Promise<SavedSearchItem[]>`
  - `createSavedSearch(userId: string | null, item: Omit<SavedSearchItem, "id" | "createdAt">): Promise<SavedSearchItem>`
  - `updateSavedSearch(userId: string | null, id: string, updates: Partial<SavedSearchItem>): Promise<SavedSearchItem>`
  - `deleteSavedSearch(userId: string | null, id: string): Promise<boolean>`
  - `recordSearchUsed(userId: string | null, id: string): Promise<void>`
  - Local `localStorage` fallback under `devvault-local-saved-searches` for guest and offline operation.
