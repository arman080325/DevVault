import type {
  FigmaResource,
  SortOption,
  AdvancedSortOption,
  SavedSearchItem,
  PaginatedResult,
} from "../../data/figmaResources";

export type { SortOption, AdvancedSortOption, SavedSearchItem, PaginatedResult };

export interface SearchMatchOptions {
  /** Filter by specific source/platform (e.g. "GitHub", "YouTube") or "All" */
  platform?: string;
  /** Filter by status (e.g. "To explore", "Exploring", "Completed") or "All" */
  status?: string;
  /** Filter by category or "All" */
  category?: string;
  /** Filter by specific collection name or "All" */
  collection?: string;
  /** Filter by single tag name (backward compatibility) */
  tag?: string;
  /** Filter by multiple tag names (AND semantics: resource must have all tags) */
  tags?: string[];
  /** Filter by favorite flag */
  favorite?: boolean;
  /** Filter by pinned flag */
  pinned?: boolean;
  /** Filter by bookmarked state (matches favorite OR pinned) */
  bookmarked?: boolean;
  /** Filter by lower timestamp boundary */
  dateFrom?: string | Date;
  /** Filter by upper timestamp boundary */
  dateTo?: string | Date;
  /** Predefined date ranges */
  datePreset?: "all" | "today" | "7d" | "30d" | "year";
  /** Optional sort order applied to matched results */
  sortOrder?: SortOption;
  /** Optional 1-based page index */
  page?: number;
  /** Optional items per page */
  pageSize?: number;
}

/**
 * Resolves a date preset ("today", "7d", "30d", "year") into Date boundary objects.
 */
export function resolveDatePresetBoundaries(
  preset?: "all" | "today" | "7d" | "30d" | "year"
): { dateFrom?: Date; dateTo?: Date } {
  if (!preset || preset === "all") return {};

  const now = new Date();
  if (preset === "today") {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { dateFrom: startOfToday };
  }
  if (preset === "7d") {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { dateFrom: sevenDaysAgo };
  }
  if (preset === "30d") {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { dateFrom: thirtyDaysAgo };
  }
  if (preset === "year") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return { dateFrom: startOfYear };
  }
  return {};
}

/**
 * Extracts a numeric timestamp from a resource's createdAt or saved field.
 */
export function getResourceTimestamp(resource: FigmaResource): number | null {
  if (resource.createdAt) {
    const ts = new Date(resource.createdAt).getTime();
    if (!isNaN(ts)) return ts;
  }
  if (!resource.saved) return null;
  const s = resource.saved.toLowerCase().trim();
  const now = Date.now();
  if (s === "today") {
    return now;
  }
  if (s === "yesterday") {
    return now - 24 * 60 * 60 * 1000;
  }
  const daysAgoMatch = s.match(/^(\d+)\s+days?\s+ago$/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    return now - days * 24 * 60 * 60 * 1000;
  }
  const parsed = Date.parse(resource.saved);
  if (!isNaN(parsed)) return parsed;
  return null;
}

/**
 * Extracts a numeric timestamp from a resource's updatedAt field,
 * falling back to getResourceTimestamp(resource).
 */
export function getResourceUpdatedTimestamp(resource: FigmaResource): number | null {
  if (resource.updatedAt) {
    const ts = new Date(resource.updatedAt).getTime();
    if (!isNaN(ts)) return ts;
  }
  return getResourceTimestamp(resource);
}

/**
 * Evaluates whether a resource satisfies the provided SearchMatchOptions.
 */
export function evaluateResourceOptions(
  resource: FigmaResource,
  options?: SearchMatchOptions
): boolean {
  if (!options) return true;

  // 1. Platform / Source filter
  if (
    options.platform &&
    options.platform !== "All" &&
    resource.source.toLowerCase() !== options.platform.toLowerCase() &&
    resource.kind.toLowerCase() !== options.platform.toLowerCase()
  ) {
    return false;
  }

  // 2. Status filter
  if (
    options.status &&
    options.status !== "All" &&
    resource.status.toLowerCase() !== options.status.toLowerCase()
  ) {
    return false;
  }

  // 3. Category filter
  if (
    options.category &&
    options.category !== "All" &&
    resource.category.toLowerCase() !== options.category.toLowerCase()
  ) {
    return false;
  }

  // 4. Collection filter
  if (
    options.collection &&
    options.collection !== "All" &&
    resource.collection?.toLowerCase() !== options.collection.toLowerCase()
  ) {
    return false;
  }

  // 5. Single-tag filter (backward compatibility)
  if (
    options.tag &&
    options.tag !== "All" &&
    !(resource.tags || []).some(
      (t) => t.toLowerCase() === options.tag!.toLowerCase()
    )
  ) {
    return false;
  }

  // 6. Multi-tag filter (AND semantics: resource must have all requested tags)
  if (options.tags && options.tags.length > 0) {
    const resTags = (resource.tags || []).map((t) => t.toLowerCase());
    const hasAllTags = options.tags.every((req) =>
      resTags.includes(req.toLowerCase().trim())
    );
    if (!hasAllTags) {
      return false;
    }
  }

  // 7. Favorite flag
  if (options.favorite !== undefined && resource.favorite !== options.favorite) {
    return false;
  }

  // 8. Pinned flag
  if (options.pinned !== undefined && resource.pinned !== options.pinned) {
    return false;
  }

  // 9. Bookmarked state (matches favorite OR pinned)
  if (options.bookmarked !== undefined) {
    const isBookmarked = Boolean(resource.pinned || resource.favorite);
    if (isBookmarked !== options.bookmarked) {
      return false;
    }
  }

  // 10. Date boundaries & Presets
  const presetBounds = resolveDatePresetBoundaries(options.datePreset);
  const effectiveFrom = options.dateFrom
    ? new Date(options.dateFrom)
    : presetBounds.dateFrom;
  const effectiveTo = options.dateTo
    ? new Date(options.dateTo)
    : presetBounds.dateTo;

  if (effectiveFrom || effectiveTo) {
    const resTimestamp = getResourceTimestamp(resource);
    if (resTimestamp !== null) {
      if (effectiveFrom && resTimestamp < effectiveFrom.getTime()) {
        return false;
      }
      if (effectiveTo && resTimestamp > effectiveTo.getTime()) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Tokenizes and normalizes a search query string into clean tokens.
 * Handles excess whitespace, lowercasing, and strips framing punctuation
 * while preserving internal punctuation (e.g., "next.js", "c++", "ui/ux", "web-dev").
 */
export function tokenizeQuery(rawQuery?: string): string[] {
  if (!rawQuery) return [];
  const trimmed = rawQuery.trim();
  if (!trimmed) return [];

  // Split on whitespace
  const rawTokens = trimmed.toLowerCase().split(/\s+/);

  const tokens: string[] = [];
  for (const token of rawTokens) {
    // Strip leading/trailing punctuation characters (e.g. quotes, brackets, colons, commas)
    // but preserve characters like '+', '#', '.', '-', '/' inside the term
    const clean = token.replace(/^["'`([{<]+|["'`)\]}>:;,.]+$/g, "");
    if (clean.length > 0) {
      tokens.push(clean);
    }
  }

  return tokens;
}

/**
 * Normalizes a URL into searchable segments: domain, pathname, and segments.
 */
function extractSearchableUrlParts(urlStr?: string): string {
  if (!urlStr) return "";
  try {
    const parsed = new URL(urlStr);
    const domain = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    // Replace slashes and hyphens with spaces for token segmentation
    const pathSegments = pathname.replace(/[/\-_.]/g, " ");
    return `${domain} ${pathname} ${pathSegments}`;
  } catch {
    // In case of non-standard or partial URL
    return urlStr.toLowerCase().replace(/[/\-_.]/g, " ");
  }
}

/**
 * Calculates a relevance score for a resource against a set of search tokens.
 * Returns 0 if not all tokens match. Higher score indicates stronger match.
 */
export function calculateMatchScore(resource: FigmaResource, tokens: string[]): number {
  if (tokens.length === 0) return 1;

  let totalScore = 0;

  const titleLower = (resource.title || "").toLowerCase();
  const descLower = (resource.description || "").toLowerCase();
  const notesLower = (resource.notes || "").toLowerCase();
  const catLower = (resource.category || "").toLowerCase();
  const sourceLower = (resource.source || "").toLowerCase();
  const domainLower = (resource.domain || "").toLowerCase();
  const colLower = (resource.collection || "").toLowerCase();
  const tagsLower = (resource.tags || []).map((t) => t.toLowerCase());
  const urlParts = extractSearchableUrlParts(resource.url);

  // Every token must match somewhere in the resource (AND condition)
  for (const token of tokens) {
    let tokenScore = 0;

    // Title matches (Highest priority)
    if (titleLower === token) {
      tokenScore += 100;
    } else if (titleLower.startsWith(token + " ") || titleLower.endsWith(" " + token)) {
      tokenScore += 70;
    } else if (titleLower.includes(token)) {
      tokenScore += 50;
    }

    // Tag matches (High priority)
    if (tagsLower.includes(token)) {
      tokenScore += 45;
    } else if (tagsLower.some((t) => t.includes(token))) {
      tokenScore += 30;
    }

    // Collection matches
    if (colLower === token) {
      tokenScore += 40;
    } else if (colLower.includes(token)) {
      tokenScore += 25;
    }

    // Category matches
    if (catLower === token) {
      tokenScore += 35;
    } else if (catLower.includes(token)) {
      tokenScore += 20;
    }

    // Platform / Source / Domain matches
    if (sourceLower === token || domainLower === token) {
      tokenScore += 30;
    } else if (sourceLower.includes(token) || domainLower.includes(token)) {
      tokenScore += 15;
    }

    // URL & Path matches
    if (urlParts.includes(token)) {
      tokenScore += 25;
    }

    // Personal notes matches
    if (notesLower.includes(token)) {
      tokenScore += 20;
    }

    // Description matches
    if (descLower.includes(token)) {
      tokenScore += 15;
    }

    // If this token didn't match any field, the resource fails the AND search
    if (tokenScore === 0) {
      return 0;
    }

    totalScore += tokenScore;
  }

  // Bonus for favorites or pinned resources
  if (resource.pinned) totalScore += 5;
  if (resource.favorite) totalScore += 5;

  return totalScore;
}

/**
 * Checks whether a single resource matches the given search query and options.
 * Evaluates Title, Description, Notes, URL & Path, Platform/Source, Category,
 * Tags, and Collection names.
 */
export function matchResource(
  resource: FigmaResource,
  rawQuery?: string,
  options?: SearchMatchOptions
): boolean {
  // 1. Check options filters if provided
  if (options && !evaluateResourceOptions(resource, options)) {
    return false;
  }

  // 2. Check query string
  const tokens = tokenizeQuery(rawQuery);
  if (tokens.length === 0) {
    return true;
  }

  return calculateMatchScore(resource, tokens) > 0;
}

/**
 * Pure filter function to search and rank an array of FigmaResources.
 */
export function searchResources(
  resources: FigmaResource[],
  query?: string,
  options?: SearchMatchOptions
): FigmaResource[] {
  const tokens = tokenizeQuery(query);

  const hasEmptyOptions =
    !options ||
    (Object.entries(options).every(([k, v]) => {
      if (v === undefined || v === null || v === "All" || v === "all") return true;
      if (Array.isArray(v) && v.length === 0) return true;
      return false;
    }));

  if (tokens.length === 0 && hasEmptyOptions) {
    return resources;
  }

  const resultsWithScore: { resource: FigmaResource; score: number }[] = [];

  for (const resource of resources) {
    // Check options first
    if (options && !evaluateResourceOptions(resource, options)) {
      continue;
    }

    if (tokens.length === 0) {
      resultsWithScore.push({ resource, score: 1 });
      continue;
    }

    const score = calculateMatchScore(resource, tokens);
    if (score > 0) {
      resultsWithScore.push({ resource, score });
    }
  }

  // If sortOrder is explicitly specified, sort using sortResources
  if (options?.sortOrder) {
    const rawMatches = resultsWithScore.map((item) => item.resource);
    return sortResources(rawMatches, options.sortOrder, query);
  }

  // Default: sort by score descending
  resultsWithScore.sort((a, b) => b.score - a.score);

  return resultsWithScore.map((item) => item.resource);
}

/**
 * Paginates an array of items given page index (1-based) and pageSize.
 * Ensures stable boundary handling, bounds clamping, and deterministic counts.
 */
export function paginateResources<T>(
  list: T[],
  page: number = 1,
  pageSize: number = 24
): PaginatedResult<T> {
  const safePageSize = Math.max(1, pageSize);
  const totalCount = list.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (safePage - 1) * safePageSize;
  const items = list.slice(startIndex, startIndex + safePageSize);

  return {
    items,
    totalCount,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    hasMore: safePage < totalPages,
  };
}

/**
 * Searches and paginates resources synchronously in a single deterministic pass.
 */
export function searchResourcesPaginated(
  resources: FigmaResource[],
  query?: string,
  options?: SearchMatchOptions
): PaginatedResult<FigmaResource> {
  const matches = searchResources(resources, query, options);
  return paginateResources(matches, options?.page ?? 1, options?.pageSize ?? 24);
}

/**
 * Internal comparator by timestamp for 'recent', 'oldest', and 'updated'.
 * Handles missing/invalid timestamps safely by ordering them last.
 * Uses deterministic tie-breaking on equal timestamps.
 */
function compareByTimestamp(
  a: FigmaResource,
  b: FigmaResource,
  direction: "desc" | "asc",
  useUpdated = false
): number {
  const tsA = useUpdated ? getResourceUpdatedTimestamp(a) : getResourceTimestamp(a);
  const tsB = useUpdated ? getResourceUpdatedTimestamp(b) : getResourceTimestamp(b);

  // Missing or invalid timestamps are consistently sorted to the end
  if (tsA !== null && tsB === null) return -1;
  if (tsA === null && tsB !== null) return 1;

  if (tsA !== null && tsB !== null && tsA !== tsB) {
    return direction === "desc" ? tsB - tsA : tsA - tsB;
  }

  // Deterministic tie-breaker
  const idDiff = direction === "desc" ? (b.id || 0) - (a.id || 0) : (a.id || 0) - (b.id || 0);
  if (idDiff !== 0) return idDiff;

  const titleCmp = (a.title || "").localeCompare(b.title || "", undefined, {
    sensitivity: "base",
    numeric: true,
  });
  if (titleCmp !== 0) {
    return direction === "desc" ? -titleCmp : titleCmp;
  }

  return (a.remoteId || "").localeCompare(b.remoteId || "");
}

/**
 * Internal comparator by title for 'title-asc' and 'title-desc'.
 * Uses locale-aware, case-insensitive natural sort.
 * Uses deterministic tie-breaking on equal titles.
 */
function compareByTitle(
  a: FigmaResource,
  b: FigmaResource,
  direction: "asc" | "desc"
): number {
  const titleA = a.title || "";
  const titleB = b.title || "";
  const cmp = titleA.localeCompare(titleB, undefined, {
    sensitivity: "base",
    numeric: true,
  });

  if (cmp !== 0) {
    return direction === "asc" ? cmp : -cmp;
  }

  // Deterministic tie-breaker on identical titles
  const idDiff = direction === "asc" ? (a.id || 0) - (b.id || 0) : (b.id || 0) - (a.id || 0);
  if (idDiff !== 0) return idDiff;

  return direction === "asc"
    ? (a.remoteId || "").localeCompare(b.remoteId || "")
    : (b.remoteId || "").localeCompare(a.remoteId || "");
}

/**
 * Internal comparator by relevance match score.
 * Falls back to 'recent' if query is empty or scores are identical.
 */
function compareByRelevance(
  a: FigmaResource,
  b: FigmaResource,
  tokens: string[]
): number {
  if (tokens.length === 0) {
    return compareByTimestamp(a, b, "desc", false);
  }

  const scoreA = calculateMatchScore(a, tokens);
  const scoreB = calculateMatchScore(b, tokens);

  if (scoreA !== scoreB) {
    return scoreB - scoreA;
  }

  // Fall back to recent on equal scores
  return compareByTimestamp(a, b, "desc", false);
}

/**
 * Pure sorting function for an array of FigmaResources.
 * Never mutates the input array; always returns a new sorted shallow copy.
 *
 * Supported Sort Options:
 * - 'recent': Recently saved (createdAt / saved descending)
 * - 'oldest': Oldest saved (createdAt / saved ascending)
 * - 'title-asc' | 'title': Title A-Z (locale-aware string comparison)
 * - 'title-desc': Title Z-A (locale-aware string comparison)
 * - 'updated': Recently updated (updatedAt descending, fallback to createdAt / saved)
 * - 'relevance': Most relevant by search match score (fallback to 'recent')
 */
export function sortResources(
  list: FigmaResource[],
  order: SortOption = "recent",
  query?: string
): FigmaResource[] {
  if (!list || list.length === 0) {
    return [];
  }

  const copy = [...list];
  const tokens = order === "relevance" ? tokenizeQuery(query) : [];

  return copy.sort((a, b) => {
    switch (order) {
      case "oldest":
        return compareByTimestamp(a, b, "asc", false);
      case "title-asc":
      case "title": // Legacy alias
        return compareByTitle(a, b, "asc");
      case "title-desc":
        return compareByTitle(a, b, "desc");
      case "updated":
        return compareByTimestamp(a, b, "desc", true);
      case "relevance":
        return compareByRelevance(a, b, tokens);
      case "recent":
      default:
        return compareByTimestamp(a, b, "desc", false);
    }
  });
}
