"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Vault,
  X,
  Plus,
  Github,
  Layers,
  LayoutDashboard,
  Bookmark,
  Compass,
  Activity,
  Settings,
} from "lucide-react";
import { NAV_GROUPS } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickCapture: () => void;
  activeFilter?: string | null;
  onSelectFilter?: (filterType: "platform" | "category" | "all", value: string) => void;
}

export function MobileNav({
  isOpen,
  onClose,
  onOpenQuickCapture,
  activeFilter,
  onSelectFilter,
}: MobileNavProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-card border-r border-border/80 p-4 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30">
                <Vault className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm text-foreground">
                DevVault
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close navigation</span>
            </Button>
          </div>

          {/* Quick Capture Action */}
          <div className="my-4">
            <Button
              onClick={() => {
                onClose();
                onOpenQuickCapture();
              }}
              className="w-full bg-primary text-primary-foreground font-medium text-xs shadow-sm justify-center"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Capture Resource</span>
            </Button>
          </div>

          {/* Nav Links */}
          <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1">
                <h4 className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
                  {group.label}
                </h4>
                <div className="space-y-0.5">
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
                          onClose();
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors text-left",
                          isActive
                            ? "bg-accent text-accent-foreground border border-border/80"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </div>
                        {item.badge && (
                          <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-border/40 text-center">
          <p className="text-[11px] text-muted-foreground/70 font-mono">
            DevVault v0.1.0 • Personal Edition
          </p>
        </div>
      </div>
    </div>
  );
}
