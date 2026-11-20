"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@/components/shared/icon";
import { savedSearchService } from "@/services/saved-search-service";
import { SavedSearchItem, AdvancedSortOption } from "@/data/figmaResources";

export interface SavedViewsDropdownProps {
  userId?: string | null;
  activeViewId?: string | null;
  onSelectView: (view: SavedSearchItem) => void;
  onOpenSaveModal?: () => void;
  canSaveActiveView?: boolean;
  refreshTrigger?: number;
  onViewsCountChange?: (count: number) => void;
  className?: string;
}

const SORT_LABELS: Record<AdvancedSortOption, string> = {
  recent: "Recently added",
  oldest: "Oldest first",
  "title-asc": "Title A–Z",
  "title-desc": "Title Z–A",
  updated: "Recently updated",
  relevance: "Best match",
};

export function SavedViewsDropdown({
  userId,
  activeViewId,
  onSelectView,
  onOpenSaveModal,
  canSaveActiveView = false,
  refreshTrigger = 0,
  onViewsCountChange,
  className = "",
}: SavedViewsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  // Inline delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Load saved searches
  const loadViews = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const views = await savedSearchService.getSavedSearches(userId);
      setSavedViews(views);
      if (onViewsCountChange) {
        onViewsCountChange(views.length);
      }
    } catch (err: any) {
      console.warn("Failed to load saved views:", err);
      setErrorMessage("Unable to load views");
    } finally {
      setIsLoading(false);
    }
  }, [userId, onViewsCountChange]);

  // Initial load and whenever refreshTrigger or userId changes
  useEffect(() => {
    loadViews();
  }, [loadViews, refreshTrigger]);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Click outside and Escape handling
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setRenamingId(null);
        setDeletingId(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (renamingId) {
          setRenamingId(null);
          setRenameError(null);
        } else if (deletingId) {
          setDeletingId(null);
        } else {
          setIsOpen(false);
        }
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, renamingId, deletingId]);

  // Handle selecting a view
  const handleSelect = async (view: SavedSearchItem) => {
    if (actionInProgress || renamingId === view.id || deletingId === view.id) {
      return;
    }
    try {
      await savedSearchService.recordSavedSearchUsed(view.id, userId);
    } catch (err) {
      console.warn("Failed to record usage for view:", err);
    }
    onSelectView(view);
    setIsOpen(false);
    // Refresh ordering based on usage
    loadViews();
  };

  // Start rename
  const handleStartRename = (view: SavedSearchItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
    setRenamingId(view.id);
    setRenameValue(view.name);
    setRenameError(null);
  };

  // Submit rename
  const handleConfirmRename = async (view: SavedSearchItem, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = renameValue.trim();

    if (!trimmed) {
      setRenameError("Name cannot be empty.");
      return;
    }

    if (trimmed.length > 100) {
      setRenameError("Name must be 100 characters or fewer.");
      return;
    }

    // Check for duplicate name among other views
    const isDuplicate = savedViews.some(
      (v) => v.id !== view.id && v.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setRenameError(`A view named "${trimmed}" already exists.`);
      return;
    }

    setActionInProgress(true);
    setRenameError(null);
    try {
      const updated = await savedSearchService.updateSavedSearch(
        view.id,
        { name: trimmed },
        userId
      );
      if (updated) {
        setSavedViews((prev) =>
          prev.map((v) => (v.id === view.id ? updated : v))
        );
        setRenamingId(null);
      } else {
        setRenameError("Failed to rename view. Please try again.");
      }
    } catch (err: any) {
      setRenameError(err.message || "Failed to rename view.");
    } finally {
      setActionInProgress(false);
    }
  };

  // Cancel rename
  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(null);
    setRenameError(null);
  };

  // Start delete confirmation
  const handleStartDelete = (view: SavedSearchItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(null);
    setDeletingId(view.id);
  };

  // Confirm delete
  const handleConfirmDelete = async (view: SavedSearchItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionInProgress(true);
    try {
      const success = await savedSearchService.deleteSavedSearch(view.id, userId);
      if (success) {
        setSavedViews((prev) => prev.filter((v) => v.id !== view.id));
        setDeletingId(null);
        if (onViewsCountChange) {
          onViewsCountChange(savedViews.length - 1);
        }
      } else {
        alert("Unable to delete view.");
      }
    } catch (err: any) {
      console.warn("Delete view error:", err);
      alert(err.message || "Unable to delete view.");
    } finally {
      setActionInProgress(false);
    }
  };

  // Cancel delete
  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  return (
    <div
      className={`saved-views-container ${className}`}
      ref={containerRef}
    >
      <button
        className={`saved-views-trigger ${savedViews.length > 0 ? "has-views" : ""} ${
          isOpen ? "is-open" : ""
        }`}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setRenamingId(null);
          setDeletingId(null);
        }}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Saved views (${savedViews.length} available)`}
      >
        <Icon name="bookmark" size={14} />
        <span>Views</span>
        {savedViews.length > 0 && (
          <span className="saved-count-badge">{savedViews.length}</span>
        )}
        <Icon name="chevron" size={12} className="views-chevron" />
      </button>

      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="saved-views-backdrop"
            onClick={() => {
              setIsOpen(false);
              setRenamingId(null);
              setDeletingId(null);
            }}
            aria-hidden="true"
          />

          <div
            className="saved-views-popover"
            role="dialog"
            aria-label="Saved Views"
          >
            <div className="saved-views-header">
              <div className="saved-views-header-title">
                <Icon name="bookmark" size={14} />
                <span>Saved Views</span>
                {savedViews.length > 0 && (
                  <span className="saved-views-count-pill">
                    {savedViews.length}
                  </span>
                )}
              </div>
              {canSaveActiveView && onOpenSaveModal && (
                <button
                  className="saved-views-quick-save-btn"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSaveModal();
                  }}
                  type="button"
                  title="Save active search and filters as a new view"
                >
                  <Icon name="plus" size={12} />
                  <span>Save active</span>
                </button>
              )}
            </div>

            {isLoading && savedViews.length === 0 ? (
              <div className="saved-views-loading" role="status">
                <div className="saved-views-spinner" />
                <span>Loading views…</span>
              </div>
            ) : errorMessage ? (
              <div className="saved-views-error" role="alert">
                <span>{errorMessage}</span>
                <button
                  className="saved-views-retry-btn"
                  onClick={loadViews}
                  type="button"
                >
                  Retry
                </button>
              </div>
            ) : savedViews.length === 0 ? (
              <div className="saved-views-empty">
                <div className="saved-views-empty-icon">
                  <Icon name="bookmark" size={24} />
                </div>
                <div className="saved-views-empty-title">No saved views yet</div>
                <p className="saved-views-empty-desc">
                  Save your active queries, tags, and filters for instant one-click access.
                </p>
                {canSaveActiveView && onOpenSaveModal ? (
                  <button
                    className="saved-views-empty-save-btn"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenSaveModal();
                    }}
                    type="button"
                  >
                    <Icon name="plus" size={13} />
                    <span>Save current view</span>
                  </button>
                ) : (
                  <span className="saved-views-empty-hint">
                    Apply a filter or search to save your first view.
                  </span>
                )}
              </div>
            ) : (
              <ul className="saved-views-list" role="list">
                {savedViews.map((view) => {
                  const isActive = activeViewId === view.id;
                  const isRenaming = renamingId === view.id;
                  const isDeleting = deletingId === view.id;
                  const c = (view as any).criteria || view;
                  const sortLabel = c.sortOrder && (SORT_LABELS as Record<string, string>)[c.sortOrder]
                    ? (SORT_LABELS as Record<string, string>)[c.sortOrder]
                    : c.sortOrder;

                  return (
                    <li
                      key={view.id}
                      className={`saved-view-item ${isActive ? "active" : ""} ${
                        isRenaming ? "is-editing" : ""
                      } ${isDeleting ? "is-deleting" : ""}`}
                    >
                      {isRenaming ? (
                        <form
                          className="saved-view-rename-form"
                          onSubmit={(e) => handleConfirmRename(view, e)}
                        >
                          <input
                            ref={renameInputRef}
                            type="text"
                            className="saved-view-rename-input"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            maxLength={100}
                            disabled={actionInProgress}
                            aria-label="New view name"
                          />
                          <div className="saved-view-rename-actions">
                            <button
                              type="submit"
                              className="saved-view-rename-save-btn"
                              disabled={actionInProgress}
                              aria-label="Confirm rename"
                              title="Save name"
                            >
                              <Icon name="check" size={13} />
                            </button>
                            <button
                              type="button"
                              className="saved-view-rename-cancel-btn"
                              onClick={handleCancelRename}
                              disabled={actionInProgress}
                              aria-label="Cancel rename"
                              title="Cancel"
                            >
                              <Icon name="x" size={13} />
                            </button>
                          </div>
                          {renameError && (
                            <div className="saved-view-rename-error" role="alert">
                              {renameError}
                            </div>
                          )}
                        </form>
                      ) : isDeleting ? (
                        <div className="saved-view-delete-confirm">
                          <span className="delete-confirm-label">
                            Delete view &quot;{view.name}&quot;?
                          </span>
                          <div className="delete-confirm-actions">
                            <button
                              type="button"
                              className="saved-view-delete-btn"
                              onClick={(e) => handleConfirmDelete(view, e)}
                              disabled={actionInProgress}
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              className="saved-view-cancel-btn"
                              onClick={handleCancelDelete}
                              disabled={actionInProgress}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="saved-view-row"
                          onClick={() => handleSelect(view)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSelect(view);
                            }
                          }}
                          aria-label={`Restore view ${view.name}`}
                        >
                          <div className="saved-view-info">
                            <div className="saved-view-title-row">
                              <span className="saved-view-name">{view.name}</span>
                              {isActive && (
                                <span className="saved-view-active-badge">Active</span>
                              )}
                            </div>

                            <div className="saved-view-chips">
                              {c.query && (
                                <span className="saved-view-chip query-chip" title={`Query: ${c.query}`}>
                                  &quot;{c.query.length > 18 ? c.query.slice(0, 18) + "…" : c.query}&quot;
                                </span>
                              )}
                              {c.platform && c.platform !== "All" && (
                                <span className="saved-view-chip">
                                  {c.platform}
                                </span>
                              )}
                              {c.category && c.category !== "All" && (
                                <span className="saved-view-chip">
                                  {c.category}
                                </span>
                              )}
                              {c.collection && c.collection !== "All" && (
                                <span className="saved-view-chip">
                                  {c.collection}
                                </span>
                              )}
                              {c.tags && c.tags.length > 0 && (
                                <>
                                  <span className="saved-view-chip tag-chip">
                                    #{c.tags[0]}
                                  </span>
                                  {c.tags.length > 1 && (
                                    <span className="saved-view-chip tag-more-chip">
                                      +{c.tags.length - 1}
                                    </span>
                                  )}
                                </>
                              )}
                              {c.bookmarked === true && (
                                <span className="saved-view-chip bookmarked-chip">
                                  ★ Saved
                                </span>
                              )}
                              {c.datePreset && c.datePreset !== "all" && (
                                <span className="saved-view-chip date-chip">
                                  {c.datePreset}
                                </span>
                              )}
                              {c.sortOrder && c.sortOrder !== "recent" && (
                                <span className="saved-view-chip sort-chip" title={`Sort: ${sortLabel}`}>
                                  ↕ {sortLabel}
                                </span>
                              )}
                            </div>
                          </div>

                          <div
                            className="saved-view-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="saved-view-action-btn"
                              onClick={(e) => handleStartRename(view, e)}
                              aria-label={`Rename view ${view.name}`}
                              title="Rename view"
                            >
                              <Icon name="edit" size={13} />
                            </button>
                            <button
                              type="button"
                              className="saved-view-action-btn delete-action"
                              onClick={(e) => handleStartDelete(view, e)}
                              aria-label={`Delete view ${view.name}`}
                              title="Delete view"
                            >
                              <Icon name="trash" size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
