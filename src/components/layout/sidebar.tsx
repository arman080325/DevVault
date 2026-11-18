"use client";

import React from "react";
import { Brand } from "./brand";
import { Icon } from "@/components/shared/icon";

export type NavPage = "home" | "library" | "explore" | "collections" | "activity" | "settings";

export interface UserProfile {
  name: string;
  email: string;
  role: string;
}

interface SidebarProps {
  page: NavPage;
  onPage: (page: NavPage) => void;
  onCapture: () => void;
  exploreCount?: number;
  onSelectCollection?: (name: string) => void;
  userProfile?: UserProfile;
}

export function Sidebar({
  page,
  onPage,
  onCapture,
  exploreCount = 7,
  onSelectCollection,
  userProfile,
}: SidebarProps) {
  const displayName = userProfile?.name || "Alex Lin";
  const displayRole = userProfile?.role || "Personal vault";
  const initials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AL";

  return (
    <aside className="sidebar select-none">
      <button onClick={() => onPage("home")} className="text-left focus:outline-none">
        <Brand />
      </button>

      <button
        className="sidebar-capture"
        onClick={onCapture}
        aria-label="Save a link to your vault (Press C)"
        title="Save a link (Press C)"
      >
        <span className="sidebar-capture-icon">
          <Icon name="plus" size={15} />
        </span>
        <span className="sidebar-capture-text">Save a link</span>
        <kbd className="sidebar-capture-kbd" aria-label="Keyboard shortcut C">
          C
        </kbd>
        <span className="sidebar-capture-shimmer" aria-hidden="true" />
      </button>

      <nav aria-label="Main Navigation">
        <button
          className={page === "home" ? "active" : ""}
          onClick={() => onPage("home")}
        >
          <Icon name="home" />
          Home
        </button>
        <button
          className={page === "library" ? "active" : ""}
          onClick={() => onPage("library")}
        >
          <Icon name="library" />
          Library
        </button>
        <button
          className={page === "explore" ? "active" : ""}
          onClick={() => onPage("explore")}
        >
          <Icon name="explore" />
          Explore<span>{exploreCount}</span>
        </button>
        <button
          className={page === "collections" ? "active" : ""}
          onClick={() => onPage("collections")}
        >
          <Icon name="collection" />
          Collections
        </button>
        <button
          className={page === "activity" ? "active" : ""}
          onClick={() => onPage("activity")}
        >
          <Icon name="activity" />
          Activity
        </button>
        <button
          className={page === "settings" ? "active" : ""}
          onClick={() => onPage("settings")}
        >
          <Icon name="settings" />
          Settings
        </button>
      </nav>

      <div className="sidebar-collection">
        <span>COLLECTIONS</span>
        <button onClick={() => onSelectCollection ? onSelectCollection("Frontend") : onPage("collections")}>
          <i className="rust-dot" />
          Frontend inspiration<small>12</small>
        </button>
        <button onClick={() => onSelectCollection ? onSelectCollection("Backend") : onPage("collections")}>
          <i className="ink-dot" />
          Backend engineering<small>28</small>
        </button>
        <button onClick={() => onSelectCollection ? onSelectCollection("Roadmaps") : onPage("collections")}>
          <i className="sage-dot" />
          Learning roadmaps<small>9</small>
        </button>
      </div>

      <div className="sidebar-bottom">
        <button className="profile" onClick={() => onPage("settings")}>
          <span>{initials}</span>
          <div>
            <b>{displayName}</b>
            <small>{displayRole}</small>
          </div>
          <Icon name="chevron" size={14} />
        </button>
      </div>
    </aside>
  );
}
