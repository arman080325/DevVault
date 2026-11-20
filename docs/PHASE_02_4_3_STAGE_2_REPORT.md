# DevVault — Phase 02.4.3 Stage 2 Implementation Report
## TypeScript Types & Advanced Sorting Engine

**Milestone:** Phase 02.4.3 — Saved Searches & Advanced Sorting  
**Stage:** Stage 2 — TypeScript Types & Advanced Sorting Engine Implementation  
**Date:** November 20, 2026  
**Status:** Completed & 100% Verified  
**Active Branch:** `feat/phase-02-4-3-saved-searches`  
**Base Commit (production main):** `6957495d0e04f78bcea2a1d83bf9a939e539e041`  

---

## 1. Executive Summary

In Stage 2 of Phase 02.4.3, we engineered the unified TypeScript type system and pure sorting engine for DevVault. This establishes the client-side foundations for multi-dimensional saved search state and multi-option resource ordering across both in-memory datasets and Supabase-persisted rows.

All 14 required sorting engine scenarios and edge cases were validated with an automated test suite (`scripts/verify-phase-02-4-3-sorting.js`), achieving **67 of 67 assertions passed (100%)**.

---

## 2. Inspecting Existing Code & Runtime Realities

Before introducing changes, the codebase was inspected to align with existing patterns:
1. **`src/data/figmaResources.ts`**:
   - `FigmaResource` previously included `createdAt?: string;` and `saved: string;`, but lacked `updatedAt?: string;`.
   - Demo resources used human-readable relative strings (`"Today"`, `"Yesterday"`, `"2 days ago"`, `"May 19"`), requiring timestamp parsers to handle both ISO-8601 timestamps and relative date phrases.
2. **`src/lib/search/search-matcher.ts`**:
   - `calculateMatchScore()` returned weighted scores (0 to 100+) based on Title, Tags, Collection, Category, Domain/URL, and Notes.
   - `getResourceTimestamp()` handled ISO dates, `"today"`, and `"yesterday"`, but lacked `"X days ago"` and `updatedAt` resolution.
3. **`src/services/resource-service.ts`**:
   - `mapRowToFigmaResource()` mapped `row.created_at` to `createdAt` and formatted `saved`, but omitted `updatedAt`.
   - `SearchResourceCriteria` lacked a `sortOrder` parameter.
4. **`src/components/views/library-view.tsx`**:
   - Contained a localized `SortOption = "recent" | "oldest" | "title"`, using naive subtraction (`b.id - a.id`).
   - Left intact in Stage 2 to prevent premature UI redesign before Stage 5.

---

## 3. TypeScript Type Architecture

Defined in `src/data/figmaResources.ts` and re-exported through `src/lib/search/search-matcher.ts`:

```typescript
export interface FigmaResource {
  id: number;
  remoteId?: string;
  kind: ResourceKind;
  source: string;
  domain: string;
  title: string;
  description: string;
  category: string;
  length: string;
  saved: string;
  status: "To explore" | "Exploring" | "Completed";
  progress?: number;
  collection?: string;
  url?: string;
  notes?: string;
  tags?: string[];
  pinned?: boolean;
  favorite?: boolean;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string; // Added for chronological update tracking
}

export type AdvancedSortOption =
  | "recent"
  | "oldest"
  | "title-asc"
  | "title-desc"
  | "updated"
  | "relevance";

export type LegacySortOption = "title";

export type SortOption = AdvancedSortOption | LegacySortOption;

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

## 4. Advanced Sorting Engine Implementation

Implemented in `src/lib/search/search-matcher.ts`:

### 4.1 Timestamp Extraction & Safety (`getResourceUpdatedTimestamp`)
- Evaluates `resource.updatedAt` first. If missing, undefined, or invalid (`NaN`), safely falls back to `getResourceTimestamp(resource)`.
- `getResourceTimestamp` parses:
  - ISO-8601 strings (`resource.createdAt`)
  - Relative strings (`"Today"`, `"Yesterday"`, `"(\d+) days ago"`)
  - Date strings (`"May 19"`)
  - Returns `null` if unparseable, preventing `NaN` corruption during comparison.

### 4.2 Safe `NULLS LAST` Ordering
Missing or invalid timestamps are systematically placed at the **end** of results for both ascending and descending chronological sorts (`recent`, `oldest`, `updated`):
```typescript
if (tsA !== null && tsB === null) return -1;
if (tsA === null && tsB !== null) return 1;
```

### 4.3 Deterministic Multi-Tier Tie-Breaking
When primary sort values are equal:
1. **Timestamp Sorts (`recent`, `updated`, `oldest`)**:
   - Secondary: `id` numeric comparison (`(b.id || 0) - (a.id || 0)` or `(a.id || 0) - (b.id || 0)`)
   - Tertiary: `title.localeCompare(...)`
   - Quaternary: `remoteId.localeCompare(...)`
2. **Title Sorts (`title-asc`, `title-desc`, legacy `title`)**:
   - Uses `localeCompare(..., undefined, { sensitivity: "base", numeric: true })` for case-insensitive natural sort.
   - Secondary: `id` numeric comparison.
   - Tertiary: `remoteId.localeCompare(...)`.
3. **Relevance Sort (`relevance`)**:
   - Primary: `scoreB - scoreA` using `calculateMatchScore(item, tokens)`.
   - Secondary: Recency (`recent` timestamp comparison).
   - Tertiary: Deterministic ID / title tie-breaker.
   - If query string is empty, undefined, or whitespace: transparently falls back to `recent`.

### 4.4 Immutability Guarantee
`sortResources` always operates on a shallow copy (`[...list].sort(...)`) and returns a new array reference, guaranteeing the caller's input array is never mutated.

---

## 5. Service Layer Integration (`src/services/resource-service.ts`)

1. **Row Mapping:** `mapRowToFigmaResource()` now maps `updatedAt: row.updated_at`.
2. **Search Criteria:** `SearchResourceCriteria` now accepts `sortOrder?: SortOption;`.
3. **RPC Result Sorting:** When `criteria?.sortOrder` is supplied, `mapped` results are sorted via `sortResources(mapped, criteria.sortOrder, cleanQ)`.
4. **PostgREST Fallback:** Automatically passes `sortOrder` to `searchMatcherResources`.
5. **Local Cache Fallback:** `searchLocalCache()` passes `sortOrder: criteria?.sortOrder` to `searchMatcherResources`.

---

## 6. Verification & Automated Test Suite

A comprehensive test suite was executed via `node scripts/verify-phase-02-4-3-sorting.js`:

| Scenario | Tested Capabilities | Status |
| :--- | :--- | :---: |
| **1. Recently Saved** | Monotonically descending `createdAt` ordering | **PASS** |
| **2. Oldest Saved** | Monotonically ascending `createdAt` ordering | **PASS** |
| **3. Title A–Z** | Natural alphanumeric locale-aware sort + legacy `"title"` alias | **PASS** |
| **4. Title Z–A** | Reverse alphabetical locale-aware sort | **PASS** |
| **5. Recently Updated** | `updatedAt` prioritization with fallback to `createdAt` | **PASS** |
| **6. Relevance** | Active query token scoring (Title > Tag > Description > Unrelated) | **PASS** |
| **7. Relevance Fallback** | Empty, undefined, and whitespace queries falling back to `recent` | **PASS** |
| **8. Missing Timestamps** | Safe `NULLS LAST` handling with zero errors or `NaN` | **PASS** |
| **9. Invalid Dates** | Invalid date strings (`"invalid-date"`) placed safely at end | **PASS** |
| **10. Equal Timestamps** | Deterministic tie-breaking across permutations | **PASS** |
| **11. UUID & Large IDs** | 32-bit hash-derived IDs ($> 2^{31}$) and UUID `remoteId` | **PASS** |
| **12. Immutability** | `sorted !== original` and original array unmutated | **PASS** |
| **13. Combined Filter + Sort** | `searchResources` composing multi-field filters with sorting | **PASS** |
| **14. Demo Compatibility** | `INITIAL_FIGMA_RESOURCES` running all 6 sorting modes cleanly | **PASS** |

**Summary:** 67/67 assertions passed (100%).

---

## 7. Quality Checks

- **`npm run type-check`**: **PASSED** (0 TypeScript errors)
- **`npm run lint`**: **PASSED** (0 ESLint errors/warnings)
- **`npm run build`**: **PASSED** (Next.js production build succeeded)

---

## 8. Preserved Git State & Scope Boundaries

- **Active Branch:** `feat/phase-02-4-3-saved-searches`
- **Main Branch:** Untouched at `6957495d0e04f78bcea2a1d83bf9a939e539e041`
- **Git Stashes Preserved:** `stash@{0}`, `stash@{1}`
- **Screenshots Preserved:** All audit screenshots intact
- **Boundary Adherence:**
  - No SQL migrations created in Stage 2.
  - No `saved-search-service.ts` created yet (deferred to Stage 4).
  - No Library UI redesign (deferred to Stage 5).
  - No commits or pushes performed.

---

## 9. Stage 3 Readiness

Stage 2 is fully complete and verified. The codebase is ready for **Stage 3: Database Migration Authoring (`009_saved_searches.sql`)** upon user authorization.
