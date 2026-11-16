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
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const [internalQuickCaptureOpen, setInternalQuickCaptureOpen] = React.useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);

  const isQuickCaptureOpen =
    externalIsQuickCaptureOpen !== undefined
      ? externalIsQuickCaptureOpen
      : internalQuickCaptureOpen;

  const handleOpenQuickCapture = () => {
    if (externalOnOpenQuickCapture) {
      externalOnOpenQuickCapture();
    } else {
      setInternalQuickCaptureOpen(true);
    }
  };

  const handleCloseQuickCapture = () => {
    if (externalOnCloseQuickCapture) {
      externalOnCloseQuickCapture();
    } else {
      setInternalQuickCaptureOpen(false);
    }
  };

  // Global keyboard shortcuts: 'c' for quick capture, 'k' or 'cmd+k' for command palette
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
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenQuickCapture={handleOpenQuickCapture}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        activeFilter={activeFilter}
        onSelectFilter={onSelectFilter}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
        <TopNav
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onOpenQuickCapture={handleOpenQuickCapture}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          activeFilter={activeFilter}
          onClearFilter={onClearFilter}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        onOpenQuickCapture={handleOpenQuickCapture}
        activeFilter={activeFilter}
        onSelectFilter={onSelectFilter}
      />

      {/* Quick Add Resource Modal */}
      <AddResourceModal
        isOpen={isQuickCaptureOpen}
        onClose={handleCloseQuickCapture}
        onAddResource={onAddResource}
      />

      {/* Global Command Palette Dialog */}
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
