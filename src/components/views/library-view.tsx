"use client";

import React, { useState, useMemo } from "react";
import { Icon } from "@/components/shared/icon";
import { ResourceArt } from "@/components/resources/resource-art";
import { FigmaResource } from "@/data/figmaResources";

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
}

export function LibraryView({
  resources,
  query,
  onQueryChange,
  onCapture,
  onOpenResource,
  onToggleBookmark,
  onToast,
}: LibraryViewProps) {
  const [view, setView] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState<SortOption>("recent");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

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

  const visible = useMemo(() => {
    const filtered = resources.filter((resource) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        resource.title.toLowerCase().includes(q) ||
        resource.description.toLowerCase().includes(q) ||
        resource.category.toLowerCase().includes(q) ||
        resource.domain.toLowerCase().includes(q) ||
        (resource.collection && resource.collection.toLowerCase().includes(q)) ||
        (resource.tags && resource.tags.some((t) => t.toLowerCase().includes(q)));

      const matchesFilter =
        filter === "All" ||
        resource.source.toLowerCase() === filter.toLowerCase() ||
        resource.kind.toLowerCase() === filter.toLowerCase();

      return matchesQuery && matchesFilter;
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === "recent") {
        return b.id - a.id;
      }
      if (sortOrder === "oldest") {
        return a.id - b.id;
      }
      if (sortOrder === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [resources, query, filter, sortOrder]);

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
      <div className="library-search">
        <Icon name="search" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search titles, notes, tags or sources..."
          aria-label="Search resources"
        />
        {query && (
          <button onClick={() => onQueryChange("")} aria-label="Clear search" type="button">
            <Icon name="x" size={15} />
          </button>
        )}
        <kbd>⌘ K</kbd>
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
          <p>Try another phrase or clear the active filters.</p>
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
