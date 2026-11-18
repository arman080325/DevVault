"use client";

import React, { useState } from "react";
import { Icon } from "@/components/shared/icon";
import { ResourceArt, ResourceKind } from "@/components/resources/resource-art";
import { FigmaResource } from "@/data/figmaResources";

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveResource: (newResource: Partial<FigmaResource>) => void;
}

export function QuickCaptureModal({
  isOpen,
  onClose,
  onSaveResource,
}: QuickCaptureModalProps) {
  const [url, setUrl] = useState("https://motion.dev/docs/react-layout-animations");
  const [category, setCategory] = useState("Animation");
  const [status, setStatus] = useState<"To explore" | "Exploring" | "Completed">("To explore");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"ready" | "saving" | "saved">("ready");

  if (!isOpen) return null;

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

  const handleSave = () => {
    setState("saving");
    setTimeout(() => {
      setState("saved");
      setTimeout(() => {
        onSaveResource({
          kind: detectedKind,
          url,
          title: "Layout animations: the missing guide",
          description: "A practical introduction to smooth, interruptible layout transitions in React.",
          domain: url.replace(/^https?:\/\//, "").split("/")[0] || "motion.dev",
          source: detectedKind.charAt(0).toUpperCase() + detectedKind.slice(1),
          category,
          status,
          notes: note,
          saved: "Today",
          length: detectedKind === "video" ? "15 min watch" : "8 min read",
        });
        setState("ready");
        onClose();
      }, 800);
    }, 600);
  };

  return (
    <div className="capture-layer" role="dialog" aria-modal="true" aria-label="Quick capture">
      <button className="capture-backdrop" onClick={onClose} aria-label="Close quick capture" />
      <div className="capture-modal select-none">
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

        {state === "saved" ? (
          <div className="capture-success">
            <span>
              <Icon name="check" size={25} />
            </span>
            <p>Layout animations: the missing guide</p>
            <small>Added to {category} · {status}</small>
          </div>
        ) : (
          <>
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
                  <button onClick={() => setUrl("")} aria-label="Clear URL">
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
            </label>

            <div className="metadata-label">
              <span>
                <i />
                METADATA FOUND
              </span>
              <small>Edited just now</small>
            </div>

            <div className="capture-preview">
              <ResourceArt kind={detectedKind} />
              <div>
                <span>{url.replace(/^https?:\/\//, "").split("/")[0] || "motion.dev"}</span>
                <h3>Layout animations: the missing guide</h3>
                <p>
                  A practical introduction to smooth, interruptible layout transitions in React.
                </p>
              </div>
            </div>

            <div className="capture-fields">
              <label>
                <span>Category</span>
                <button
                  type="button"
                  onClick={() => {
                    const categories = ["Animation", "UI systems", "Web performance", "CSS", "React"];
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

            <footer className="capture-actions">
              <span>
                <kbd>⌘</kbd>
                <kbd>↵</kbd> to save
              </span>
              <div>
                <button className="cancel" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="save"
                  onClick={handleSave}
                  disabled={!url.trim() || state === "saving"}
                >
                  {state === "saving" ? "Saving..." : "Save resource"}
                  <Icon name={state === "saving" ? "clock" : "arrow"} />
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
