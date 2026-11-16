"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Bookmark,
  Compass,
  Layers,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  onOpenQuickCapture: () => void;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export function MobileNav({
  onOpenQuickCapture,
  activeTab = "home",
  onSelectTab,
}: MobileNavProps) {
  const tabs = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "library", label: "Library", icon: Bookmark },
    { id: "explore", label: "Explore", icon: Compass },
    { id: "collections", label: "Collections", icon: Layers },
  ];

  return (
    <>
      {/* Floating Action Button for Quick Capture on Mobile */}
      <div className="fixed bottom-18 right-4 z-40 md:hidden">
        <button
          onClick={onOpenQuickCapture}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/30 border border-primary/30 transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Capture new resource"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-around border-t border-border/70 bg-card/95 px-2 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden select-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab?.(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] transition-colors",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground/70 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 mb-0.5", isActive && "stroke-[2.2]")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
