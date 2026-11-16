"use client";

import * as React from "react";
import {
  Search,
  Plus,
  Menu,
  Github,
  Command,
  Filter,
  X,
  Bell,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";

interface TopNavProps {
  onOpenMobileNav: () => void;
  onOpenQuickCapture: () => void;
  onOpenCommandPalette: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter?: string | null;
  onClearFilter?: () => void;
}

export function TopNav({
  onOpenMobileNav,
  onOpenQuickCapture,
  onOpenCommandPalette,
  searchQuery,
  onSearchChange,
  activeFilter,
  onClearFilter,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md">
      {/* Left Area: Mobile Trigger + Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden text-muted-foreground hover:text-foreground"
          onClick={onOpenMobileNav}
          aria-label="Open mobile navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search & Command trigger */}
        <div className="relative w-full max-w-md">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search resources, tags, authors... (Ctrl+K)"
              className="h-8.5 w-full rounded-lg border border-input bg-card/60 pl-8 pr-16 text-xs text-foreground placeholder:text-muted-foreground/70 shadow-2xs transition-all focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  onClick={() => onSearchChange("")}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : (
                <button
                  onClick={onOpenCommandPalette}
                  className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border/80 bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground"
                >
                  <Command className="h-2.5 w-2.5" />
                  <span>K</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Pill */}
        {activeFilter && (
          <div className="hidden sm:flex items-center gap-1">
            <Badge
              variant="outline"
              className="flex items-center gap-1 bg-primary/10 text-primary border-primary/30 text-[11px] py-0.5 px-2"
            >
              <Filter className="h-2.5 w-2.5" />
              <span>{activeFilter}</span>
              {onClearFilter && (
                <button
                  onClick={onClearFilter}
                  className="ml-1 rounded hover:bg-primary/20 p-0.5"
                  title="Clear filter"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </Badge>
          </div>
        )}
      </div>

      {/* Right Area: Actions, Theme, External Links */}
      <div className="flex items-center gap-2">
        {/* Quick Add Resource Desktop */}
        <Button
          onClick={onOpenQuickCapture}
          size="sm"
          className="hidden sm:inline-flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Resource</span>
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* GitHub Repository */}
        <a
          href="https://github.com/arman080325/DevVault"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
          title="View GitHub Repository"
        >
          <Github className="h-4 w-4" />
          <span className="sr-only">GitHub</span>
        </a>
      </div>
    </header>
  );
}
