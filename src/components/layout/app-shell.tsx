"use client";

import * as React from "react";
import { Sidebar, type NavPage, type UserProfile } from "./sidebar";
import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";
import { Lightfall } from "@/components/ui/lightfall";
import { executeThemeTransition } from "@/lib/theme-transition";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";

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
  onTheme?: (event?: React.MouseEvent<HTMLElement>) => void;
  isAuthenticated?: boolean;
  onOpenAuth?: (mode?: "sign-in" | "sign-up") => void;
  onSignOut?: () => void;
  syncStatus?: "synced" | "local" | "syncing" | "error" | "offline";
}

export function AppShell(props: AppShellProps) {
  return (
    <SidebarProvider>
      <AppShellContent {...props} />
    </SidebarProvider>
  );
}

function AppShellContent({
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
  syncStatus,
}: AppShellProps) {
  const { open } = useSidebar();
  const [internalTheme, setInternalTheme] = React.useState<"light" | "dark">("light");
  const [mounted, setMounted] = React.useState(false);

  const theme = controlledTheme ?? internalTheme;

  React.useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleToggleTheme = React.useCallback(
    (e?: React.MouseEvent<HTMLElement>) => {
      if (controlledOnTheme) {
        controlledOnTheme(e);
        return;
      }
      const next = internalTheme === "light" ? "dark" : "light";
      executeThemeTransition({
        nextTheme: next,
        event: e,
        applyTheme: () => {
          setInternalTheme(next);
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
        },
      });
    },
    [controlledOnTheme, internalTheme]
  );

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
    <div
      className={`app-shell ${theme}`}
      style={{ "--sidebar-width": open ? "260px" : "72px" } as React.CSSProperties}
    >
      {mounted && (
        <div className="devvault-lightfall-bg" aria-hidden="true">
          <Lightfall
            colors={
              theme === "dark"
                ? ["#c8bfb0", "#b8aea0", "#9b5645", "#783f33", "#68352b"]
                : ["#ded5c4", "#e8decb", "#f0e8d8", "#cec3b0", "#ba6b58", "#a89c8c"]
            }
            backgroundColor={theme === "dark" ? "#191613" : "#F5F1E9"}
            speed={theme === "dark" ? 0.15 : 0.13}
            streakCount={2}
            streakWidth={theme === "dark" ? 0.7 : 0.65}
            twinkle={theme === "dark" ? 0.18 : 0.14}
            backgroundGlow={theme === "dark" ? 0.06 : 0.02}
            headGlow={theme === "dark" ? 0.22 : 0.16}
            bloom={theme === "dark" ? 0.12 : 0.05}
            mouseInteraction
            holdToWarp
            intro
            streakLength={theme === "dark" ? 0.9 : 0.85}
            density={theme === "dark" ? 0.30 : 0.24}
            glow={theme === "dark" ? 0.35 : 0.26}
            depth={theme === "dark" ? 0.85 : 0.88}
            zoom={3}
            mouseStrength={0.16}
            mouseRadius={0.38}
            lens={0.2}
            fade={0}
            lightMode={theme !== "dark"}
          />
          <div className="devvault-lightfall-overlay" aria-hidden="true" />
        </div>
      )}
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
          syncStatus={syncStatus}
        />
        <main>{children}</main>
      </div>
      <MobileNav page={page} onPage={onPage} onCapture={onCapture} />
    </div>
  );
}
