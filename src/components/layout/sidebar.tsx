"use client";

import React from "react";
import { Brand } from "./brand";
import { Icon } from "@/components/shared/icon";

export type NavPage = "home" | "library" | "explore" | "collections" | "activity" | "settings";

interface SidebarProps {
  page: NavPage;
  onPage: (page: NavPage) => void;
  onCapture: () => void;
  exploreCount?: number;
}

export function Sidebar({
  page,
  onPage,
  onCapture,
  exploreCount = 7,
}: SidebarProps) {
  return (
    <aside className="sidebar select-none">
      <button onClick={() => onPage("home")} className="text-left focus:outline-none">
        <Brand />
      </button>

      <button className="sidebar-capture" onClick={onCapture} aria-label="Save a link">
        <Icon name="plus" size={15} />
        Save a link
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
        <button onClick={() => onPage("collections")}>
          <i className="rust-dot" />
          Frontend inspiration<small>12</small>
        </button>
        <button onClick={() => onPage("collections")}>
          <i className="ink-dot" />
          Backend engineering<small>28</small>
        </button>
        <button onClick={() => onPage("collections")}>
          <i className="sage-dot" />
          Learning roadmaps<small>9</small>
        </button>
      </div>

      <div className="sidebar-bottom">
        <button className="profile" onClick={() => onPage("settings")}>
          <span>AL</span>
          <div>
            <b>Alex Lin</b>
            <small>Personal vault</small>
          </div>
          <Icon name="chevron" size={14} />
        </button>
      </div>
    </aside>
  );
}
