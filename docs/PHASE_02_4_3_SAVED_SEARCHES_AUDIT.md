# DevVault — Phase 02.4.3: Saved Searches & Advanced Sorting Architecture Audit

**Milestone:** Phase 02.4.3 — Saved Searches & Advanced Sorting  
**Stage:** Stage 1 — Branch Synchronization & Architecture Audit  
**Date:** November 20, 2026  
**Status:** Audit & Plan Complete (Read-Only; Pending Authorization)  
**Target Branch:** `feat/phase-02-4-3-saved-searches`  
**Base Commit (production main):** `6957495d0e04f78bcea2a1d83bf9a939e539e041` (`Merge pull request #2 from arman080325/feat/phase-02-4-advanced-filtering`)  
**Parent Merged Commit:** `1b2521c1f45a0b2770e5da6ac0e67d8d5c62b6ec` (`feat(filters): implement advanced multi-dimensional filtering`)  

---

## 1. Git Synchronization & Baseline Verification

### 1.1 Synchronization Summary
- **Remote `origin/main`:** Fetched latest remote references (`git fetch origin`). Verified commit `6957495d0e04f78bcea2a1d83bf9a939e539e041`, confirming that the Phase 02.4.2 PR was merged into `main`.
- **Local `main`:** Safely fast-forwarded from `88c1cd6` to `6957495` (`git merge --ff-only origin/main`).
- **Migration 008 in History:** Verified `supabase/migrations/008_advanced_filtering.sql` is present and committed in the merged history.
- **New Feature Branch Created:** `feat/phase-02-4-3-saved-searches` was created directly from verified `origin/main` (`6957495`).
- **Branch Safety:** No branches deleted, no force-pushes, no merges into main.
- **Safety Stashes Preserved:**
  - `stash@{0}`: `On main: DevVault working tree backup before rebase onto main`
  - `stash@{1}`: `On feat/phase-02-4-advanced-filtering: DevVault Phase 02.4 screenshots and audit work`
- **Screenshot Artifacts Preserved:** All 10 existing screenshot binaries remain intact in the working tree.

---

## 2. Existing Architecture Findings

### 2.1 State Management in `LibraryView` (`src/components/views/library-view.tsx`)
Currently, `LibraryView` manages 8 independent filter dimensions:
1. `query` (string, passed via props from `page.tsx`).
2. `filter` (source/platform: `"All" | "GitHub" | "YouTube" | "Article" | "Documentation" | "Instagram" | "Motion"`).
3. `selectedCategory` (string: `"All" | "Development" | "Design" | ...`).
4. `selectedStatus` (string: `"All" | "To explore" | "Exploring" | "Completed"`).
5. `selectedCollection` (string: `"All" | <collection-name>`).
6. `selectedTags` (string[]: multi-tag array enforcing relational AND semantics).
7. `selectedBookmarked` (boolean | null: `null` for all, `true` for bookmarked).
8. `selectedDatePreset` (`"all" | "today" | "7d" | "30d" | "year"`).

### 2.2 Current Sorting Implementation
Sorting is controlled by:
```typescript
type SortOption = "recent" | "oldest" | "title";
```
Implemented locally via:
```typescript
const sortResources = (list: FigmaResource[], order: SortOption) => {
  return [...list].sort((a, b) => {
    if (order === "recent") return b.id - a.id;
    if (order === "oldest") return a.id - b.id;
    if (order === "title") return a.title.localeCompare(b.title);
    return 0;
  });
};
```
**Architectural Shortcomings Identified:**
- `SortOption` only supports 3 options. Missing: Title Z–A, Recently updated, and Most relevant.
- `b.id - a.id` assumes numeric IDs are monotonically increasing with time. For Supabase-persisted resources, `id` is a hash-derived integer, which may not guarantee chronological ordering. Sorting must use `b.createdAt` / `getResourceTimestamp(b)`.
- Relevancy scoring exists in `calculateMatchScore()` (`search-matcher.ts`), but is not selectable as an explicit sort option in the UI dropdown.

### 2.3 Persistence & Fallback Architecture
- **Supabase Pattern:** Services (`resource-service.ts`, `collection-service.ts`) follow a strict dual-path:
  - If `supabase && userId`: query remote database with Row-Level Security (`auth.uid() = user_id`).
  - If unauthenticated or network error: gracefully fall back to `localStorage` (`devvault-local-resources`, `devvault-local-collections`).
- **Saved Searches currently has NO persistence layer.** Users who carefully construct multi-tag, category, date, and keyword filters must re-apply them manually each visit.

---

## 3. Proposed Database Design (`saved_searches`)

### 3.1 Migration File: `supabase/migrations/009_saved_searches.sql`
Following migration `008_advanced_filtering.sql`, the next sequential migration is `009_saved_searches.sql`.

```sql
-- DevVault Migration: 009_saved_searches.sql
-- Saved Searches persistence for multi-dimensional filter presets and sorting preferences

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  search_query TEXT,
  platform TEXT,
  category TEXT,
  status TEXT,
  collection TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
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
  CONSTRAINT uq_user_saved_search_name UNIQUE (user_id, name)
);

-- Performance and ordering indexes
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id
  ON public.saved_searches(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_searches_last_used
  ON public.saved_searches(user_id, last_used_at DESC);

-- Automatic updated_at trigger
CREATE TRIGGER on_saved_searches_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS)
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved searches"
  ON public.saved_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved searches"
  ON public.saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved searches"
  ON public.saved_searches FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved searches"
  ON public.saved_searches FOR DELETE
  USING (auth.uid() = user_id);

-- Permissions
GRANT ALL ON TABLE public.saved_searches TO authenticated;
GRANT SELECT ON TABLE public.saved_searches TO anon;
```

### 3.2 Design Rationale
- **Zero Resource Duplication:** Stores solely the criteria schema (query, tags, dates, flags) and foreign reference to the owner. Never duplicates resource rows.
- **Unique Name per User:** `CONSTRAINT uq_user_saved_search_name UNIQUE (user_id, name)` prevents accidental duplicate names under a single account while allowing different users to share common names (e.g., `"Frontend Lab"`).
- **Temporal Tracking:** `last_used_at` enables sorting saved searches by frequency/recency of use.

---

## 4. Proposed TypeScript Interfaces & Type Safety

### 4.1 Advanced Sorting Types (`src/types/sorting.ts` or `src/lib/search/search-matcher.ts`)
```typescript
export type AdvancedSortOption =
  | "recent"        // Recently saved (created_at DESC)
  | "oldest"        // Oldest saved (created_at ASC)
  | "title-asc"     // Title A–Z
  | "title-desc"    // Title Z–A
  | "updated"       // Recently updated (updated_at DESC)
  | "relevance";    // Most relevant (search score / ts_rank_cd DESC)

export const ADVANCED_SORT_LABELS: Record<AdvancedSortOption, string> = {
  recent: "Recently saved",
  oldest: "Oldest saved",
  "title-asc": "Title (A–Z)",
  "title-desc": "Title (Z–A)",
  updated: "Recently updated",
  relevance: "Most relevant",
};
```

### 4.2 Saved Search Item Interface
```typescript
export interface SavedSearchItem {
  id: string; // UUID or deterministic local ID
  userId?: string;
  name: string;
  query?: string;
  platform?: string;
  category?: string;
  status?: string;
  collection?: string;
  tags?: string[];
  favorite?: boolean;
  pinned?: boolean;
  bookmarked?: boolean;
  datePreset?: "all" | "today" | "7d" | "30d" | "year";
  dateFrom?: string;
  dateTo?: string;
  sortOrder?: AdvancedSortOption;
  createdAt: string;
  updatedAt?: string;
  lastUsedAt?: string;
}
```

---

## 5. Proposed Service Architecture (`saved-search-service.ts`)

A dedicated service module `src/services/saved-search-service.ts` will provide:
1. `fetchSavedSearches(userId?: string): Promise<SavedSearchItem[]>`:
   - Fetches from `public.saved_searches` ordered by `last_used_at DESC`.
   - Falls back to `localStorage` key `devvault-local-saved-searches`.
2. `createSavedSearch(userId: string | null, item: Omit<SavedSearchItem, "id" | "createdAt">): Promise<SavedSearchItem>`:
   - Persists to Supabase with RLS check, logs `SAVED_SEARCH_CREATED` activity event.
   - Saves to `localStorage` for offline availability.
3. `updateSavedSearch(userId: string | null, id: string, updates: Partial<SavedSearchItem>): Promise<SavedSearchItem>`:
   - Updates name or criteria in Supabase and local cache.
4. `deleteSavedSearch(userId: string | null, id: string): Promise<boolean>`:
   - Deletes from Supabase and local cache.
5. `recordSearchUsed(userId: string | null, id: string): Promise<void>`:
   - Updates `last_used_at = now()` to keep frequently used searches at the top of the menu.

---

## 6. Advanced Sorting Architecture

### 6.1 Sorting Algorithms (Client & Remote Consistency)

| Sort Option | Local / In-Memory Evaluation | Remote PostgREST / RPC Order |
| :--- | :--- | :--- |
| **Recently saved (`recent`)** | `getResourceTimestamp(b) - getResourceTimestamp(a)` | `ORDER BY created_at DESC` |
| **Oldest first (`oldest`)** | `getResourceTimestamp(a) - getResourceTimestamp(b)` | `ORDER BY created_at ASC` |
| **Title A–Z (`title-asc`)** | `a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })` | `ORDER BY title ASC` |
| **Title Z–A (`title-desc`)** | `b.title.localeCompare(a.title, undefined, { sensitivity: 'base' })` | `ORDER BY title DESC` |
| **Recently updated (`updated`)** | `new Date(b.updatedAt \|\| b.createdAt).getTime() - new Date(a.updatedAt \|\| a.createdAt).getTime()` | `ORDER BY updated_at DESC` |
| **Most relevant (`relevance`)** | `calculateMatchScore(b, tokens) - calculateMatchScore(a, tokens)` (falls back to `recent` if no query) | `ORDER BY rank DESC, created_at DESC` (via `ts_rank_cd`) |

### 6.2 Backward Compatibility
The existing legacy option `"title"` will transparently map to `"title-asc"`.

---

## 7. UX & Frontend Integration Plan

### 7.1 Save Search Action
- **Trigger Location:** Inside `.active-filters-bar` (rendered when `activeFilterCount > 0` or `query.trim().length > 0`):
  - A subtle, tactile button: `<button className="save-view-btn"><Icon name="bookmark" size={13} /> Save view</button>`.
- **Save Modal Dialog:**
  - Lightweight modal styled with DevVault parchment/espresso palette.
  - Auto-suggests a name based on current criteria (e.g. `"React Architecture"`, `"YouTube • Exploring"`).
  - Shows active criteria summary pills (query, category, tags, sort).
  - Actions: "Cancel" and "Save view".

### 7.2 Saved Searches Access & Menu
- **Primary Location:** In `.library-tools`, adjacent to the `.filter-trigger-container`:
  - `<button className="saved-views-trigger"><Icon name="bookmark" size={14} /> Views {savedSearches.length > 0 && <span className="saved-count-badge">{savedSearches.length}</span>} <Icon name="chevron" size={12} /></button>`.
  - Clicking opens an elegant dropdown popover listing saved searches.
  - Each item displays:
    - Search name (primary).
    - Summary tags (e.g. `#react`, `GitHub`, `Last 7d`).
    - Quick actions on hover: Rename (`pencil`), Delete (`trash`).
- **Sidebar Integration (Optional Quick Access):**
  - In `src/components/layout/sidebar.tsx`, below `COLLECTIONS`, add a `SAVED VIEWS` section listing up to 3 most recently used views.

### 7.3 One-Click Restoration
- Clicking a saved search executes an atomic state restoration:
  1. Sets search query.
  2. Sets platform/source filter.
  3. Sets category, status, collection.
  4. Sets multi-tag array.
  5. Sets bookmark flag.
  6. Sets date preset / custom boundaries.
  7. Sets sort order.
  8. Calls `savedSearchService.recordSearchUsed(item.id)`.
  9. Displays subtle toast: `"Restored view: {name}"`.

### 7.4 Mobile Responsiveness ($\le 768\text{px}$)
- Saved searches trigger button has touch target $\ge 44\text{px}$.
- Saved views menu opens as an accessible bottom sheet drawer with modal backdrop (`.filter-backdrop`).
- Sorting dropdown adapts to touch-friendly selection with active checkmarks.

---

## 8. Security & Row-Level Security (RLS)

1. **Strict Multi-Tenancy:**
   - Every row in `public.saved_searches` requires `user_id UUID NOT NULL REFERENCES public.profiles(id)`.
   - RLS policy `auth.uid() = user_id` ensures users can never read, modify, or delete another user's saved searches.
2. **Input Sanitization:**
   - Saved search names trimmed and limited to 64 characters.
   - Query string sanitized to prevent SQL/XSS injection.
3. **Guest / Demo Mode Isolation:**
   - Guest searches persist exclusively in `localStorage` under `devvault-local-saved-searches`.
   - Authenticating will offer automatic migration of local saved searches to Supabase (mirroring resource migration).

---

## 9. Comprehensive Test Strategy

### 9.1 Automated Test Suite (`scripts/verify-phase-02-4-3-saved-searches.js`)
- **Group 1: Advanced Sorting Unit Tests (Genuinely Executed):**
  - Test all 6 sort options on mock resource arrays.
  - Test A–Z and Z–A localized title ordering.
  - Test timestamp-based `recent`, `oldest`, and `updated` ordering.
  - Test `relevance` ordering with multi-term tokens and verify score ranking.
  - Test `relevance` fallback to recency when query is empty.
- **Group 2: Saved Search Data & Service Tests (Genuinely Executed):**
  - Test `createSavedSearch()`, `fetchSavedSearches()`, `updateSavedSearch()`, and `deleteSavedSearch()` with local storage mock.
  - Test atomic criteria serialization and deserialization.
  - Test `recordSearchUsed()` updates `last_used_at`.
- **Group 3: Migration 009 Contract Verification (Contract Assertions):**
  - Verify SQL schema, columns, unique constraints, indexes, RLS policies, and triggers.
- **Group 4: Headless Chrome CDP UI Verification (Genuinely Executed):**
  - Apply multiple filters -> click "Save view" -> enter name -> confirm save.
  - Clear all filters -> open Saved Views dropdown -> click saved item.
  - Verify all 8 filter controls and sorting state restore synchronously.
  - Verify sorting dropdown switches between all 6 sort options.
  - Test mobile bottom sheet viewports (375x812) and 44px tap targets.
  - Test light and dark themes.

---

## 10. Ordered Implementation Stages

1. **Stage 1 (Current):** Branch synchronization and architecture audit report.
2. **Stage 2:** Core Sorting & TypeScript Types (`src/types/sorting.ts`, `src/lib/search/search-matcher.ts`).
3. **Stage 3:** Database Migration Authoring (`supabase/migrations/009_saved_searches.sql`).
4. **Stage 4:** Saved Search Service Layer (`src/services/saved-search-service.ts`) with dual Supabase/local fallback.
5. **Stage 5:** UI Components (`SaveViewModal`, `SavedViewsDropdown`, expanded Sort dropdown in `LibraryView.tsx`).
6. **Stage 6:** Design System CSS (`src/app/globals.css`).
7. **Stage 7:** Automated Verification Suite & Headless Chrome Testing.
8. **Stage 8:** Pre-commit Review & Quality Audits (`type-check`, `lint`, `build`).

---

## 11. Risks & Dependencies

- **Dependency on Migration 008:** Migration 009 builds on the schema and filter conventions established in Migration 008.
- **State Synchronization:** Applying a saved search updates 8 distinct React state hooks in `LibraryView`. Ensuring these update atomically without triggering multiple redundant server queries requires proper debouncing or grouped state updates.
- **Local Storage Quota:** Saved searches store lightweight strings and metadata; storage footprint is minimal (<10KB).

---

**Execution complete.** Stage 1 architecture audit delivered. Awaiting explicit user authorization before commencing Stage 2 implementation.
