import * as React from "react";
import { LucideIcon, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon = BookmarkPlus,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 sm:p-12 text-center bg-card/30">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground mb-3 ring-1 ring-border/60">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-heading text-sm font-semibold text-foreground tracking-tight mb-1">
        {title}
      </h3>
      <p className="max-w-sm text-xs text-muted-foreground leading-relaxed mb-5">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
