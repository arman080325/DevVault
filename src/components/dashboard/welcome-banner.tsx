"use client";

import * as React from "react";
import { Plus, Flame, ArrowRight, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeBannerProps {
  onOpenQuickCapture: () => void;
  streakDays: number;
  totalCount: number;
}

export function WelcomeBanner({
  onOpenQuickCapture,
  streakDays,
  totalCount,
}: WelcomeBannerProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <section className="space-y-3 pt-1">
      {/* Editorial Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] text-muted-foreground/70 uppercase tracking-wider">
              {today}
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary">
              <Flame className="h-3 w-3 fill-primary/30" />
              <span>{streakDays}d streak</span>
            </span>
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Personal Knowledge Workspace
          </h1>
          <p className="text-xs text-muted-foreground max-w-lg mt-0.5">
            Discover, capture and organize high-signal engineering resources.
          </p>
        </div>

        {/* Primary Capture Action Trigger */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <Button
            onClick={onOpenQuickCapture}
            size="sm"
            className="bg-primary text-primary-foreground font-heading font-medium text-xs shadow-2xs hover:bg-primary/90 flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Resource</span>
          </Button>
        </div>
      </div>

      {/* Fast Capture Quick-Bar */}
      <div
        onClick={onOpenQuickCapture}
        className="group flex items-center justify-between rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground cursor-pointer transition-colors hover:border-border hover:bg-card hover:text-foreground"
      >
        <div className="flex items-center gap-2 min-w-0">
          <LinkIcon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          <span className="truncate">
            Paste any GitHub, YouTube, or docs URL to quickly capture...
          </span>
        </div>
        <kbd className="hidden sm:inline-flex items-center rounded border border-border/80 bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shrink-0">
          Press C
        </kbd>
      </div>
    </section>
  );
}
