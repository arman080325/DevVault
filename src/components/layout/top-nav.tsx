"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Github,
  Command,
  Filter,
  X,
  Vault,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";

interface TopNavProps {
  onOpenMobileNav?: () => void;
  onOpenQuickCapture: () => void;
  onOpenCommandPalette: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter?: string | null;
  onClearFilter?: () => void;
}

export function TopNav({
  onOpenQuickCapture,
  onOpenCommandPalette,
  searchQuery,
  onSearchChange,
  activeFilter,
  onClearFilter,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-20 flex h-13 w-full items-center justify-between border-b border-border/70 bg-background/90 px-3.5 sm:px-6 backdrop-blur-md">
      {/* Mobile Branding (Visible only on mobile) */}
      <div className="flex items-center gap-2 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-primary border border-border/80">
            <Vault className="h-3.5 w-3.5" />
          </div>
          <span className="font-heading font-semibold text-xs tracking-tight text-foreground">
            DevVault
          </span>
        </Link>
      </div>

      {/* Search Bar (Desktop: inline input; Mobile: hidden, accessible via icon button) */}
      <div className="hidden md:flex items-center gap-2.5 flex-1 max-w-lg">
        <div className="relative w-full max-w-md">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search resources, tags, authors... (Ctrl+K)"
              className="h-8 w-full rounded-md border border-input bg-secondary/30 pl-8 pr-14 text-xs text-foreground placeholder:text-muted-foreground/50 shadow-2xs transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
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
                  className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border/70 bg-card px-1 py-0.5 text-[9px] font-mono text-muted-foreground hover:text-foreground"
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
          <div className="hidden sm:flex items-center">
            <Badge
              variant="secondary"
              className="flex items-center gap-1 text-[11px] py-0.5 px-2"
            >
              <Filter className="h-2.5 w-2.5 opacity-70" />
              <span className="font-mono text-[10px]">{activeFilter}</span>
              {onClearFilter && (
                <button
                  onClick={onClearFilter}
                  className="ml-1 rounded hover:bg-muted p-0.5"
                  title="Clear filter"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </Badge>
          </div>
        )}
      </div>

      {/* Right Controls Area */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Mobile Search Icon Trigger */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onOpenCommandPalette}
          className="md:hidden text-muted-foreground hover:text-foreground"
          title="Search resources"
        >
          <Search className="h-4 w-4" />
          <span className="sr-only">Search</span>
        </Button>

        {/* Quick Add Resource Desktop (hidden on mobile, uses floating button) */}
        <Button
          onClick={onOpenQuickCapture}
          size="sm"
          className="hidden md:inline-flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs shadow-2xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Capture</span>
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* GitHub Repository */}
        <a
          href="https://github.com/arman080325/DevVault"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors"
          title="View GitHub Repository"
        >
          <Github className="h-3.5 w-3.5" />
          <span className="sr-only">GitHub</span>
        </a>
      </div>
    </header>
  );
}
