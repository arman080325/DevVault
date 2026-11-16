"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Vault,
  Plus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Search,
} from "lucide-react";
import { NAV_GROUPS } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
        "relative flex flex-col border-r border-border/60 bg-card/60 backdrop-blur-md transition-all duration-300 z-30 select-none",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border/40">
        <Link
          href="/"
          className="flex items-center gap-2.5 overflow-hidden group focus-visible:outline-none"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 text-primary shadow-sm group-hover:border-primary/60 transition-colors">
            <Vault className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
              <span className="font-semibold text-sm tracking-tight text-foreground">
                DevVault
              </span>
              <span className="rounded bg-primary/10 px-1 py-0.2 text-[10px] font-mono text-primary font-medium border border-primary/20">
                PRO
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle button */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onToggleCollapse}
          className="hidden md:flex text-muted-foreground hover:text-foreground"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Quick Action Button */}
      <div className="p-3">
        <Button
          onClick={onOpenQuickCapture}
          className={cn(
            "w-full bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 hover:border-primary/50 shadow-sm transition-all justify-start",
            isCollapsed && "justify-center px-0"
          )}
          size="sm"
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!isCollapsed && (
            <div className="flex items-center justify-between w-full ml-2">
              <span className="font-medium text-xs">Quick Capture</span>
              <kbd className="hidden lg:inline-flex h-4 items-center gap-0.5 rounded border border-primary/30 bg-primary/10 px-1 font-mono text-[9px] text-primary">
                C
              </kbd>
            </div>
          )}
        </Button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            {!isCollapsed && (
              <h4 className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5">
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
                      "group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors text-left",
                      isActive
                        ? "bg-accent text-accent-foreground border border-border/80 font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-transparent",
                      isCollapsed && "justify-center px-0"
                    )}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1">{item.title}</span>
                        {item.badge && (
                          <span className="ml-auto rounded-full bg-muted/80 px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
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

      {/* User Status Footer */}
      <div className="p-3 border-t border-border/40 bg-card/40">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-accent/40",
            isCollapsed && "justify-center p-0"
          )}
        >
          <Avatar className="h-7 w-7 border-border/80 ring-1 ring-primary/20">
            <AvatarFallback className="bg-primary/20 text-primary text-[11px] font-semibold">
              DV
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-medium text-foreground truncate">
                DevVault Architect
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Local Vault Active
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
