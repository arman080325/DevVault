"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/shared/icon";
import { ResourceArt } from "@/components/resources/resource-art";
import { FigmaResource } from "@/data/figmaResources";

interface ResourceDetailDrawerProps {
  resource: FigmaResource;
  onClose: () => void;
  onToggleStatus?: (id: number) => void;
  onToggleBookmark?: (id: number) => void;
  onUpdateNotes?: (id: number, notes: string) => void;
  onToast?: (message: string) => void;
}

export function ResourceDetailDrawer({
  resource,
  onClose,
  onToggleStatus,
  onToggleBookmark,
  onUpdateNotes,
  onToast,
}: ResourceDetailDrawerProps) {
  const [completed, setCompleted] = useState(resource.status === "Completed");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [noteText, setNoteText] = useState(
    resource.notes ||
      "The examples are unusually clear. Return to the section on shared layout transitions when building the collection view."
  );
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isBookmarked = Boolean(resource.pinned || resource.favorite);

  useEffect(() => {
    setCompleted(resource.status === "Completed");
    setNoteText(
      resource.notes ||
        "The examples are unusually clear. Return to the section on shared layout transitions when building the collection view."
    );
  }, [resource]);

  // Background scroll lock & Escape listener
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleToggleCompleted = () => {
    setCompleted(!completed);
    onToggleStatus?.(resource.id);
  };

  const handleSaveNotes = () => {
    onUpdateNotes?.(resource.id, noteText);
    setIsEditingNotes(false);
    onToast?.("Notes updated");
  };

  const handleCopyLink = () => {
    if (resource.url) {
      navigator.clipboard?.writeText(resource.url);
      onToast?.("Resource URL copied");
    } else {
      onToast?.("No URL available for this resource");
    }
    setIsMoreOpen(false);
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

          <div style={{ position: "relative" }}>
            <button
              className={isBookmarked ? "active" : ""}
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark resource"}
              title={isBookmarked ? "Bookmarked" : "Bookmark"}
              onClick={() => onToggleBookmark?.(resource.id)}
              type="button"
            >
              <Icon name="bookmark" />
            </button>
            <button
              aria-label="More options"
              onClick={() => setIsMoreOpen((prev) => !prev)}
              type="button"
            >
              <Icon name="more" />
            </button>
            <button aria-label="Close" onClick={onClose} type="button">
              <Icon name="x" />
            </button>

            {isMoreOpen && (
              <div className="dropdown-popover" style={{ top: "42px", right: "30px" }} role="menu">
                <button type="button" onClick={handleCopyLink} role="menuitem">
                  <span>Copy URL</span>
                  <Icon name="link" size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleBookmark?.(resource.id);
                    setIsMoreOpen(false);
                  }}
                  role="menuitem"
                >
                  <span>{isBookmarked ? "Remove bookmark" : "Bookmark"}</span>
                  <Icon name="bookmark" size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleToggleCompleted();
                    setIsMoreOpen(false);
                  }}
                  role="menuitem"
                >
                  <span>{completed ? "Mark to explore" : "Mark completed"}</span>
                  <Icon name="check" size={13} />
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="detail-scroll">
          <ResourceArt
            kind={resource.kind}
            title={resource.title}
            domain={resource.domain}
            category={resource.category}
            url={resource.url}
            imageUrl={resource.imageUrl}
            large
          />

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
                type="button"
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
                type="button"
              >
                <Icon name="check" />
                {completed ? "Completed" : "Mark explored"}
              </button>
            </div>

            <section className="detail-section">
              <span>NOTES</span>
              {isEditingNotes ? (
                <div className="detail-notes-edit">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Write personal thoughts or learnings..."
                    autoFocus
                  />
                  <div className="detail-notes-actions">
                    <button className="save-note" type="button" onClick={handleSaveNotes}>
                      Save notes
                    </button>
                    <button
                      className="cancel-note"
                      type="button"
                      onClick={() => {
                        setNoteText(resource.notes || "");
                        setIsEditingNotes(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p>{noteText}</p>
                  <button type="button" onClick={() => setIsEditingNotes(true)}>
                    Edit note
                  </button>
                </>
              )}
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
