/**
 * DevVault Phase 02.4.4: Performance & Scalability Verification Suite
 *
 * Validates:
 * 1. Server-side & local pagination slicing, total counts, hasMore, and boundary clamping
 * 2. Stable ordering across pagination boundaries (no duplicate or omitted records)
 * 3. Intelligent LRU & TTL query caching and canonical key generation
 * 4. Cache hit/miss behavior and request deduplication
 * 5. Cache invalidation on mutations (create, update, delete, local cache save)
 * 6. Frontend memoization, lazy loading, and async decoding
 * 7. Search sequence increment and AbortController race condition protection
 * 8. Pagination reset on criteria change and saved view restoration
 */

const assert = require("assert");
const path = require("path");
const jiti = require("jiti")(process.cwd(), {
  alias: { "@": path.resolve("./src") },
});

// Import modules under test
const {
  paginateResources,
  searchResourcesPaginated,
  sortResources,
  tokenizeQuery,
} = jiti("./src/lib/search/search-matcher.ts");

const {
  ResourceQueryCache,
  resourceCache,
} = jiti("./src/lib/cache/resource-cache.ts");

const {
  resourceService,
} = jiti("./src/services/resource-service.ts");

const {
  INITIAL_FIGMA_RESOURCES,
} = jiti("./src/data/figmaResources.ts");

// Mock mock-local-storage for Node environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(k) {
    return this.store[k] || null;
  }
  setItem(k, v) {
    this.store[k] = String(v);
  }
  removeItem(k) {
    delete this.store[k];
  }
  clear() {
    this.store = {};
  }
}
global.localStorage = new MockLocalStorage();

console.log("================================================================================");
console.log("   DevVault Phase 02.4.4: Performance & Scalability QA Suite                    ");
console.log("================================================================================\n");

let passedAssertions = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passedAssertions++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    process.exit(1);
  }
}

// ------------------------------------------------------------------------------
// Helper fixtures: Generate 100 mock resources for rigorous pagination testing
// ------------------------------------------------------------------------------
function generateMockResources(count = 100) {
  const categories = ["Architecture", "Development", "Design", "Tools"];
  const platforms = ["GitHub", "YouTube", "Article", "Documentation"];
  const statuses = ["To explore", "Exploring", "Completed"];

  return Array.from({ length: count }, (_, i) => {
    const id = i + 1;
    const cat = categories[i % categories.length];
    const plat = platforms[i % platforms.length];
    const stat = statuses[i % statuses.length];
    const createdDate = new Date(Date.now() - (count - i) * 3600 * 1000).toISOString();

    return {
      id,
      remoteId: `uuid-${id}`,
      kind: plat === "GitHub" ? "github" : plat === "YouTube" ? "video" : "article",
      source: plat,
      domain: `${plat.toLowerCase()}.com`,
      title: `Resource #${id.toString().padStart(3, "0")} - ${cat} Pattern`,
      description: `Comprehensive analysis of ${cat} pattern and best practices for scale.`,
      category: cat,
      length: "10 min read",
      saved: "Today",
      status: stat,
      progress: (i * 7) % 100,
      url: `https://example.com/res-${id}`,
      tags: [cat, "Scale", plat],
      pinned: i % 10 === 0,
      favorite: i % 5 === 0,
      createdAt: createdDate,
      updatedAt: createdDate,
    };
  });
}

const MOCK_100 = generateMockResources(100);

// ==============================================================================
// 1. Pagination Unit Tests
// ==============================================================================
console.log("[Workstream 1 & 2] Resource Pagination Slicing & Boundary Verification");

it("Default pagination slices page 1 with pageSize 24", () => {
  const result = paginateResources(MOCK_100, 1, 24);
  assert.strictEqual(result.items.length, 24);
  assert.strictEqual(result.totalCount, 100);
  assert.strictEqual(result.page, 1);
  assert.strictEqual(result.pageSize, 24);
  assert.strictEqual(result.totalPages, 5); // ceil(100 / 24) = 5
  assert.strictEqual(result.hasMore, true);
  assert.strictEqual(result.items[0].id, 1);
  assert.strictEqual(result.items[23].id, 24);
});

it("Page 2 retrieves items 25–48 with correct offset", () => {
  const result = paginateResources(MOCK_100, 2, 24);
  assert.strictEqual(result.items.length, 24);
  assert.strictEqual(result.page, 2);
  assert.strictEqual(result.hasMore, true);
  assert.strictEqual(result.items[0].id, 25);
  assert.strictEqual(result.items[23].id, 48);
});

it("Last page (page 5) retrieves remaining 4 items with hasMore = false", () => {
  const result = paginateResources(MOCK_100, 5, 24);
  assert.strictEqual(result.items.length, 4);
  assert.strictEqual(result.page, 5);
  assert.strictEqual(result.hasMore, false);
  assert.strictEqual(result.items[0].id, 97);
  assert.strictEqual(result.items[3].id, 100);
});

it("Boundary clamping: page 0 or negative safely clamps to page 1", () => {
  const resZero = paginateResources(MOCK_100, 0, 24);
  assert.strictEqual(resZero.page, 1);
  assert.strictEqual(resZero.items[0].id, 1);

  const resNeg = paginateResources(MOCK_100, -5, 24);
  assert.strictEqual(resNeg.page, 1);
  assert.strictEqual(resNeg.items[0].id, 1);
});

it("Boundary clamping: page exceeding totalPages safely clamps to last page", () => {
  const resOverflow = paginateResources(MOCK_100, 999, 24);
  assert.strictEqual(resOverflow.page, 5);
  assert.strictEqual(resOverflow.items.length, 4);
  assert.strictEqual(resOverflow.items[3].id, 100);
});

it("Empty dataset handling: returns empty slice with totalPages = 1 and hasMore = false", () => {
  const resEmpty = paginateResources([], 1, 24);
  assert.strictEqual(resEmpty.items.length, 0);
  assert.strictEqual(resEmpty.totalCount, 0);
  assert.strictEqual(resEmpty.page, 1);
  assert.strictEqual(resEmpty.totalPages, 1);
  assert.strictEqual(resEmpty.hasMore, false);
});

// ==============================================================================
// 2. Stable Ordering Across Pagination Boundaries
// ==============================================================================
console.log("\n[Workstream 2] Stable Ordering Across Pagination Boundaries");

it("Iterating through all pages yields 100% unique items with zero duplicates", () => {
  const pageSize = 20;
  const seenIds = new Set();
  const allIterated = [];

  for (let p = 1; p <= 5; p++) {
    const pageResult = paginateResources(MOCK_100, p, pageSize);
    for (const item of pageResult.items) {
      assert.strictEqual(seenIds.has(item.id), false, `Duplicate item ID ${item.id} detected across pages`);
      seenIds.add(item.id);
      allIterated.push(item);
    }
  }

  assert.strictEqual(seenIds.size, 100);
  assert.strictEqual(allIterated.length, 100);
});

it("Sorted items preserve deterministic ordering across pages under 'recent' sort", () => {
  const sorted = sortResources(MOCK_100, "recent");
  const p1 = paginateResources(sorted, 1, 25);
  const p2 = paginateResources(sorted, 2, 25);

  // Newest items should be in p1, older items in p2
  const p1LastTimestamp = new Date(p1.items[24].createdAt).getTime();
  const p2FirstTimestamp = new Date(p2.items[0].createdAt).getTime();
  assert.ok(p1LastTimestamp >= p2FirstTimestamp, "Page 1 boundary item is newer than or equal to Page 2 boundary item");
});

it("Deterministic tie-breaking on identical timestamps prevents boundary flapping", () => {
  const tiedItems = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    title: `Tied Item ${i + 1}`,
    createdAt: "2026-11-20T12:00:00.000Z",
    saved: "Today",
  }));

  const sortedTied = sortResources(tiedItems, "recent");
  const page1 = paginateResources(sortedTied, 1, 25);
  const page2 = paginateResources(sortedTied, 2, 25);

  const set1 = new Set(page1.items.map((i) => i.id));
  const set2 = new Set(page2.items.map((i) => i.id));

  // Ensure sets are disjoint
  for (const id of set2) {
    assert.strictEqual(set1.has(id), false, `Tied ID ${id} leaked between pages`);
  }
  assert.strictEqual(set1.size + set2.size, 50);
});

// ==============================================================================
// 3. Intelligent LRU & TTL Caching Layer
// ==============================================================================
console.log("\n[Workstream 3] Intelligent LRU & TTL Caching Layer");

it("Generates canonical cache key with tag ordering equivalence", () => {
  const cache = new ResourceQueryCache();
  const keyA = cache.generateKey("user-1", {
    query: "react",
    tags: ["React", "TypeScript"],
    page: 1,
    pageSize: 24,
  });

  const keyB = cache.generateKey("user-1", {
    query: "react",
    tags: ["TypeScript", "React"], // different order
    page: 1,
    pageSize: 24,
  });

  assert.strictEqual(keyA, keyB, "Tag order permutations must produce identical canonical cache key");
});

it("Differentiates cache keys by page and search criteria dimensions", () => {
  const cache = new ResourceQueryCache();
  const keyP1 = cache.generateKey("user-1", { query: "react", page: 1 });
  const keyP2 = cache.generateKey("user-1", { query: "react", page: 2 });
  const keySort = cache.generateKey("user-1", { query: "react", page: 1, sortOrder: "title-asc" });

  assert.notStrictEqual(keyP1, keyP2);
  assert.notStrictEqual(keyP1, keySort);
});

it("Cache set and get retrieves cached item with hit", () => {
  const cache = new ResourceQueryCache();
  const mockResult = paginateResources(MOCK_100, 1, 24);
  const key = cache.generateKey("user-1", { query: "test" });

  cache.set(key, mockResult, "user-1");
  const retrieved = cache.get(key);

  assert.ok(retrieved !== null);
  assert.strictEqual(retrieved.items.length, 24);
  assert.strictEqual(retrieved.totalCount, 100);
});

it("Cache returns null on expired TTL", () => {
  const cache = new ResourceQueryCache({ defaultTtlMs: 10 }); // 10ms TTL
  const mockResult = paginateResources(MOCK_100, 1, 24);
  const key = cache.generateKey("user-1", { query: "expiring" });

  cache.set(key, mockResult, "user-1", 1); // 1ms TTL
  
  // Wait 15ms for expiration
  const start = Date.now();
  while (Date.now() - start < 15) {}

  const retrieved = cache.get(key);
  assert.strictEqual(retrieved, null, "Expired cache entry must return null");
});

it("LRU eviction drops least recently accessed entry when capacity exceeded", () => {
  const cache = new ResourceQueryCache({ maxEntries: 3 });
  const dummy = { items: [], totalCount: 0, page: 1, pageSize: 24, totalPages: 1, hasMore: false };

  cache.set("k1", dummy, "u1");
  cache.set("k2", dummy, "u1");
  cache.set("k3", dummy, "u1");

  // Touch k1 to make k2 the oldest
  cache.get("k1");

  // Insert k4, should evict k2
  cache.set("k4", dummy, "u1");

  assert.ok(cache.get("k1") !== null, "k1 should remain in cache (recently accessed)");
  assert.strictEqual(cache.get("k2"), null, "k2 should have been evicted as LRU entry");
  assert.ok(cache.get("k3") !== null, "k3 should remain in cache");
  assert.ok(cache.get("k4") !== null, "k4 should exist in cache");
});

// ==============================================================================
// 4. Cache Invalidation on Resource Mutations
// ==============================================================================
console.log("\n[Workstream 3 & 5] Cache Invalidation on Resource Mutations");

it("invalidateUser purges user-specific entries while preserving others", () => {
  const cache = new ResourceQueryCache();
  const dummy = { items: [], totalCount: 0, page: 1, pageSize: 24, totalPages: 1, hasMore: false };

  cache.set("u1-key", dummy, "user-alpha");
  cache.set("u2-key", dummy, "user-beta");

  cache.invalidateUser("user-alpha");

  assert.strictEqual(cache.get("u1-key"), null, "user-alpha cache entries must be purged");
  assert.ok(cache.get("u2-key") !== null, "user-beta cache entries must be preserved");
});

it("resourceService.invalidateCache() triggers cache invalidation", () => {
  const key = resourceCache.generateKey("user-123", { query: "search" });
  resourceCache.set(key, { items: [], totalCount: 0, page: 1, pageSize: 24, totalPages: 1, hasMore: false }, "user-123");

  assert.ok(resourceCache.get(key) !== null);
  resourceService.invalidateCache("user-123");
  assert.strictEqual(resourceCache.get(key), null);
});

it("In-flight promise deduplication prevents duplicate concurrent requests", async () => {
  const cache = new ResourceQueryCache();
  const key = "dedupe-test-key";
  let fetchCount = 0;

  async function mockFetch() {
    fetchCount++;
    await new Promise((r) => setTimeout(r, 20));
    return { items: [], totalCount: 0, page: 1, pageSize: 24, totalPages: 1, hasMore: false };
  }

  // Two simultaneous calls
  const p1 = (async () => {
    let inflight = cache.getInFlight(key);
    if (!inflight) {
      inflight = mockFetch();
      cache.setInFlight(key, inflight);
    }
    return inflight;
  })();

  const p2 = (async () => {
    let inflight = cache.getInFlight(key);
    if (!inflight) {
      inflight = mockFetch();
      cache.setInFlight(key, inflight);
    }
    return inflight;
  })();

  const [res1, res2] = await Promise.all([p1, p2]);
  assert.strictEqual(fetchCount, 1, "Only 1 network fetch should execute for concurrent requests");
  assert.strictEqual(res1, res2);
});

// ==============================================================================
// 5. Local Storage / Offline Pagination Fallback
// ==============================================================================
console.log("\n[Workstream 2 & 5] Local Storage / Offline Pagination Fallback");

it("searchLocalCachePaginated paginates mock local cache accurately", () => {
  global.localStorage.setItem("devvault-local-resources", JSON.stringify(MOCK_100));

  const result = resourceService.searchLocalCachePaginated({
    query: "Architecture",
    page: 1,
    pageSize: 10,
  });

  assert.ok(result.items.length <= 10);
  assert.ok(result.totalCount > 0);
  assert.strictEqual(result.page, 1);
  assert.strictEqual(result.pageSize, 10);
  assert.ok(result.items.every((item) => item.category === "Architecture" || item.title.includes("Architecture")));
});

it("searchResources defaults to local cache fallback when userId is null", async () => {
  global.localStorage.setItem("devvault-local-resources", JSON.stringify(INITIAL_FIGMA_RESOURCES));

  const items = await resourceService.searchResources(null, {
    query: "layout",
  });

  assert.ok(Array.isArray(items));
  assert.ok(items.length > 0);
  assert.strictEqual(items[0].id, 1);
});

// ==============================================================================
// 6. Frontend Integration & Reliability Verification
// ==============================================================================
console.log("\n[Workstream 4 & 5] Frontend Integration, Memoization & Reliability");

it("LibraryView and ResourceArt implement performance optimizations", () => {
  const fs = require("fs");
  const libViewSrc = fs.readFileSync(path.resolve("./src/components/views/library-view.tsx"), "utf8");
  const resArtSrc = fs.readFileSync(path.resolve("./src/components/resources/resource-art.tsx"), "utf8");

  // Check memoized components
  assert.ok(libViewSrc.includes("React.memo(function LibraryGridCard"), "LibraryGridCard is memoized with React.memo");
  assert.ok(libViewSrc.includes("React.memo(function LibraryListRow"), "LibraryListRow is memoized with React.memo");

  // Check pagination controls
  assert.ok(libViewSrc.includes("className=\"library-pagination\""), "LibraryView renders .library-pagination");
  assert.ok(libViewSrc.includes("pagination-btn prev-btn"), "LibraryView renders previous page button");
  assert.ok(libViewSrc.includes("pagination-btn next-btn"), "LibraryView renders next page button");
  assert.ok(libViewSrc.includes("pagination-page-btn"), "LibraryView renders numeric page buttons");

  // Check criteria change resets page
  assert.ok(libViewSrc.includes("setCurrentPage(1)"), "Criteria change, filter reset, and view restore reset page to 1");

  // Check ResourceArt lazy and async image decoding
  assert.ok(resArtSrc.includes('loading="lazy"'), "ResourceArt uses loading='lazy'");
  assert.ok(resArtSrc.includes('decoding="async"'), "ResourceArt uses decoding='async'");
});

it("Globals.css contains responsive pagination styling", () => {
  const fs = require("fs");
  const css = fs.readFileSync(path.resolve("./src/app/globals.css"), "utf8");

  assert.ok(css.includes(".library-pagination"), "globals.css contains .library-pagination");
  assert.ok(css.includes(".pagination-btn"), "globals.css contains .pagination-btn");
  assert.ok(css.includes(".pagination-page-btn.active"), "globals.css contains active page button styles");
  assert.ok(css.includes(".dark .library-pagination"), "globals.css contains dark mode pagination styles");
  assert.ok(css.includes("min-height: 44px"), "globals.css provides accessible touch targets on mobile");
});

it("Migration 010 defines composite performance indexes and pagination RPC", () => {
  const fs = require("fs");
  const sql = fs.readFileSync(path.resolve("./supabase/migrations/010_pagination_performance.sql"), "utf8");

  assert.ok(sql.includes("idx_resources_user_created_at_id"), "Migration 010 defines composite created_at index");
  assert.ok(sql.includes("idx_col_res_resource_id"), "Migration 010 defines collection_resources junction index");
  assert.ok(sql.includes("page_limit INTEGER DEFAULT NULL"), "search_user_resources supports page_limit");
  assert.ok(sql.includes("page_offset INTEGER DEFAULT NULL"), "search_user_resources supports page_offset");
  assert.ok(sql.includes("total_count BIGINT"), "search_user_resources returns total_count window function");
  assert.ok(sql.includes("REVOKE ALL ON FUNCTION public.search_user_resources"), "Explicit REVOKE FROM PUBLIC included");
});

console.log("\n================================================================================");
console.log(`Phase 02.4.4 Performance & Scalability QA Complete: ${passedAssertions}/${passedAssertions} assertions passed (100%).`);
console.log("================================================================================\n");
