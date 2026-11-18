"use client";

import React, { useState, useMemo } from "react";
import { Icon } from "@/components/shared/icon";
import { ResourceArt } from "@/components/resources/resource-art";
import { FigmaResource } from "@/data/figmaResources";

interface ExploreViewProps {
  resources: FigmaResource[];
  onOpenResource: (resource: FigmaResource) => void;
  onRemoveFromQueue?: (id: number) => void;
}

export function ExploreView({
  resources,
  onOpenResource,
  onRemoveFromQueue,
}: ExploreViewProps) {
  const [focus, setFocus] = useState<"All" | "Short reads" | "Watch">("All");

  // Derive queue synchronously from parent resources
  const queue = useMemo(
    () => resources.filter((resource) => resource.status !== "Completed"),
    [resources]
  );

  const visible = queue.filter((resource) => {
    if (focus === "Watch") return resource.length.includes("watch");
    if (focus === "Short reads") return resource.length.includes("read");
    return true;
  });

  const handleRemove = (id: number) => {
    onRemoveFromQueue?.(id);
  };

  return (
    <div className="page stage-page">
      <header className="library-head stage-head">
        <div>
          <span className="date-label">YOUR READING QUEUE</span>
          <h1>Explore later</h1>
          <p>{queue.length} thoughtful finds, waiting for the right moment.</p>
        </div>
      </header>

      <div className="queue-controls">
        <div className="filters" role="tablist">
          {(["All", "Short reads", "Watch"] as const).map((item) => (
            <button
              className={focus === item ? "active" : ""}
              onClick={() => setFocus(item)}
              key={item}
              role="tab"
              aria-selected={focus === item}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <span>Ordered by oldest saved</span>
      </div>

      {visible.length > 0 ? (
        <div className="queue-list">
          {visible.map((resource, index) => (
            <article className="queue-item" key={resource.id}>
              <span className="queue-number">{String(index + 1).padStart(2, "0")}</span>

              <button
                className="queue-art"
                onClick={() => onOpenResource(resource)}
                aria-label={`Open ${resource.title}`}
                type="button"
              >
                <ResourceArt kind={resource.kind} />
              </button>

              <button
                className="queue-copy text-left"
                onClick={() => onOpenResource(resource)}
                aria-label={resource.title}
                type="button"
              >
                <span>
                  {resource.source} / {resource.length}
                </span>
                <h2>{resource.title}</h2>
                <p>{resource.description}</p>
              </button>

              <div className="queue-actions">
                <button
                  className="queue-open"
                  onClick={() => onOpenResource(resource)}
                  type="button"
                >
                  Start exploring <Icon name="arrow" size={15} />
                </button>
                <button onClick={() => handleRemove(resource.id)} type="button">
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span>
            <Icon name="check" />
          </span>
          <h2>Your queue is clear.</h2>
          <p>Anything you save for later will gather here.</p>
        </div>
      )}
    </div>
  );
}
