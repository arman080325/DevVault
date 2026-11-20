"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Icon } from "@/components/shared/icon";
import { savedSearchService } from "@/services/saved-search-service";
import {
  SavedSearchItem,
  AdvancedSortOption,
} from "@/data/figmaResources";

export interface SaveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (item: SavedSearchItem) => void;
  userId?: string | null;
  currentQuery: string;
  currentFilter: string; // source / platform
  currentCategory: string;
  currentStatus: string;
  currentCollection: string;
  currentTags: string[];
  currentBookmarked: boolean | null;
  currentDatePreset: "all" | "today" | "7d" | "30d" | "year";
  currentDateFrom?: string;
  currentDateTo?: string;
  currentSortOrder: AdvancedSortOption;
}

export function SaveViewModal({
  isOpen,
  onClose,
  onSaved,
  userId,
  currentQuery,
  currentFilter,
  currentCategory,
  currentStatus,
  currentCollection,
  currentTags,
  currentBookmarked,
  currentDatePreset,
  currentDateFrom,
  currentDateTo,
  currentSortOrder,
}: SaveViewModalProps) {
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive an intuitive default suggestion based on current active criteria
  const defaultSuggestedName = useMemo(() => {
    const cleanQ = currentQuery.trim();
    if (cleanQ) {
      return `Search: ${cleanQ.length > 25 ? cleanQ.slice(0, 25) + "…" : cleanQ}`;
    }
    if (currentTags.length > 0) {
      return `${currentTags[0]} Resources`;
    }
    if (currentCollection !== "All") {
      return `${currentCollection} Shelf`;
    }
    if (currentCategory !== "All") {
      return `${currentCategory} View`;
    }
    if (currentFilter !== "All") {
      return `${currentFilter} Discoveries`;
    }
    if (currentBookmarked === true) {
      return "Bookmarked Discoveries";
    }
    return "My Custom View";
  }, [
    currentQuery,
    currentTags,
    currentCollection,
    currentCategory,
    currentFilter,
    currentBookmarked,
  ]);

  // Reset state and focus on open
  useEffect(() => {
    if (isOpen) {
      setName(defaultSuggestedName);
      setErrorMsg(null);
      setIsSaving(false);
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, defaultSuggestedName]);

  // Handle ESC key to cancel
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isSaving) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  // Criteria summary chips for visual confirmation of what is being preserved
  const activeChips: { label: string; key: string }[] = [];
  if (currentQuery.trim()) {
    activeChips.push({ label: `Query: "${currentQuery.trim()}"`, key: "query" });
  }
  if (currentFilter !== "All") {
    activeChips.push({ label: `Source: ${currentFilter}`, key: "source" });
  }
  if (currentCategory !== "All") {
    activeChips.push({ label: `Category: ${currentCategory}`, key: "cat" });
  }
  if (currentStatus !== "All") {
    activeChips.push({ label: `Status: ${currentStatus}`, key: "status" });
  }
  if (currentCollection !== "All") {
    activeChips.push({ label: `Collection: ${currentCollection}`, key: "col" });
  }
  currentTags.forEach((t) => {
    activeChips.push({ label: `#${t}`, key: `tag-${t}` });
  });
  if (currentBookmarked === true) {
    activeChips.push({ label: "Bookmarked only", key: "bookmarked" });
  }
  if (currentDatePreset !== "all") {
    const presetLabels: Record<string, string> = {
      today: "Today",
      "7d": "Last 7 days",
      "30d": "Last 30 days",
      year: "This year",
    };
    activeChips.push({
      label: `Date: ${presetLabels[currentDatePreset] || currentDatePreset}`,
      key: "date",
    });
  }
  const sortLabels: Record<AdvancedSortOption, string> = {
    recent: "Recently added",
    oldest: "Oldest first",
    "title-asc": "Title A–Z",
    "title-desc": "Title Z–A",
    updated: "Recently updated",
    relevance: "Best match",
  };
  activeChips.push({ label: `Sort: ${sortLabels[currentSortOrder]}`, key: "sort" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg("Saved search name cannot be empty.");
      inputRef.current?.focus();
      return;
    }
    if (trimmed.length > 100) {
      setErrorMsg("Saved search name must be 100 characters or fewer.");
      inputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    // Pre-flight check for duplicate name in existing saved views
    try {
      const existing = await savedSearchService.getSavedSearches(userId);
      const isDuplicate = existing.some(
        (v) => v.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) {
        setErrorMsg(`A saved view with the name "${trimmed}" already exists. Please choose a different name.`);
        setIsSaving(false);
        inputRef.current?.focus();
        return;
      }
    } catch {
      // Continue to service creation which also enforces unique name validation
    }

    try {
      const created = await savedSearchService.createSavedSearch(
        {
          name: trimmed,
          query: currentQuery.trim() || undefined,
          platform: currentFilter !== "All" ? currentFilter : undefined,
          category: currentCategory !== "All" ? currentCategory : undefined,
          status: currentStatus !== "All" ? currentStatus : undefined,
          collection: currentCollection !== "All" ? currentCollection : undefined,
          tags: currentTags.length > 0 ? currentTags : undefined,
          favorite: currentBookmarked === true ? true : undefined,
          bookmarked: currentBookmarked === true ? true : undefined,
          datePreset: currentDatePreset !== "all" ? currentDatePreset : undefined,
          dateFrom: currentDateFrom,
          dateTo: currentDateTo,
          sortOrder: currentSortOrder,
        },
        userId
      );

      onSaved(created);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save view. Please try again.");
      setIsSaving(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="save-view-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="save-view-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-view-modal-title"
      >
        <div className="save-view-modal-header">
          <div className="save-view-modal-title-row">
            <span className="save-view-modal-icon-badge">
              <Icon name="bookmark" size={16} />
            </span>
            <h3 id="save-view-modal-title">Save this view</h3>
          </div>
          <button
            className="save-view-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            type="button"
            disabled={isSaving}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="save-view-modal-form" noValidate>
          <div className="save-view-modal-body">
            {/* Name Input */}
            <div className="save-view-field-group">
              <div className="save-view-label-row">
                <label htmlFor="save-view-name-input">View name</label>
                <span className="save-view-char-count">{name.length}/100</span>
              </div>
              <input
                id="save-view-name-input"
                ref={inputRef}
                type="text"
                className={`save-view-input ${errorMsg ? "has-error" : ""}`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                maxLength={100}
                placeholder="e.g. React Architecture, Weekly Reading"
                disabled={isSaving}
                autoComplete="off"
                required
              />
              {errorMsg && (
                <p className="save-view-error-message" role="alert">
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Criteria Preview Summary */}
            <div className="save-view-criteria-summary">
              <span className="save-view-criteria-title">Active settings included:</span>
              <div className="save-view-chips-wrap">
                {activeChips.map((chip) => (
                  <span key={chip.key} className="save-view-chip">
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="save-view-modal-footer">
            <button
              type="button"
              className="save-view-btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-view-btn-primary"
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? (
                <>
                  <span className="save-view-spinner" aria-hidden="true" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Icon name="check" size={14} />
                  <span>Save view</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
