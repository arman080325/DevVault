"use client";

import * as React from "react";
import { CategoryStat } from "@/types/resource";
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
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-muted-foreground">
          Categories
        </h3>
        {activeCategory && (
          <button
            onClick={() => onSelectCategory(activeCategory)}
            className="text-[11px] text-primary hover:underline font-mono"
          >
            Clear category
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-wrap sm:flex-nowrap">
        {categoryStats.map((item) => {
          const isSelected = activeCategory === item.category;
          return (
            <button
              key={item.category}
              onClick={() => onSelectCategory(item.category)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors whitespace-nowrap",
                isSelected
                  ? "bg-primary text-primary-foreground font-medium shadow-2xs"
                  : "bg-secondary/40 text-muted-foreground border border-border/60 hover:bg-secondary hover:text-foreground"
              )}
            >
              <span>{item.category}</span>
              <span
                className={cn(
                  "font-mono text-[10px] opacity-60",
                  isSelected && "text-primary-foreground opacity-90"
                )}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
