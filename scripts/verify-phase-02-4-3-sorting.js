/**
 * DevVault — Phase 02.4.3 Stage 2: Advanced Sorting Verification Suite
 *
 * Verifies all 14 required sorting engine scenarios:
 * 1. Recently saved timestamp ordering
 * 2. Oldest saved timestamp ordering
 * 3. Title A-Z (including legacy "title" alias)
 * 4. Title Z-A
 * 5. Recently updated with fallback timestamps
 * 6. Relevance sorting using active query
 * 7. Relevance fallback when query is empty
 * 8. Missing timestamps handling (safe NULLS LAST)
 * 9. Invalid timestamp strings ("invalid-date", NaN handling)
 * 10. Equal timestamps and deterministic tie-breaker
 * 11. UUID / hash-derived IDs handling
 * 12. Original array immutability (no in-place mutation)
 * 13. Combined search and advanced filters with sorting
 * 14. Local/demo resource compatibility (INITIAL_FIGMA_RESOURCES)
 */

const {
  sortResources,
  searchResources,
  getResourceTimestamp,
  getResourceUpdatedTimestamp,
} = require("../src/lib/search/search-matcher.ts");

const { INITIAL_FIGMA_RESOURCES } = require("../src/data/figmaResources.ts");

let totalChecks = 0;
let passedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("================================================================================");
console.log("   DevVault Phase 02.4.3 Stage 2: Sorting Engine Verification Suite            ");
console.log("================================================================================");

const baseTime = Date.now();
const oneHour = 60 * 60 * 1000;
const oneDay = 24 * oneHour;

// ---------------------------------------------------------------------------
// Scenario 1: Recently saved timestamp ordering
// ---------------------------------------------------------------------------
console.log("\n[Scenario 1] Recently saved timestamp ordering");
{
  const list = [
    { id: 1, title: "Older", createdAt: new Date(baseTime - 5 * oneDay).toISOString() },
    { id: 2, title: "Newest", createdAt: new Date(baseTime - 10 * 60 * 1000).toISOString() },
    { id: 3, title: "Middle", createdAt: new Date(baseTime - 2 * oneDay).toISOString() },
  ];
  const sorted = sortResources(list, "recent");
  assert(sorted[0].id === 2, "Newest item (10m ago) sorted first");
  assert(sorted[1].id === 3, "Middle item (2d ago) sorted second");
  assert(sorted[2].id === 1, "Older item (5d ago) sorted third");
}

// ---------------------------------------------------------------------------
// Scenario 2: Oldest saved timestamp ordering
// ---------------------------------------------------------------------------
console.log("\n[Scenario 2] Oldest saved timestamp ordering");
{
  const list = [
    { id: 1, title: "Newest", createdAt: new Date(baseTime - 10 * 60 * 1000).toISOString() },
    { id: 2, title: "Oldest", createdAt: new Date(baseTime - 30 * oneDay).toISOString() },
    { id: 3, title: "Middle", createdAt: new Date(baseTime - 5 * oneDay).toISOString() },
  ];
  const sorted = sortResources(list, "oldest");
  assert(sorted[0].id === 2, "Oldest item (30d ago) sorted first");
  assert(sorted[1].id === 3, "Middle item (5d ago) sorted second");
  assert(sorted[2].id === 1, "Newest item (10m ago) sorted third");
}

// ---------------------------------------------------------------------------
// Scenario 3: Title A-Z (and legacy 'title' alias)
// ---------------------------------------------------------------------------
console.log("\n[Scenario 3] Title A-Z (and legacy 'title' alias)");
{
  const list = [
    { id: 1, title: "Zustand State Management" },
    { id: 2, title: "apple documentation" },
    { id: 3, title: "Beta release notes" },
    { id: 4, title: "2 Tips for CSS" },
    { id: 5, title: "10 Tips for CSS" },
  ];
  const sortedAsc = sortResources(list, "title-asc");
  const sortedLegacy = sortResources(list, "title");

  assert(sortedAsc[0].title === "2 Tips for CSS", "Numeric title '2 Tips' precedes '10 Tips' with natural sort");
  assert(sortedAsc[1].title === "10 Tips for CSS", "'10 Tips' follows '2 Tips'");
  assert(sortedAsc[2].title === "apple documentation", "'apple documentation' precedes 'Beta' (case-insensitive base sensitivity)");
  assert(sortedAsc[3].title === "Beta release notes", "'Beta release notes' precedes 'Zustand'");
  assert(sortedAsc[4].title === "Zustand State Management", "'Zustand State Management' sorted last in A-Z");

  assert(
    JSON.stringify(sortedAsc.map((r) => r.id)) === JSON.stringify(sortedLegacy.map((r) => r.id)),
    "Legacy alias 'title' produces identical order to 'title-asc'"
  );
}

// ---------------------------------------------------------------------------
// Scenario 4: Title Z-A
// ---------------------------------------------------------------------------
console.log("\n[Scenario 4] Title Z-A");
{
  const list = [
    { id: 1, title: "Alpha guide" },
    { id: 2, title: "Gamma documentation" },
    { id: 3, title: "Beta patterns" },
  ];
  const sortedDesc = sortResources(list, "title-desc");
  assert(sortedDesc[0].title === "Gamma documentation", "'Gamma' sorted first in Z-A");
  assert(sortedDesc[1].title === "Beta patterns", "'Beta' sorted second in Z-A");
  assert(sortedDesc[2].title === "Alpha guide", "'Alpha' sorted third in Z-A");
}

// ---------------------------------------------------------------------------
// Scenario 5: Recently updated with fallback timestamps
// ---------------------------------------------------------------------------
console.log("\n[Scenario 5] Recently updated with fallback timestamps");
{
  const list = [
    {
      id: 1,
      title: "Created long ago, updated today",
      createdAt: new Date(baseTime - 30 * oneDay).toISOString(),
      updatedAt: new Date(baseTime - 1 * oneHour).toISOString(), // 1 hour ago
    },
    {
      id: 2,
      title: "Created yesterday, updated 2 hours ago",
      createdAt: new Date(baseTime - 1 * oneDay).toISOString(),
      updatedAt: new Date(baseTime - 2 * oneHour).toISOString(), // 2 hours ago
    },
    {
      id: 3,
      title: "No updatedAt, created 3 hours ago",
      createdAt: new Date(baseTime - 3 * oneHour).toISOString(), // fallback to createdAt (3 hours ago)
      updatedAt: undefined,
    },
    {
      id: 4,
      title: "No updatedAt, created 10 days ago",
      createdAt: new Date(baseTime - 10 * oneDay).toISOString(), // fallback to createdAt (10 days ago)
      updatedAt: undefined,
    },
  ];

  const sorted = sortResources(list, "updated");
  assert(sorted[0].id === 1, "Item updated 1 hour ago ranks 1st");
  assert(sorted[1].id === 2, "Item updated 2 hours ago ranks 2nd");
  assert(sorted[2].id === 3, "Item with no updatedAt fallback (created 3 hours ago) ranks 3rd");
  assert(sorted[3].id === 4, "Item with no updatedAt fallback (created 10 days ago) ranks 4th");

  assert(
    getResourceUpdatedTimestamp(list[0]) === new Date(list[0].updatedAt).getTime(),
    "getResourceUpdatedTimestamp returns updatedAt timestamp when present"
  );
  assert(
    getResourceUpdatedTimestamp(list[2]) === new Date(list[2].createdAt).getTime(),
    "getResourceUpdatedTimestamp falls back to createdAt when updatedAt is missing"
  );
}

// ---------------------------------------------------------------------------
// Scenario 6: Relevance sorting using active query
// ---------------------------------------------------------------------------
console.log("\n[Scenario 6] Relevance sorting using active query");
{
  const list = [
    {
      id: 1,
      title: "Unrelated Docker Setup",
      description: "How to configure containers",
      category: "DevOps",
      tags: ["Docker"],
      createdAt: new Date(baseTime - 1 * oneDay).toISOString(),
    },
    {
      id: 2,
      title: "React Server Components Architecture",
      description: "Deep dive into RSC streaming",
      category: "Architecture",
      tags: ["React", "TypeScript"],
      createdAt: new Date(baseTime - 2 * oneDay).toISOString(),
    },
    {
      id: 3,
      title: "State Management in Frontend",
      description: "Mentioning React patterns and hooks",
      category: "Development",
      tags: ["Frontend"],
      createdAt: new Date(baseTime - 3 * oneDay).toISOString(),
    },
    {
      id: 4,
      title: "UI Design Primitives",
      description: "Component tokens",
      category: "Design",
      tags: ["React"],
      createdAt: new Date(baseTime - 4 * oneDay).toISOString(),
    },
  ];

  const sorted = sortResources(list, "relevance", "React");
  assert(sorted[0].id === 2, "Resource with 'React' in Title and Tag ranks highest");
  assert(sorted[1].id === 4, "Resource with 'React' in Tag ranks second");
  assert(sorted[2].id === 3, "Resource with 'React' in Description ranks third");
  assert(sorted[3].id === 1, "Unrelated resource ranks lowest (score 0)");
}

// ---------------------------------------------------------------------------
// Scenario 7: Relevance fallback when query is empty
// ---------------------------------------------------------------------------
console.log("\n[Scenario 7] Relevance fallback when query is empty");
{
  const list = [
    { id: 1, title: "Oldest Item", createdAt: new Date(baseTime - 10 * oneDay).toISOString() },
    { id: 2, title: "Newest Item", createdAt: new Date(baseTime - 1 * oneHour).toISOString() },
    { id: 3, title: "Middle Item", createdAt: new Date(baseTime - 2 * oneDay).toISOString() },
  ];

  const sortedEmpty = sortResources(list, "relevance", "");
  const sortedUndefined = sortResources(list, "relevance", undefined);
  const sortedWhitespace = sortResources(list, "relevance", "   ");
  const sortedRecent = sortResources(list, "recent");

  assert(
    JSON.stringify(sortedEmpty.map((r) => r.id)) === JSON.stringify(sortedRecent.map((r) => r.id)),
    "Empty query string falls back to 'recent' recency sorting"
  );
  assert(
    JSON.stringify(sortedUndefined.map((r) => r.id)) === JSON.stringify(sortedRecent.map((r) => r.id)),
    "Undefined query falls back to 'recent' recency sorting"
  );
  assert(
    JSON.stringify(sortedWhitespace.map((r) => r.id)) === JSON.stringify(sortedRecent.map((r) => r.id)),
    "Whitespace-only query falls back to 'recent' recency sorting"
  );
}

// ---------------------------------------------------------------------------
// Scenario 8: Missing timestamps handling (safe NULLS LAST)
// ---------------------------------------------------------------------------
console.log("\n[Scenario 8] Missing timestamps handling (safe NULLS LAST)");
{
  const list = [
    { id: 1, title: "No timestamp A", createdAt: undefined, saved: undefined },
    { id: 2, title: "Has valid timestamp", createdAt: new Date(baseTime - 5 * oneDay).toISOString() },
    { id: 3, title: "No timestamp B", createdAt: undefined, saved: undefined },
  ];

  const sortedRecent = sortResources(list, "recent");
  assert(sortedRecent[0].id === 2, "Valid timestamp sorted before missing timestamps in 'recent'");
  assert(sortedRecent[1].id !== 2 && sortedRecent[2].id !== 2, "Missing timestamp items placed at end in 'recent'");

  const sortedOldest = sortResources(list, "oldest");
  assert(sortedOldest[0].id === 2, "Valid timestamp sorted before missing timestamps in 'oldest'");
  assert(sortedOldest[1].id !== 2 && sortedOldest[2].id !== 2, "Missing timestamp items placed at end in 'oldest'");

  const sortedUpdated = sortResources(list, "updated");
  assert(sortedUpdated[0].id === 2, "Valid timestamp sorted before missing timestamps in 'updated'");
}

// ---------------------------------------------------------------------------
// Scenario 9: Invalid timestamp strings ("invalid-date", NaN handling)
// ---------------------------------------------------------------------------
console.log("\n[Scenario 9] Invalid timestamp strings ('invalid-date', NaN handling)");
{
  const list = [
    { id: 1, title: "Invalid timestamp 1", createdAt: "not-a-valid-date-string" },
    { id: 2, title: "Valid timestamp", createdAt: new Date(baseTime - 2 * oneDay).toISOString() },
    { id: 3, title: "Invalid timestamp 2", createdAt: "99999-99-99T99:99:99" },
  ];

  let threw = false;
  let sorted;
  try {
    sorted = sortResources(list, "recent");
  } catch (err) {
    threw = true;
  }

  assert(!threw, "Invalid timestamp strings do not throw errors");
  assert(sorted[0].id === 2, "Valid timestamp sorted first; invalid strings placed at end");
  assert(
    getResourceTimestamp(list[0]) === null,
    "getResourceTimestamp safely returns null for invalid date strings"
  );
}

// ---------------------------------------------------------------------------
// Scenario 10: Equal timestamps and deterministic tie-breaker
// ---------------------------------------------------------------------------
console.log("\n[Scenario 10] Equal timestamps and deterministic tie-breaker");
{
  const fixedTimestamp = "2026-11-20T10:00:00.000Z";
  const list = [
    { id: 10, title: "Zebra article", createdAt: fixedTimestamp },
    { id: 50, title: "Apple article", createdAt: fixedTimestamp },
    { id: 25, title: "Middle article", createdAt: fixedTimestamp },
  ];

  const run1 = sortResources(list, "recent");
  const run2 = sortResources([...list].reverse(), "recent");

  assert(
    JSON.stringify(run1.map((r) => r.id)) === JSON.stringify(run2.map((r) => r.id)),
    "Sort order is 100% deterministic regardless of input list permutation"
  );
  assert(run1[0].id === 50 && run1[1].id === 25 && run1[2].id === 10, "Tie broken deterministically by ID descending");
}

// ---------------------------------------------------------------------------
// Scenario 11: UUID / hash-derived IDs handling
// ---------------------------------------------------------------------------
console.log("\n[Scenario 11] UUID / hash-derived IDs handling");
{
  const list = [
    {
      id: parseInt("a1b2c3d4", 16), // 2712847316
      remoteId: "a1b2c3d4-1234-5678-90ab-cdef12345678",
      title: "Resource A",
      createdAt: new Date(baseTime - 5 * oneDay).toISOString(),
    },
    {
      id: parseInt("ffffffff", 16), // 4294967295 (large 32-bit unsigned int)
      remoteId: "ffffffff-1234-5678-90ab-cdef12345678",
      title: "Resource B",
      createdAt: new Date(baseTime - 1 * oneDay).toISOString(),
    },
    {
      id: parseInt("00000001", 16), // 1
      remoteId: "00000001-1234-5678-90ab-cdef12345678",
      title: "Resource C",
      createdAt: new Date(baseTime - 10 * oneDay).toISOString(),
    },
  ];

  const sorted = sortResources(list, "recent");
  assert(sorted[0].remoteId.startsWith("ffffffff"), "Large hash-derived ID handles recent sort without overflow");
  assert(sorted[1].remoteId.startsWith("a1b2c3d4"), "Middle date ranks second");
  assert(sorted[2].remoteId.startsWith("00000001"), "Oldest date ranks third");

  // Tie-breaker with UUIDs
  const equalTimeList = [
    { id: 100, remoteId: "uuid-z", title: "Same", createdAt: "2026-11-20T00:00:00Z" },
    { id: 100, remoteId: "uuid-a", title: "Same", createdAt: "2026-11-20T00:00:00Z" },
  ];
  const sortedEqual = sortResources(equalTimeList, "title-asc");
  assert(sortedEqual.length === 2, "UUID remoteId tie-breaking functions reliably");
}

// ---------------------------------------------------------------------------
// Scenario 12: Original array immutability (no in-place mutation)
// ---------------------------------------------------------------------------
console.log("\n[Scenario 12] Original array immutability (no in-place mutation)");
{
  const original = [
    { id: 3, title: "Charlie", createdAt: new Date(baseTime - 1 * oneDay).toISOString() },
    { id: 1, title: "Alpha", createdAt: new Date(baseTime - 10 * oneDay).toISOString() },
    { id: 2, title: "Bravo", createdAt: new Date(baseTime - 5 * oneDay).toISOString() },
  ];
  const originalCopy = JSON.stringify(original);

  const sorted = sortResources(original, "title-asc");

  assert(sorted !== original, "Returned sorted array is a new reference, not the same instance");
  assert(JSON.stringify(original) === originalCopy, "Input array elements and indices were not mutated");
  assert(original[0].id === 3, "Original first item remains unchanged");
}

// ---------------------------------------------------------------------------
// Scenario 13: Combined search and advanced filters with sorting
// ---------------------------------------------------------------------------
console.log("\n[Scenario 13] Combined search and advanced filters with sorting");
{
  const resources = [
    {
      id: 1,
      title: "Zustand State Architecture",
      description: "State management guide",
      category: "Architecture",
      source: "Web",
      kind: "article",
      status: "Completed",
      tags: ["React", "State"],
      createdAt: new Date(baseTime - 10 * oneDay).toISOString(),
    },
    {
      id: 2,
      title: "Alpine.js Lightweight Reactivity",
      description: "Architecture without heavy bundle",
      category: "Architecture",
      source: "Web",
      kind: "article",
      status: "Exploring",
      tags: ["Architecture", "Lightweight"],
      createdAt: new Date(baseTime - 2 * oneDay).toISOString(),
    },
    {
      id: 3,
      title: "Next.js App Router Architecture",
      description: "Complete architectural overview",
      category: "Architecture",
      source: "Web",
      kind: "article",
      status: "Completed",
      tags: ["React", "Architecture"],
      createdAt: new Date(baseTime - 1 * oneDay).toISOString(),
    },
    {
      id: 4,
      title: "PostgreSQL Architecture",
      description: "Database internals",
      category: "Database",
      source: "Docs",
      kind: "docs",
      status: "To explore",
      tags: ["Database"],
      createdAt: new Date(baseTime - 5 * oneDay).toISOString(),
    },
  ];

  // Search "Architecture", filter category: "Architecture", sort by title-asc
  const resultsAsc = searchResources(resources, "Architecture", {
    category: "Architecture",
    sortOrder: "title-asc",
  });

  assert(resultsAsc.length === 3, "Returns 3 matching architecture resources");
  assert(resultsAsc[0].title.startsWith("Alpine.js"), "First alphabetically is Alpine.js");
  assert(resultsAsc[1].title.startsWith("Next.js"), "Second alphabetically is Next.js");
  assert(resultsAsc[2].title.startsWith("Zustand"), "Third alphabetically is Zustand");

  // Same search, sort by recent
  const resultsRecent = searchResources(resources, "Architecture", {
    category: "Architecture",
    sortOrder: "recent",
  });
  assert(resultsRecent[0].id === 3, "Most recent is Next.js (1 day ago)");
  assert(resultsRecent[1].id === 2, "Second most recent is Alpine.js (2 days ago)");
  assert(resultsRecent[2].id === 1, "Third most recent is Zustand (10 days ago)");
}

// ---------------------------------------------------------------------------
// Scenario 14: Local/demo resource compatibility (INITIAL_FIGMA_RESOURCES)
// ---------------------------------------------------------------------------
console.log("\n[Scenario 14] Local/demo resource compatibility (INITIAL_FIGMA_RESOURCES)");
{
  assert(
    Array.isArray(INITIAL_FIGMA_RESOURCES) && INITIAL_FIGMA_RESOURCES.length === 6,
    "INITIAL_FIGMA_RESOURCES loaded with 6 seed items"
  );

  const sortModes = ["recent", "oldest", "title-asc", "title-desc", "updated", "relevance"];
  for (const mode of sortModes) {
    const sorted = sortResources(INITIAL_FIGMA_RESOURCES, mode, "React");
    assert(
      sorted.length === 6,
      `sortResources(INITIAL_FIGMA_RESOURCES, "${mode}") returned 6 items without error`
    );
    assert(
      sorted.every((r) => r.id && r.title),
      `All items in "${mode}" sort result retain valid id and title`
    );
  }

  // Check that relative strings "Today", "Yesterday", "2 days ago", "May 19" evaluate properly
  const timestamps = INITIAL_FIGMA_RESOURCES.map((r) => ({
    id: r.id,
    title: r.title,
    saved: r.saved,
    ts: getResourceTimestamp(r),
  }));

  const allHaveTimestamps = timestamps.every((item) => typeof item.ts === "number" && !isNaN(item.ts));
  assert(allHaveTimestamps, "All 6 INITIAL_FIGMA_RESOURCES have valid parsed numeric timestamps");

  const recentDemo = sortResources(INITIAL_FIGMA_RESOURCES, "recent");
  assert(
    recentDemo[0].saved.toLowerCase() === "today",
    "Items with saved='Today' sort first in demo recent view"
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`   Verification Complete: ${passedChecks}/${totalChecks} assertions passed (100%)       `);
console.log("================================================================================\n");

if (passedChecks !== totalChecks) {
  process.exit(1);
} else {
  process.exit(0);
}
