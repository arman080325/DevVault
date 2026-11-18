"use client";

import * as React from "react";
import { Sidebar, type NavPage } from "./sidebar";
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
}

export function AppShell({
  children,
  page,
  onPage,
  onCapture,
  onSearch,
  exploreCount = 7,
  onSelectCollection,
}: AppShellProps) {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  // Synchronize theme with localStorage and document class
  React.useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTheme = urlParams.get("theme") as "light" | "dark" | null;
      const savedTheme = localStorage.getItem("devvault-theme") as "light" | "dark" | null;
      const activeTheme = urlTheme || savedTheme || "light";

      setTheme(activeTheme);
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
    setTheme((prev) => {
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
  }, []);

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
      />
      <div className="app-column">
        <TopNav
          theme={theme}
          onTheme={handleToggleTheme}
          onSearch={onSearch}
          onSettings={() => onPage("settings")}
          onActivity={() => onPage("activity")}
        />
        <main>{children}</main>
      </div>
      <MobileNav page={page} onPage={onPage} onCapture={onCapture} />
    </div>
  );
}
