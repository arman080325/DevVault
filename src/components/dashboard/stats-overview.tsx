"use client";

import * as React from "react";
import {
  Bookmark,
  Compass,
  Pin,
  CheckCircle2,
} from "lucide-react";
import { ResourceStats } from "@/types/resource";
import { cn } from "@/lib/utils";

interface StatsOverviewProps {
  stats: ResourceStats;
  onFilterClick?: (status: string) => void;
  activeStatusTab?: string;
}

export function StatsOverview({
  stats,
  onFilterClick,
  activeStatusTab,
}: StatsOverviewProps) {
  const metrics = [
    {
      label: "All Resources",
      value: stats.totalResources,
      icon: Bookmark,
      filterValue: "ALL",
      active: activeStatusTab === "ALL",
    },
    {
      label: "In Queue",
      value: stats.exploreLaterCount,
      icon: Compass,
      filterValue: "EXPLORING",
      active: activeStatusTab === "EXPLORING",
    },
    {
      label: "Pinned",
      value: stats.pinnedCount,
      icon: Pin,
      filterValue: "PINNED",
      active: activeStatusTab === "PINNED",
    },
    {
      label: "Completed",
      value: stats.completedThisWeek,
      icon: CheckCircle2,
      filterValue: "COMPLETED",
      active: activeStatusTab === "COMPLETED",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <button
            key={m.label}
            onClick={() => onFilterClick?.(m.filterValue)}
            className={cn(
              "flex flex-col items-start rounded-lg border p-3 text-left transition-all group",
              m.active
                ? "border-primary/50 bg-secondary/80 text-foreground shadow-2xs"
                : "border-border/70 bg-card/60 text-muted-foreground hover:border-border hover:bg-card hover:text-foreground"
            )}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[11px] font-sans font-medium text-muted-foreground">
                {m.label}
              </span>
              <Icon className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {m.value}
            </div>
          </button>
        );
      })}
    </div>
  );
}
