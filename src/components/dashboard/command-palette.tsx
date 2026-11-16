"use client";

import * as React from "react";
import {
  Search,
  Plus,
  Terminal,
  Layers,
  Github,
  Youtube,
  FileCode,
  Globe,
  Sparkles,
  Command,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResourceItem } from "@/types/resource";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  resources: ResourceItem[];
  onSelectResource: (url: string) => void;
  onOpenQuickCapture: () => void;
  onSelectPlatformFilter: (platform: string) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  resources,
  onSelectResource,
  onOpenQuickCapture,
  onSelectPlatformFilter,
}: CommandPaletteProps) {
  const [query, setQuery] = React.useState("");

  // Filter resources
  const filteredResources = React.useMemo(() => {
    if (!query.trim()) return resources.slice(0, 6);
    const q = query.toLowerCase();
    return resources
      .filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          (r.author && r.author.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [query, resources]);

  // Listen for Ctrl+K / Cmd+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Can be handled by parent or opened
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden border-border/80 bg-card shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
        </DialogHeader>

        {/* Search Input Bar */}
        <div className="flex items-center border-b border-border/60 px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search knowledge vault..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            autoFocus
          />
          <kbd className="rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-4">
          {/* Quick Actions */}
          {!query && (
            <div className="space-y-1">
              <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Quick Actions
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenQuickCapture();
                }}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span>Quick Capture New Resource</span>
                </div>
                <kbd className="font-mono text-[10px] text-muted-foreground">
                  C
                </kbd>
              </button>
            </div>
          )}

          {/* Resources matches */}
          <div className="space-y-1">
            <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {query ? "Matching Resources" : "Recent Resources"}
            </span>
            {filteredResources.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground text-center">
                No matching resources found for &quot;{query}&quot;.
              </p>
            ) : (
              filteredResources.map((res) => (
                <button
                  key={res.id}
                  onClick={() => {
                    onSelectResource(res.url);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-left group"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {res.title}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono mt-0.5">
                      <span className="capitalize">{res.platform.toLowerCase()}</span>
                      <span>•</span>
                      <span>{res.category}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground font-mono">
          <span>DevVault Command Palette</span>
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
