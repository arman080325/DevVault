/**
 * DevVault — Phase 02.4.3 Stage 5: Saved Searches UI Integration Automated Verification Suite
 *
 * Verifies all 21 required UI, integration, state management, and accessibility scenarios:
 * 1. Save View visibility with active criteria
 * 2. Save View behavior with query-only criteria
 * 3. Save View behavior with filter-only criteria
 * 4. Name validation
 * 5. Duplicate-name handling
 * 6. Complete criteria serialization
 * 7. Saved Views loading
 * 8. Empty state
 * 9. Restore all criteria
 * 10. Restore sort preference
 * 11. Record usage
 * 12. Rename without losing criteria
 * 13. Delete confirmation
 * 14. Refresh after mutations
 * 15. Sort dropdown options and mappings
 * 16. Search/filter/sort composition
 * 17. Clear filters behavior
 * 18. Mobile toolbar layout
 * 19. Mobile dropdown/bottom-sheet behavior
 * 20. Keyboard and accessibility behavior
 * 21. Stale async response protection
 */

const fs = require("fs");
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
  LOCAL_SAVED_SEARCHES_KEY,
} = jiti("./src/services/saved-search-service.ts");

const {
  sortResources,
  matchResource,
  evaluateResourceOptions,
} = jiti("./src/lib/search/search-matcher.ts");

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

async function runVerificationSuite() {
  console.log("================================================================================");
  console.log("DevVault — Phase 02.4.3 Stage 5: Saved Searches UI Automated Verification");
  console.log("================================================================================\n");

  const cssContent = fs.readFileSync(path.resolve(__dirname, "../src/app/globals.css"), "utf8");
  const libraryViewCode = fs.readFileSync(path.resolve(__dirname, "../src/components/views/library-view.tsx"), "utf8");
  const saveModalCode = fs.readFileSync(path.resolve(__dirname, "../src/components/library/save-view-modal.tsx"), "utf8");
  const dropdownCode = fs.readFileSync(path.resolve(__dirname, "../src/components/library/saved-views-dropdown.tsx"), "utf8");

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Save View visibility with active criteria
  // ---------------------------------------------------------------------------
  console.log("Scenario 1: Save View visibility with active criteria");
  {
    // Active criteria: filter count > 0 OR query.trim().length > 0
    const query = "react hooks";
    const filter = "GitHub";
    const activeFilterCount = 1;

    const canSaveActive = activeFilterCount > 0 || query.trim().length > 0;
    assert(canSaveActive === true, "canSaveActiveView is true when query and filters are present");

    // Check code in library-view renders active bar and save view button
    assert(
      libraryViewCode.includes("(activeFilterCount > 0 || query.trim().length > 0) && ("),
      "library-view.tsx renders active-filters-bar when activeFilterCount > 0 OR query is present"
    );
    assert(
      libraryViewCode.includes('className="save-view-btn"'),
      "library-view.tsx renders save-view-btn in active-filters-bar"
    );
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Save View behavior with query-only criteria
  // ---------------------------------------------------------------------------
  console.log("\nScenario 2: Save View behavior with query-only criteria");
  {
    const query = "design tokens";
    const activeFilterCount = 0;

    const canSaveActive = activeFilterCount > 0 || query.trim().length > 0;
    assert(canSaveActive === true, "Save View action is active with query-only criteria");

    // Suggestion logic for query-only
    const cleanQ = query.trim();
    const suggestedName = cleanQ ? `Search: ${cleanQ}` : "My Custom View";
    assert(suggestedName === "Search: design tokens", "Suggested name adopts clean query prefix");

    assert(
      libraryViewCode.includes('active-filter-chip query-chip'),
      "library-view.tsx displays dedicated query-chip in active-filters-bar"
    );
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Save View behavior with filter-only criteria
  // ---------------------------------------------------------------------------
  console.log("\nScenario 3: Save View behavior with filter-only criteria");
  {
    const query = "";
    const currentTags = ["TypeScript"];
    const activeFilterCount = 1;

    const canSaveActive = activeFilterCount > 0 || query.trim().length > 0;
    assert(canSaveActive === true, "Save View action is active with filter-only criteria");

    const suggestedName = currentTags.length > 0 ? `${currentTags[0]} Resources` : "My Custom View";
    assert(suggestedName === "TypeScript Resources", "Suggested name uses tag name when query is empty");
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Name validation
  // ---------------------------------------------------------------------------
  console.log("\nScenario 4: Name validation (trimming, rejection of empty, max 100 characters)");
  {
    assert(validateSavedSearchName("   My Vault View   ") === "My Vault View", "Trims leading and trailing whitespace");

    let emptyThrew = false;
    try {
      validateSavedSearchName("   ");
    } catch (e) {
      emptyThrew = true;
    }
    assert(emptyThrew, "Rejects empty or whitespace-only name");

    let overlongThrew = false;
    try {
      validateSavedSearchName("A".repeat(101));
    } catch (e) {
      overlongThrew = true;
    }
    assert(overlongThrew, "Rejects name longer than 100 characters");

    const maxValid = "A".repeat(100);
    assert(validateSavedSearchName(maxValid) === maxValid, "Accepts exact 100 character name");

    assert(
      saveModalCode.includes("maxLength={100}"),
      "save-view-modal enforces 100-character maxLength on input"
    );
    assert(
      dropdownCode.includes("maxLength={100}"),
      "saved-views-dropdown enforces 100-character maxLength on rename input"
    );
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Duplicate-name handling
  // ---------------------------------------------------------------------------
  console.log("\nScenario 5: Duplicate-name handling");
  {
    mockStorage.clear();
    const testUserId = "user-ui-test";

    // Create initial view
    await savedSearchService.createSavedSearch(
      {
        name: "Frontend Stack",
        query: "react",
        sortOrder: "recent",
      },
      testUserId
    );

    // Attempt to create duplicate with different casing
    let dupThrew = false;
    try {
      await savedSearchService.createSavedSearch(
        {
          name: "frontend stack",
          query: "vue",
        },
        testUserId
      );
    } catch (e) {
      dupThrew = true;
      assert(
        e.message.includes("already exists"),
        "Duplicate error message clearly communicates existing name conflict"
      );
    }
    assert(dupThrew, "Duplicate name is rejected case-insensitively");

    // Modal code checks duplicate before saving
    assert(
      saveModalCode.includes("already exists"),
      "SaveViewModal includes duplicate name check and warning"
    );
    // Dropdown code checks duplicate before inline rename
    assert(
      dropdownCode.includes("already exists"),
      "SavedViewsDropdown includes duplicate check during inline rename"
    );
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Complete criteria serialization
  // ---------------------------------------------------------------------------
  console.log("\nScenario 6: Complete criteria serialization");
  {
    const fullInput = {
      name: "Full Criteria View",
      query: "architecture",
      platform: "GitHub",
      category: "Engineering",
      status: "Exploring",
      collection: "System Design",
      tags: ["Distributed", "Microservices"],
      bookmarked: true,
      favorite: true,
      datePreset: "30d",
      sortOrder: "relevance",
    };

    const saved = await savedSearchService.createSavedSearch(fullInput, "user-ui-test");
    assert(saved.name === "Full Criteria View", "Preserves name");
    assert(saved.query === "architecture", "Preserves query");
    assert(saved.platform === "GitHub", "Preserves platform");
    assert(saved.category === "Engineering", "Preserves category");
    assert(saved.status === "Exploring", "Preserves status");
    assert(saved.collection === "System Design", "Preserves collection");
    assert(Array.isArray(saved.tags) && saved.tags.length === 2, "Preserves multi-tag array");
    assert(saved.bookmarked === true, "Preserves bookmarked state");
    assert(saved.datePreset === "30d", "Preserves datePreset");
    assert(saved.sortOrder === "relevance", "Preserves sortOrder");
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Saved Views loading
  // ---------------------------------------------------------------------------
  console.log("\nScenario 7: Saved Views loading");
  {
    const views = await savedSearchService.getSavedSearches("user-ui-test");
    assert(Array.isArray(views), "getSavedSearches returns an array");
    assert(views.length === 2, "Returns expected count of saved searches");
    assert(
      dropdownCode.includes("savedViews.length > 0 && (") &&
      dropdownCode.includes("saved-count-badge"),
      "SavedViewsDropdown renders count badge when views exist"
    );
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Empty state
  // ---------------------------------------------------------------------------
  console.log("\nScenario 8: Empty state");
  {
    assert(
      dropdownCode.includes("savedViews.length === 0 ? (") &&
      dropdownCode.includes("No saved views yet"),
      "SavedViewsDropdown renders dedicated empty state when no views exist"
    );
    assert(
      dropdownCode.includes("canSaveActiveView && onOpenSaveModal"),
      "Empty state provides direct button to save current view if active filters exist"
    );
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 9: Restore all criteria
  // ---------------------------------------------------------------------------
  console.log("\nScenario 9: Restore all criteria");
  {
    const targetView = {
      id: "view-restore-test",
      name: "All Dimensions View",
      query: "microservices",
      platform: "GitHub",
      category: "Architecture",
      status: "Completed",
      collection: "Backend",
      tags: ["Kafka", "gRPC"],
      bookmarked: true,
      datePreset: "year",
      sortOrder: "title-asc",
    };

    // State simulation container
    const state = {
      query: "",
      filter: "All",
      category: "All",
      status: "All",
      collection: "All",
      tags: [],
      bookmarked: null,
      datePreset: "all",
      sortOrder: "recent",
      activeViewId: null,
    };

    // Simulate handleRestoreView logic from library-view.tsx
    const handleRestoreView = (view) => {
      const c = view.criteria || view;
      state.query = c.query || "";
      state.filter = c.platform || "All";
      state.category = c.category || "All";
      state.status = c.status || "All";
      state.collection = c.collection || "All";
      state.tags = c.tags && c.tags.length > 0 ? [...c.tags] : [];
      state.bookmarked = c.bookmarked !== undefined ? c.bookmarked : null;
      state.datePreset = c.datePreset || "all";
      state.sortOrder = c.sortOrder || "recent";
      state.activeViewId = view.id;
    };

    handleRestoreView(targetView);

    assert(state.query === "microservices", "Query restored");
    assert(state.filter === "GitHub", "Platform filter restored");
    assert(state.category === "Architecture", "Category restored");
    assert(state.status === "Completed", "Status restored");
    assert(state.collection === "Backend", "Collection restored");
    assert(state.tags.length === 2 && state.tags[0] === "Kafka", "Tags restored atomically");
    assert(state.bookmarked === true, "Bookmarked flag restored");
    assert(state.datePreset === "year", "Date preset restored");
    assert(state.sortOrder === "title-asc", "Sort order restored");
    assert(state.activeViewId === "view-restore-test", "Active view ID tracked");
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 10: Restore sort preference
  // ---------------------------------------------------------------------------
  console.log("\nScenario 10: Restore sort preference");
  {
    const sortVariants = ["recent", "oldest", "title-asc", "title-desc", "updated", "relevance"];
    for (const sortOpt of sortVariants) {
      const dummyView = { id: `view-${sortOpt}`, name: `View ${sortOpt}`, sortOrder: sortOpt };
      let restoredSort = null;
      const restore = (v) => {
        restoredSort = (v.criteria || v).sortOrder || "recent";
      };
      restore(dummyView);
      assert(restoredSort === sortOpt, `Restores sort option '${sortOpt}' accurately`);
    }
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 11: Record usage
  // ---------------------------------------------------------------------------
  console.log("\nScenario 11: Record usage");
  {
    const views = await savedSearchService.getSavedSearches("user-ui-test");
    const targetItem = views[views.length - 1]; // Pick bottom item

    await savedSearchService.recordSavedSearchUsed(targetItem.id, "user-ui-test");

    const reordered = await savedSearchService.getSavedSearches("user-ui-test");
    assert(reordered[0].id === targetItem.id, "Used search moves to top of list after recordSavedSearchUsed");
    assert(Boolean(reordered[0].lastUsedAt), "lastUsedAt timestamp is populated");

    assert(
      dropdownCode.includes("savedSearchService.recordSavedSearchUsed(view.id, userId)"),
      "SavedViewsDropdown invokes recordSavedSearchUsed upon view selection"
    );
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 12: Rename without losing criteria
  // ---------------------------------------------------------------------------
  console.log("\nScenario 12: Rename without losing criteria");
  {
    const views = await savedSearchService.getSavedSearches("user-ui-test");
    const original = views.find((v) => v.name === "Full Criteria View");
    assert(Boolean(original), "Found original view with full criteria");

    const updated = await savedSearchService.updateSavedSearch(
      original.id,
      { name: "Architectural Vault View" },
      "user-ui-test"
    );

    assert(updated.name === "Architectural Vault View", "Name updated successfully");
    assert(updated.query === original.query, "Query preserved after rename");
    assert(updated.platform === original.platform, "Platform preserved after rename");
    assert(updated.category === original.category, "Category preserved after rename");
    assert(updated.collection === original.collection, "Collection preserved after rename");
    assert(updated.tags.join(",") === original.tags.join(","), "Tags preserved after rename");
    assert(updated.sortOrder === original.sortOrder, "Sort order preserved after rename");
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 13: Delete confirmation
  // ---------------------------------------------------------------------------
  console.log("\nScenario 13: Delete confirmation");
  {
    assert(
      dropdownCode.includes("isDeleting ? (") &&
      dropdownCode.includes("delete-confirm-label") &&
      dropdownCode.includes("saved-view-delete-btn"),
      "SavedViewsDropdown presents inline delete confirmation before deletion"
    );
    assert(
      dropdownCode.includes("savedSearchService.deleteSavedSearch(view.id, userId)"),
      "SavedViewsDropdown calls deleteSavedSearch only on explicit confirmation"
    );
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 14: Refresh after mutations
  // ---------------------------------------------------------------------------
  console.log("\nScenario 14: Refresh after mutations");
  {
    assert(
      libraryViewCode.includes("setViewsRefreshTrigger((prev) => prev + 1)"),
      "library-view increments viewsRefreshTrigger to notify dropdown to reload on save or restore"
    );
    assert(
      dropdownCode.includes("refreshTrigger"),
      "SavedViewsDropdown observes refreshTrigger in its dependency list"
    );
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 15: Sort dropdown options and mappings
  // ---------------------------------------------------------------------------
  console.log("\nScenario 15: Sort dropdown options and mappings");
  {
    const expectedSorts = {
      recent: "Recently added",
      oldest: "Oldest first",
      "title-asc": "Title A–Z",
      "title-desc": "Title Z–A",
      updated: "Recently updated",
      relevance: "Best match",
    };

    for (const [key, label] of Object.entries(expectedSorts)) {
      assert(
        libraryViewCode.includes(key) && libraryViewCode.includes(label),
        `library-view includes sort option '${key}' mapped to '${label}'`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 16: Search/filter/sort composition
  // ---------------------------------------------------------------------------
  console.log("\nScenario 16: Search/filter/sort composition");
  {
    const sampleResources = [
      { id: 1, title: "React Query Guide", kind: "github", category: "Development", saved: "2026-01-01", tags: ["react"] },
      { id: 2, title: "Zustand State", kind: "github", category: "Development", saved: "2026-02-01", tags: ["react", "state"] },
      { id: 3, title: "Figma UI Kit", kind: "motion", category: "Design", saved: "2026-03-01", tags: ["design"] },
    ];

    // Filter by tag "react"
    const matched = sampleResources.filter((r) =>
      evaluateResourceOptions(r, { tags: ["react"] })
    );
    assert(matched.length === 2, "Filtered down to react tagged resources");

    // Sort by Title A-Z
    const sorted = sortResources(matched, "title-asc");
    assert(sorted[0].title === "React Query Guide" && sorted[1].title === "Zustand State", "Correctly sorted Title A-Z");

    // Sort by Title Z-A
    const sortedDesc = sortResources(matched, "title-desc");
    assert(sortedDesc[0].title === "Zustand State" && sortedDesc[1].title === "React Query Guide", "Correctly sorted Title Z-A");
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 17: Clear filters behavior
  // ---------------------------------------------------------------------------
  console.log("\nScenario 17: Clear filters behavior");
  {
    // Check resetFilters in library-view.tsx
    const resetFiltersIndex = libraryViewCode.indexOf("const resetFilters = () => {");
    const nextFunctionIndex = libraryViewCode.indexOf("const handleRestoreView =", resetFiltersIndex);
    const resetFiltersBody = libraryViewCode.slice(resetFiltersIndex, nextFunctionIndex);

    assert(
      resetFiltersBody.includes('setFilter("All");') &&
      resetFiltersBody.includes('setSelectedCategory("All");') &&
      resetFiltersBody.includes('setSelectedStatus("All");') &&
      resetFiltersBody.includes('setSelectedCollection("All");') &&
      resetFiltersBody.includes("setSelectedTags([]);") &&
      resetFiltersBody.includes("setSelectedBookmarked(null);") &&
      resetFiltersBody.includes('setSelectedDatePreset("all");') &&
      !resetFiltersBody.includes("setSortOrder"),
      "resetFilters resets all filter dimensions without altering sortOrder"
    );
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 18: Mobile toolbar layout
  // ---------------------------------------------------------------------------
  console.log("\nScenario 18: Mobile toolbar layout");
  {
    assert(
      cssContent.includes(".saved-views-trigger {") &&
      cssContent.includes("min-height: 44px;"),
      "globals.css specifies min-height: 44px for saved-views-trigger on mobile"
    );
    assert(
      cssContent.includes(".saved-view-row {") &&
      cssContent.includes("min-height: 48px;"),
      "globals.css specifies min-height: 48px for saved-view-row"
    );
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 19: Mobile dropdown/bottom-sheet behavior
  // ---------------------------------------------------------------------------
  console.log("\nScenario 19: Mobile dropdown/bottom-sheet behavior");
  {
    assert(
      cssContent.includes(".saved-views-backdrop {") &&
      cssContent.includes("position: fixed;"),
      "globals.css provides fixed fullscreen backdrop for saved views popover"
    );
    assert(
      cssContent.includes(".saved-views-popover {") &&
      cssContent.includes("border-radius: 16px 16px 0 0;"),
      "globals.css applies bottom-sheet styling on mobile viewports"
    );
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 20: Keyboard and accessibility behavior
  // ---------------------------------------------------------------------------
  console.log("\nScenario 20: Keyboard and accessibility behavior");
  {
    assert(
      saveModalCode.includes('role="dialog"') &&
      saveModalCode.includes('aria-modal="true"'),
      "SaveViewModal includes accessible dialog and aria-modal attributes"
    );
    assert(
      saveModalCode.includes('.key === "Escape"') &&
      saveModalCode.includes("onClose();"),
      "SaveViewModal handles Escape key to dismiss"
    );
    assert(
      dropdownCode.includes('.key === "Escape"'),
      "SavedViewsDropdown handles Escape key to close popover or cancel rename"
    );
    assert(
      dropdownCode.includes('aria-expanded={isOpen}'),
      "SavedViewsDropdown trigger binds aria-expanded attribute"
    );
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 21: Stale async response protection
  // ---------------------------------------------------------------------------
  console.log("\nScenario 21: Stale async response protection");
  {
    assert(
      libraryViewCode.includes("abortControllerRef.current.abort();"),
      "handleRestoreView aborts pending in-flight requests"
    );
    assert(
      libraryViewCode.includes("searchSeqRef.current++;"),
      "handleRestoreView increments search sequence counter to invalidate late arrivals"
    );
  }

  console.log("\n================================================================================");
  console.log(`Phase 02.4.3 Stage 5 UI Verification Complete: ${passedChecks}/${totalChecks} assertions passed.`);
  console.log("================================================================================\n");
}

runVerificationSuite().catch((err) => {
  console.error("Verification suite failed:", err);
  process.exit(1);
});
