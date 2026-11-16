"use client";

import * as React from "react";
import {
  Layout,
  Server,
  ShieldAlert,
  Database,
  Cloud,
  Palette,
  Terminal,
  Grid,
} from "lucide-react";
import { CategoryStat } from "@/types/resource";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CategoryExplorerProps {
  categoryStats: CategoryStat[];
  activeCategory?: string | null;
  onSelectCategory: (category: string) => void;
}

export function CategoryExplorer({
  categoryStats,
  activeCategory,
  onSelectCategory,
}: CategoryExplorerProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Frontend":
        return <Layout className="h-4 w-4 text-sky-400" />;
      case "Backend":
        return <Server className="h-4 w-4 text-indigo-400" />;
      case "Cybersecurity":
        return <ShieldAlert className="h-4 w-4 text-rose-400" />;
      case "Databases":
        return <Database className="h-4 w-4 text-orange-400" />;
      case "DevOps & Cloud":
        return <Cloud className="h-4 w-4 text-purple-400" />;
      case "UI/UX & Design":
        return <Palette className="h-4 w-4 text-pink-400" />;
      default:
        return <Terminal className="h-4 w-4 text-emerald-400" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Grid className="h-4 w-4 text-primary" />
            <span>Domain Categorization</span>
          </CardTitle>
          <span className="text-[11px] text-muted-foreground font-mono">
            Direct Filter
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categoryStats.map((item) => {
            const isSelected = activeCategory === item.category;
            return (
              <button
                key={item.category}
                onClick={() => onSelectCategory(item.category)}
                className={cn(
                  "flex flex-col items-start rounded-xl border p-2.5 text-left transition-all group",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-xs"
                    : "border-border/50 bg-background/40 hover:border-border hover:bg-accent/40"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="p-1 rounded-md bg-muted/60 transition-transform group-hover:scale-110">
                    {getCategoryIcon(item.category)}
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {item.count}
                  </span>
                </div>
                <span className="text-xs font-medium text-foreground truncate w-full">
                  {item.category}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
