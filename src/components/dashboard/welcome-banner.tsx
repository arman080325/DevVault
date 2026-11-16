"use client";

import * as React from "react";
import { Sparkles, Plus, Terminal, Flame, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeBannerProps {
  onOpenQuickCapture: () => void;
  streakDays: number;
}

export function WelcomeBanner({
  onOpenQuickCapture,
  streakDays,
}: WelcomeBannerProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card/90 to-primary/5 p-6 shadow-sm">
      {/* Subtle background glow */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-mono font-medium text-primary border border-primary/20">
              <Terminal className="h-3 w-3" />
              <span>{today}</span>
            </span>
            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-amber-400 border border-amber-500/20">
              <Flame className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span>{streakDays} Day Capture Streak</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Developer Knowledge Command Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Curate high-signal engineering discoveries across GitHub, YouTube,
            Instagram reels, documentation, and system design internals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={onOpenQuickCapture}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm transition-all"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Quick Capture</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
