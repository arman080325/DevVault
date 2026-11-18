"use client";

import React from "react";
import { Icon } from "@/components/shared/icon";
import { ResourceArt } from "@/components/resources/resource-art";
import { FigmaResource, CollectionItem } from "@/data/figmaResources";
import { type NavPage } from "@/components/layout/sidebar";

interface HomeViewProps {
  resources: FigmaResource[];
  collections: CollectionItem[];
  onCapture: () => void;
  onOpenResource: (resource: FigmaResource) => void;
  onNavigate: (page: NavPage) => void;
  onToggleBookmark?: (id: number) => void;
}

export function HomeView({
  resources,
  collections,
  onCapture,
  onOpenResource,
  onNavigate,
  onToggleBookmark,
}: HomeViewProps) {
  const continueResource = resources.find((r) => r.status === "Exploring") || resources[0];
  const recentResources = resources.slice(1, 5);

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
    <div className="page home-page">
      <section className="home-intro">
        <span className="date-label">THURSDAY, MAY 22</span>
        <h1>
          Good morning, Alex.
          <br />
          <em>What have you found?</em>
        </h1>
        <p>A quiet place for the ideas, tools and lessons you want to return to.</p>
      </section>

      {/* Hero Capture Bar */}
      <button className="capture-bar" onClick={onCapture} aria-label="Paste a link to remember">
        <Icon name="link" />
        <span>
          <b>Paste a link to remember</b>
          <small>Instagram, YouTube, GitHub, docs or articles</small>
        </span>
        <i>
          <span className="save-label">Save to vault</span>
          <Icon name="arrow" />
        </i>
      </button>

      {/* Section 01: Continue exploring */}
      {continueResource && (
        <section className="home-section continue-section">
          <div className="section-heading">
            <div>
              <span>01</span>
              <h2>Continue exploring</h2>
            </div>
            <button onClick={() => onNavigate("explore")}>
              View queue
              <Icon name="arrow" size={15} />
            </button>
          </div>

          <article className="continue-card">
            <button
              className="continue-art"
              onClick={() => onOpenResource(continueResource)}
              aria-label={`Open ${continueResource.title}`}
            >
              <ResourceArt
                kind={continueResource.kind}
                title={continueResource.title}
                domain={continueResource.domain}
                category={continueResource.category}
                url={continueResource.url}
                imageUrl={continueResource.imageUrl}
                large
              />
            </button>
            <div className="continue-copy">
              <div className="eyebrow-row">
                <span>{continueResource.domain}</span>
                <span>{continueResource.length}</span>
              </div>
              <button
                onClick={() => onOpenResource(continueResource)}
                className="text-left focus:outline-none"
              >
                <h3>{continueResource.title}</h3>
              </button>
              <p>{continueResource.description}</p>
              <div className="progress-line">
                <i style={{ width: `${continueResource.progress || 35}%` }} />
              </div>
              <div className="continue-foot">
                <span>{continueResource.progress || 35}% explored</span>
                <button onClick={() => onOpenResource(continueResource)}>
                  Continue reading <Icon name="arrow" size={15} />
                </button>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* Section 02: Recently saved */}
      <section className="home-section recent-section">
        <div className="section-heading">
          <div>
            <span>02</span>
            <h2>Recently saved</h2>
          </div>
          <button onClick={() => onNavigate("library")}>
            See everything
            <Icon name="arrow" size={15} />
          </button>
        </div>

        <div className="recent-list">
          {recentResources.map((resource) => (
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
                className={`row-action ${resource.pinned || resource.favorite ? "active" : ""}`}
                aria-label={resource.pinned || resource.favorite ? "Remove bookmark" : "Bookmark resource"}
                title={resource.pinned || resource.favorite ? "Bookmarked" : "Bookmark"}
                onClick={() => onToggleBookmark?.(resource.id)}
              >
                <Icon name="bookmark" />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Section 03: Bottom Grid */}
      <section className="home-bottom-grid">
        <div className="collections-preview">
          <div className="section-heading">
            <div>
              <span>03</span>
              <h2>Curated shelves</h2>
            </div>
            <button onClick={() => onNavigate("collections")}>
              All collections
              <Icon name="arrow" size={15} />
            </button>
          </div>

          <div className="collection-cards">
            {collections.slice(0, 2).map((col, idx) => (
              <article className={`collection-mini ${col.tone}`} key={col.name}>
                <div>
                  <span>{String(idx + 1).padStart(2, "0")}</span>
                  <small>{col.count} pieces</small>
                </div>
                <h3>
                  {col.name.split(" ")[0]}
                  <br />
                  <em>{col.name.split(" ").slice(1).join(" ")}</em>
                </h3>
                <button onClick={() => onNavigate("collections")}>
                  Open shelf <Icon name="arrow" />
                </button>
              </article>
            ))}
          </div>
        </div>

        <button
          className="at-glance focus:outline-none"
          onClick={() => onNavigate("activity")}
          aria-label="View activity at a glance"
        >
          <span className="date-label">YOUR VAULT / MAY</span>
          <h2>At a glance</h2>
          <div>
            <b>248</b>
            <span>Resources saved</span>
          </div>
          <div>
            <b>7</b>
            <span>Waiting to explore</span>
          </div>
          <div>
            <b>18</b>
            <span>Completed this month</span>
          </div>
          <p>Five more discoveries explored than last month.</p>
          <span className="at-glance-link">
            View activity <Icon name="arrow" size={14} />
          </span>
        </button>
      </section>
    </div>
  );
}
