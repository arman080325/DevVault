"use client";

import React from "react";
import { Icon } from "@/components/shared/icon";
import { type NavPage } from "./sidebar";

interface MobileNavProps {
  page: NavPage;
  onPage: (page: NavPage) => void;
  onCapture: () => void;
}

export function MobileNav({ page, onPage, onCapture }: MobileNavProps) {
  return (
    <nav className="mobile-nav select-none" aria-label="Mobile Navigation">
      <button
        className={page === "home" ? "active" : ""}
        onClick={() => onPage("home")}
        aria-label="Home"
      >
        <Icon name="home" />
        <span>Home</span>
      </button>

      <button
        className={page === "library" ? "active" : ""}
        onClick={() => onPage("library")}
        aria-label="Library"
      >
        <Icon name="library" />
        <span>Library</span>
      </button>

      <button
        className="mobile-capture"
        onClick={onCapture}
        aria-label="Save discovery"
      >
        <Icon name="plus" />
        <span>Save</span>
      </button>

      <button
        className={page === "explore" ? "active" : ""}
        onClick={() => onPage("explore")}
        aria-label="Explore"
      >
        <Icon name="explore" />
        <span>Explore</span>
      </button>

      <button
        className={page === "collections" ? "active" : ""}
        onClick={() => onPage("collections")}
        aria-label="Collections"
      >
        <Icon name="collection" />
        <span>Collections</span>
      </button>
    </nav>
  );
}
