"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@/components/shared/icon";
import { ResourceArt, ResourceKind } from "@/components/resources/resource-art";
import { FigmaResource } from "@/data/figmaResources";

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveResource: (newResource: Partial<FigmaResource>) => void;
  existingResources?: FigmaResource[];
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
}: QuickCaptureModalProps) {
  const [url, setUrl] = useState("https://motion.dev/docs/react-layout-animations");
  const [category, setCategory] = useState("Animation");
  const [status, setStatus] = useState<"To explore" | "Exploring" | "Completed">("To explore");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"ready" | "saving" | "saved">("ready");

  const metadata = useMemo(() => deriveMetadata(url), [url]);

  // Check if URL is already captured
  const isDuplicate = useMemo(() => {
    if (!url.trim() || !existingResources.length) return null;
    const clean = url.trim().toLowerCase().replace(/\/$/, "");
    return existingResources.find(
      (r) => r.url && r.url.toLowerCase().replace(/\/$/, "") === clean
    );
  }, [url, existingResources]);

  // Auto-detect kind from URL
  const detectKind = (inputUrl: string): ResourceKind => {
    const lower = inputUrl.toLowerCase();
    if (lower.includes("github.com")) return "github";
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "video";
    if (lower.includes("instagram.com")) return "instagram";
    if (lower.includes("react.dev") || lower.includes("docs.")) return "docs";
    if (lower.includes("motion.dev")) return "motion";
    return "article";
  };

  const detectedKind = detectKind(url);

  // Background scroll lock and keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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
  }, [isOpen, onClose, url, state]);

  if (!isOpen) return null;

  const handleSave = () => {
    setState("saving");
    setTimeout(() => {
      setState("saved");
      setTimeout(() => {
        onSaveResource({
          kind: detectedKind,
          url,
          title: metadata.title,
          description: metadata.description,
          domain: metadata.domain,
          source: detectedKind.charAt(0).toUpperCase() + detectedKind.slice(1),
          category,
          status,
          notes: note,
          saved: "Today",
          length: detectedKind === "video" ? "15 min watch" : "8 min read",
        });
        setState("ready");
        onClose();
      }, 700);
    }, 500);
  };

  return (
    <div className="capture-layer" role="dialog" aria-modal="true" aria-label="Quick capture">
      <button className="capture-backdrop" onClick={onClose} aria-label="Close quick capture" />
      <div className="capture-modal">
        <div className="capture-sheet-header">
          <div className="sheet-handle" />
          <header className="capture-head">
            <div>
              <span>QUICK CAPTURE</span>
              <h2>{state === "saved" ? "Saved to your vault." : "Save a discovery"}</h2>
            </div>
            <button onClick={onClose} aria-label="Close">
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
              <p>{metadata.title}</p>
              <small>Added to {category} · {status}</small>
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
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://..."
                    autoFocus
                  />
                  {url && (
                    <button onClick={() => setUrl("")} aria-label="Clear URL" type="button">
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </div>
              </label>

              {isDuplicate && (
                <div className="duplicate-warning" role="alert">
                  <Icon name="bookmark" size={14} />
                  <span>
                    <b>Already in vault:</b> &ldquo;{isDuplicate.title}&rdquo; ({isDuplicate.category} · {isDuplicate.status}).
                  </span>
                </div>
              )}

              <div className="metadata-label">
                <span>
                  <i />
                  METADATA FOUND
                </span>
                <small>Detected from link</small>
              </div>

              <div className="capture-preview">
                <ResourceArt kind={detectedKind} />
                <div>
                  <span>{metadata.domain}</span>
                  <h3>{metadata.title}</h3>
                  <p>{metadata.description}</p>
                </div>
              </div>

              <div className="capture-fields">
                <label>
                  <span>Category</span>
                  <button
                    type="button"
                    onClick={() => {
                      const categories = ["Animation", "UI systems", "Web performance", "CSS", "React", "Tools"];
                      const next = categories[(categories.indexOf(category) + 1) % categories.length];
                      setCategory(next);
                    }}
                  >
                    {category} <Icon name="chevron" size={14} />
                  </button>
                </label>

                <label>
                  <span>Status</span>
                  <button
                    type="button"
                    onClick={() => {
                      const statuses: ("To explore" | "Exploring" | "Completed")[] = [
                        "To explore",
                        "Exploring",
                        "Completed",
                      ];
                      const next = statuses[(statuses.indexOf(status) + 1) % statuses.length];
                      setStatus(next);
                    }}
                  >
                    {status} <Icon name="chevron" size={14} />
                  </button>
                </label>
              </div>

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
