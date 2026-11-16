"use client";

import * as React from "react";
import {
  ExternalLink,
  Pin,
  Star,
  MoreVertical,
  CheckCircle2,
  Copy,
  Check,
  Compass,
} from "lucide-react";
import { ResourceItem, PlatformType } from "@/types/resource";
import { Badge } from "@/components/ui/badge";
import { TagPill } from "@/components/shared/tag-pill";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNumber, formatRelativeTime, cn } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/config/platforms";

interface ResourceCardProps {
  resource: ResourceItem;
  onTogglePin?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onStatusChange?: (id: string, status: ResourceItem["status"]) => void;
  onSelectTag?: (tag: string) => void;
  selectedTag?: string | null;
  compact?: boolean;
}

export function ResourceCard({
  resource,
  onTogglePin,
  onToggleFavorite,
  onStatusChange,
  onSelectTag,
  selectedTag,
  compact = false,
}: ResourceCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(resource.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const platformMeta = PLATFORM_CONFIG[resource.platform] || {
    label: resource.platform,
    dotColor: "#A3B2A6",
  };

  // Compact relevant detail string
  const getRelevantDetail = () => {
    if (resource.platform === "GITHUB" && resource.metadata) {
      const parts: string[] = [];
      if (resource.metadata.language) parts.push(resource.metadata.language);
      if (resource.metadata.stars) parts.push(`★ ${formatNumber(resource.metadata.stars)}`);
      return parts.join(" • ");
    }
    if (resource.platform === "YOUTUBE" && resource.metadata) {
      const parts: string[] = [];
      if (resource.metadata.duration) parts.push(resource.metadata.duration);
      if (resource.metadata.views) parts.push(`${formatNumber(resource.metadata.views)} views`);
      return parts.join(" • ");
    }
    if (resource.platform === "INSTAGRAM" && resource.metadata) {
      const parts: string[] = [];
      if (resource.metadata.postType) parts.push(resource.metadata.postType);
      if (resource.metadata.likes) parts.push(`♥ ${formatNumber(resource.metadata.likes)}`);
      return parts.join(" • ");
    }
    if (resource.readTimeMin) {
      return `${resource.readTimeMin}m read`;
    }
    return null;
  };

  const relevantDetail = getRelevantDetail();

  return (
    <article
      className={cn(
        "group relative flex flex-col justify-between rounded-lg border border-border/70 bg-card p-3.5 sm:p-4 transition-all duration-150 hover:border-border hover:shadow-sm",
        resource.isPinned && "border-primary/40 bg-card"
      )}
    >
      <div>
        {/* Header: Platform dot, Category, Status, Actions */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {/* Platform indicator */}
            <span className="inline-flex items-center gap-1 text-[11px] font-sans text-muted-foreground/90">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: platformMeta.dotColor }}
              />
              <span className="capitalize">{resource.platform.toLowerCase()}</span>
            </span>

            <span className="text-muted-foreground/30">•</span>

            {/* Category */}
            <span className="text-[11px] font-sans text-muted-foreground/80 truncate">
              {resource.category}
            </span>

            {/* Status indicator if active */}
            {resource.status === "EXPLORING" && (
              <span className="rounded bg-secondary px-1.5 py-0.2 text-[9px] font-mono text-primary border border-primary/20">
                Exploring
              </span>
            )}
            {resource.status === "COMPLETED" && (
              <span className="rounded bg-secondary px-1.5 py-0.2 text-[9px] font-mono text-muted-foreground border border-border/60">
                Completed
              </span>
            )}
          </div>

          {/* Actions: Pin, Favorite, Menu */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => onTogglePin?.(resource.id)}
              className={cn(
                "rounded p-1 transition-colors hover:bg-secondary/70",
                resource.isPinned
                  ? "text-primary"
                  : "text-muted-foreground/40 hover:text-muted-foreground"
              )}
              title={resource.isPinned ? "Unpin resource" : "Pin resource"}
            >
              <Pin
                className={cn(
                  "h-3 w-3",
                  resource.isPinned && "fill-primary"
                )}
              />
            </button>

            <button
              onClick={() => onToggleFavorite?.(resource.id)}
              className={cn(
                "rounded p-1 transition-colors hover:bg-secondary/70",
                resource.isFavorite
                  ? "text-primary"
                  : "text-muted-foreground/40 hover:text-muted-foreground"
              )}
              title={resource.isFavorite ? "Favorited" : "Mark favorite"}
            >
              <Star
                className={cn(
                  "h-3 w-3",
                  resource.isFavorite && "fill-primary"
                )}
              />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded p-1 text-muted-foreground/40 hover:text-foreground hover:bg-secondary/70 transition-colors">
                  <MoreVertical className="h-3 w-3" />
                  <span className="sr-only">More options</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleCopy}>
                  {copied ? (
                    <Check className="mr-2 h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="mr-2 h-3.5 w-3.5" />
                  )}
                  <span>{copied ? "Copied" : "Copy URL"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    <span>Open link</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    onStatusChange?.(
                      resource.id,
                      resource.status === "EXPLORING" ? "SAVED" : "EXPLORING"
                    )
                  }
                >
                  <Compass className="mr-2 h-3.5 w-3.5" />
                  <span>
                    {resource.status === "EXPLORING"
                      ? "Move to Saved"
                      : "Mark Exploring"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onStatusChange?.(
                      resource.id,
                      resource.status === "COMPLETED" ? "SAVED" : "COMPLETED"
                    )
                  }
                >
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                  <span>
                    {resource.status === "COMPLETED"
                      ? "Mark Active"
                      : "Mark Completed"}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-heading font-medium text-xs sm:text-sm text-foreground leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 focus-visible:outline-none"
          >
            <span>{resource.title}</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-primary" />
          </a>
        </h3>

        {/* Short Description */}
        {!compact && resource.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2 font-sans">
            {resource.description}
          </p>
        )}

        {/* Quiet technical detail pill row */}
        {relevantDetail && (
          <div className="mb-2.5 font-mono text-[10px] text-muted-foreground/70">
            {relevantDetail}
          </div>
        )}
      </div>

      {/* Footer: Tags & Meta */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          {resource.tags.slice(0, 2).map((tag) => (
            <TagPill
              key={tag}
              tag={tag}
              isSelected={selectedTag === tag}
              onClick={onSelectTag}
            />
          ))}
          {resource.tags.length > 2 && (
            <span className="font-mono text-[9px] text-muted-foreground/60">
              +{resource.tags.length - 2}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] text-muted-foreground/60">
          <span className="truncate max-w-[90px]">{resource.author || "DevVault"}</span>
          <span>•</span>
          <span>{formatRelativeTime(resource.createdAt)}</span>
        </div>
      </div>
    </article>
  );
}
