"use client";

import * as React from "react";
import { Sidebar, type NavPage, type UserProfile } from "./sidebar";
import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";

interface AppShellProps {
  children: React.ReactNode;
  page: NavPage;
  onPage: (page: NavPage) => void;
  onCapture: () => void;
  onSearch: () => void;
  exploreCount?: number;
  onSelectCollection?: (name: string) => void;
  userProfile?: UserProfile;
  theme?: "light" | "dark";
  onTheme?: () => void;
  isAuthenticated?: boolean;
  onOpenAuth?: (mode?: "sign-in" | "sign-up") => void;
  onSignOut?: () => void;
}

export function AppShell({
  children,
  page,
  onPage,
  onCapture,
  onSearch,
  exploreCount = 7,
  onSelectCollection,
  userProfile,
  theme: controlledTheme,
  onTheme: controlledOnTheme,
  isAuthenticated = false,
  onOpenAuth,
  onSignOut,
}: AppShellProps) {
  const [internalTheme, setInternalTheme] = React.useState<"light" | "dark">("light");

  const theme = controlledTheme ?? internalTheme;

  // Synchronize theme with localStorage and document class
  React.useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTheme = urlParams.get("theme") as "light" | "dark" | null;
      const savedTheme = localStorage.getItem("devvault-theme") as "light" | "dark" | null;
      const activeTheme = urlTheme || savedTheme || "light";

      setInternalTheme(activeTheme);
      if (activeTheme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    } catch {}
  }, []);

  const handleToggleTheme = React.useCallback(() => {
    if (controlledOnTheme) {
      controlledOnTheme();
      return;
    }
    setInternalTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem("devvault-theme", next);
        if (next === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
        }
      } catch {}
      return next;
    });
  }, [controlledOnTheme]);

  // Keyboard shortcuts: 'C' for capture, '⌘ K' / 'Ctrl+K' for search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onSearch();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        onCapture();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearch, onCapture]);

  return (
    <div className={`app-shell ${theme}`}>
      <Sidebar
        page={page}
        onPage={onPage}
        onCapture={onCapture}
        exploreCount={exploreCount}
        onSelectCollection={onSelectCollection}
        userProfile={userProfile}
        isAuthenticated={isAuthenticated}
        onOpenAuth={onOpenAuth}
        onSignOut={onSignOut}
      />
      <div className="app-column">
        <TopNav
          theme={theme}
          onTheme={handleToggleTheme}
          onSearch={onSearch}
          onSettings={() => onPage("settings")}
          onActivity={() => onPage("activity")}
          userProfile={userProfile}
          isAuthenticated={isAuthenticated}
          onOpenAuth={onOpenAuth}
          onSignOut={onSignOut}
        />
        <main>{children}</main>
      </div>
      <MobileNav page={page} onPage={onPage} onCapture={onCapture} />
    </div>
  );
}
