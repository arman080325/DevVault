"use client";

import React from "react";
import { Brand } from "./brand";
import { Icon } from "@/components/shared/icon";
import { type UserProfile } from "./sidebar";

interface TopNavProps {
  theme: "light" | "dark";
  onTheme: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onActivity: () => void;
  userProfile?: UserProfile;
  isAuthenticated?: boolean;
  onOpenAuth?: (mode?: "sign-in" | "sign-up") => void;
  onSignOut?: () => void;
}

export function TopNav({
  theme,
  onTheme,
  onSearch,
  onSettings,
  onActivity,
  userProfile,
  isAuthenticated = false,
  onOpenAuth,
  onSignOut,
}: TopNavProps) {
  const displayName = userProfile?.name || "Alex Lin";
  const initials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AL";

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
        {/* Unauthenticated: Discoverable Sign In Button */}
        {!isAuthenticated ? (
          <button
            type="button"
            className="top-signin-btn"
            onClick={() => onOpenAuth?.("sign-in")}
            aria-label="Sign in to your vault"
          >
            <Icon name="log-in" size={14} />
            <span>Sign In</span>
          </button>
        ) : (
          <span
            className="top-synced-pill"
            title="Connected to Supabase PostgreSQL"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Cloud</span>
          </span>
        )}

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

        <button
          className="mobile-avatar"
          onClick={() => (isAuthenticated ? onSettings() : onOpenAuth?.("sign-in"))}
          aria-label={isAuthenticated ? "Open settings" : "Sign in to vault"}
          title={isAuthenticated ? displayName : "Sign in to vault"}
        >
          {isAuthenticated ? initials : <Icon name="user" size={16} />}
        </button>
      </div>
    </header>
  );
}
