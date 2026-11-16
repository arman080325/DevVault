"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";
import { AddResourceModal } from "@/components/resources/add-resource-modal";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { ResourceItem } from "@/types/resource";

interface AppShellProps {
  children: React.ReactNode;
  resources: ResourceItem[];
  onAddResource: (resource: ResourceItem) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFilter?: string | null;
  onSelectFilter?: (type: "platform" | "category" | "all", value: string) => void;
  onClearFilter?: () => void;
  isQuickCaptureOpen?: boolean;
  onOpenQuickCapture?: () => void;
  onCloseQuickCapture?: () => void;
  mobileActiveTab?: string;
  onSelectMobileTab?: (tab: string) => void;
}

export function AppShell({
  children,
  resources,
  onAddResource,
  searchQuery,
  onSearchChange,
  activeFilter,
  onSelectFilter,
  onClearFilter,
  isQuickCaptureOpen: externalIsQuickCaptureOpen,
  onOpenQuickCapture: externalOnOpenQuickCapture,
  onCloseQuickCapture: externalOnCloseQuickCapture,
  mobileActiveTab = "home",
  onSelectMobileTab,
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [internalQuickCaptureOpen, setInternalQuickCaptureOpen] = React.useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);

  const isQuickCaptureOpen =
    externalIsQuickCaptureOpen !== undefined
      ? externalIsQuickCaptureOpen
      : internalQuickCaptureOpen;

  const handleOpenQuickCapture = React.useCallback(() => {
    if (externalOnOpenQuickCapture) {
      externalOnOpenQuickCapture();
    } else {
      setInternalQuickCaptureOpen(true);
    }
  }, [externalOnOpenQuickCapture]);

  const handleCloseQuickCapture = React.useCallback(() => {
    if (externalOnCloseQuickCapture) {
      externalOnCloseQuickCapture();
    } else {
      setInternalQuickCaptureOpen(false);
    }
  }, [externalOnCloseQuickCapture]);

  // Keyboard shortcuts: 'C' for capture, 'Ctrl+K' for command palette
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
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        handleOpenQuickCapture();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenQuickCapture]);

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-foreground">
      {/* Desktop Sidebar (hidden on <md) */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenQuickCapture={handleOpenQuickCapture}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        activeFilter={activeFilter}
        onSelectFilter={onSelectFilter}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 w-full overflow-x-hidden">
        <TopNav
          onOpenQuickCapture={handleOpenQuickCapture}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          activeFilter={activeFilter}
          onClearFilter={onClearFilter}
        />

        {/* Content Container: pb-28 on mobile leaves space for fixed bottom nav */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-7 pb-28 md:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Dedicated Bottom Nav & Floating Action */}
      <MobileNav
        onOpenQuickCapture={handleOpenQuickCapture}
        activeTab={mobileActiveTab}
        onSelectTab={onSelectMobileTab}
      />

      {/* Quick Add Resource Dialog */}
      <AddResourceModal
        isOpen={isQuickCaptureOpen}
        onClose={handleCloseQuickCapture}
        onAddResource={onAddResource}
      />

      {/* Command Palette Dialog */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        resources={resources}
        onSelectResource={(url) => window.open(url, "_blank")}
        onOpenQuickCapture={handleOpenQuickCapture}
        onSelectPlatformFilter={(p) => onSelectFilter?.("platform", p)}
      />
    </div>
  );
}
