"use client";

import React, { useState, useMemo } from "react";
import { Icon } from "@/components/shared/icon";
import { ResourceArt } from "@/components/resources/resource-art";
import { FigmaResource } from "@/data/figmaResources";

type ViewMode = "grid" | "list";

interface LibraryViewProps {
  resources: FigmaResource[];
  query: string;
  onQueryChange: (q: string) => void;
  onCapture: () => void;
  onOpenResource: (resource: FigmaResource) => void;
  onToggleBookmark?: (id: number) => void;
}

export function LibraryView({
  resources,
  query,
  onQueryChange,
  onCapture,
  onOpenResource,
  onToggleBookmark,
}: LibraryViewProps) {
  const [view, setView] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState("All");

  const filterOptions = ["All", "GitHub", "YouTube", "Article", "Documentation"];

  const visible = useMemo(() => {
    return resources.filter((resource) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        resource.title.toLowerCase().includes(q) ||
        resource.description.toLowerCase().includes(q) ||
        resource.category.toLowerCase().includes(q) ||
        resource.domain.toLowerCase().includes(q) ||
        (resource.tags && resource.tags.some((t) => t.toLowerCase().includes(q)));

      const matchesFilter =
        filter === "All" ||
        resource.source.toLowerCase() === filter.toLowerCase() ||
        resource.kind.toLowerCase() === filter.toLowerCase();

      return matchesQuery && matchesFilter;
    });
  }, [resources, query, filter]);

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
          <button onClick={() => onQueryChange("")} aria-label="Clear search">
            <Icon name="x" size={15} />
          </button>
        )}
        <kbd>⌘ K</kbd>
      </div>

      {/* Library Tools & Controls */}
      <div className="library-tools">
        <div className="filters" role="tablist" aria-label="Filter by source">
          {filterOptions.map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
              role="tab"
              aria-selected={filter === item}
            >
              {item}
            </button>
          ))}
          <button
            className={`more-filter ${filter !== "All" && !filterOptions.includes(filter) ? "active" : ""}`}
            onClick={() => setFilter("All")}
          >
            <Icon name="filter" size={15} />
            More
          </button>
        </div>

        <div className="sort-view">
          <button aria-label="Sort order">
            Recently saved <Icon name="chevron" size={13} />
          </button>
          <div role="group" aria-label="View toggle">
            <button
              className={view === "grid" ? "active" : ""}
              onClick={() => setView("grid")}
              aria-label="Grid view"
              title="Grid view"
            >
              <Icon name="grid" />
            </button>
            <button
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
              aria-label="List view"
              title="List view"
            >
              <Icon name="list" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Header Label */}
      <div className="results-label">
        <span>{visible.length} resources</span>
        <span>Updated just now</span>
      </div>

      {/* Results Grid or List */}
      {visible.length > 0 ? (
        view === "grid" ? (
          <div className="library-results grid">
            {visible.map((resource) => (
              <article className="library-card" key={resource.id}>
                <button
                  className="card-art-button"
                  onClick={() => onOpenResource(resource)}
                  aria-label={`View ${resource.title}`}
                >
                  <ResourceArt kind={resource.kind} />
                </button>
                <div className="library-card-copy">
                  <div className="eyebrow-row">
                    <span>{resource.domain}</span>
                    <span>{resource.length}</span>
                  </div>
                  <button
                    className="card-title text-left focus:outline-none"
                    onClick={() => onOpenResource(resource)}
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
                        onClick={() => onToggleBookmark?.(resource.id)}
                        aria-label="Bookmark"
                      >
                        <Icon name="bookmark" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="library-results list">
            {visible.map((resource) => (
              <article className="recent-row" key={resource.id}>
                <button
                  className={`source-tile ${resource.kind}`}
                  onClick={() => onOpenResource(resource)}
                  aria-label={resource.source}
                >
                  {getSourceShort(resource.kind)}
                </button>

                <button
                  className="recent-title"
                  onClick={() => onOpenResource(resource)}
                  aria-label={resource.title}
                >
                  <span>{resource.source}</span>
                  <h3>{resource.title}</h3>
                </button>

                <span className="recent-category">{resource.category}</span>
                <time>{resource.saved}</time>

                <button
                  className="row-action"
                  aria-label="Bookmark"
                  onClick={() => onToggleBookmark?.(resource.id)}
                >
                  <Icon name="bookmark" />
                </button>
              </article>
            ))}
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
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
