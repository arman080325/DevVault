"use client";

import * as React from "react";
import { LayoutGrid, List, SearchX, ArrowUpDown } from "lucide-react";
import { ResourceItem } from "@/types/resource";
import { ResourceCard } from "./resource-card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

interface ResourceGridProps {
  resources: ResourceItem[];
  onTogglePin?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onStatusChange?: (id: string, status: ResourceItem["status"]) => void;
  onSelectTag?: (tag: string) => void;
  selectedTag?: string | null;
  onOpenQuickCapture?: () => void;
  activeStatusTab?: string;
  onStatusTabChange?: (status: string) => void;
}

export function ResourceGrid({
  resources,
  onTogglePin,
  onToggleFavorite,
  onStatusChange,
  onSelectTag,
  selectedTag,
  onOpenQuickCapture,
  activeStatusTab = "ALL",
  onStatusTabChange,
}: ResourceGridProps) {
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = React.useState<"newest" | "title">("newest");

  const statusTabs: { label: string; value: string }[] = [
    { label: "All", value: "ALL" },
    { label: "Saved", value: "SAVED" },
    { label: "Exploring", value: "EXPLORING" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Inbox", value: "INBOX" },
  ];

  const sortedResources = React.useMemo(() => {
    const list = [...resources];
    if (sortBy === "title") {
      return list.sort((a, b) => a.title.localeCompare(b.title));
    }
    // Default newest (already sorted or by date)
    return list;
  }, [resources, sortBy]);

  return (
    <div className="space-y-3.5">
      {/* Filter and View Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-border/60">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {statusTabs.map((tab) => {
            const isActive = activeStatusTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => onStatusTabChange?.(tab.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-secondary text-foreground font-medium border border-border/80 shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* View mode toggle + count */}
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2.5">
          <span className="text-[11px] text-muted-foreground font-mono">
            {sortedResources.length} {sortedResources.length === 1 ? "resource" : "resources"}
          </span>

          <div className="flex items-center rounded-md border border-border/70 bg-card/60 p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded p-1 transition-colors",
                viewMode === "grid"
                  ? "bg-secondary text-foreground shadow-2xs"
                  : "text-muted-foreground/60 hover:text-foreground"
              )}
              title="Grid view"
            >
              <LayoutGrid className="h-3 w-3" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded p-1 transition-colors",
                viewMode === "list"
                  ? "bg-secondary text-foreground shadow-2xs"
                  : "text-muted-foreground/60 hover:text-foreground"
              )}
              title="List view"
            >
              <List className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Resource Cards Display */}
      {sortedResources.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No resources match this filter"
          description="Adjust your search query, status tabs, or selected category."
          actionLabel="Add Resource"
          onAction={onOpenQuickCapture}
        />
      ) : (
        <div
          className={cn(
            "grid gap-3",
            viewMode === "grid"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1"
          )}
        >
          {sortedResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onTogglePin={onTogglePin}
              onToggleFavorite={onToggleFavorite}
              onStatusChange={onStatusChange}
              onSelectTag={onSelectTag}
              selectedTag={selectedTag}
              compact={viewMode === "list"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
