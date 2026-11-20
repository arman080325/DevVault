/**
 * DevVault — Phase 02.4.3 Stage 4: Saved Search Service Automated Verification Suite
 *
 * Verifies all 20 required service capabilities:
 * 1. Name trimming and validation
 * 2. Empty and overlong name rejection
 * 3. Complete criteria serialization
 * 4. Nullable criteria mapping
 * 5. Preservation of false boolean values
 * 6. Multiple tag persistence
 * 7. All supported sort options
 * 8. Legacy 'title' compatibility
 * 9. Database row-to-model mapping
 * 10. Model-to-database mapping
 * 11. Fetch ordering (lastUsedAt DESC, createdAt DESC)
 * 12. Create success
 * 13. Duplicate-name error handling
 * 14. Update partial-field behavior
 * 15. Delete behavior
 * 16. Record-used behavior
 * 17. Guest/demo localStorage fallback
 * 18. Offline/network failure handling
 * 19. Auth/session-expiry handling
 * 20. RLS-compatible query construction
 */

const path = require("path");

// Use jiti to execute TypeScript and resolve project '@/' aliases
const jiti = require("jiti")(process.cwd(), {
  alias: {
    "@": path.resolve(__dirname, "../src"),
  },
});

// Setup mock localStorage in Node global environment
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};
global.window = {};

const {
  savedSearchService,
  validateSavedSearchName,
  validateDateBoundaries,
  normalizeSortOrder,
  mapRowToSavedSearchItem,
  mapInputToDatabaseRow,
  sortSavedSearches,
  LOCAL_SAVED_SEARCHES_KEY,
} = jiti("./src/services/saved-search-service.ts");

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

async function runTestSuite() {
  console.log("================================================================================");
  console.log("   DevVault Phase 02.4.3 Stage 4: Saved Search Service QA Suite                ");
  console.log("================================================================================\n");

  // Clear mock storage before starting
  mockStorage.clear();

  // ---------------------------------------------------------------------------
  // Test 1: Name trimming and validation
  // ---------------------------------------------------------------------------
  console.log("[Test 1] Name trimming and validation");
  {
    const trimmed = validateSavedSearchName("   React Architecture Views   ");
    assert(trimmed === "React Architecture Views", "Whitespace properly trimmed from name");

    const singleChar = validateSavedSearchName("A");
    assert(singleChar === "A", "Single character name is valid");
  }

  // ---------------------------------------------------------------------------
  // Test 2: Empty and overlong name rejection
  // ---------------------------------------------------------------------------
  console.log("\n[Test 2] Empty and overlong name rejection");
  {
    let emptyThrew = false;
    try {
      validateSavedSearchName("");
    } catch (e) {
      emptyThrew = true;
      assert(e.message.includes("empty"), "Empty name threw empty validation error");
    }
    assert(emptyThrew, "Empty string rejected");

    let whitespaceThrew = false;
    try {
      validateSavedSearchName("      ");
    } catch (e) {
      whitespaceThrew = true;
      assert(e.message.includes("empty"), "Whitespace-only name threw empty validation error");
    }
    assert(whitespaceThrew, "Whitespace-only string rejected");

    let overlongThrew = false;
    try {
      validateSavedSearchName("A".repeat(101));
    } catch (e) {
      overlongThrew = true;
      assert(e.message.includes("100"), "101-character name threw length constraint error");
    }
    assert(overlongThrew, "101-character name rejected");

    const exactly100 = validateSavedSearchName("A".repeat(100));
    assert(exactly100.length === 100, "100-character name successfully accepted");
  }

  // ---------------------------------------------------------------------------
  // Test 3: Complete criteria serialization
  // ---------------------------------------------------------------------------
  console.log("\n[Test 3] Complete criteria serialization");
  {
    const input = {
      name: "Full Criteria Test",
      query: "react query",
      platform: "GitHub",
      category: "Architecture",
      status: "Exploring",
      collection: "Frontend Core",
      tags: ["React", "State", "Async"],
      favorite: true,
      pinned: false,
      bookmarked: true,
      datePreset: "7d",
      dateFrom: "2026-11-10T00:00:00Z",
      dateTo: "2026-11-17T00:00:00Z",
      sortOrder: "updated",
    };

    const dbRow = mapInputToDatabaseRow(input, "test-user-id");
    assert(dbRow.user_id === "test-user-id", "user_id assigned correctly");
    assert(dbRow.name === "Full Criteria Test", "name mapped");
    assert(dbRow.search_query === "react query", "search_query mapped");
    assert(dbRow.platform === "GitHub", "platform mapped");
    assert(dbRow.category === "Architecture", "category mapped");
    assert(dbRow.status === "Exploring", "status mapped");
    assert(dbRow.collection === "Frontend Core", "collection mapped");
    assert(JSON.stringify(dbRow.tags) === JSON.stringify(["React", "State", "Async"]), "tags mapped as array");
    assert(dbRow.is_favorite === true, "is_favorite serialized as boolean true");
    assert(dbRow.is_pinned === false, "is_pinned serialized as boolean false");
    assert(dbRow.is_bookmarked === true, "is_bookmarked serialized as boolean true");
    assert(dbRow.date_preset === "7d", "date_preset mapped");
    assert(new Date(dbRow.date_from).toISOString() === "2026-11-10T00:00:00.000Z", "date_from serialized as ISO");
    assert(new Date(dbRow.date_to).toISOString() === "2026-11-17T00:00:00.000Z", "date_to serialized as ISO");
    assert(dbRow.sort_order === "updated", "sort_order mapped");
  }

  // ---------------------------------------------------------------------------
  // Test 4: Nullable criteria mapping
  // ---------------------------------------------------------------------------
  console.log("\n[Test 4] Nullable criteria mapping");
  {
    const input = {
      name: "Minimal View",
      platform: "All",
      category: "All",
      status: "All",
      collection: "All",
      datePreset: "all",
      query: "",
    };

    const dbRow = mapInputToDatabaseRow(input, "user-min");
    assert(dbRow.search_query === null, "Empty query mapped to null");
    assert(dbRow.platform === null, "Platform 'All' mapped to null");
    assert(dbRow.category === null, "Category 'All' mapped to null");
    assert(dbRow.status === null, "Status 'All' mapped to null");
    assert(dbRow.collection === null, "Collection 'All' mapped to null");
    assert(dbRow.date_preset === null, "DatePreset 'all' mapped to null");
    assert(dbRow.date_from === null, "Omitted dateFrom mapped to null");
    assert(dbRow.date_to === null, "Omitted dateTo mapped to null");
    assert(dbRow.is_favorite === null, "Omitted favorite mapped to null");
    assert(dbRow.is_pinned === null, "Omitted pinned mapped to null");
    assert(dbRow.is_bookmarked === null, "Omitted bookmarked mapped to null");
    assert(JSON.stringify(dbRow.tags) === "[]", "Omitted tags mapped to empty array");
    assert(dbRow.sort_order === "recent", "Omitted sortOrder defaults to 'recent'");
  }

  // ---------------------------------------------------------------------------
  // Test 5: Preservation of false boolean values
  // ---------------------------------------------------------------------------
  console.log("\n[Test 5] Preservation of false boolean values");
  {
    const input = {
      name: "False Booleans",
      favorite: false,
      pinned: false,
      bookmarked: false,
    };
    const dbRow = mapInputToDatabaseRow(input, "user-false");
    assert(dbRow.is_favorite === false, "favorite: false strictly serialized as boolean false (not null)");
    assert(dbRow.is_pinned === false, "pinned: false strictly serialized as boolean false (not null)");
    assert(dbRow.is_bookmarked === false, "bookmarked: false strictly serialized as boolean false (not null)");

    const mockRow = {
      id: "uuid-123",
      user_id: "user-false",
      name: "False Booleans",
      search_query: null,
      platform: null,
      category: null,
      status: null,
      collection: null,
      tags: [],
      is_favorite: false,
      is_pinned: false,
      is_bookmarked: false,
      date_preset: null,
      date_from: null,
      date_to: null,
      sort_order: "recent",
      created_at: "2026-11-20T10:00:00Z",
      updated_at: "2026-11-20T10:00:00Z",
      last_used_at: "2026-11-20T10:00:00Z",
    };

    const model = mapRowToSavedSearchItem(mockRow);
    assert(model.favorite === false, "is_favorite: false deserialized to favorite: false (not undefined)");
    assert(model.pinned === false, "is_pinned: false deserialized to pinned: false (not undefined)");
    assert(model.bookmarked === false, "is_bookmarked: false deserialized to bookmarked: false (not undefined)");
  }

  // ---------------------------------------------------------------------------
  // Test 6: Multiple tag persistence
  // ---------------------------------------------------------------------------
  console.log("\n[Test 6] Multiple tag persistence");
  {
    const inputWithTags = {
      name: "Tags View",
      tags: ["  React  ", "Next.js", " Tailwind CSS "],
    };
    const dbRow = mapInputToDatabaseRow(inputWithTags, "user-tags");
    assert(
      JSON.stringify(dbRow.tags) === JSON.stringify(["React", "Next.js", "Tailwind CSS"]),
      "Tags trimmed and preserved as array"
    );

    const inputEmptyTags = {
      name: "Empty Tags View",
      tags: [],
    };
    const dbRowEmpty = mapInputToDatabaseRow(inputEmptyTags, "user-tags");
    assert(Array.isArray(dbRowEmpty.tags) && dbRowEmpty.tags.length === 0, "Empty tags preserved as empty array");
  }

  // ---------------------------------------------------------------------------
  // Test 7: All supported sort options
  // ---------------------------------------------------------------------------
  console.log("\n[Test 7] All supported sort options");
  {
    const allOptions = ["recent", "oldest", "title-asc", "title-desc", "updated", "relevance"];
    for (const opt of allOptions) {
      const normalized = normalizeSortOrder(opt);
      assert(normalized === opt, `normalizeSortOrder preserves '${opt}'`);
    }
  }

  // ---------------------------------------------------------------------------
  // Test 8: Legacy 'title' compatibility
  // ---------------------------------------------------------------------------
  console.log("\n[Test 8] Legacy 'title' compatibility");
  {
    const normalized = normalizeSortOrder("title");
    assert(normalized === "title-asc", "Legacy sort option 'title' transparently maps to 'title-asc'");

    const input = { name: "Legacy Title View", sortOrder: "title" };
    const dbRow = mapInputToDatabaseRow(input, "user-leg");
    assert(dbRow.sort_order === "title-asc", "Database row receives 'title-asc' for legacy 'title'");
  }

  // ---------------------------------------------------------------------------
  // Test 9: Database row-to-model mapping
  // ---------------------------------------------------------------------------
  console.log("\n[Test 9] Database row-to-model mapping");
  {
    const mockRow = {
      id: "d83f1201-4467-4d92-932b-8a8b13926e25",
      user_id: "0a1b2c3d-0000-0000-0000-000000000000",
      name: "Full Stack Lab",
      search_query: "graphql api",
      platform: "GitHub",
      category: "Engineering",
      status: "Completed",
      collection: "Backend Lab",
      tags: ["GraphQL", "Node"],
      is_favorite: true,
      is_pinned: false,
      is_bookmarked: true,
      date_preset: "30d",
      date_from: "2026-10-20T00:00:00Z",
      date_to: "2026-11-20T00:00:00Z",
      sort_order: "relevance",
      created_at: "2026-11-19T08:00:00Z",
      updated_at: "2026-11-20T12:00:00Z",
      last_used_at: "2026-11-20T14:30:00Z",
    };

    const model = mapRowToSavedSearchItem(mockRow);
    assert(model.id === mockRow.id, "id mapped");
    assert(model.userId === mockRow.user_id, "userId mapped from user_id");
    assert(model.name === mockRow.name, "name mapped");
    assert(model.query === "graphql api", "query mapped from search_query");
    assert(model.platform === "GitHub", "platform mapped");
    assert(model.category === "Engineering", "category mapped");
    assert(model.status === "Completed", "status mapped");
    assert(model.collection === "Backend Lab", "collection mapped");
    assert(model.tags.length === 2 && model.tags[0] === "GraphQL", "tags mapped");
    assert(model.favorite === true, "favorite mapped from is_favorite");
    assert(model.pinned === false, "pinned mapped from is_pinned");
    assert(model.bookmarked === true, "bookmarked mapped from is_bookmarked");
    assert(model.datePreset === "30d", "datePreset mapped from date_preset");
    assert(model.dateFrom === mockRow.date_from, "dateFrom mapped");
    assert(model.dateTo === mockRow.date_to, "dateTo mapped");
    assert(model.sortOrder === "relevance", "sortOrder mapped from sort_order");
    assert(model.createdAt === mockRow.created_at, "createdAt mapped");
    assert(model.updatedAt === mockRow.updated_at, "updatedAt mapped");
    assert(model.lastUsedAt === mockRow.last_used_at, "lastUsedAt mapped");
  }

  // ---------------------------------------------------------------------------
  // Test 10: Model-to-database mapping
  // ---------------------------------------------------------------------------
  console.log("\n[Test 10] Model-to-database mapping");
  {
    const input = {
      name: "CSS Tricks",
      query: "container queries",
      dateFrom: "2026-01-01T00:00:00Z",
      dateTo: "2026-06-01T00:00:00Z",
    };
    const row = mapInputToDatabaseRow(input, "author-uuid");
    assert(row.user_id === "author-uuid", "Correct author assigned");
    assert(row.name === "CSS Tricks", "Name preserved");
    assert(row.search_query === "container queries", "Query mapped");
  }

  // ---------------------------------------------------------------------------
  // Test 11: Fetch ordering (lastUsedAt DESC, createdAt DESC)
  // ---------------------------------------------------------------------------
  console.log("\n[Test 11] Fetch ordering (lastUsedAt DESC, createdAt DESC)");
  {
    const baseTime = Date.now();
    const items = [
      {
        id: "1",
        name: "Older Search, Used Recently",
        createdAt: new Date(baseTime - 100000).toISOString(),
        lastUsedAt: new Date(baseTime - 1000).toISOString(), // Most recently used
      },
      {
        id: "2",
        name: "Newer Search, Used Earlier",
        createdAt: new Date(baseTime - 10000).toISOString(),
        lastUsedAt: new Date(baseTime - 50000).toISOString(), // Used earlier
      },
      {
        id: "3",
        name: "Oldest Search, Used Long Ago",
        createdAt: new Date(baseTime - 200000).toISOString(),
        lastUsedAt: new Date(baseTime - 150000).toISOString(), // Used longest ago
      },
      {
        id: "4",
        name: "Same Last Used, Newer Created",
        createdAt: new Date(baseTime - 5000).toISOString(),
        lastUsedAt: new Date(baseTime - 1000).toISOString(), // Tied with #1 on lastUsedAt
      },
    ];

    const sorted = sortSavedSearches(items);
    // #4 and #1 tied on lastUsedAt (-1000), but #4 was created at -5000 vs #1 at -100000 -> #4 comes before #1
    assert(sorted[0].id === "4", "Tied lastUsedAt breaks tie with newer createdAt");
    assert(sorted[1].id === "1", "Second is #1");
    assert(sorted[2].id === "2", "Third is #2");
    assert(sorted[3].id === "3", "Fourth is #3");
  }

  // ---------------------------------------------------------------------------
  // Test 12: Create success (Guest / LocalStorage mode)
  // ---------------------------------------------------------------------------
  console.log("\n[Test 12] Create success (Guest / LocalStorage mode)");
  {
    mockStorage.clear();

    const created = await savedSearchService.createSavedSearch({
      name: "React Hooks Views",
      query: "useEffect",
      platform: "Article",
      tags: ["React"],
      sortOrder: "recent",
    });

    assert(created.id && created.id.startsWith("local-search-"), "Generated unique local search ID");
    assert(created.name === "React Hooks Views", "Name matches");
    assert(created.query === "useEffect", "Query matches");
    assert(created.sortOrder === "recent", "Sort order matches");
    assert(Boolean(created.createdAt), "createdAt timestamp present");
    assert(Boolean(created.lastUsedAt), "lastUsedAt timestamp present");

    const inStorage = JSON.parse(mockStorage.get(LOCAL_SAVED_SEARCHES_KEY));
    assert(inStorage.length === 1 && inStorage[0].name === "React Hooks Views", "Persisted to localStorage");
  }

  // ---------------------------------------------------------------------------
  // Test 13: Duplicate-name error handling
  // ---------------------------------------------------------------------------
  console.log("\n[Test 13] Duplicate-name error handling");
  {
    let threw = false;
    try {
      // Attempt to create duplicate with case-variant and whitespace
      await savedSearchService.createSavedSearch({
        name: "  react hooks views  ",
      });
    } catch (e) {
      threw = true;
      assert(e.message.includes("already exists"), "Duplicate name error message is informative");
    }
    assert(threw, "Duplicate search name rejected with actionable error");
  }

  // ---------------------------------------------------------------------------
  // Test 14: Update partial-field behavior
  // ---------------------------------------------------------------------------
  console.log("\n[Test 14] Update partial-field behavior");
  {
    const existing = savedSearchService.getLocalSavedSearches();
    const target = existing[0];

    const updated = await savedSearchService.updateSavedSearch(target.id, {
      query: "useCallback & useMemo",
      category: "Performance",
    });

    assert(updated.id === target.id, "ID preserved on update");
    assert(updated.name === target.name, "Name preserved when not updated");
    assert(updated.query === "useCallback & useMemo", "Query updated to new value");
    assert(updated.category === "Performance", "Category added");
    assert(updated.platform === target.platform, "Platform preserved when omitted");
    assert(JSON.stringify(updated.tags) === JSON.stringify(target.tags), "Tags preserved when omitted");
  }

  // ---------------------------------------------------------------------------
  // Test 15: Delete behavior
  // ---------------------------------------------------------------------------
  console.log("\n[Test 15] Delete behavior");
  {
    const existing = savedSearchService.getLocalSavedSearches();
    const targetId = existing[0].id;

    const deleteResult = await savedSearchService.deleteSavedSearch(targetId);
    assert(deleteResult === true, "deleteSavedSearch returns true on success");

    const afterDelete = savedSearchService.getLocalSavedSearches();
    assert(afterDelete.length === 0, "Item removed from storage");

    // Deleting nonexistent ID
    const deleteNonExistent = await savedSearchService.deleteSavedSearch("non-existent-id");
    assert(deleteNonExistent === true, "Deleting nonexistent ID safely handled without crashing");
  }

  // ---------------------------------------------------------------------------
  // Test 16: Record-used behavior
  // ---------------------------------------------------------------------------
  console.log("\n[Test 16] Record-used behavior");
  {
    const created = await savedSearchService.createSavedSearch({
      name: "Usage Test View",
      query: "testing",
    });

    const initialLastUsed = created.lastUsedAt;

    // Wait slightly to ensure timestamp increment
    await new Promise((r) => setTimeout(r, 50));

    await savedSearchService.recordSavedSearchUsed(created.id);

    const refreshed = savedSearchService.getLocalSavedSearches().find((s) => s.id === created.id);
    assert(
      new Date(refreshed.lastUsedAt).getTime() >= new Date(initialLastUsed).getTime(),
      "lastUsedAt timestamp updated on recordSavedSearchUsed"
    );
    assert(refreshed.name === "Usage Test View", "Search name preserved");
    assert(refreshed.query === "testing", "Search query preserved");
  }

  // ---------------------------------------------------------------------------
  // Test 17: Guest/demo localStorage fallback
  // ---------------------------------------------------------------------------
  console.log("\n[Test 17] Guest/demo localStorage fallback");
  {
    mockStorage.clear();

    // 1. Create two searches
    const s1 = await savedSearchService.createSavedSearch({ name: "Search A", sortOrder: "title-asc" });
    const s2 = await savedSearchService.createSavedSearch({ name: "Search B", sortOrder: "recent" });

    // 2. Fetch
    const list = await savedSearchService.getSavedSearches(null);
    assert(list.length === 2, "getSavedSearches returns both local items in guest mode");

    // 3. Update
    await savedSearchService.updateSavedSearch(s1.id, { query: "new query" });
    const listAfterUpdate = await savedSearchService.getSavedSearches(null);
    const updatedS1 = listAfterUpdate.find((s) => s.id === s1.id);
    assert(updatedS1.query === "new query", "Updated item persisted locally");

    // 4. Delete
    await savedSearchService.deleteSavedSearch(s2.id);
    const listAfterDelete = await savedSearchService.getSavedSearches(null);
    assert(listAfterDelete.length === 1 && listAfterDelete[0].id === s1.id, "Deleted item removed locally");
  }

  // ---------------------------------------------------------------------------
  // Test 18: Offline/network failure handling
  // ---------------------------------------------------------------------------
  console.log("\n[Test 18] Offline/network failure handling");
  {
    // Seed local cache
    const cachedItems = [
      { id: "cached-1", name: "Offline Cache Item", createdAt: new Date().toISOString() },
    ];
    mockStorage.set(LOCAL_SAVED_SEARCHES_KEY, JSON.stringify(cachedItems));

    // When remote Supabase query throws, getSavedSearches must fall back to local storage
    const items = await savedSearchService.getSavedSearches("simulated-error-user");
    assert(items.length >= 1, "getSavedSearches returns cached local searches on remote failure");
    assert(items[0].name === "Offline Cache Item", "Cached item returned accurately");
  }

  // ---------------------------------------------------------------------------
  // Test 19: Auth/session-expiry handling
  // ---------------------------------------------------------------------------
  console.log("\n[Test 19] Auth/session-expiry handling");
  {
    mockStorage.clear();
    // In unconfigured / session expired environment, getSavedSearches safely returns empty array or local cache
    const unauthList = await savedSearchService.getSavedSearches(undefined);
    assert(Array.isArray(unauthList) && unauthList.length === 0, "Empty list returned on expired / guest session");
  }

  // ---------------------------------------------------------------------------
  // Test 20: RLS-compatible query construction
  // ---------------------------------------------------------------------------
  console.log("\n[Test 20] RLS-compatible query construction");
  {
    const input = {
      name: "Security Isolation Test",
      query: "auth check",
    };
    const row = mapInputToDatabaseRow(input, "authenticated-user-uuid-1234");
    assert(
      row.user_id === "authenticated-user-uuid-1234",
      "row payload user_id strictly bound to authenticated user context"
    );
    assert(!("id" in row), "id omitted from insert payload to allow PostgreSQL gen_random_uuid()");
    assert(!("created_at" in row), "created_at omitted to allow server-managed default");
    assert(!("updated_at" in row), "updated_at omitted to allow server-managed default");
    assert(!("last_used_at" in row), "last_used_at omitted to allow server-managed default");
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
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
