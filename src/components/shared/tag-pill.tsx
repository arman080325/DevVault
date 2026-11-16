import * as React from "react";
import { cn } from "@/lib/utils";

interface TagPillProps {
  tag: string;
  isSelected?: boolean;
  onClick?: (tag: string) => void;
  className?: string;
}

export function TagPill({
  tag,
  isSelected = false,
  onClick,
  className,
}: TagPillProps) {
  const isClickable = !!onClick;

  return (
    <span
      onClick={isClickable ? () => onClick(tag) : undefined}
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] transition-all duration-150 select-none",
        isSelected
          ? "bg-primary/20 text-foreground border border-primary/40 font-medium"
          : "bg-secondary/50 text-muted-foreground border border-border/60 hover:bg-secondary hover:text-foreground",
        isClickable && "cursor-pointer active:scale-95",
        className
      )}
    >
      #{tag}
    </span>
  );
}
