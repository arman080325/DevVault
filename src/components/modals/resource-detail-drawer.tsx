"use client";

import React, { useState } from "react";
import { Icon } from "@/components/shared/icon";
import { ResourceArt } from "@/components/resources/resource-art";
import { FigmaResource } from "@/data/figmaResources";

interface ResourceDetailDrawerProps {
  resource: FigmaResource;
  onClose: () => void;
  onToggleStatus?: (id: number) => void;
  onToggleBookmark?: (id: number) => void;
}

export function ResourceDetailDrawer({
  resource,
  onClose,
  onToggleStatus,
  onToggleBookmark,
}: ResourceDetailDrawerProps) {
  const [completed, setCompleted] = useState(resource.status === "Completed");

  const handleToggleCompleted = () => {
    setCompleted(!completed);
    onToggleStatus?.(resource.id);
  };

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
    <div className="detail-layer" role="dialog" aria-modal="true" aria-label="Resource detail">
      <button className="detail-backdrop" onClick={onClose} aria-label="Close detail" />
      <aside className="detail-panel select-none">
        <header className="detail-head">
          <div>
            <span className={`source-tile ${resource.kind}`}>
              {getSourceShort(resource.kind)}
            </span>
            <span>
              {resource.source}
              <small>{resource.domain}</small>
            </span>
          </div>

          <div>
            <button
              aria-label="Bookmark"
              onClick={() => onToggleBookmark?.(resource.id)}
            >
              <Icon name="bookmark" />
            </button>
            <button aria-label="More options">
              <Icon name="more" />
            </button>
            <button aria-label="Close" onClick={onClose}>
              <Icon name="x" />
            </button>
          </div>
        </header>

        <div className="detail-scroll">
          <ResourceArt kind={resource.kind} large />

          <div className="detail-content">
            <div className="detail-eyebrow">
              <span>{resource.category}</span>
              <span>{resource.length}</span>
            </div>

            <h1>{resource.title}</h1>
            <p className="detail-description">{resource.description}</p>

            <div className="detail-actions">
              <button
                className="open-source"
                onClick={() => {
                  if (resource.url) {
                    window.open(resource.url, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                Open original <Icon name="arrow" />
              </button>

              <button
                className={completed ? "completed" : ""}
                onClick={handleToggleCompleted}
              >
                <Icon name="check" />
                {completed ? "Completed" : "Mark explored"}
              </button>
            </div>

            <section className="detail-section">
              <span>NOTES</span>
              <p>
                {resource.notes ||
                  "The examples are unusually clear. Return to the section on shared layout transitions when building the collection view."}
              </p>
              <button>Edit note</button>
            </section>

            <section className="detail-section">
              <span>ORGANIZATION</span>
              <div className="detail-row">
                <span>Collection</span>
                <b>{resource.collection ?? "Not in a collection"}</b>
                <Icon name="chevron" />
              </div>
              <div className="detail-row">
                <span>Status</span>
                <b>{completed ? "Completed" : resource.status}</b>
                <Icon name="chevron" />
              </div>
              <div className="detail-row">
                <span>Tags</span>
                <b>{resource.tags?.join(", ") || `${resource.category}, learning`}</b>
                <Icon name="chevron" />
              </div>
            </section>

            <section className="detail-meta">
              <div>
                <span>Saved</span>
                <b>{resource.saved}</b>
              </div>
              <div>
                <span>Last opened</span>
                <b>2 hours ago</b>
              </div>
              <div>
                <span>Source</span>
                <b>{resource.domain}</b>
              </div>
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}
