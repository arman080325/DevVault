/**
 * DevVault In-Memory LRU & TTL Resource Query Cache
 *
 * Provides high-speed caching for search and library queries with:
 * - Deterministic criteria key serialization
 * - Time-to-live (TTL) expiration
 * - Least Recently Used (LRU) entry eviction
 * - User-scoped cache invalidation (on mutations)
 * - In-flight request deduplication to prevent redundant network fetches
 */

import type { PaginatedResult, FigmaResource } from "@/data/figmaResources";
import type { SearchResourceCriteria } from "@/services/resource-service";

interface CacheEntry<T> {
  key: string;
  value: T;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastAccessed: number;
}

export interface ResourceCacheOptions {
  maxEntries?: number;
  defaultTtlMs?: number;
}

export class ResourceQueryCache {
  private entries = new Map<string, CacheEntry<PaginatedResult<FigmaResource>>>();
  private inFlightPromises = new Map<string, Promise<PaginatedResult<FigmaResource>>>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  constructor(options?: ResourceCacheOptions) {
    this.maxEntries = options?.maxEntries ?? 50;
    this.defaultTtlMs = options?.defaultTtlMs ?? 2 * 60 * 1000; // 2 minutes
  }

  /**
   * Generates a deterministic cache key from userId and query criteria.
   */
  public generateKey(
    userId: string | null | undefined,
    criteria?: SearchResourceCriteria
  ): string {
    const uid = userId || "guest";
    const q = (criteria?.query || "").trim().toLowerCase();
    const platform = criteria?.platform || "All";
    const category = criteria?.category || "All";
    const status = criteria?.status || "All";
    const collection = (criteria?.collection || "All").trim().toLowerCase();

    // Sort tags for canonical key
    const tags = Array.isArray(criteria?.tags)
      ? [...criteria.tags].map((t) => t.trim().toLowerCase()).sort().join(",")
      : criteria?.tag
      ? criteria.tag.trim().toLowerCase()
      : "";

    const fav = criteria?.favorite !== undefined ? String(criteria.favorite) : "";
    const pin = criteria?.pinned !== undefined ? String(criteria.pinned) : "";
    const bkm = criteria?.bookmarked !== undefined ? String(criteria.bookmarked) : "";
    const datePreset = criteria?.datePreset || "all";
    const dateFrom = criteria?.dateFrom || "";
    const dateTo = criteria?.dateTo || "";
    const sort = criteria?.sortOrder || "recent";
    const page = criteria?.page ?? 1;
    const pageSize = criteria?.pageSize ?? 24;

    return `${uid}|${q}|${platform}|${category}|${status}|${collection}|${tags}|${fav}|${pin}|${bkm}|${datePreset}|${dateFrom}|${dateTo}|${sort}|${page}|${pageSize}`;
  }

  /**
   * Retrieves an item from the cache if present and unexpired.
   * Updates LRU access timestamp.
   */
  public get(key: string): PaginatedResult<FigmaResource> | null {
    const entry = this.entries.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }

    // Update LRU position
    entry.lastAccessed = now;
    // Map insertion order update for Map iterator LRU
    this.entries.delete(key);
    this.entries.set(key, entry);

    // Return a shallow clone of items to prevent external mutation
    return {
      ...entry.value,
      items: [...entry.value.items],
    };
  }

  /**
   * Stores an item in the cache with LRU eviction and TTL.
   */
  public set(
    key: string,
    value: PaginatedResult<FigmaResource>,
    userId?: string | null,
    ttlMs?: number
  ): void {
    const now = Date.now();
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;
    const uid = userId || "guest";

    // If cache is at max capacity, evict the least recently used entry
    if (this.entries.size >= this.maxEntries && !this.entries.has(key)) {
      let oldestKey: string | null = null;
      let oldestAccess = Infinity;

      for (const [k, e] of this.entries.entries()) {
        if (e.lastAccessed < oldestAccess) {
          oldestAccess = e.lastAccessed;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.entries.delete(oldestKey);
      }
    }

    this.entries.set(key, {
      key,
      value: {
        ...value,
        items: [...value.items],
      },
      userId: uid,
      createdAt: now,
      expiresAt: now + effectiveTtl,
      lastAccessed: now,
    });
  }

  /**
   * Invalidates all cache entries for a specific user (or guest).
   * If userId is omitted or null, invalidates all entries.
   */
  public invalidateUser(userId?: string | null): void {
    if (!userId) {
      this.entries.clear();
      this.inFlightPromises.clear();
      return;
    }

    for (const [key, entry] of this.entries.entries()) {
      if (entry.userId === userId || entry.userId === "guest") {
        this.entries.delete(key);
      }
    }

    this.inFlightPromises.clear();
  }

  /**
   * Clears the entire cache and in-flight promises.
   */
  public clear(): void {
    this.entries.clear();
    this.inFlightPromises.clear();
  }

  /**
   * In-flight promise tracking to prevent duplicate network calls.
   */
  public getInFlight(key: string): Promise<PaginatedResult<FigmaResource>> | undefined {
    return this.inFlightPromises.get(key);
  }

  public setInFlight(
    key: string,
    promise: Promise<PaginatedResult<FigmaResource>>
  ): void {
    this.inFlightPromises.set(key, promise);
    // Automatically clean up when promise resolves or rejects
    promise.finally(() => {
      if (this.inFlightPromises.get(key) === promise) {
        this.inFlightPromises.delete(key);
      }
    });
  }

  public size(): number {
    return this.entries.size;
  }
}

// Singleton query cache instance for the application
export const resourceCache = new ResourceQueryCache();
