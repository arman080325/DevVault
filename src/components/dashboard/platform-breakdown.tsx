"use client";

import * as React from "react";
import {
  Github,
  Youtube,
  Instagram,
  FileCode,
  Globe,
  Palette,
  Layers,
} from "lucide-react";
import { PlatformStat, PlatformType } from "@/types/resource";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  const getIcon = (platform: PlatformType) => {
    switch (platform) {
      case "GITHUB":
        return <Github className="h-3.5 w-3.5" />;
      case "YOUTUBE":
        return <Youtube className="h-3.5 w-3.5 text-red-500" />;
      case "INSTAGRAM":
        return <Instagram className="h-3.5 w-3.5 text-pink-500" />;
      case "DOCS":
        return <FileCode className="h-3.5 w-3.5 text-cyan-400" />;
      case "DESIGN":
        return <Palette className="h-3.5 w-3.5 text-violet-400" />;
      default:
        return <Globe className="h-3.5 w-3.5 text-emerald-400" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span>Platform Distribution</span>
          </CardTitle>
          <span className="text-[11px] text-muted-foreground font-mono">
            Across 6 channels
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Multi-segment progress bar */}
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
          {platformStats.map((stat) => (
            <div
              key={stat.platform}
              style={{
                width: `${stat.percentage}%`,
                backgroundColor: stat.color,
              }}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
              title={`${stat.platform}: ${stat.count} (${stat.percentage}%)`}
            />
          ))}
        </div>

        {/* Platform interactive list */}
        <div className="grid grid-cols-2 gap-2">
          {platformStats.map((stat) => {
            const isSelected = activePlatform === stat.platform;
            return (
              <button
                key={stat.platform}
                onClick={() => onSelectPlatform(stat.platform)}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-2 text-left transition-all text-xs",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-xs"
                    : "border-border/50 bg-background/40 hover:border-border hover:bg-accent/40"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: stat.color }}
                  />
                  <div className="truncate font-medium text-foreground capitalize">
                    {stat.platform.toLowerCase()}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px] text-muted-foreground">
                  <span>{stat.count}</span>
                  <span className="text-muted-foreground/60 text-[10px]">
                    ({stat.percentage}%)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
