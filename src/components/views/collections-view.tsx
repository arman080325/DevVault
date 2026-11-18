"use client";

import React, { useState } from "react";
import { Icon } from "@/components/shared/icon";
import { CollectionItem } from "@/data/figmaResources";

interface CollectionsViewProps {
  collections: CollectionItem[];
  onOpenCollection?: (collection: CollectionItem) => void;
  onCreateCollection?: (newCol: CollectionItem) => void;
}

export function CollectionsView({
  collections,
  onOpenCollection,
  onCreateCollection,
}: CollectionsViewProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    const newCol: CollectionItem = {
      name: name.trim(),
      count: 0,
      note: "A new shelf, ready for its first discovery.",
      tone: "paper",
    };

    onCreateCollection?.(newCol);
    setName("");
    setCreating(false);
  };

  return (
    <div className="page stage-page">
      <header className="library-head stage-head">
        <div>
          <span className="date-label">CURATED BY YOU</span>
          <h1>Collections</h1>
          <p>{collections.length} shelves for the ideas that belong together.</p>
        </div>
        <button
          className="library-add"
          onClick={() => setCreating(true)}
          aria-label="New collection"
          type="button"
        >
          <Icon name="plus" /> New collection
        </button>
      </header>

      <div className="collection-grid">
        {collections.map((collection, index) => (
          <button
            className={`collection-large ${collection.tone} focus:outline-none`}
            key={collection.name}
            onClick={() => onOpenCollection?.(collection)}
            aria-label={`Open ${collection.name}`}
            type="button"
          >
            <div>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <small>{collection.count} resources</small>
            </div>
            <h2>{collection.name}</h2>
            <p>{collection.note}</p>
            <span className="collection-open">
              Open collection <Icon name="arrow" />
            </span>
          </button>
        ))}
      </div>

      {creating && (
        <div className="mini-layer" role="dialog" aria-modal="true" aria-label="Create collection">
          <button
            className="capture-backdrop"
            onClick={() => setCreating(false)}
            aria-label="Close dialog"
            type="button"
          />
          <form className="mini-modal" onSubmit={handleCreate}>
            <span className="date-label">NEW SHELF</span>
            <h2>Name your collection</h2>
            <p>Give related discoveries a place to gather.</p>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Design engineering"
            />
            <div>
              <button type="button" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button className="primary" disabled={!name.trim()} type="submit">
                Create collection
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
