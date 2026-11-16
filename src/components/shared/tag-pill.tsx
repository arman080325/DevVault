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
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium transition-all duration-150 select-none",
        isSelected
          ? "bg-primary/20 text-primary border border-primary/30"
          : "bg-muted/40 text-muted-foreground border border-border/40 hover:bg-muted/70 hover:text-foreground",
        isClickable && "cursor-pointer active:scale-95",
        className
      )}
    >
      #{tag}
    </span>
  );
}
