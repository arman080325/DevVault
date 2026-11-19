# DevVault — Phase 02.4.1: Global Search Architecture Audit Report

**Date:** November 19, 2026  
**Status:** Audit Complete — Awaiting Implementation Authorization  
**Current Branch:** `feat/phase-02-3-smart-metadata`  
**Current Checkpoint:** `ae0ec11` (synced with `origin/feat/phase-02-3-smart-metadata`)  
**Parent Checkpoint:** `dbf023f`  

---

## Executive Summary

As part of Phase 02.4.1, we conducted an exhaustive architectural and code-level audit of DevVault's search capabilities across the user interface, client state management, database schema, Row-Level Security (RLS) policies, and persistence services.

The primary objective is to design a robust, high-performance **Global Search Engine** capable of efficiently indexing and retrieving resources across **Title**, **Description**, **Original URL**, **Personal Notes**, **Tags**, **Platform/Provider**, and **Collection (Shelf) Names**, scaling seamlessly from small local demo libraries to large multi-thousand item personal vaults in Supabase PostgreSQL without violating multi-tenant security boundaries.

### Key Audit Findings at a Glance

1. **Current Search is Strictly Client-Side:** Search filtering is implemented as an in-memory `useMemo` filter inside `src/components/views/library-view.tsx`. No server-side querying or indexing currently exists.
2. **Missing Search Fields (Discovered Gaps):**
   - **Personal Notes (`resource.notes`):** Completely omitted from `matchesQuery` in `library-view.tsx:54-61`, even though the search input placeholder explicitly advertises *"Search titles, notes, tags or sources..."*.
   - **Original URL (`resource.url`):** Omitted from `matchesQuery`. Searching for specific domain paths or repository slugs yields zero results unless the domain string matches.
   - **Platform / Source:** Only filtered if selected via dropdown pill tabs; typing "github" or "youtube" into the text input does not match the `source` field.
3. **Database Unindexed for Search:** The Supabase `resources` table contains B-Tree indexes on `(user_id, status)`, `(user_id, category)`, etc., but **zero text search indexes** (`tsvector`), **no GIN indexes**, and **no trigram indexes**.
4. **Data Scalability Bound:** The app currently loads all resources into client memory via unpaginated `fetchResources(userId)`. While acceptable for small vaults, this will fail or degrade performance once libraries exceed hundreds or thousands of items.
5. **No Visual Loading States:** `LibraryView` provides no loading feedback, skeleton state, or network degradation indicators for search operations.

---

## 1. Existing Architecture Findings

### 1.1 Search Entry Points & Propagation Flow

```
[TopNav] (.global-search button)  ──┐
                                     ├──> handleOpenSearch() (src/app/page.tsx)
[AppShell] (⌘K / Ctrl+K hotkey)    ──┘         │
                                               ├─> setPage("library")
                                               └─> focus(".library-search input")
                                                       │
[LibraryView] (.library-search input) ─────────────────┴─> searchQuery state
                                                               │
                                                       useMemo() filter
                                                               │
                                                   [visible: FigmaResource[]]
```

1. **Top Navigation (`src/components/layout/top-nav.tsx`):**
   - Renders a trigger button `.global-search` styled like a search box with a shortcut badge (`<kbd>⌘ K</kbd>`).
   - Clicking it invokes `onSearch()`.
   - On mobile viewports (`max-width: 768px`), CSS collapses this button into a 38px circular search icon button (`.global-search span, .global-search kbd { display: none }`).
2. **Global Keyboard Listener (`src/components/layout/app-shell.tsx`):**
   - Attaches a `keydown` listener to `window`.
   - Binds `(e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"` to `onSearch()`.
   - Ignores keypresses when the active element is an `<input>`, `<textarea>`, or `isContentEditable`.
3. **Application Root State (`src/app/page.tsx`):**
   - Owns `searchQuery` state (`const [searchQuery, setSearchQuery] = React.useState("")`).
   - Implements `handleOpenSearch`:
     ```typescript
     const handleOpenSearch = React.useCallback(() => {
       setPage("library");
       window.setTimeout(() => {
         document.querySelector<HTMLInputElement>(".library-search input")?.focus();
       }, 60);
     }, []);
     ```
   - Implements `handleSelectCollection` (invoked when clicking a shelf in CollectionsView):
     ```typescript
     const handleSelectCollection = React.useCallback((name: string) => {
       setSearchQuery(name);
       setPage("library");
       window.scrollTo({ top: 0, behavior: "smooth" });
     }, []);
     ```
4. **Library View (`src/components/views/library-view.tsx`):**
   - Receives `resources: FigmaResource[]`, `query: string`, and `onQueryChange: (q: string) => void`.
   - Houses the controlled `<input>` with search icon, clear button (`X`), and `<kbd>⌘ K</kbd>`.

---

## 2. Relevant Files & Current Responsibilities

| File Path | Component / Module | Current Responsibility |
|---|---|---|
| `src/components/views/library-view.tsx` | `LibraryView` | Controlled search input, clear button, client-side in-memory `useMemo` filtering, sort options, source filters, view toggle (grid/list), empty state rendering. |
| `src/components/layout/top-nav.tsx` | `TopNav` | Desktop search trigger bar with `⌘ K` badge; mobile circular search button. |
| `src/components/layout/app-shell.tsx` | `AppShell` | Global `⌘K`/`Ctrl+K` keydown listener, theme container, layout orchestration. |
| `src/components/layout/mobile-nav.tsx` | `MobileNav` | Bottom navigation bar on mobile (Home, Library, Save, Explore, Collections). Directs to Library view where search input lives. |
| `src/app/page.tsx` | `Page` (Root) | Holds `searchQuery` state, orchestrates navigation to `"library"`, provides data fixtures, initializes Supabase / local storage data. |
| `src/services/resource-service.ts` | `resourceService` | `fetchResources(userId)` loads all user resources from Supabase with joined tags & collections; fallback to `localStorage`. `createResource`, `updateResource`, `deleteResource`. |
| `src/services/tag-service.ts` | `tagService` | `searchByTag(userId, tagName)` queries Supabase `tags` with joined `resource_tags` and `resources`. |
| `src/services/collection-service.ts` | `collectionService` | `fetchCollections(userId)` queries Supabase collections with resource counts; fallback to `localStorage`. |
| `src/types/resource.ts` | Type definitions | Platform types, category types, metadata interfaces (`ResourceItem`, `PlatformType`). |
| `src/data/figmaResources.ts` | `FigmaResource` & Fixtures | Canonical frontend interface (`FigmaResource`), fixture data (`INITIAL_FIGMA_RESOURCES`). |
| `src/components/dashboard/command-palette.tsx` | `CommandPalette` | **Unused legacy component** from early prototype. Contains an alternative search dialog using `lucide-react` and `ResourceItem`. |
| `supabase/migrations/002_create_resources.sql` | SQL Schema | Table definition and B-Tree indexes for `resources`. |
| `supabase/migrations/003_create_collections.sql` | SQL Schema | Table definition and junction table `collection_resources`. |
| `supabase/migrations/004_create_tags.sql` | SQL Schema | Table definition and junction table `resource_tags`. |
| `supabase/migrations/006_row_level_security.sql` | SQL RLS | Row-level security policies isolating data by `auth.uid() = user_id`. |

---

## 3. Current Search Limitations & Discovered Bugs

### 3.1 Code Inspection of Current Filter Logic

In `src/components/views/library-view.tsx:51-69`:
```typescript
const visible = useMemo(() => {
  const filtered = resources.filter((resource) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      resource.title.toLowerCase().includes(q) ||
      resource.description.toLowerCase().includes(q) ||
      resource.category.toLowerCase().includes(q) ||
      resource.domain.toLowerCase().includes(q) ||
      (resource.collection && resource.collection.toLowerCase().includes(q)) ||
      (resource.tags && resource.tags.some((t) => t.toLowerCase().includes(q)));

    const matchesFilter =
      filter === "All" ||
      resource.source.toLowerCase() === filter.toLowerCase() ||
      resource.kind.toLowerCase() === filter.toLowerCase();

    return matchesQuery && matchesFilter;
  });
  // ... sorting
}, [resources, query, filter, sortOrder]);
```

### 3.2 Specific Deficiencies & Bugs

1. **Bug: `resource.notes` is NOT Searched:**
   - In `library-view.tsx:123`, the placeholder reads:
     `placeholder="Search titles, notes, tags or sources..."`
   - However, `resource.notes` is **never evaluated** in `matchesQuery`! Any personal markdown notes or learning takeaways written by the user are completely invisible to search.
2. **Bug: `resource.url` is NOT Searched:**
   - Neither `original_url` nor `normalized_url` is evaluated. Only `resource.domain` is checked. Searching for a specific path (e.g., `/vercel/next.js` or `devvault.app/docs`) fails.
3. **Bug: Platform / Provider is NOT Searched in Text Query:**
   - `resource.source` (e.g. "GitHub", "YouTube", "Docs") is only checked if selected from the dropdown tab bar (`matchesFilter`). If a user types "YouTube" into the search bar, it does not match unless the title or description contains "YouTube".
4. **Limitation: Dataset Scale Bound (Loaded Memory Only):**
   - Search operates strictly on `resources` passed down as props.
   - If a user has 5,000 resources, fetching all 5,000 upfront causes huge memory bloat and slow initial page loads. When pagination or virtualization is introduced, items not loaded in the client cannot be found.
5. **Limitation: No Database Text Indexing:**
   - In PostgreSQL, queries using `ILIKE '%term%'` without indexes force expensive sequential scans (`Seq Scan`) across every row.
   - PostgreSQL `to_tsvector` and GIN indexes are currently absent.
6. **Limitation: Missing Asynchronous Feedback:**
   - There is no loading spinner, skeleton placeholder, or search progress state.
   - When a query yields 0 results, the empty state displays `Nothing found for “{query}”`, but does not differentiate between an in-progress search, a network timeout, or an empty library.

---

## 4. Answers to Mandatory Architecture Questions

### Question 1: Is search currently frontend-only?
**YES.** Search is 100% frontend-only. All filtering occurs synchronously inside `LibraryView` via JavaScript `Array.prototype.filter()` over React state. No database or HTTP API endpoint is queried when typing in the search bar.

### Question 2: Does search operate on the complete resource collection or only loaded resources?
**Loaded resources only.** Search has zero awareness of rows stored in Supabase that have not been pre-loaded into the React `resources` state array.

### Question 3: Can search find resources by tags and notes?
- **Tags:** YES. `(resource.tags && resource.tags.some((t) => t.toLowerCase().includes(q)))` searches tag names in memory.
- **Notes:** **NO.** As discovered in Section 3, `resource.notes` was omitted from the filter condition.

### Question 4: Can it search through collection names?
**YES, in memory.** `(resource.collection && resource.collection.toLowerCase().includes(q))` checks the string property `resource.collection`. In the database, collection names are stored in `collections` and linked via `collection_resources`, requiring a join.

### Question 5: How should Supabase search work without violating RLS?
Supabase PostgREST client queries automatically forward the user's JWT authorization header. All RLS policies in `006_row_level_security.sql` enforce `USING (auth.uid() = user_id)`.
- When querying `supabase.from("resources").select(...)`, PostgreSQL strictly scopes the scan to rows where `user_id = auth.uid()`.
- No user can ever view or search another user's resources, even if executing arbitrary search vectors or `ILIKE` patterns.
- Any helper database function (e.g., PostgreSQL RPC) must either run with standard invoker rights or explicitly enforce `WHERE user_id = auth.uid()`.

### Question 6: Should we use PostgreSQL full-text search, ILIKE, or a hybrid approach?
**Recommended: Hybrid Approach.**
- **PostgreSQL Full-Text Search (FTS with GIN Index):**
  - Uses `to_tsvector('english', ...)` and `websearch_to_tsquery('english', ...)`.
  - Excellent for natural language, word stems ("dockerizing" matches "docker"), and multi-word ranking (`ts_rank`).
  - Limitations: Poor at partial string or URL prefix matching (e.g. typing "you" does not match "youtube").
- **Trigram / Substring (`ILIKE` / `pg_trgm`):**
  - Matches exact substrings and partial URLs.
- **The Hybrid Strategy:**
  - In PostgreSQL: A generated `search_vector tsvector` column with a GIN index for ranked full-text queries, complemented by `.or()` fallback on `original_url.ilike.%term%` and `title.ilike.%term%`.
  - In Client: Instant local filtering over cached resources during debounce, switching seamlessly to deep server search.

### Question 7: How should local/demo mode behave consistently?
- In local/demo mode (unauthenticated or offline), the app stores data in `localStorage` (`devvault-local-resources`).
- A unified search matcher utility (`searchEngine.matchResource(resource, tokens)`) will be used by both the local cache service and the client-side instant filter.
- It will evaluate all 7 required dimensions (Title, Description, Notes, URL, Tags, Platform, Collection) with identical tokenization logic.

### Question 8: How can we debounce input without introducing stale results?
- **Debounce:** 250ms–300ms delay between keypresses before initiating remote search.
- **Request Cancellation:** Use native `AbortController` passed to the fetch/Supabase query to abort obsolete in-flight requests.
- **Sequence ID Tracking:** Maintain an incrementing `searchSeqRef` integer. When an asynchronous query completes, verify `response.seq === searchSeqRef.current`. If stale, discard the result.

### Question 9: What happens when there are no results, loading errors, or an offline connection?
- **No Results:** Display the editorial empty state (`Nothing found for “{query}”`) with one-click actions: "Clear search" and "Reset active filters".
- **Loading State:** Subtle non-disruptive progress line across the search bar (`.search-loading-bar`) without jarring layout shifts.
- **Offline / Network Error:** Gracefully fallback to in-memory/localStorage search with a calm badge: *"Offline — searching saved cache"*. Never crash or display a blank screen.

### Question 10: How can we support future filtering without rewriting the search architecture?
By defining a strongly typed `SearchFilterCriteria` contract:
```typescript
export interface SearchFilterCriteria {
  query: string;
  platform?: PlatformType | "All";
  status?: ResourceStatus | "All";
  category?: string | "All";
  collectionId?: string;
  tags?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
  sortBy?: "recent" | "oldest" | "title" | "relevance";
}
```
All search providers (Supabase RPC, PostgREST query, Local Cache) implement this identical criteria contract.

---

## 5. Recommended Search Architecture: The Hybrid Tiered Model

```
                            [User Types in Search Input]
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
          [Immediate (0ms)]                          [Debounced (300ms)]
     Client-Side Cache Filter                      Deep Vault Server Search
                   │                                           │
       Matches loaded resources in                 Checks if online & authenticated
       React state across all 7 fields                         │
                   │                                ┌──────────┴──────────┐
                   ▼                                ▼                     ▼
        Instant Results Displayed             [Cloud Vault]         [Local/Offline]
        (Zero perceptible latency)            PostgreSQL FTS        localStorage scan
                                                    │
                                                    ▼
                                           Merge / Update View
                                           (if deep results found)
```

### Benefits of the Hybrid Tiered Model

1. **Sub-millisecond responsiveness:** For users with under 100 items or during rapid typing, results update instantly at 60 FPS.
2. **Deep search capabilities:** Once the debounce window expires, a background query searches the full database (including unpaginated items, archived items, and full notes).
3. **Zero UI flicker:** The user immediately sees matches from currently loaded memory; deep server results smoothly enrich the list without clearing the screen.

---

## 6. Proposed Database & Query Strategy

### 6.1 Database Migration Plan (Proposed for Phase 02.4.2)

To enable high-performance text search in PostgreSQL without full table scans, we propose adding a generated `search_vector` column and GIN index to `public.resources`:

```sql
-- Migration: 007_search_indexes.sql (Proposed)

-- 1. Add generated tsvector column combining title (A), category/platform (B), description/notes (C), domain (D)
ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(category, '') || ' ' || coalesce(platform, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '') || ' ' || coalesce(personal_notes, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(source_domain, '')), 'D')
) STORED;

-- 2. Create GIN index on search_vector
CREATE INDEX IF NOT EXISTS idx_resources_search_vector
  ON public.resources USING gin(search_vector);

-- 3. Create trigram extension and index for URL and exact substring search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_resources_title_trgm
  ON public.resources USING gin(title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_resources_url_trgm
  ON public.resources USING gin(original_url gin_trgm_ops);
```

### 6.2 PostgREST Query Construction with RLS Safety

In `src/services/resource-service.ts`:
```typescript
async searchResources(
  userId: string,
  criteria: SearchFilterCriteria
): Promise<FigmaResource[]> {
  const supabase = getBrowserSupabase();
  if (!supabase || !userId) {
    return this.searchLocalCache(criteria);
  }

  const { query, platform, status, category, sortBy } = criteria;
  const cleanQ = query.trim();

  // Base query with joined tags and collections
  let q = supabase
    .from("resources")
    .select(`
      *,
      resource_tags ( tags ( name ) ),
      collection_resources ( collections ( name ) )
    `)
    .eq("user_id", userId); // Strictly enforces user tenancy alongside RLS

  if (platform && platform !== "All") {
    q = q.eq("platform", platform);
  }
  if (status && status !== "All") {
    q = q.eq("status", status);
  }
  if (category && category !== "All") {
    q = q.eq("category", category);
  }

  if (cleanQ) {
    // Hybrid FTS or ILIKE fallback
    const formattedFts = cleanQ.split(/\s+/).filter(Boolean).map(t => `${t}:*`).join(" & ");
    q = q.or(`search_vector.fts.${formattedFts},original_url.ilike.%${cleanQ}%,title.ilike.%${cleanQ}%`);
  }

  // Execute query with sorting
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;

  return (data || []).map(r => {
    const tags = (r.resource_tags || []).map((rt: any) => rt.tags?.name).filter(Boolean);
    const colName = r.collection_resources?.[0]?.collections?.name;
    return mapRowToFigmaResource(r, tags, colName);
  });
}
```

---

## 7. Local & Demo Fallback Strategy

To ensure seamless offline demo functionality and complete consistency with cloud search:

1. **Shared Tokenizer (`src/lib/search/search-matcher.ts`):**
   ```typescript
   export function matchResource(resource: FigmaResource, rawQuery: string): boolean {
     if (!rawQuery.trim()) return true;
     
     const terms = rawQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
     
     // Build consolidated searchable corpus
     const corpus = [
       resource.title,
       resource.description,
       resource.notes || "",
       resource.url || "",
       resource.domain,
       resource.source,
       resource.category,
       resource.collection || "",
       ...(resource.tags || []),
     ].join(" ").toLowerCase();

     // Every term in a multi-word query must match
     return terms.every(term => corpus.includes(term));
   }
   ```
2. **Local Cache Execution:**
   - Reads `localStorage.getItem("devvault-local-resources")`.
   - Applies `matchResource` and filter options.
   - Preserves active sort order (`recent`, `oldest`, `title`).

---

## 8. Frontend Integration Plan

### 8.1 Visual & UX Continuity (Figma Design System)

The search implementation will strictly preserve DevVault's established editorial aesthetic:
- **Typography:** Newsreader serif for headings, Instrument Sans for UI body, IBM Plex Mono for `<kbd>⌘ K</kbd>`.
- **Theme Support:** Clean, contrast-compliant styling in both Light mode (Warm Parchment) and Dark mode (Warm Espresso).
- **Search Header & Count:** Live update of `visible.length resources` with highlighted search query.
- **Empty State:** Highlighting the query term with one-click "Clear search" and "Reset filters" buttons.
- **Keyboard Navigation:**
  - `⌘K` / `Ctrl+K`: Opens/focuses search input.
  - `Esc`: Clears query if text is present, or blurs input.
  - Arrow down from search input focuses the first resource card.

### 8.2 Loading Indicator Specification
A discreet 2px indeterminate progress bar beneath the search input container:
```css
.library-search.is-loading::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 100%;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  animation: search-shimmer 1.2s infinite;
}
```

---

## 9. Security & RLS Considerations

1. **Zero Data Leakage:**
   - PostgreSQL RLS enforces `auth.uid() = user_id` at the database kernel level.
   - Client queries parameterize search inputs, preventing SQL injection.
2. **Sanitization of FTS Input:**
   - Special characters in user queries (e.g. `!`, `&`, `|`, `(`, `)`, `:`, `*`) must be sanitized before passing to `tsquery` to prevent syntax exceptions.
   - Use `websearch_to_tsquery` or token prefix sanitization (`encodeURIComponent` or regex cleanup `replace(/[^\w\s]/g, '')`).
3. **No Unauthenticated Leaks:**
   - Offline mode only accesses data stored in the current browser's `localStorage`.

---

## 10. Comprehensive Test Plan

### Test Suite Structure (Planned for Phase 02.4.2)

1. **Unit & Logic Tests (`scripts/verify-phase-02-4-search.js`):**
   - **Assertion Group 1: Tokenization & Multi-field Matching:**
     - Match across Title, Description, Personal Notes, Original URL, Tags, Platform/Source, and Collection.
     - Case-insensitivity tests (`"react"`, `"REACT"`, `"ReAcT"`).
     - Multi-word search (e.g., `"tailwind css animations"`).
   - **Assertion Group 2: Empty & Edge Case Queries:**
     - Blank / whitespace-only queries return all items.
     - Punctuation and special characters (`!@#$%^&*()`) sanitized without error.
     - Zero-match query produces empty array and valid empty state metadata.
   - **Assertion Group 3: Sorting & Filtering Concurrency:**
     - Query combined with Platform filter ("GitHub").
     - Query combined with Sort Order ("Title A-Z", "Recently saved").
   - **Assertion Group 4: Local Storage Fallback:**
     - Correctly searches local fixtures when unauthenticated or offline.
2. **Supabase Database & RLS Tests:**
   - Verify search vector generation and GIN index performance.
   - Verify User A cannot find User B's resources even with identical search queries.
3. **CDP Headless Browser UI Tests:**
   - Test `⌘K` global keydown navigation from Home view to Library search.
   - Type query and verify live card count updates.
   - Test "Clear search" (`X`) button restoration.
   - Test Mobile search button trigger and focus.
   - Visual regression screenshot in Light and Dark mode.

---

## 11. Sequential Implementation Tasks for Phase 02.4.2

1. **Task 1: Search Matcher Engine & Bug Fixes (`src/lib/search/search-matcher.ts`):**
   - Implement normalized multi-field matching covering all 7 fields (including missing `notes` and `url`).
   - Add query sanitizer for safe FTS and regex matching.
2. **Task 2: Service Layer & Async Search API (`src/services/resource-service.ts`):**
   - Implement `searchResources(userId, criteria, signal)` with debounce and abort support.
   - Add local cache fallback matching.
3. **Task 3: Database Search Migration (Optional / Recommended):**
   - Add `search_vector` generated column and GIN indexes in `supabase/migrations/007_search_indexes.sql`.
4. **Task 4: Library View UI & Loading State (`src/components/views/library-view.tsx`):**
   - Integrate debounced search with loading feedback.
   - Wire up `Esc` key handling to clear query.
   - Enhance empty state with helpful tips and filter resets.
5. **Task 5: Mobile & Global Nav Polish (`top-nav.tsx`, `mobile-nav.tsx`):**
   - Ensure mobile search button transitions smoothly to the search input.
6. **Task 6: Verification & Test Automation:**
   - Create and run `scripts/verify-phase-02-4-search.js`.
   - Run type checks, linting, and production build.

---

## 12. Verification & Guardrails Confirmation

- [x] **Application code completely untouched:** No `.ts`, `.tsx`, or `.css` files were modified.
- [x] **Database migrations completely untouched:** No SQL migrations were modified.
- [x] **Dependencies unchanged:** No packages installed or removed.
- [x] **Git branch unchanged:** Active branch remains `feat/phase-02-3-smart-metadata`.
- [x] **Git working tree clean:** `git status` reports working tree clean (excluding new report).
- [x] **Phase 02.4.2 implementation not started.**
