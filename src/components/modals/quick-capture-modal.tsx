"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Icon } from "@/components/shared/icon";
import { ResourceArt, ResourceKind } from "@/components/resources/resource-art";
import { FigmaResource, CollectionItem } from "@/data/figmaResources";
import { type Session } from "@supabase/supabase-js";
import { NormalizedMetadata } from "@/lib/metadata/types";

export const CANONICAL_CATEGORIES = [
  "Frontend",
  "Backend",
  "Cybersecurity",
  "Databases",
  "DevOps & Cloud",
  "UI/UX & Design",
  "Tools",
  "Animation",
  "Other",
] as const;

export const CANONICAL_STATUSES: { value: "To explore" | "Exploring" | "Completed"; label: string }[] = [
  { value: "To explore", label: "To Explore" },
  { value: "Exploring", label: "Exploring" },
  { value: "Completed", label: "Explored" },
];

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveResource: (newResource: Partial<FigmaResource>) => void | Promise<void>;
  existingResources?: FigmaResource[];
  collections?: CollectionItem[];
  session?: Session | null;
}

function deriveMetadata(inputUrl: string): { title: string; description: string; domain: string } {
  try {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      return {
        title: "New Discovery",
        description: "Resource from the web.",
        domain: "web",
      };
    }
    const urlObj = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = urlObj.hostname.replace(/^www\./, "");
    const pathname = urlObj.pathname.replace(/^\/|\/$/g, "");
    const parts = pathname.split("/").filter(Boolean);

    if (host.includes("github.com")) {
      if (parts.length >= 2) {
        return {
          title: `${parts[0]}/${parts[1]}: Developer repository`,
          description: `Open-source repository hosted on GitHub by ${parts[0]}.`,
          domain: "github.com",
        };
      }
      return {
        title: "GitHub Repository",
        description: "Source code repository and documentation.",
        domain: "github.com",
      };
    }

    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return {
        title: "YouTube Video / Tutorial",
        description: "Video resource and developer walkthrough.",
        domain: "youtube.com",
      };
    }

    if (host.includes("instagram.com")) {
      return {
        title: "Instagram Dev Reel / Post",
        description: "Visual design and code snippet demonstration.",
        domain: "instagram.com",
      };
    }

    if (host.includes("motion.dev")) {
      if (pathname.includes("layout")) {
        return {
          title: "Layout animations: the missing guide",
          description: "A practical introduction to smooth, interruptible layout transitions in React.",
          domain: "motion.dev",
        };
      }
      return {
        title: "Motion for React: Modern Animation Library",
        description: "Production-ready motion primitives and gestures for React apps.",
        domain: "motion.dev",
      };
    }

    if (parts.length > 0) {
      const slug = parts[parts.length - 1].replace(/[-_]/g, " ");
      const capitalized = slug.charAt(0).toUpperCase() + slug.slice(1);
      return {
        title: `${capitalized} — ${host}`,
        description: `Resource and technical reference on ${host}.`,
        domain: host,
      };
    }

    return {
      title: `${host.charAt(0).toUpperCase() + host.slice(1)} Reference`,
      description: `Resource and developer reference on ${host}.`,
      domain: host,
    };
  } catch {
    return {
      title: "Web Resource",
      description: "Saved developer resource.",
      domain: "web",
    };
  }
}

export function QuickCaptureModal({
  isOpen,
  onClose,
  onSaveResource,
  existingResources = [],
  collections = [],
  session = null,
}: QuickCaptureModalProps) {
  const [url, setUrl] = useState("https://motion.dev/docs/react-layout-animations");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string>("Animation");
  const [status, setStatus] = useState<"To explore" | "Exploring" | "Completed">("To explore");
  const [collection, setCollection] = useState<string>("None");
  const [tags, setTags] = useState<string[]>(["Animation"]);
  const [tagInput, setTagInput] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"ready" | "saving" | "saved">("ready");

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSource, setExtractionSource] = useState<string | null>(null);
  const [extractionWarning, setExtractionWarning] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);

  const categoryRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const collectionRef = useRef<HTMLDivElement>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);
  const isSubmittingRef = useRef<boolean>(false);
  const isTitleModifiedRef = useRef<boolean>(false);
  const isDescModifiedRef = useRef<boolean>(false);

  // Auto-detect kind from URL
  const detectKind = useCallback((inputUrl: string): ResourceKind => {
    const lower = inputUrl.toLowerCase();
    if (lower.includes("github.com")) return "github";
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "video";
    if (lower.includes("instagram.com")) return "instagram";
    if (lower.includes("react.dev") || lower.includes("docs.")) return "docs";
    if (lower.includes("motion.dev")) return "motion";
    return "article";
  }, []);

  const [detectedKind, setDetectedKind] = useState<ResourceKind>("motion");

  // Check if URL is already captured
  const isDuplicate = useMemo(() => {
    if (!url.trim() || !existingResources.length) return null;
    const clean = url.trim().toLowerCase().replace(/\/$/, "");
    return existingResources.find(
      (r) => r.url && r.url.toLowerCase().replace(/\/$/, "") === clean
    );
  }, [url, existingResources]);

  // Derived metadata fallback
  const fallbackMetadata = useMemo(() => deriveMetadata(url), [url]);

  // Tag Management
  const handleAddTag = useCallback((rawTag: string) => {
    const trimmed = rawTag.trim().replace(/^#/, "");
    if (trimmed) {
      setTags((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    }
    setTagInput("");
  }, []);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }, []);

  // Live debounced metadata extraction with race condition and stale response protection
  useEffect(() => {
    const trimmedUrl = url.trim();
    const reqId = ++requestIdRef.current;
    abortControllerRef.current?.abort();

    // Immediately clear image from previous URL to prevent stale previews
    setImageUrl(undefined);

    if (!trimmedUrl) {
      setTitle("");
      setDescription("");
      setIsExtracting(false);
      setExtractionWarning(null);
      setAuthNotice(null);
      setExtractionSource(null);
      return;
    }

    const derived = deriveMetadata(trimmedUrl);
    if (!isTitleModifiedRef.current) {
      setTitle(derived.title);
    }
    if (!isDescModifiedRef.current) {
      setDescription(derived.description);
    }
    setDetectedKind(detectKind(trimmedUrl));

    // Validate URL format before firing network request
    let isValidUrl = false;
    try {
      const u = new URL(
        trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")
          ? trimmedUrl
          : `https://${trimmedUrl}`
      );
      isValidUrl = Boolean(u.hostname && u.hostname.includes("."));
    } catch {
      isValidUrl = false;
    }

    if (!isValidUrl) {
      setIsExtracting(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsExtracting(true);
      setExtractionWarning(null);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        } else if (process.env.NODE_ENV !== "production") {
          // Development bypass token for local testing
          headers["Authorization"] = "Bearer devvault-test-token";
        }

        const formattedUrl =
          trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")
            ? trimmedUrl
            : `https://${trimmedUrl}`;

        const res = await fetch("/api/metadata/extract", {
          method: "POST",
          headers,
          body: JSON.stringify({ url: formattedUrl }),
          signal: controller.signal,
        });

        if (reqId !== requestIdRef.current) return;

        if (res.ok) {
          const json = await res.json();
          const data: NormalizedMetadata = json.data;

          if (!isTitleModifiedRef.current && data.title) {
            setTitle(data.title);
          }
          if (!isDescModifiedRef.current && data.description) {
            setDescription(data.description);
          }
          if (data.image) {
            setImageUrl(data.image);
          }

          // Map platform to ResourceKind and tag suggestions
          if (data.platform === "GITHUB") {
            setDetectedKind("github");
            setTags((prev) => Array.from(new Set([...prev, "GitHub"])));
          } else if (data.platform === "YOUTUBE") {
            setDetectedKind("video");
            setTags((prev) => Array.from(new Set([...prev, "Video"])));
          } else if (data.platform === "INSTAGRAM") {
            setDetectedKind("instagram");
          } else if (data.platform === "DOCS") {
            setDetectedKind("docs");
          }

          // Warnings and status
          if (data.extractionStatus === "manual_required") {
            setExtractionWarning(
              data.warnings?.[0] ||
                "Restricted access detected. Verify or adjust details manually."
            );
            setExtractionSource("manual required");
          } else {
            if (data.warnings && data.warnings.length > 0) {
              setExtractionWarning(data.warnings[0]);
            }
            setExtractionSource(
              data.platform !== "WEBSITE"
                ? `${data.platform.toLowerCase()}`
                : "web metadata"
            );
          }
          setAuthNotice(null);
        } else if (res.status === 401) {
          if (session) {
            setAuthNotice("Session expired. Please log in again to sync, or save locally.");
          } else {
            setAuthNotice("Sign in to enable automatic extraction, or enter details manually.");
          }
          setExtractionSource("manual / local");
        } else if (res.status === 429) {
          setExtractionWarning("Rate limit reached. Enter details manually or wait a moment.");
          setExtractionSource("manual / local");
        } else {
          const errJson = await res.json().catch(() => ({}));
          setExtractionWarning(
            errJson.message || "Live extraction unavailable. You can enter details manually."
          );
          setExtractionSource("manual / local");
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") return;
        if (reqId !== requestIdRef.current) return;
        setExtractionWarning(
          "Network request could not be completed. You can enter details manually."
        );
        setExtractionSource("manual / local");
      } finally {
        if (reqId === requestIdRef.current) {
          setIsExtracting(false);
        }
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url, session, detectKind]);

  // Handle Save with double-submission protection
  const handleSave = useCallback(async () => {
    if (isSubmittingRef.current || state === "saving") return;
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    isSubmittingRef.current = true;
    setState("saving");

    const derived = deriveMetadata(trimmedUrl);
    const finalKind = detectedKind || detectKind(trimmedUrl);

    const finalTitle = (title || "").trim() || derived.title;
    const finalDesc = (description || "").trim() || derived.description;
    const finalTags = tags.length > 0 ? Array.from(new Set(tags)) : [category];

    const newResource: Partial<FigmaResource> = {
      kind: finalKind,
      url: trimmedUrl,
      title: finalTitle,
      description: finalDesc,
      domain: derived.domain,
      source:
        finalKind === "github"
          ? "GitHub"
          : finalKind === "video"
          ? "YouTube"
          : finalKind === "instagram"
          ? "Instagram"
          : derived.domain.charAt(0).toUpperCase() + derived.domain.slice(1),
      category,
      status,
      collection: collection === "None" ? undefined : collection,
      tags: finalTags,
      notes: note.trim() || undefined,
      imageUrl: imageUrl || undefined,
      saved: "Today",
      length: finalKind === "video" ? "15 min watch" : "8 min read",
    };

    try {
      await onSaveResource(newResource);
      setState("saved");
      setTimeout(() => {
        setState("ready");
        isSubmittingRef.current = false;
        onClose();
      }, 700);
    } catch (err) {
      console.warn("Failed to save resource:", err);
      setState("ready");
      isSubmittingRef.current = false;
    }
  }, [
    url,
    title,
    description,
    imageUrl,
    detectedKind,
    detectKind,
    category,
    status,
    collection,
    tags,
    note,
    onSaveResource,
    onClose,
    state,
  ]);

  // Handle outside click to dismiss dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (categoryRef.current && !categoryRef.current.contains(target)) {
        setIsCategoryOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(target)) {
        setIsStatusOpen(false);
      }
      if (collectionRef.current && !collectionRef.current.contains(target)) {
        setIsCollectionOpen(false);
      }
    }
    if (isCategoryOpen || isStatusOpen || isCollectionOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCategoryOpen, isStatusOpen, isCollectionOpen]);

  // Background scroll lock and keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isCategoryOpen || isStatusOpen || isCollectionOpen) {
          e.stopPropagation();
          setIsCategoryOpen(false);
          setIsStatusOpen(false);
          setIsCollectionOpen(false);
          return;
        }
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (url.trim() && state === "ready") {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, url, state, handleSave, isCategoryOpen, isStatusOpen, isCollectionOpen]);

  if (!isOpen) return null;

  const currentStatusLabel =
    CANONICAL_STATUSES.find((s) => s.value === status)?.label || status;

  return (
    <div className="capture-layer" role="dialog" aria-modal="true" aria-label="Quick capture">
      <button className="capture-backdrop" onClick={onClose} aria-label="Close quick capture" />
      <div className="capture-modal">
        <div className="capture-sheet-header">
          <div className="sheet-handle" />
          <header className="capture-head">
            <div>
              <span className="capture-eyebrow">QUICK CAPTURE</span>
              <h2>{state === "saved" ? "Saved to your vault." : "Save a discovery"}</h2>
            </div>
            <button onClick={onClose} aria-label="Close" type="button">
              <Icon name="x" />
            </button>
          </header>
        </div>

        {state === "saved" ? (
          <div className="capture-sheet-body">
            <div className="capture-success">
              <span>
                <Icon name="check" size={25} />
              </span>
              <p>{title || fallbackMetadata.title}</p>
              <small>
                Added to {category} · {currentStatusLabel}
                {collection !== "None" ? ` · Shelf: ${collection}` : ""}
              </small>
            </div>
          </div>
        ) : (
          <>
            <div className="capture-sheet-body">
              <label className="url-field">
                <span>URL</span>
                <div>
                  <Icon name="link" />
                  <input
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                    }}
                    placeholder="https://..."
                    autoFocus
                  />
                  {url && (
                    <button
                      onClick={() => {
                        setUrl("");
                        setTitle("");
                        setDescription("");
                        setImageUrl(undefined);
                        isTitleModifiedRef.current = false;
                        isDescModifiedRef.current = false;
                      }}
                      aria-label="Clear URL"
                      type="button"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </div>
              </label>

              {isDuplicate && (
                <div className="duplicate-warning" role="alert">
                  <Icon name="bookmark" size={14} />
                  <span>
                    <b>Already in vault:</b> &ldquo;{isDuplicate.title}&rdquo; (
                    {isDuplicate.category} · {isDuplicate.status}).
                  </span>
                </div>
              )}

              {authNotice && (
                <div className="capture-warning auth-warning" role="alert">
                  <Icon name="info" size={14} />
                  <span>{authNotice}</span>
                </div>
              )}

              {extractionWarning && (
                <div className="capture-warning extraction-warning" role="alert">
                  <Icon name="info" size={14} />
                  <span>{extractionWarning}</span>
                </div>
              )}

              <div className="metadata-label">
                <span>
                  <i className={isExtracting ? "pulse-dot" : ""} />
                  {isExtracting
                    ? "ANALYZING LINK..."
                    : extractionSource
                    ? `METADATA FOUND (${extractionSource.toUpperCase()})`
                    : "METADATA READY"}
                </span>
                <small>{isExtracting ? "Live inspection" : "Detected from link"}</small>
              </div>

              {/* Preview Card with Editable Title & Description */}
              <div className="capture-preview">
                <ResourceArt
                  kind={detectedKind}
                  title={title || fallbackMetadata.title}
                  domain={fallbackMetadata.domain}
                  category={category}
                  url={url}
                  imageUrl={imageUrl}
                />
                <div className="capture-preview-content">
                  <span className="capture-preview-domain">{fallbackMetadata.domain}</span>
                  <input
                    className="capture-title-input"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      isTitleModifiedRef.current = true;
                    }}
                    placeholder="Resource title"
                    aria-label="Resource title"
                  />
                  <textarea
                    className="capture-desc-input"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      isDescModifiedRef.current = true;
                    }}
                    placeholder="Summary or description..."
                    aria-label="Resource description"
                    rows={2}
                  />
                </div>
              </div>

              {/* Classification Row 1: Category & Status */}
              <div className="capture-fields">
                {/* Category Dropdown */}
                <div className="capture-field-group" ref={categoryRef}>
                  <label htmlFor="category-select-trigger" className="capture-field-label">
                    Category
                  </label>
                  <div className="capture-dropdown-wrap">
                    <button
                      id="category-select-trigger"
                      type="button"
                      className="capture-dropdown-trigger"
                      aria-haspopup="listbox"
                      aria-expanded={isCategoryOpen}
                      onClick={() => {
                        setIsCategoryOpen((prev) => !prev);
                        setIsStatusOpen(false);
                        setIsCollectionOpen(false);
                      }}
                    >
                      <span className="trigger-value">{category}</span>
                      <Icon
                        name="chevron"
                        size={14}
                        className={`trigger-chevron ${isCategoryOpen ? "rotate" : ""}`}
                      />
                    </button>

                    {isCategoryOpen && (
                      <ul
                        className="capture-dropdown-menu"
                        role="listbox"
                        aria-label="Select Category"
                      >
                        {CANONICAL_CATEGORIES.map((cat) => {
                          const isSelected = category === cat;
                          return (
                            <li
                              key={cat}
                              role="option"
                              aria-selected={isSelected}
                              tabIndex={0}
                              className={`capture-dropdown-item ${isSelected ? "selected" : ""}`}
                              onClick={() => {
                                setCategory(cat);
                                setIsCategoryOpen(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setCategory(cat);
                                  setIsCategoryOpen(false);
                                }
                              }}
                            >
                              <span>{cat}</span>
                              {isSelected && <Icon name="check" size={14} />}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="capture-field-group" ref={statusRef}>
                  <label htmlFor="status-select-trigger" className="capture-field-label">
                    Status
                  </label>
                  <div className="capture-dropdown-wrap">
                    <button
                      id="status-select-trigger"
                      type="button"
                      className="capture-dropdown-trigger"
                      aria-haspopup="listbox"
                      aria-expanded={isStatusOpen}
                      onClick={() => {
                        setIsStatusOpen((prev) => !prev);
                        setIsCategoryOpen(false);
                        setIsCollectionOpen(false);
                      }}
                    >
                      <span className="trigger-value">{currentStatusLabel}</span>
                      <Icon
                        name="chevron"
                        size={14}
                        className={`trigger-chevron ${isStatusOpen ? "rotate" : ""}`}
                      />
                    </button>

                    {isStatusOpen && (
                      <ul
                        className="capture-dropdown-menu"
                        role="listbox"
                        aria-label="Select Status"
                      >
                        {CANONICAL_STATUSES.map((st) => {
                          const isSelected = status === st.value;
                          return (
                            <li
                              key={st.value}
                              role="option"
                              aria-selected={isSelected}
                              tabIndex={0}
                              className={`capture-dropdown-item ${isSelected ? "selected" : ""}`}
                              onClick={() => {
                                setStatus(st.value);
                                setIsStatusOpen(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setStatus(st.value);
                                  setIsStatusOpen(false);
                                }
                              }}
                            >
                              <span>{st.label}</span>
                              {isSelected && <Icon name="check" size={14} />}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Classification Row 2: Shelf (Collection) & Tags */}
              <div className="capture-fields">
                {/* Collection Dropdown */}
                <div className="capture-field-group" ref={collectionRef}>
                  <label htmlFor="collection-select-trigger" className="capture-field-label">
                    Shelf / Collection
                  </label>
                  <div className="capture-dropdown-wrap">
                    <button
                      id="collection-select-trigger"
                      type="button"
                      className="capture-dropdown-trigger"
                      aria-haspopup="listbox"
                      aria-expanded={isCollectionOpen}
                      onClick={() => {
                        setIsCollectionOpen((prev) => !prev);
                        setIsCategoryOpen(false);
                        setIsStatusOpen(false);
                      }}
                    >
                      <span className="trigger-value">
                        {collection === "None" ? "None (Unassigned)" : collection}
                      </span>
                      <Icon
                        name="chevron"
                        size={14}
                        className={`trigger-chevron ${isCollectionOpen ? "rotate" : ""}`}
                      />
                    </button>

                    {isCollectionOpen && (
                      <ul
                        className="capture-dropdown-menu"
                        role="listbox"
                        aria-label="Select Shelf"
                      >
                        <li
                          role="option"
                          aria-selected={collection === "None"}
                          tabIndex={0}
                          className={`capture-dropdown-item ${
                            collection === "None" ? "selected" : ""
                          }`}
                          onClick={() => {
                            setCollection("None");
                            setIsCollectionOpen(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setCollection("None");
                              setIsCollectionOpen(false);
                            }
                          }}
                        >
                          <span>None (Unassigned)</span>
                          {collection === "None" && <Icon name="check" size={14} />}
                        </li>
                        {collections.map((col) => {
                          const isSelected = collection === col.name;
                          return (
                            <li
                              key={col.name}
                              role="option"
                              aria-selected={isSelected}
                              tabIndex={0}
                              className={`capture-dropdown-item ${
                                isSelected ? "selected" : ""
                              }`}
                              onClick={() => {
                                setCollection(col.name);
                                setIsCollectionOpen(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setCollection(col.name);
                                  setIsCollectionOpen(false);
                                }
                              }}
                            >
                              <span>{col.name}</span>
                              {isSelected && <Icon name="check" size={14} />}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Tags Input */}
                <div className="capture-field-group">
                  <label htmlFor="tags-input-field" className="capture-field-label">
                    Tags
                  </label>
                  <div className="capture-tags-container">
                    {tags.map((t) => (
                      <span key={t} className="capture-tag-chip">
                        #{t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          aria-label={`Remove tag ${t}`}
                        >
                          <Icon name="x" size={10} />
                        </button>
                      </span>
                    ))}
                    <input
                      id="tags-input-field"
                      className="capture-tag-input"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          handleAddTag(tagInput);
                        } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                          handleRemoveTag(tags[tags.length - 1]);
                        }
                      }}
                      onBlur={() => {
                        if (tagInput.trim()) {
                          handleAddTag(tagInput);
                        }
                      }}
                      placeholder={tags.length === 0 ? "Add tag..." : "+ tag..."}
                    />
                  </div>
                </div>
              </div>

              {/* Personal Notes */}
              <label className="capture-note">
                <span>
                  Note <i>Optional</i>
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why is this worth returning to?"
                />
              </label>
            </div>

            <footer className="capture-sheet-footer">
              <div className="capture-actions">
                <span>
                  <kbd>⌘</kbd>
                  <kbd>↵</kbd> to save
                </span>
                <div>
                  <button className="cancel" onClick={onClose} type="button">
                    Cancel
                  </button>
                  <button
                    className="save"
                    type="button"
                    onClick={handleSave}
                    disabled={!url.trim() || state === "saving"}
                  >
                    {state === "saving" ? "Saving..." : "Save resource"}
                    <Icon name={state === "saving" ? "clock" : "arrow"} />
                  </button>
                </div>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
