"use client";

import * as React from "react";
import { LayoutGrid, List, SearchX, BookmarkPlus } from "lucide-react";
import { ResourceItem, ResourceStatus } from "@/types/resource";
import { ResourceCard } from "./resource-card";
import { Button } from "@/components/ui/button";
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

  const statusTabs: { label: string; value: string }[] = [
    { label: "All Resources", value: "ALL" },
    { label: "Saved", value: "SAVED" },
    { label: "Exploring", value: "EXPLORING" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Inbox", value: "INBOX" },
  ];

  return (
    <div className="space-y-4">
      {/* Controls Bar: Status Filter Tabs + View Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {statusTabs.map((tab) => {
            const isActive = activeStatusTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => onStatusTabChange?.(tab.value)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-accent text-accent-foreground border border-border/80 shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* View Mode & Count */}
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
          <span className="text-xs text-muted-foreground font-mono">
            Showing <strong className="text-foreground">{resources.length}</strong> items
          </span>

          <div className="flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-md p-1 transition-colors",
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-md p-1 transition-colors",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Compact list view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Resource Cards Display */}
      {resources.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No resources found"
          description="Try adjusting your search terms or filters to find what you are looking for."
          actionLabel="Quick Capture New Resource"
          onAction={onOpenQuickCapture}
        />
      ) : (
        <div
          className={cn(
            "grid gap-3.5",
            viewMode === "grid"
              ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
              : "grid-cols-1"
          )}
        >
          {resources.map((resource) => (
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
