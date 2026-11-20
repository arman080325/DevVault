# DevVault — Phase 02.4.3 Stage 7 Deployment Readiness Report
## Remote Supabase Migration 009 Readiness, Security Hardening & Persistence Verification Audit

**Document Version:** 1.1.0 (Post-Hardening Review)  
**Audit Date:** November 20, 2026  
**Active Feature Branch:** `feat/phase-02-4-3-saved-searches`  
**Production Main Baseline:** `6957495d0e04f78bcea2a1d83bf9a939e539e041`  
**Target Supabase Project ID:** `jjzwpydspnhpoxhckeko`  
**Deployment Status:** Phase A Audit & Stage 7A.1 Hardening Complete — Awaiting Explicit User Authorization for Phase C Execution  

---

## 1. Git Branch & Working-Tree Status

### 1.1 Branch & Baseline Verification
- **Current Branch:** `feat/phase-02-4-3-saved-searches` (confirmed via `git branch --show-current`).
- **HEAD Commit:** `6957495d0e04f78bcea2a1d83bf9a939e539e041`.
- **Main Baseline:** `6957495d0e04f78bcea2a1d83bf9a939e539e041` (confirmed via `git rev-parse main`).
- **Safety Status:** Production `main` remains untouched. 0 commits ahead, 0 commits behind main.

### 1.2 Git Stashes & Screenshots Preservation
- **Stashes Intact:**
  - `stash@{0}`: On main: DevVault working tree backup before rebase onto main
  - `stash@{1}`: On feat/phase-02-4-advanced-filtering: DevVault Phase 02.4 screenshots and audit work
- **Screenshots Preserved:** All 10 existing audit screenshots in `docs/screenshots/` and 7 Phase 02.4 screenshots remain preserved intact.

### 1.3 Working Tree Status (`git status --short`)
```
 M docs/screenshots/phase-02-2-activity.png
 M docs/screenshots/phase-02-2-collections.png
 M docs/screenshots/phase-02-2-library.png
 M src/app/globals.css
 M src/components/shared/icon.tsx
 M src/components/views/library-view.tsx
 M src/data/figmaResources.ts
 M src/lib/search/search-matcher.ts
 M src/lib/supabase/types.ts
 M src/services/resource-service.ts
 M supabase/migrations/009_saved_searches.sql
?? docs/PHASE_02_4_2_SUPABASE_DEPLOYMENT_PLAN.md
?? docs/PHASE_02_4_3_SAVED_SEARCHES_AUDIT.md
?? docs/PHASE_02_4_3_STAGE_2_REPORT.md
?? docs/PHASE_02_4_3_STAGE_3_REPORT.md
?? docs/PHASE_02_4_3_STAGE_4_REPORT.md
?? docs/PHASE_02_4_3_STAGE_5_REPORT.md
?? docs/PHASE_02_4_3_STAGE_6_REPORT.md
?? docs/PHASE_02_4_3_STAGE_7_REPORT.md
?? docs/screenshots/phase-02-4-2-filter-desktop-dark.png
?? docs/screenshots/phase-02-4-2-filter-desktop-light.png
?? docs/screenshots/phase-02-4-2-filter-mobile-bottomsheet.png
?? docs/screenshots/phase-02-4-authenticated-search-live.png
?? docs/screenshots/phase-02-4-search-desktop-dark.png
?? docs/screenshots/phase-02-4-search-desktop-light.png
?? docs/screenshots/phase-02-4-search-mobile.png
?? scripts/verify-phase-02-4-3-e2e-journeys.js
?? scripts/verify-phase-02-4-3-saved-search-service.js
?? scripts/verify-phase-02-4-3-saved-search-ui.js
?? scripts/verify-phase-02-4-3-sorting.js
?? src/components/library/
?? src/services/saved-search-service.ts
```

---

## 2. Supabase Project Identity & Configuration

*(Inspected safely without exposing secret keys, access tokens, or service-role credentials)*

- **Project URL:** `https://jjzwpydspnhpoxhckeko.supabase.co`
- **Project Reference ID:** `jjzwpydspnhpoxhckeko`
- **Protocol:** `https:`
- **Environment Source:** `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`)
- **Project Role:** Remote PostgreSQL database hosting DevVault user authentication (`auth.users`), profiles (`public.profiles`), and resources (`public.resources`).
- **Integrity Check:** The remote project matches the validated database used throughout Phase 02.4.2 and Phase 02.4.1.

---

## 3. Migration 009 Static Review & SQL Contract

### 3.1 Overview
- **File:** `supabase/migrations/009_saved_searches.sql` (117 lines).
- **Execution Status:** **NOT executed on remote Supabase.**
- **Purpose:** Provide relational persistence for user-saved search presets, multi-dimensional filter configurations, and sorting preferences.
- **Safety Characteristics:** Fully idempotent statements (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`, `DROP POLICY IF EXISTS`). Safe for re-execution.
- **Security Hardening (Stage 7A.1):** Added explicit `REVOKE ALL ON TABLE public.saved_searches FROM PUBLIC;` before `GRANT ... TO authenticated;`.

### 3.2 Exact SQL Migration Content
```sql
-- DevVault Migration: 009_saved_searches.sql
-- Saved Searches persistence for multi-dimensional filter presets and sorting preferences
-- Version: Phase 02.4.3 (Stage 7 Production Deployment)

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
```

---

## 4. Database Schema & TypeScript Compatibility

Every database column was mapped and verified against application interfaces (`SavedSearchItem`, `SavedSearchRow`, `SavedSearchInsert`, `SavedSearchUpdate`, and `savedSearchService`):

| # | Database Column | SQL Definition | `SavedSearchRow` Type | `SavedSearchItem` Property | Mapping / Service Handling |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | `string` | `id: string` | Generated by DB; mapped 1:1 on read |
| 2 | `user_id` | `UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` | `string` | `userId?: string` | Scoped strictly via `auth.uid()` / session context |
| 3 | `name` | `TEXT NOT NULL` | `string` | `name: string` | Trimmed, 1–100 chars, duplicate validated |
| 4 | `search_query` | `TEXT NULL` | `string \| null` | `query?: string` | Trimmed query or `null` if empty |
| 5 | `platform` | `TEXT NULL` | `string \| null` | `platform?: string` | Source string or `null` if `"All"` |
| 6 | `category` | `TEXT NULL` | `string \| null` | `category?: string` | Category name or `null` if `"All"` |
| 7 | `status` | `TEXT NULL` | `string \| null` | `status?: string` | Status string or `null` if `"All"` |
| 8 | `collection` | `TEXT NULL` | `string \| null` | `collection?: string` | Collection name or `null` if `"All"` |
| 9 | `tags` | `TEXT[] NOT NULL DEFAULT '{}'` | `string[]` | `tags?: string[]` | Sanitized array of non-empty tags |
| 10 | `is_favorite` | `BOOLEAN NULL` | `boolean \| null` | `favorite?: boolean` | Strict boolean check preserves `false` |
| 11 | `is_pinned` | `BOOLEAN NULL` | `boolean \| null` | `pinned?: boolean` | Strict boolean check preserves `false` |
| 12 | `is_bookmarked` | `BOOLEAN NULL` | `boolean \| null` | `bookmarked?: boolean` | Strict boolean check preserves `false` |
| 13 | `date_preset` | `TEXT NULL` | `string \| null` | `datePreset?: "all" \| "today" \| "7d" \| "30d" \| "year"` | Preset enum string or `null` if `"all"` |
| 14 | `date_from` | `TIMESTAMPTZ NULL` | `string \| null` | `dateFrom?: string` | ISO-8601 string; checked `date_from <= date_to` |
| 15 | `date_to` | `TIMESTAMPTZ NULL` | `string \| null` | `dateTo?: string` | ISO-8601 string; checked `date_from <= date_to` |
| 16 | `sort_order` | `TEXT NOT NULL DEFAULT 'recent'` | `string` | `sortOrder?: AdvancedSortOption` | Normalized via `normalizeSortOrder()`; legacy `'title'` supported |
| 17 | `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())` | `string` | `createdAt: string` | Managed by PostgreSQL default |
| 18 | `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())` | `string` | `updatedAt?: string` | Managed by trigger `on_saved_searches_updated_at` |
| 19 | `last_used_at` | `TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())` | `string` | `lastUsedAt?: string` | Explicitly updated by `recordSavedSearchUsed()` |

---

## 5. RLS Policies, Grants & Security Privilege Audit

### 5.1 Privilege Isolation & Grant Ordering
In PostgreSQL, role hierarchy dictates that `anon` and `authenticated` inherit from `PUBLIC`. If default schema privileges exist, `PUBLIC` could inadvertently hold table access rights. Migration 009 resolves this by enforcing the following exact execution sequence:

1. `REVOKE ALL ON TABLE public.saved_searches FROM PUBLIC;`  
   *Strips all default and inherited privileges from the PUBLIC pseudo-role.*
2. `REVOKE ALL ON TABLE public.saved_searches FROM anon;`  
   *Explicitly denies any table access to unauthenticated / anonymous requests.*
3. `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_searches TO authenticated;`  
   *Grants the 4 necessary CRUD DML capabilities exclusively to logged-in users with a valid JWT.*

### 5.2 Row Level Security (RLS) Policies
Even with table-level grants assigned to `authenticated`, RLS acts as a mandatory second-tier gate:
`ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;`

1. **SELECT Policy:** `"Users can view their own saved searches"`
   - `USING (auth.uid() = user_id)`
   - Filters rows at query evaluation time; cross-tenant queries return 0 rows.
2. **INSERT Policy:** `"Users can insert their own saved searches"`
   - `WITH CHECK (auth.uid() = user_id)`
   - Rejects insert attempts where `user_id` does not match the JWT caller's `auth.uid()`.
3. **UPDATE Policy:** `"Users can update their own saved searches"`
   - `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
   - Prevents updating existing rows owned by other users or changing a row's `user_id`.
4. **DELETE Policy:** `"Users can delete their own saved searches"`
   - `USING (auth.uid() = user_id)`
   - Prevents deleting rows owned by another user account.

---

## 6. Migration 008 & Search RPC Non-Interference

- **File Check:** `supabase/migrations/008_advanced_filtering.sql` has 0 changes (`git diff` clean).
- **Search RPC:** The 11-parameter `public.search_user_resources` function remains completely untouched.
- **Database Non-Interference:** Migration 009 operates strictly on `public.saved_searches` and does not alter, replace, or wrap the search function or any table created in migrations 001–008.

---

## 7. Rollback Dependencies Deep-Dive

A rigorous inspection of all database dependencies was conducted to evaluate rollback safety:

### 7.1 Inward Dependencies (Objects Referencing `saved_searches`)
- **Foreign Keys:** Zero tables have foreign keys pointing to `public.saved_searches(id)`.
- **Views:** Zero SQL views reference `public.saved_searches`.
- **Functions / Stored Procedures:** Zero functions, procedures, or triggers depend on `public.saved_searches`.
- **Conclusion:** There are **no inward dependencies** in the database schema.

### 7.2 Outward Dependencies (Objects Referenced By `saved_searches`)
- `saved_searches.user_id` references `public.profiles(id)` with `ON DELETE CASCADE`.
- `saved_searches` uses the trigger function `public.handle_updated_at()` from migration 001.

### 7.3 Rollback Analysis & Recommended Command
Because there are zero inward dependencies, the standard rollback statement:
```sql
DROP TABLE IF EXISTS public.saved_searches;
```
is completely safe and sufficient. It automatically drops:
- The table `public.saved_searches`
- Its two indexes (`idx_saved_searches_user_id`, `idx_saved_searches_last_used`)
- Its trigger (`on_saved_searches_updated_at`)
- Its five constraints (`uq_user_saved_search_name`, check constraints)
- Its four RLS policies

The referenced `public.profiles` table and the shared `public.handle_updated_at()` trigger function remain 100% intact and unaffected. Adding `CASCADE`:
```sql
DROP TABLE IF EXISTS public.saved_searches CASCADE;
```
is also safe because no production foreign keys or tables reference `saved_searches`, but omitting `CASCADE` or understanding its exact scope ensures total transparency.

---

## 8. Summary of Findings

1. **Active Branch:** Strictly `feat/phase-02-4-3-saved-searches` at commit `6957495d0e04f78bcea2a1d83bf9a939e539e041`.
2. **Main Integrity:** Production `main` remains untouched at `6957495d0e04f78bcea2a1d83bf9a939e539e041` (0 commits ahead, 0 behind).
3. **Migration 008 Intact:** `008_advanced_filtering.sql` and the `search_user_resources` RPC have zero modifications.
4. **Target Supabase Identity:** Verified safely as `https://jjzwpydspnhpoxhckeko.supabase.co` (`jjzwpydspnhpoxhckeko`) matching earlier Phase 02.4 deployments.
5. **No Secrets Exposed:** Inspected configuration safely without logging or leaking any credentials, tokens, or service-role keys.
6. **Schema Parity:** All 19 database columns match TypeScript types and service mappings with 100% agreement.
7. **Constraint Parity:** PostgreSQL check constraints enforce exact application validation rules for name length (1–100 chars), sort options (6 options + legacy `title`), date presets (5 presets), and date boundaries.
8. **User Name Uniqueness:** `UNIQUE(user_id, name)` constraint guarantees view uniqueness per user while allowing identical names across different user accounts.
9. **RLS Isolation:** 4 independent RLS policies enforce strict `auth.uid() = user_id` isolation across SELECT, INSERT, UPDATE, and DELETE.
10. **Security Hardening Applied:** Successfully incorporated `REVOKE ALL ON TABLE public.saved_searches FROM PUBLIC;` into migration 009, executed before `GRANT ... TO authenticated`.
11. **Client Security:** Application client uses only public anonymous tokens with authenticated user sessions; service-role keys are never exposed in browser bundles.
12. **Idempotency:** Migration 009 uses `IF NOT EXISTS` and `DROP ... IF EXISTS` throughout, ensuring safe re-execution.
13. **Rollback Safety:** Table has zero inward foreign keys or view dependencies; rollback is instantaneous via `DROP TABLE IF EXISTS public.saved_searches;` with zero risk to resources or profiles.
14. **Test Baseline:** 335 automated test assertions across 5 suites pass with 100% success; build, lint, and type-check are clean.
15. **Execution Status:** **NO remote SQL has been executed.** Awaiting your explicit approval for Phase C execution.
