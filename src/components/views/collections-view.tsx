"use client";

import React, { useState } from "react";
import { Icon } from "@/components/shared/icon";
import { CollectionItem } from "@/data/figmaResources";

interface CollectionsViewProps {
  collections: CollectionItem[];
  onOpenCollection?: (collection: CollectionItem) => void;
  onCreateCollection?: (newCol: CollectionItem) => void;
  onUpdateCollection?: (oldName: string, updates: Partial<CollectionItem>) => void;
  onDeleteCollection?: (name: string, id?: string) => void;
}

export function CollectionsView({
  collections,
  onOpenCollection,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
}: CollectionsViewProps) {
  const [creating, setCreating] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionItem | null>(null);

  // Form states for creation
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [tone, setTone] = useState<CollectionItem["tone"]>("paper");

  // Form states for editing
  const [editName, setEditName] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editTone, setEditTone] = useState<CollectionItem["tone"]>("paper");

  const tones: CollectionItem["tone"][] = ["rust", "ink", "sage", "sand", "paper"];

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    const newCol: CollectionItem = {
      name: name.trim(),
      count: 0,
      note: note.trim() || "A new shelf, ready for its first discovery.",
      tone,
    };

    onCreateCollection?.(newCol);
    setName("");
    setNote("");
    setTone("paper");
    setCreating(false);
  };

  const handleOpenEdit = (e: React.MouseEvent, col: CollectionItem) => {
    e.stopPropagation();
    setEditingCollection(col);
    setEditName(col.name);
    setEditNote(col.note);
    setEditTone(col.tone);
  };

  const handleSaveEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingCollection || !editName.trim()) return;

    onUpdateCollection?.(editingCollection.name, {
      name: editName.trim(),
      note: editNote.trim(),
      tone: editTone,
    });

    setEditingCollection(null);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingCollection) return;
    if (window.confirm(`Are you sure you want to delete the collection "${editingCollection.name}"?`)) {
      onDeleteCollection?.(editingCollection.name, editingCollection.id);
      setEditingCollection(null);
    }
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
          <div
            className={`collection-large ${collection.tone} relative group cursor-pointer focus:outline-none`}
            key={collection.name + index}
            onClick={() => onOpenCollection?.(collection)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onOpenCollection?.(collection);
              }
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <small>{collection.count} resources</small>
              </div>

              {/* Edit / Shelf Options Button */}
              <button
                type="button"
                className="opacity-70 group-hover:opacity-100 hover:scale-105 p-1 rounded transition-all"
                onClick={(e) => handleOpenEdit(e, collection)}
                aria-label={`Edit collection ${collection.name}`}
                title="Edit shelf details"
              >
                <Icon name="more" size={16} />
              </button>
            </div>

            <h2>{collection.name}</h2>
            <p>{collection.note}</p>

            <span className="collection-open">
              Open collection <Icon name="arrow" />
            </span>
          </div>
        ))}
      </div>

      {/* CREATE COLLECTION MODAL */}
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
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Shelf description or purpose (optional)"
              className="mt-2 text-sm"
            />
            <div className="flex items-center gap-2 mt-3 mb-1">
              <span className="text-xs text-[var(--muted,#7c7468)] uppercase font-semibold">Cover tone:</span>
              <div className="flex gap-1.5">
                {tones.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`w-5 h-5 rounded-full border ${
                      tone === t ? "border-foreground ring-1 ring-foreground" : "border-transparent"
                    } ${
                      t === "rust"
                        ? "bg-[#b85d39]"
                        : t === "ink"
                        ? "bg-[#2b2722]"
                        : t === "sage"
                        ? "bg-[#5a7d65]"
                        : t === "sand"
                        ? "bg-[#d4b996]"
                        : "bg-[#e8e2d5]"
                    }`}
                    title={t}
                  />
                ))}
              </div>
            </div>
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

      {/* EDIT COLLECTION MODAL */}
      {editingCollection && (
        <div className="mini-layer" role="dialog" aria-modal="true" aria-label="Edit collection">
          <button
            className="capture-backdrop"
            onClick={() => setEditingCollection(null)}
            aria-label="Close dialog"
            type="button"
          />
          <form className="mini-modal" onSubmit={handleSaveEdit}>
            <span className="date-label">EDIT SHELF</span>
            <h2>Customize shelf</h2>
            <p>Update title, description or color tone.</p>
            <input
              autoFocus
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Collection name"
            />
            <input
              value={editNote}
              onChange={(event) => setEditNote(event.target.value)}
              placeholder="Description"
              className="mt-2 text-sm"
            />
            <div className="flex items-center gap-2 mt-3 mb-1">
              <span className="text-xs text-[var(--muted,#7c7468)] uppercase font-semibold">Cover tone:</span>
              <div className="flex gap-1.5">
                {tones.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditTone(t)}
                    className={`w-5 h-5 rounded-full border ${
                      editTone === t ? "border-foreground ring-1 ring-foreground" : "border-transparent"
                    } ${
                      t === "rust"
                        ? "bg-[#b85d39]"
                        : t === "ink"
                        ? "bg-[#2b2722]"
                        : t === "sage"
                        ? "bg-[#5a7d65]"
                        : t === "sand"
                        ? "bg-[#d4b996]"
                        : "bg-[#e8e2d5]"
                    }`}
                    title={t}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center w-full mt-4">
              <button
                type="button"
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1 p-1"
              >
                <Icon name="trash" size={14} /> Delete
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingCollection(null)}>
                  Cancel
                </button>
                <button className="primary" disabled={!editName.trim()} type="submit">
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
