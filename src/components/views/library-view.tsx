"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Icon } from "@/components/shared/icon";
import { ResourceArt } from "@/components/resources/resource-art";
import { FigmaResource } from "@/data/figmaResources";
import { matchResource } from "@/lib/search/search-matcher";
import { resourceService } from "@/services/resource-service";

type ViewMode = "grid" | "list";
type SortOption = "recent" | "oldest" | "title";

interface LibraryViewProps {
  resources: FigmaResource[];
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
  const [sortOrder, setSortOrder] = useState<SortOption>("recent");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Search state management
  const [isSearching, setIsSearching] = useState(false);
  const [isOfflineOrError, setIsOfflineOrError] = useState(false);
  const [remoteResults, setRemoteResults] = useState<FigmaResource[] | null>(null);
  const searchSeqRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const baseFilterOptions = ["All", "GitHub", "YouTube", "Article", "Documentation"];
  const moreFilterOptions = ["Instagram", "Motion"];

  const sortLabels: Record<SortOption, string> = {
    recent: "Recently saved",
    oldest: "Oldest saved",
    title: "Title (A-Z)",
  };

  const handleCopyLink = (url?: string) => {
    if (!url) return;
    navigator.clipboard?.writeText(url);
    onToast?.("URL copied to clipboard");
  };

  // Debounced server search effect
  useEffect(() => {
    const cleanQ = query.trim();

    if (!cleanQ || !userId) {
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
          query: cleanQ,
          platform: filter !== "All" ? filter : undefined,
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
  }, [query, filter, userId]);

  const sortResources = (list: FigmaResource[], order: SortOption) => {
    return [...list].sort((a, b) => {
      if (order === "recent") {
        return b.id - a.id;
      }
      if (order === "oldest") {
        return a.id - b.id;
      }
      if (order === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  };

  const visible = useMemo(() => {
    // If no query string, filter by source/kind only
    if (!query.trim()) {
      const filtered = resources.filter((resource) => {
        return (
          filter === "All" ||
          resource.source.toLowerCase() === filter.toLowerCase() ||
          resource.kind.toLowerCase() === filter.toLowerCase()
        );
      });
      return sortResources(filtered, sortOrder);
    }

    // 1. Instant local matching across Title, Description, Notes, URL, Tags, Platform, Collection
    const localMatches = resources.filter((resource) => {
      const matchesFilter =
        filter === "All" ||
        resource.source.toLowerCase() === filter.toLowerCase() ||
        resource.kind.toLowerCase() === filter.toLowerCase();

      return matchesFilter && matchResource(resource, query);
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

    return sortResources(combined, sortOrder);
  }, [resources, query, filter, sortOrder, remoteResults]);

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
          <div className="more-container">
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
                    <span>Reset filter</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sort and View Toggle */}
        <div className="sort-view">
          <div className="sort-container">
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
                {(["recent", "oldest", "title"] as SortOption[]).map((opt) => (
                  <button
                    key={opt}
                    className={sortOrder === opt ? "active" : ""}
                    onClick={() => {
                      setSortOrder(opt);
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

      {/* Results Header Label */}
      <div className="results-label">
        <span>{visible.length} resources</span>
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
                        <small className={`status ${resource.status.toLowerCase().replace(" ", "-")}`}>
                          {resource.status}
                        </small>
                        <button
                          className={isBookmarked ? "active" : ""}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleBookmark?.(resource.id);
                          }}
                          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark resource"}
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
                    aria-label={isBookmarked ? "Remove bookmark" : "Bookmark resource"}
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
          <h2>Nothing found for “{query}”</h2>
          <p>
            {isOfflineOrError
              ? "Searched local vault. Check your cloud connection or try another phrase."
              : "Try another phrase, search by personal notes or tags, or clear the active filters."}
          </p>
          <button
            onClick={() => {
              onQueryChange("");
              setFilter("All");
            }}
            type="button"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
