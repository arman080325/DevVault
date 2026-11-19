import type { FigmaResource } from "../../data/figmaResources";

export interface SearchMatchOptions {
  /** Filter by specific source/platform (e.g. "GitHub", "YouTube") or "All" */
  platform?: string;
  /** Filter by status (e.g. "To explore", "Exploring", "Completed") or "All" */
  status?: string;
  /** Filter by category or "All" */
  category?: string;
  /** Filter by specific collection name */
  collection?: string;
  /** Filter by specific tag name */
  tag?: string;
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
  if (options) {
    if (
      options.platform &&
      options.platform !== "All" &&
      resource.source.toLowerCase() !== options.platform.toLowerCase() &&
      resource.kind.toLowerCase() !== options.platform.toLowerCase()
    ) {
      return false;
    }

    if (
      options.status &&
      options.status !== "All" &&
      resource.status.toLowerCase() !== options.status.toLowerCase()
    ) {
      return false;
    }

    if (
      options.category &&
      options.category !== "All" &&
      resource.category.toLowerCase() !== options.category.toLowerCase()
    ) {
      return false;
    }

    if (
      options.collection &&
      resource.collection?.toLowerCase() !== options.collection.toLowerCase()
    ) {
      return false;
    }

    if (
      options.tag &&
      !(resource.tags || []).some(
        (t) => t.toLowerCase() === options.tag!.toLowerCase()
      )
    ) {
      return false;
    }
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

  if (tokens.length === 0 && (!options || Object.values(options).every((v) => !v || v === "All"))) {
    return resources;
  }

  const resultsWithScore: { resource: FigmaResource; score: number }[] = [];

  for (const resource of resources) {
    // Check options first
    if (options) {
      if (
        options.platform &&
        options.platform !== "All" &&
        resource.source.toLowerCase() !== options.platform.toLowerCase() &&
        resource.kind.toLowerCase() !== options.platform.toLowerCase()
      ) {
        continue;
      }

      if (
        options.status &&
        options.status !== "All" &&
        resource.status.toLowerCase() !== options.status.toLowerCase()
      ) {
        continue;
      }

      if (
        options.category &&
        options.category !== "All" &&
        resource.category.toLowerCase() !== options.category.toLowerCase()
      ) {
        continue;
      }

      if (
        options.collection &&
        resource.collection?.toLowerCase() !== options.collection.toLowerCase()
      ) {
        continue;
      }

      if (
        options.tag &&
        !(resource.tags || []).some(
          (t) => t.toLowerCase() === options.tag!.toLowerCase()
        )
      ) {
        continue;
      }
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

  return resultsWithScore.map((item) => item.resource);
}
