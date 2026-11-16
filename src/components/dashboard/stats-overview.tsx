"use client";

import * as React from "react";
import {
  Bookmark,
  Compass,
  Pin,
  CheckCircle2,
  TrendingUp,
  Flame,
} from "lucide-react";
import { ResourceStats } from "@/types/resource";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsOverviewProps {
  stats: ResourceStats;
  onFilterClick?: (status: string) => void;
}

export function StatsOverview({ stats, onFilterClick }: StatsOverviewProps) {
  const cards = [
    {
      label: "Total Knowledge Vault",
      value: stats.totalResources,
      subtext: "+14% added this month",
      icon: Bookmark,
      color: "text-primary",
      bgColor: "bg-primary/10 border-primary/20",
      filterValue: "ALL",
    },
    {
      label: "Explore Later Queue",
      value: stats.exploreLaterCount,
      subtext: "Ready for deep dive",
      icon: Compass,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10 border-blue-500/20",
      filterValue: "EXPLORING",
    },
    {
      label: "Pinned Architecture Gems",
      value: stats.pinnedCount,
      subtext: "Quick-access references",
      icon: Pin,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10 border-amber-500/20",
      filterValue: "PINNED",
    },
    {
      label: "Mastered This Week",
      value: stats.completedThisWeek,
      subtext: "Completed & archived",
      icon: CheckCircle2,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
      filterValue: "COMPLETED",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.label}
            onClick={() => onFilterClick?.(item.filterValue)}
            className="p-4 transition-all hover:border-border hover:shadow-md cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground truncate">
                {item.label}
              </span>
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg border",
                  item.bgColor,
                  item.color
                )}
              >
                <Icon className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {item.value}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/80">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span>{item.subtext}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
