/**
 * DevVault — In-Memory Metadata Cache
 * 
 * Bounded LRU cache with URL canonicalization, TTL-based expiration,
 * and memory-safe eviction.
 */

import { NormalizedMetadata } from './types';

interface CacheEntry {
  data: NormalizedMetadata;
  expiresAt: number;
}

const DEFAULT_MAX_ITEMS = 1000;
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Marketing attribution tracking query parameters stripped during URL canonicalization.
 * Note: Generic parameters like 'ref' or 'source' are intentionally preserved to prevent
 * cache collisions across version branches (e.g. GitHub ?ref=v1.0.0) or custom query parameters.
 */
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  '_openstat',
  'twclid',
  'igshid',
  'wbraid',
  'gbraid',
]);

/**
 * Normalizes a URL for use as a deterministic cache key.
 */
export function normalizeUrlForCache(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());

    // Normalize protocol and hostname
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    // Strip fragment
    parsed.hash = '';

    // Strip common tracking parameters and sort remaining query params
    const searchParams = new URLSearchParams(parsed.search);
    const sortedKeys = Array.from(searchParams.keys())
      .filter((key) => !TRACKING_PARAMS.has(key.toLowerCase()))
      .sort();

    const cleanedParams = new URLSearchParams();
    for (const key of sortedKeys) {
      const values = searchParams.getAll(key);
      for (const val of values) {
        cleanedParams.append(key, val);
      }
    }

    parsed.search = cleanedParams.toString();

    // Remove trailing slash if path is longer than '/'
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.href;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

export class MetadataCache {
  private cache: Map<string, CacheEntry>;
  private maxItems: number;
  private defaultTtlMs: number;

  constructor(maxItems: number = DEFAULT_MAX_ITEMS, defaultTtlMs: number = DEFAULT_TTL_MS) {
    this.cache = new Map();
    this.maxItems = maxItems;
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Retrieves an item from the cache. Updates LRU order if valid.
   */
  get(rawUrl: string): NormalizedMetadata | null {
    const key = normalizeUrlForCache(rawUrl);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU order: delete and re-insert at end of Map
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * Stores an item with TTL. Evicts least recently used item if capacity reached.
   */
  set(rawUrl: string, data: NormalizedMetadata, ttlMs?: number): void {
    const key = normalizeUrlForCache(rawUrl);
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;
    const expiresAt = Date.now() + effectiveTtl;

    // If key already exists, delete it so re-insert moves to end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxItems) {
      // Evict least recently used (first key in map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Check whether key exists and is unexpired without altering LRU order.
   */
  has(rawUrl: string): boolean {
    const key = normalizeUrlForCache(rawUrl);
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Deletes a specific entry.
   */
  delete(rawUrl: string): boolean {
    const key = normalizeUrlForCache(rawUrl);
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Current number of stored entries.
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * Global singleton cache instance for the application process.
 */
export const metadataCache = new MetadataCache();
