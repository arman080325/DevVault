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
  onUpdateResource?: (id: number, updates: Partial<FigmaResource>, remoteId?: string) => void;
  onDeleteResource?: (id: number, url?: string, remoteId?: string) => void;
  onToast?: (message: string) => void;
}

export function ResourceDetailDrawer({
  resource,
  onClose,
  onToggleStatus,
  onToggleBookmark,
  onUpdateNotes,
  onUpdateResource,
  onDeleteResource,
  onToast,
}: ResourceDetailDrawerProps) {
  const [completed, setCompleted] = useState(resource.status === "Completed");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [noteText, setNoteText] = useState(resource.notes || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(resource.title);
  const [descText, setDescText] = useState(resource.description);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isBookmarked = Boolean(resource.pinned || resource.favorite);

  useEffect(() => {
    setCompleted(resource.status === "Completed");
    setNoteText(resource.notes || "");
    setTitleText(resource.title);
    setDescText(resource.description);
    setIsEditingTitle(false);
    setIsEditingNotes(false);
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

  const handleSaveTitleAndDesc = () => {
    if (!titleText.trim()) return;
    onUpdateResource?.(
      resource.id,
      {
        title: titleText.trim(),
        description: descText.trim(),
      },
      resource.remoteId
    );
    setIsEditingTitle(false);
    onToast?.("Details updated");
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

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this resource from your vault?")) {
      onDeleteResource?.(resource.id, resource.url, resource.remoteId);
      onClose();
      onToast?.("Resource deleted");
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
                    setIsEditingTitle(true);
                    setIsMoreOpen(false);
                  }}
                  role="menuitem"
                >
                  <span>Edit title & summary</span>
                  <Icon name="more" size={13} />
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
                <button
                  type="button"
                  onClick={handleDelete}
                  role="menuitem"
                  className="text-red-500 hover:text-red-700 font-medium"
                >
                  <span>Delete resource</span>
                  <Icon name="trash" size={13} />
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

            {isEditingTitle ? (
              <div className="mb-4">
                <label className="block text-xs uppercase font-semibold text-[var(--muted,#7c7468)] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] bg-[var(--surface,#fcfbf8)] dark:bg-[var(--surface,#1a1815)] text-[16px] font-bold focus:outline-none focus:ring-1 focus:ring-[var(--accent,#b85d39)]"
                  placeholder="Resource title"
                />
                <label className="block text-xs uppercase font-semibold text-[var(--muted,#7c7468)] mt-3 mb-1">
                  Description
                </label>
                <textarea
                  value={descText}
                  onChange={(e) => setDescText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border,#e4dfd5)] dark:border-[var(--border,#2b2722)] bg-[var(--surface,#fcfbf8)] dark:bg-[var(--surface,#1a1815)] text-[14px] focus:outline-none focus:ring-1 focus:ring-[var(--accent,#b85d39)]"
                  rows={3}
                  placeholder="Summary or description"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleSaveTitleAndDesc}
                    className="save-note"
                  >
                    Save details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTitleText(resource.title);
                      setDescText(resource.description);
                      setIsEditingTitle(false);
                    }}
                    className="cancel-note"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1>{resource.title}</h1>
                <p className="detail-description">{resource.description}</p>
              </>
            )}

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
                  <p>{noteText || "No personal notes added yet. Record key takeaways or syntax tips here."}</p>
                  <button type="button" onClick={() => setIsEditingNotes(true)}>
                    {noteText ? "Edit note" : "Add note"}
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
                <span>Source</span>
                <b>{resource.domain}</b>
              </div>
              {resource.url && (
                <div className="col-span-2">
                  <span>URL</span>
                  <b className="truncate block text-xs">{resource.url}</b>
                </div>
              )}
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}
