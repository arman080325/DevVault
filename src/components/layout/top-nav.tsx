"use client";

import React from "react";
import { Brand } from "./brand";
import { Icon } from "@/components/shared/icon";

interface TopNavProps {
  theme: "light" | "dark";
  onTheme: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onActivity: () => void;
}

export function TopNav({
  theme,
  onTheme,
  onSearch,
  onSettings,
  onActivity,
}: TopNavProps) {
  return (
    <header className="topbar select-none">
      <div className="mobile-brand">
        <Brand />
      </div>

      <button className="global-search" onClick={onSearch} aria-label="Search library">
        <Icon name="search" />
        <span>Search your library...</span>
        <kbd>⌘ K</kbd>
      </button>

      <div className="top-actions">
        <button
          aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          onClick={onTheme}
          title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
        >
          <Icon name={theme === "light" ? "moon" : "sun"} />
        </button>

        <button aria-label="Open activity" onClick={onActivity} title="Activity & Insights">
          <Icon name="more" />
        </button>

        <button className="mobile-avatar" onClick={onSettings} aria-label="Open settings">
          AL
        </button>
      </div>
    </header>
  );
}
