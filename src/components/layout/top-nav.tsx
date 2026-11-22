/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { Brand } from "./brand";
import { Icon } from "@/components/shared/icon";
import { type UserProfile } from "./sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { IconMenu2 } from "@tabler/icons-react";

interface TopNavProps {
  theme: "light" | "dark";
  onTheme: (event?: React.MouseEvent<HTMLElement>) => void;
  onSearch: () => void;
  onSettings: () => void;
  onActivity?: () => void;
  userProfile?: UserProfile;
  isAuthenticated?: boolean;
  onOpenAuth?: (mode?: "sign-in" | "sign-up") => void;
  onSignOut?: () => void;
  syncStatus?: "synced" | "local" | "syncing" | "error" | "offline";
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
  syncStatus,
}: TopNavProps) {
  const { setOpen } = useSidebar();
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
      <div className="mobile-topbar-left">
        <button
          type="button"
          className="mobile-menu-trigger"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Open navigation menu"
          title="Open menu"
        >
          <IconMenu2 size={20} />
        </button>
        <div className="mobile-brand">
          <Brand />
        </div>
      </div>

      <button className="global-search" onClick={onSearch} aria-label="Search library">
        <Icon name="search" />
        <span>Search your library...</span>
        <kbd>⌘ K</kbd>
      </button>

      <div className="top-actions">
        {/* Unauthenticated: Discoverable Sign In Button (Desktop/Tablet) */}
        {!isAuthenticated && (
          <button
            type="button"
            className="top-signin-btn hidden md:inline-flex"
            onClick={() => onOpenAuth?.("sign-in")}
            aria-label="Sign in to your vault"
          >
            <Icon name="log-in" size={14} />
            <span>Sign In</span>
          </button>
        )}

        <button
          type="button"
          className="top-icon-btn"
          aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          onClick={(e) => onTheme(e)}
          title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
        >
          <span className="theme-toggle-icon-wrap" aria-hidden="true">
            <Icon name={theme === "light" ? "moon" : "sun"} />
          </span>
        </button>

        <button
          type="button"
          className="mobile-avatar shrink-0 overflow-hidden"
          onClick={() => (isAuthenticated ? onSettings() : onOpenAuth?.("sign-in"))}
          aria-label={isAuthenticated ? "Open settings" : "Sign in to vault"}
          title={isAuthenticated ? displayName : "Sign in to vault"}
        >
          {userProfile?.avatar_url ? (
            <img
              src={userProfile.avatar_url}
              alt={displayName}
              className="w-full h-full object-cover rounded-full"
            />
          ) : isAuthenticated ? (
            initials
          ) : (
            <Icon name="user" size={16} />
          )}
        </button>
      </div>
    </header>
  );
}
