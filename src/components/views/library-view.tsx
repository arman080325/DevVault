"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Icon } from "@/components/shared/icon";
import { ResourceArt } from "@/components/resources/resource-art";
import {
  FigmaResource,
  CollectionItem,
  AdvancedSortOption,
  SavedSearchItem,
} from "@/data/figmaResources";
import {
  matchResource,
  evaluateResourceOptions,
  sortResources,
} from "@/lib/search/search-matcher";
import { resourceService } from "@/services/resource-service";
import { SaveViewModal } from "@/components/library/save-view-modal";
import { SavedViewsDropdown } from "@/components/library/saved-views-dropdown";

type ViewMode = "grid" | "list";
type SortOption = AdvancedSortOption;
type DatePreset = "all" | "today" | "7d" | "30d" | "year";

interface LibraryViewProps {
  resources: FigmaResource[];
  collections?: CollectionItem[];
  query: string;
  onQueryChange: (q: string) => void;
  onCapture: () => void;
  onOpenResource: (resource: FigmaResource) => void;
  onToggleBookmark?: (id: number) => void;
  onToast?: (message: string) => void;
  userId?: string | null;
}

export function LibraryView({
  resources,
  collections = [],
  query,
  onQueryChange,
  onCapture,
  onOpenResource,
  onToggleBookmark,
  onToast,
  userId,
}: LibraryViewProps) {
  const [view, setView] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState<AdvancedSortOption>("recent");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [viewsRefreshTrigger, setViewsRefreshTrigger] = useState(0);

  // Advanced Filtering State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedCollection, setSelectedCollection] = useState("All");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedBookmarked, setSelectedBookmarked] = useState<boolean | null>(null);
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("all");

  // Search state management
  const [isSearching, setIsSearching] = useState(false);
  const [isOfflineOrError, setIsOfflineOrError] = useState(false);
  const [remoteResults, setRemoteResults] = useState<FigmaResource[] | null>(null);
  const searchSeqRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);

  const sortContainerRef = useRef<HTMLDivElement>(null);
  const moreContainerRef = useRef<HTMLDivElement>(null);

  const baseFilterOptions = ["All", "GitHub", "YouTube", "Article", "Documentation"];
  const moreFilterOptions = ["Instagram", "Motion"];

  const sortLabels: Record<AdvancedSortOption, string> = {
    recent: "Recently added",
    oldest: "Oldest first",
    "title-asc": "Title A–Z",
    "title-desc": "Title Z–A",
    updated: "Recently updated",
    relevance: "Best match",
  };

  const datePresetLabels: Record<DatePreset, string> = {
    all: "All time",
    today: "Today",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    year: "This year",
  };

  // Derive unique tags from resources
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    resources.forEach((r) => {
      (r.tags || []).forEach((t) => {
        if (t && t.trim()) tagSet.add(t.trim());
      });
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [resources]);

  // Derive unique categories
  const availableCategories = useMemo(() => {
    const catSet = new Set<string>([
      "Development",
      "Design",
      "Product",
      "Architecture",
      "Engineering",
      "Tools",
    ]);
    resources.forEach((r) => {
      if (r.category && r.category.trim()) catSet.add(r.category.trim());
    });
    return ["All", ...Array.from(catSet).sort((a, b) => a.localeCompare(b))];
  }, [resources]);

  // Derive unique collections
  const availableCollections = useMemo(() => {
    const colSet = new Set<string>();
    if (collections && collections.length > 0) {
      collections.forEach((c) => {
        if (c.name && c.name.trim()) colSet.add(c.name.trim());
      });
    }
    resources.forEach((r) => {
      if (r.collection && r.collection.trim()) colSet.add(r.collection.trim());
    });
    return ["All", ...Array.from(colSet).sort((a, b) => a.localeCompare(b))];
  }, [collections, resources]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter !== "All") count++;
    if (selectedCategory !== "All") count++;
    if (selectedStatus !== "All") count++;
    if (selectedCollection !== "All") count++;
    if (selectedTags.length > 0) count += selectedTags.length;
    if (selectedBookmarked === true) count++;
    if (selectedDatePreset !== "all") count++;
    return count;
  }, [
    filter,
    selectedCategory,
    selectedStatus,
    selectedCollection,
    selectedTags,
    selectedBookmarked,
    selectedDatePreset,
  ]);

  const handleToggleTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setSelectedTags((prev) =>
      prev.includes(trimmed)
        ? prev.filter((t) => t !== trimmed)
        : [...prev, trimmed]
    );
  };

  const resetFilters = () => {
    setFilter("All");
    setSelectedCategory("All");
    setSelectedStatus("All");
    setSelectedCollection("All");
    setSelectedTags([]);
    setSelectedBookmarked(null);
    setSelectedDatePreset("all");
    setActiveViewId(null);
  };

  // Atomically restore a saved search view
  const handleRestoreView = (view: SavedSearchItem) => {
    // 1. Abort any in-flight async request to prevent stale overwrite
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    searchSeqRef.current++;
    setIsSearching(false);

    // 2. Synchronously apply all criteria dimensions
    const c = (view as any).criteria || view;
    onQueryChange(c.query || "");
    setFilter(c.platform || "All");
    setSelectedCategory(c.category || "All");
    setSelectedStatus(c.status || "All");
    setSelectedCollection(c.collection || "All");
    setSelectedTags(c.tags && c.tags.length > 0 ? [...c.tags] : []);
    setSelectedBookmarked(c.bookmarked !== undefined ? c.bookmarked : null);
    setSelectedDatePreset(c.datePreset || "all");
    setSortOrder(c.sortOrder || "recent");

    // 3. Mark active view & notify refresh
    setActiveViewId(view.id);
    setViewsRefreshTrigger((prev) => prev + 1);

    if (onToast) {
      onToast(`Restored view "${view.name}"`);
    }
  };

  // Click outside and Escape handling for popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        filterContainerRef.current &&
        !filterContainerRef.current.contains(target)
      ) {
        setIsFilterOpen(false);
      }
      if (
        sortContainerRef.current &&
        !sortContainerRef.current.contains(target)
      ) {
        setIsSortOpen(false);
      }
      if (
        moreContainerRef.current &&
        !moreContainerRef.current.contains(target)
      ) {
        setIsMoreOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
        setIsSortOpen(false);
        setIsMoreOpen(false);
      }
    }

    if (isFilterOpen || isSortOpen || isMoreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterOpen, isSortOpen, isMoreOpen]);

  // Lock body scroll on mobile bottom sheet
  useEffect(() => {
    if (isFilterOpen && typeof window !== "undefined" && window.innerWidth <= 768) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isFilterOpen]);

  // Debounced server search effect
  useEffect(() => {
    const cleanQ = query.trim();
    const hasAnyFilter = Boolean(
      cleanQ ||
      filter !== "All" ||
      selectedCategory !== "All" ||
      selectedStatus !== "All" ||
      selectedCollection !== "All" ||
      selectedTags.length > 0 ||
      selectedBookmarked !== null ||
      selectedDatePreset !== "all"
    );

    if (!hasAnyFilter || !userId) {
      setRemoteResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setIsOfflineOrError(false);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const seq = ++searchSeqRef.current;

    const timer = setTimeout(async () => {
      try {
        const results = await resourceService.searchResources(userId, {
          query: cleanQ || undefined,
          platform: filter !== "All" ? filter : undefined,
          category: selectedCategory !== "All" ? selectedCategory : undefined,
          status: selectedStatus !== "All" ? selectedStatus : undefined,
          collection: selectedCollection !== "All" ? selectedCollection : undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          bookmarked: selectedBookmarked === true ? true : undefined,
          datePreset: selectedDatePreset,
          signal: abortController.signal,
        });

        if (seq === searchSeqRef.current && !abortController.signal.aborted) {
          setRemoteResults(results);
          setIsSearching(false);
        }
      } catch (err: any) {
        if (seq === searchSeqRef.current && !abortController.signal.aborted) {
          setIsSearching(false);
          setIsOfflineOrError(true);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [
    query,
    filter,
    selectedCategory,
    selectedStatus,
    selectedCollection,
    selectedTags,
    selectedBookmarked,
    selectedDatePreset,
    userId,
  ]);

  const visible = useMemo(() => {
    const cleanQ = query.trim();
    const filterOptions = {
      platform: filter !== "All" ? filter : undefined,
      category: selectedCategory !== "All" ? selectedCategory : undefined,
      status: selectedStatus !== "All" ? selectedStatus : undefined,
      collection: selectedCollection !== "All" ? selectedCollection : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      bookmarked: selectedBookmarked === true ? true : undefined,
      datePreset: selectedDatePreset,
    };

    // 1. Instant local matching across Title, Description, Notes, URL, Tags, Platform, Collection, etc.
    const localMatches = resources.filter((resource) => {
      if (cleanQ) {
        return matchResource(resource, cleanQ, filterOptions);
      }
      return evaluateResourceOptions(resource, filterOptions);
    });

    // 2. If remote search returns additional unique resources, enrich results
    let combined = localMatches;
    if (remoteResults && remoteResults.length > 0) {
      const localIds = new Set(localMatches.map((r) => r.id));
      const localRemoteIds = new Set(
        localMatches.map((r) => r.remoteId).filter(Boolean)
      );

      const additional = remoteResults.filter(
        (r) =>
          !localIds.has(r.id) &&
          (!r.remoteId || !localRemoteIds.has(r.remoteId))
      );
      if (additional.length > 0) {
        combined = [...localMatches, ...additional];
      }
    }

    return sortResources(combined, sortOrder, cleanQ);
  }, [
    resources,
    query,
    filter,
    selectedCategory,
    selectedStatus,
    selectedCollection,
    selectedTags,
    selectedBookmarked,
    selectedDatePreset,
    sortOrder,
    remoteResults,
  ]);

  const getSourceShort = (kind: FigmaResource["kind"]) => {
    switch (kind) {
      case "github":
        return "GH";
      case "video":
        return "YT";
      case "article":
        return "AR";
      case "docs":
        return "DO";
      case "instagram":
        return "IG";
      case "motion":
      default:
        return "MO";
    }
  };

  return (
    <div className="page library-page">
      <header className="library-head">
        <div>
          <span className="date-label">YOUR PERSONAL INDEX</span>
          <h1>Library</h1>
          <p>{resources.length} discoveries, kept with intention.</p>
        </div>
        <button className="library-add" onClick={onCapture} aria-label="Add resource">
          <Icon name="plus" />
          Add resource
        </button>
      </header>

      {/* Search Bar */}
      <div className={`library-search ${isSearching ? "is-loading" : ""}`}>
        <Icon name="search" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              if (query) {
                onQueryChange("");
              } else {
                (event.target as HTMLInputElement).blur();
              }
            }
          }}
          placeholder="Search titles, notes, tags or sources..."
          aria-label="Search resources"
        />
        {isSearching && (
          <span className="search-spinner" aria-label="Searching...">
            <svg
              className="animate-spin"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ color: "var(--accent)" }}
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          </span>
        )}
        {query && (
          <button onClick={() => onQueryChange("")} aria-label="Clear search" type="button">
            <Icon name="x" size={15} />
          </button>
        )}
        <kbd>⌘ K</kbd>
        {isSearching && <div className="library-search-shimmer" aria-hidden="true" />}
      </div>

      {/* Library Tools & Controls */}
      <div className="library-tools">
        <div className="filters" role="tablist" aria-label="Filter by source">
          {baseFilterOptions.map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => {
                setFilter(item);
                setIsMoreOpen(false);
              }}
              role="tab"
              aria-selected={filter === item}
              type="button"
            >
              {item}
            </button>
          ))}

          {/* More Filters Dropdown */}
          <div className="more-container" ref={moreContainerRef}>
            <button
              className={`more-filter ${moreFilterOptions.includes(filter) ? "active" : ""}`}
              onClick={() => setIsMoreOpen((prev) => !prev)}
              type="button"
              aria-expanded={isMoreOpen}
              aria-label="More source filters"
            >
              <Icon name="filter" size={15} />
              {moreFilterOptions.includes(filter) ? filter : "More"}
              <Icon name="chevron" size={12} />
            </button>

            {isMoreOpen && (
              <div className="dropdown-popover left" role="menu">
                {moreFilterOptions.map((opt) => (
                  <button
                    key={opt}
                    className={filter === opt ? "active" : ""}
                    onClick={() => {
                      setFilter(opt);
                      setIsMoreOpen(false);
                    }}
                    type="button"
                    role="menuitem"
                  >
                    <span>{opt}</span>
                    {filter === opt && <Icon name="check" size={12} />}
                  </button>
                ))}
                {filter !== "All" && (
                  <button
                    onClick={() => {
                      setFilter("All");
                      setIsMoreOpen(false);
                    }}
                    type="button"
                    role="menuitem"
                    style={{ borderTop: "1px solid var(--rule)", marginTop: "4px" }}
                  >
                    <span>Reset source filter</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Advanced Filter Trigger & Popover */}
        <div className="filter-trigger-container" ref={filterContainerRef}>
          <button
            className={`advanced-filter-trigger ${activeFilterCount > 0 ? "has-filters" : ""} ${
              isFilterOpen ? "is-open" : ""
            }`}
            onClick={() => setIsFilterOpen((prev) => !prev)}
            type="button"
            aria-expanded={isFilterOpen}
            aria-label={`Advanced filters (${activeFilterCount} active)`}
          >
            <Icon name="filter" size={14} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="filter-count-badge">{activeFilterCount}</span>
            )}
          </button>

          {isFilterOpen && (
            <>
              {/* Mobile Backdrop */}
              <div
                className="filter-backdrop"
                onClick={() => setIsFilterOpen(false)}
                aria-hidden="true"
              />

              <div
                className="advanced-filter-popover"
                role="dialog"
                aria-modal="true"
                aria-label="Advanced Filters"
              >
                <div className="filter-popover-header">
                  <div className="filter-popover-title-row">
                    <h4>Filters</h4>
                    {activeFilterCount > 0 && (
                      <span className="filter-count-badge small">{activeFilterCount}</span>
                    )}
                  </div>
                  <div className="filter-popover-header-actions">
                    {activeFilterCount > 0 && (
                      <button
                        className="filter-reset-link"
                        onClick={resetFilters}
                        type="button"
                      >
                        Reset all
                      </button>
                    )}
                    <button
                      className="filter-close-btn"
                      onClick={() => setIsFilterOpen(false)}
                      aria-label="Close filters"
                      type="button"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                </div>

                <div className="filter-popover-body">
                  {/* Category Section */}
                  <div className="filter-section">
                    <label className="filter-section-label">Category</label>
                    <div className="filter-chip-group">
                      {availableCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`filter-chip ${selectedCategory === cat ? "active" : ""}`}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Section */}
                  <div className="filter-section">
                    <label className="filter-section-label">Status</label>
                    <div className="filter-chip-group">
                      {["All", "To explore", "Exploring", "Completed"].map((st) => (
                        <button
                          key={st}
                          type="button"
                          className={`filter-chip ${selectedStatus === st ? "active" : ""}`}
                          onClick={() => setSelectedStatus(st)}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Collection Section */}
                  <div className="filter-section">
                    <label className="filter-section-label">Collection</label>
                    <select
                      className="filter-select"
                      value={selectedCollection}
                      onChange={(e) => setSelectedCollection(e.target.value)}
                      aria-label="Filter by collection"
                    >
                      {availableCollections.map((col) => (
                        <option key={col} value={col}>
                          {col === "All" ? "All Collections" : col}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tags Section (Multi-select AND) */}
                  {availableTags.length > 0 && (
                    <div className="filter-section">
                      <div className="filter-section-header-row">
                        <label className="filter-section-label">Tags (Matches All)</label>
                        {selectedTags.length > 0 && (
                          <button
                            type="button"
                            className="filter-clear-section"
                            onClick={() => setSelectedTags([])}
                          >
                            Clear tags
                          </button>
                        )}
                      </div>
                      <p className="filter-section-hint">
                        Select multiple tags to find resources with all of them.
                      </p>
                      <div className="filter-tags-scroll">
                        {availableTags.map((tag) => {
                          const isSelected = selectedTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              className={`filter-tag-pill ${isSelected ? "selected" : ""}`}
                              onClick={() => handleToggleTag(tag)}
                              aria-pressed={isSelected}
                            >
                              <span>#{tag}</span>
                              {isSelected && <Icon name="check" size={11} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Bookmarked Filter */}
                  <div className="filter-section">
                    <label className="filter-section-label">Bookmarked</label>
                    <div className="filter-chip-group">
                      <button
                        type="button"
                        className={`filter-chip ${
                          selectedBookmarked === null ? "active" : ""
                        }`}
                        onClick={() => setSelectedBookmarked(null)}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${
                          selectedBookmarked === true ? "active" : ""
                        }`}
                        onClick={() => setSelectedBookmarked(true)}
                      >
                        <Icon name="bookmark" size={12} /> Bookmarked only
                      </button>
                    </div>
                  </div>

                  {/* Date Saved Presets */}
                  <div className="filter-section">
                    <label className="filter-section-label">Date Saved</label>
                    <div className="filter-chip-group">
                      {(
                        [
                          { label: "All time", val: "all" as const },
                          { label: "Today", val: "today" as const },
                          { label: "Past 7 days", val: "7d" as const },
                          { label: "Past 30 days", val: "30d" as const },
                          { label: "This year", val: "year" as const },
                        ] as const
                      ).map((dp) => (
                        <button
                          key={dp.val}
                          type="button"
                          className={`filter-chip ${
                            selectedDatePreset === dp.val ? "active" : ""
                          }`}
                          onClick={() => setSelectedDatePreset(dp.val)}
                        >
                          {dp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="filter-popover-footer">
                  <button
                    className="filter-apply-btn"
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                  >
                    Show {visible.length} results
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Saved Views Dropdown */}
        <SavedViewsDropdown
          userId={userId}
          activeViewId={activeViewId}
          onSelectView={handleRestoreView}
          onOpenSaveModal={() => setIsSaveModalOpen(true)}
          canSaveActiveView={activeFilterCount > 0 || query.trim().length > 0}
          refreshTrigger={viewsRefreshTrigger}
        />

        {/* Sort and View Toggle */}
        <div className="sort-view">
          <div className="sort-container" ref={sortContainerRef}>
            <button
              className="sort-btn"
              onClick={() => setIsSortOpen((prev) => !prev)}
              aria-label="Sort order"
              aria-expanded={isSortOpen}
              type="button"
            >
              {sortLabels[sortOrder]} <Icon name="chevron" size={13} />
            </button>

            {isSortOpen && (
              <div className="dropdown-popover" role="menu">
                {(
                  [
                    "recent",
                    "oldest",
                    "title-asc",
                    "title-desc",
                    "updated",
                    "relevance",
                  ] as AdvancedSortOption[]
                ).map((opt) => (
                  <button
                    key={opt}
                    className={sortOrder === opt ? "active" : ""}
                    onClick={() => {
                      setSortOrder(opt);
                      setActiveViewId(null);
                      setIsSortOpen(false);
                    }}
                    type="button"
                    role="menuitem"
                  >
                    <span>{sortLabels[opt]}</span>
                    {sortOrder === opt && <Icon name="check" size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div role="group" aria-label="View toggle">
            <button
              className={view === "grid" ? "active" : ""}
              onClick={() => setView("grid")}
              aria-label="Grid view"
              title="Grid view"
              type="button"
            >
              <Icon name="grid" />
            </button>
            <button
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
              aria-label="List view"
              title="List view"
              type="button"
            >
              <Icon name="list" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Bar */}
      {(activeFilterCount > 0 || query.trim().length > 0) && (
        <div className="active-filters-bar" role="region" aria-label="Active filters and criteria">
          <span className="active-filters-label">Active:</span>
          <div className="active-filters-chips">
            {query.trim().length > 0 && (
              <span className="active-filter-chip query-chip">
                Search: &quot;{query.trim().length > 20 ? query.trim().slice(0, 20) + "…" : query.trim()}&quot;
                <button
                  onClick={() => {
                    onQueryChange("");
                    setActiveViewId(null);
                  }}
                  aria-label="Clear search query"
                  type="button"
                >
                  <Icon name="x" size={12} />
                </button>
              </span>
            )}
            {filter !== "All" && (
              <span className="active-filter-chip">
                Source: {filter}
                <button
                  onClick={() => {
                    setFilter("All");
                    setActiveViewId(null);
                  }}
                  aria-label={`Remove ${filter} source filter`}
                  type="button"
                >
                  <Icon name="x" size={12} />
                </button>
              </span>
            )}
            {selectedCategory !== "All" && (
              <span className="active-filter-chip">
                Category: {selectedCategory}
                <button
                  onClick={() => {
                    setSelectedCategory("All");
                    setActiveViewId(null);
                  }}
                  aria-label={`Remove ${selectedCategory} category filter`}
                  type="button"
                >
                  <Icon name="x" size={12} />
                </button>
              </span>
            )}
            {selectedStatus !== "All" && (
              <span className="active-filter-chip">
                Status: {selectedStatus}
                <button
                  onClick={() => {
                    setSelectedStatus("All");
                    setActiveViewId(null);
                  }}
                  aria-label={`Remove ${selectedStatus} status filter`}
                  type="button"
                >
                  <Icon name="x" size={12} />
                </button>
              </span>
            )}
            {selectedCollection !== "All" && (
              <span className="active-filter-chip">
                Collection: {selectedCollection}
                <button
                  onClick={() => {
                    setSelectedCollection("All");
                    setActiveViewId(null);
                  }}
                  aria-label={`Remove ${selectedCollection} collection filter`}
                  type="button"
                >
                  <Icon name="x" size={12} />
                </button>
              </span>
            )}
            {selectedTags.map((tag) => (
              <span className="active-filter-chip tag-chip" key={tag}>
                #{tag}
                <button
                  onClick={() => {
                    handleToggleTag(tag);
                    setActiveViewId(null);
                  }}
                  aria-label={`Remove ${tag} tag filter`}
                  type="button"
                >
                  <Icon name="x" size={12} />
                </button>
              </span>
            ))}
            {selectedBookmarked === true && (
              <span className="active-filter-chip">
                Bookmarked
                <button
                  onClick={() => {
                    setSelectedBookmarked(null);
                    setActiveViewId(null);
                  }}
                  aria-label="Remove bookmarked filter"
                  type="button"
                >
                  <Icon name="x" size={12} />
                </button>
              </span>
            )}
            {selectedDatePreset !== "all" && (
              <span className="active-filter-chip">
                Date: {datePresetLabels[selectedDatePreset]}
                <button
                  onClick={() => {
                    setSelectedDatePreset("all");
                    setActiveViewId(null);
                  }}
                  aria-label="Remove date filter"
                  type="button"
                >
                  <Icon name="x" size={12} />
                </button>
              </span>
            )}

            <button
              className="save-view-btn"
              onClick={() => setIsSaveModalOpen(true)}
              type="button"
              title="Save current search & filter criteria as a view"
            >
              <Icon name="bookmark" size={13} />
              <span>Save view</span>
            </button>

            <button
              className="clear-all-filters-btn"
              onClick={resetFilters}
              type="button"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Results Header Label */}
      <div className="results-label">
        <span>
          Showing {visible.length} of {resources.length} discoveries
          {activeFilterCount > 0 && ` • ${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} applied`}
        </span>
        <span>Sorted by {sortLabels[sortOrder].toLowerCase()}</span>
      </div>

      {/* Results Grid or List */}
      {visible.length > 0 ? (
        view === "grid" ? (
          <div className="library-results grid">
            {visible.map((resource) => {
              const isBookmarked = Boolean(resource.pinned || resource.favorite);
              return (
                <article className="library-card" key={resource.id}>
                  <button
                    className="card-art-button"
                    onClick={() => onOpenResource(resource)}
                    aria-label={`View ${resource.title}`}
                    type="button"
                  >
                    <ResourceArt
                      kind={resource.kind}
                      title={resource.title}
                      domain={resource.domain}
                      category={resource.category}
                      url={resource.url}
                      imageUrl={resource.imageUrl}
                    />
                  </button>
                  <div className="library-card-copy">
                    <div className="eyebrow-row">
                      <span>{resource.domain}</span>
                      <span>{resource.length}</span>
                    </div>
                    <button
                      className="card-title text-left focus:outline-none"
                      onClick={() => onOpenResource(resource)}
                      type="button"
                    >
                      <h3>{resource.title}</h3>
                    </button>
                    <p>{resource.description}</p>
                    <div className="card-foot">
                      <span>{resource.category}</span>
                      <div>
                        <small
                          className={`status ${resource.status
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          {resource.status}
                        </small>
                        <button
                          className={isBookmarked ? "active" : ""}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleBookmark?.(resource.id);
                          }}
                          aria-label={
                            isBookmarked ? "Remove bookmark" : "Bookmark resource"
                          }
                          title={isBookmarked ? "Bookmarked" : "Bookmark"}
                          type="button"
                        >
                          <Icon name="bookmark" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="library-results list">
            {visible.map((resource) => {
              const isBookmarked = Boolean(resource.pinned || resource.favorite);
              return (
                <article className="recent-row" key={resource.id}>
                  <button
                    className={`source-tile ${resource.kind}`}
                    onClick={() => onOpenResource(resource)}
                    aria-label={resource.source}
                    type="button"
                  >
                    {getSourceShort(resource.kind)}
                  </button>

                  <button
                    className="recent-title text-left"
                    onClick={() => onOpenResource(resource)}
                    aria-label={resource.title}
                    type="button"
                  >
                    <span>{resource.source}</span>
                    <h3>{resource.title}</h3>
                  </button>

                  <span className="recent-category">{resource.category}</span>
                  <time>{resource.saved}</time>

                  <button
                    className={`row-action ${isBookmarked ? "active" : ""}`}
                    aria-label={
                      isBookmarked ? "Remove bookmark" : "Bookmark resource"
                    }
                    title={isBookmarked ? "Bookmarked" : "Bookmark"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark?.(resource.id);
                    }}
                    type="button"
                  >
                    <Icon name="bookmark" />
                  </button>
                </article>
              );
            })}
          </div>
        )
      ) : (
        <div className="no-results">
          <span>
            <Icon name="search" />
          </span>
          <h2>
            {query
              ? `Nothing found for “${query}”`
              : "Nothing found matching active criteria"}
          </h2>
          <p>
            {activeFilterCount > 0
              ? "Try adjusting or clearing some of your active filters to broaden your search."
              : isOfflineOrError
              ? "Searched local vault. Check your cloud connection or try another phrase."
              : "Try another phrase, search by personal notes or tags, or clear the active filters."}
          </p>
          <button
            onClick={() => {
              onQueryChange("");
              resetFilters();
            }}
            type="button"
          >
            Reset all filters
          </button>
        </div>
      )}

      {/* Save View Modal */}
      <SaveViewModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSaved={(item) => {
          setIsSaveModalOpen(false);
          setActiveViewId(item.id);
          setViewsRefreshTrigger((prev) => prev + 1);
          if (onToast) {
            onToast(`Saved view "${item.name}"`);
          }
        }}
        userId={userId}
        currentQuery={query}
        currentFilter={filter}
        currentCategory={selectedCategory}
        currentStatus={selectedStatus}
        currentCollection={selectedCollection}
        currentTags={selectedTags}
        currentBookmarked={selectedBookmarked}
        currentDatePreset={selectedDatePreset}
        currentSortOrder={sortOrder}
      />
    </div>
  );
}
