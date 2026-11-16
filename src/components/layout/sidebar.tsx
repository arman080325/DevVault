"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Vault,
  Plus,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Bookmark,
  Compass,
  Layers,
  Activity,
  Github,
  Youtube,
  Instagram,
  FileCode,
  Globe,
  Settings,
} from "lucide-react";
import { NAV_GROUPS } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenQuickCapture: () => void;
  onOpenCommandPalette: () => void;
  activeFilter?: string | null;
  onSelectFilter?: (filterType: "platform" | "category" | "all", value: string) => void;
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  onOpenQuickCapture,
  onOpenCommandPalette,
  activeFilter,
  onSelectFilter,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        // Strictly hidden on mobile, visible on desktop md+
        "hidden md:flex flex-col border-r border-border/70 bg-card/60 backdrop-blur-sm transition-all duration-200 z-30 select-none shrink-0",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-13 items-center justify-between px-3.5 border-b border-border/60">
        <Link
          href="/"
          className="flex items-center gap-2.5 overflow-hidden group focus-visible:outline-none"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-primary border border-border/80 shadow-2xs group-hover:border-primary/50 transition-colors">
            <Vault className="h-3.5 w-3.5" />
          </div>
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              <span className="font-heading font-semibold text-xs tracking-tight text-foreground">
                DevVault
              </span>
              <span className="text-[10px] text-muted-foreground/70 font-mono">
                workspace
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className="text-muted-foreground/60 hover:text-foreground hover:bg-secondary/70 rounded p-1 transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Quick Capture Button */}
      <div className="p-2.5">
        <Button
          onClick={onOpenQuickCapture}
          className={cn(
            "w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-2xs transition-all justify-start",
            isCollapsed && "justify-center px-0"
          )}
          size="sm"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          {!isCollapsed && (
            <div className="flex items-center justify-between w-full ml-2">
              <span className="font-heading text-xs font-medium">New Resource</span>
              <kbd className="inline-flex h-4 items-center rounded border border-primary/20 bg-primary/10 px-1 font-mono text-[9px]">
                C
              </kbd>
            </div>
          )}
        </Button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-0.5">
            {!isCollapsed && (
              <h4 className="px-2 text-[10px] font-heading font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
                {group.label}
              </h4>
            )}
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isPlatform = item.href.includes("platform=");
                const platformKey = isPlatform
                  ? item.href.split("platform=")[1]
                  : null;
                const isActive =
                  platformKey && activeFilter === platformKey
                    ? true
                    : !isPlatform && pathname === item.href;

                return (
                  <button
                    key={item.title}
                    onClick={() => {
                      if (platformKey && onSelectFilter) {
                        onSelectFilter("platform", platformKey);
                      }
                    }}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors text-left",
                      isActive
                        ? "bg-secondary text-foreground font-medium border border-border/80 shadow-2xs"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground border border-transparent",
                      isCollapsed && "justify-center px-0"
                    )}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1 font-sans">{item.title}</span>
                        {item.badge && (
                          <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* User Footer */}
      <div className="p-2.5 border-t border-border/60 bg-card/40">
        <div
          className={cn(
            "flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-secondary/50",
            isCollapsed && "justify-center p-0"
          )}
        >
          <Avatar className="h-6.5 w-6.5 border-border/80">
            <AvatarFallback className="bg-secondary text-foreground text-[10px] font-medium font-mono">
              DV
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-medium text-foreground truncate">
                DevVault Architect
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Local Vault
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
