"use client";

import * as React from "react";
import { PlatformStat, PlatformType } from "@/types/resource";
import { cn } from "@/lib/utils";

interface PlatformBreakdownProps {
  platformStats: PlatformStat[];
  activePlatform?: string | null;
  onSelectPlatform: (platform: string) => void;
}

export function PlatformBreakdown({
  platformStats,
  activePlatform,
  onSelectPlatform,
}: PlatformBreakdownProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-muted-foreground">
          Platform Sources
        </h3>
        {activePlatform && (
          <button
            onClick={() => onSelectPlatform(activePlatform)}
            className="text-[11px] text-primary hover:underline font-mono"
          >
            Clear platform
          </button>
        )}
      </div>

      {/* Multi-segment thin progress bar */}
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
        {platformStats.map((stat) => (
          <div
            key={stat.platform}
            style={{
              width: `${stat.percentage}%`,
              backgroundColor: stat.color,
            }}
            className="h-full transition-all duration-300 opacity-80 hover:opacity-100"
            title={`${stat.platform}: ${stat.count} (${stat.percentage}%)`}
          />
        ))}
      </div>

      {/* Compact horizontal pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-wrap">
        {platformStats.map((stat) => {
          const isSelected = activePlatform === stat.platform;
          return (
            <button
              key={stat.platform}
              onClick={() => onSelectPlatform(stat.platform)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] transition-colors whitespace-nowrap",
                isSelected
                  ? "bg-secondary text-foreground font-medium border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: stat.color }}
              />
              <span className="capitalize">{stat.platform.toLowerCase()}</span>
              <span className="font-mono text-[10px] text-muted-foreground/60">
                {stat.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
