"use client";

import * as React from "react";
import {
  ExternalLink,
  Github,
  Youtube,
  Instagram,
  FileCode,
  Globe,
  Pin,
  Star,
  Clock,
  Eye,
  GitFork,
  MoreVertical,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  Compass,
} from "lucide-react";
import { ResourceItem, PlatformType } from "@/types/resource";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagPill } from "@/components/shared/tag-pill";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNumber, formatRelativeTime, cn } from "@/lib/utils";

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

  const renderPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case "GITHUB":
        return <Github className="h-3.5 w-3.5" />;
      case "YOUTUBE":
        return <Youtube className="h-3.5 w-3.5 text-red-500" />;
      case "INSTAGRAM":
        return <Instagram className="h-3.5 w-3.5 text-pink-500" />;
      case "DOCS":
        return <FileCode className="h-3.5 w-3.5 text-cyan-400" />;
      default:
        return <Globe className="h-3.5 w-3.5 text-emerald-400" />;
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card/70 p-4 transition-all duration-200 hover:border-border hover:bg-card/95 hover:shadow-lg hover:shadow-black/20",
        resource.isPinned && "border-amber-500/30 bg-amber-500/[0.02]"
      )}
    >
      <div>
        {/* Top Header: Platform, Category, Actions */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Platform Badge */}
            <Badge
              variant={
                resource.platform === "GITHUB"
                  ? "github"
                  : resource.platform === "YOUTUBE"
                  ? "youtube"
                  : resource.platform === "INSTAGRAM"
                  ? "instagram"
                  : resource.platform === "DOCS"
                  ? "docs"
                  : "website"
              }
              className="flex items-center gap-1 text-[11px] font-medium py-0.5 px-2 capitalize"
            >
              {renderPlatformIcon(resource.platform)}
              <span>{resource.platform.toLowerCase()}</span>
            </Badge>

            {/* Category */}
            <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/40">
              {resource.category}
            </span>

            {/* Status indicator if exploring or completed */}
            {resource.status === "EXPLORING" && (
              <span className="flex items-center gap-1 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20">
                <Compass className="h-2.5 w-2.5" />
                <span>Exploring</span>
              </span>
            )}
            {resource.status === "COMPLETED" && (
              <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-2.5 w-2.5" />
                <span>Completed</span>
              </span>
            )}
          </div>

          {/* Quick Actions (Pin, Favorite, More) */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onTogglePin?.(resource.id)}
              className={cn(
                "rounded p-1 transition-colors hover:bg-accent/80",
                resource.isPinned
                  ? "text-amber-400"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
              title={resource.isPinned ? "Unpin resource" : "Pin to top"}
            >
              <Pin
                className={cn(
                  "h-3.5 w-3.5",
                  resource.isPinned && "fill-amber-400 rotate-45"
                )}
              />
            </button>

            <button
              onClick={() => onToggleFavorite?.(resource.id)}
              className={cn(
                "rounded p-1 transition-colors hover:bg-accent/80",
                resource.isFavorite
                  ? "text-rose-400"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
              title={
                resource.isFavorite
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  resource.isFavorite && "fill-rose-400"
                )}
              />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded p-1 text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/80 transition-colors">
                  <MoreVertical className="h-3.5 w-3.5" />
                  <span className="sr-only">More options</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleCopy}>
                  {copied ? (
                    <Check className="mr-2 h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="mr-2 h-3.5 w-3.5" />
                  )}
                  <span>{copied ? "Copied!" : "Copy URL"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    <span>Open in new tab</span>
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
                  <Compass className="mr-2 h-3.5 w-3.5 text-blue-400" />
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
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-400" />
                  <span>
                    {resource.status === "COMPLETED"
                      ? "Mark Uncompleted"
                      : "Mark Completed"}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title & Link */}
        <h3 className="font-medium text-sm text-foreground leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 focus-visible:outline-none"
          >
            <span>{resource.title}</span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-primary" />
          </a>
        </h3>

        {/* Description */}
        {!compact && resource.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
            {resource.description}
          </p>
        )}

        {/* Platform Specific Metadata Pills */}
        <div className="flex items-center gap-2 mb-3 text-[11px] text-muted-foreground flex-wrap">
          {/* GitHub Metadata */}
          {resource.platform === "GITHUB" && resource.metadata && (
            <>
              {resource.metadata.language && (
                <span className="flex items-center gap-1 font-mono">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {resource.metadata.language}
                </span>
              )}
              {resource.metadata.stars !== undefined && (
                <span className="flex items-center gap-0.5 font-mono">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {formatNumber(resource.metadata.stars)}
                </span>
              )}
              {resource.metadata.forks !== undefined && (
                <span className="flex items-center gap-0.5 font-mono">
                  <GitFork className="h-3 w-3" />
                  {formatNumber(resource.metadata.forks)}
                </span>
              )}
            </>
          )}

          {/* YouTube Metadata */}
          {resource.platform === "YOUTUBE" && resource.metadata && (
            <>
              {resource.metadata.duration && (
                <span className="flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.2 text-[10px] font-mono border border-border/40">
                  <Clock className="h-2.5 w-2.5" />
                  {resource.metadata.duration}
                </span>
              )}
              {resource.metadata.views && (
                <span className="flex items-center gap-0.5 font-mono text-[10px]">
                  <Eye className="h-2.5 w-2.5" />
                  {formatNumber(resource.metadata.views)} views
                </span>
              )}
            </>
          )}

          {/* Instagram Metadata */}
          {resource.platform === "INSTAGRAM" && resource.metadata && (
            <>
              {resource.metadata.postType && (
                <span className="rounded bg-pink-500/10 px-1.5 py-0.2 text-[10px] font-medium text-pink-400 uppercase tracking-wider">
                  {resource.metadata.postType}
                </span>
              )}
              {resource.metadata.likes && (
                <span className="font-mono text-[10px]">
                  ♥ {formatNumber(resource.metadata.likes)}
                </span>
              )}
            </>
          )}

          {/* Reading Time */}
          {resource.readTimeMin && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80 font-mono">
              <Clock className="h-2.5 w-2.5" />
              {resource.readTimeMin}m read
            </span>
          )}
        </div>
      </div>

      {/* Footer: Tags & Timestamp */}
      <div className="pt-2 border-t border-border/40 flex flex-col gap-2">
        {/* Tags */}
        <div className="flex items-center gap-1 flex-wrap">
          {resource.tags.slice(0, 3).map((tag) => (
            <TagPill
              key={tag}
              tag={tag}
              isSelected={selectedTag === tag}
              onClick={onSelectTag}
            />
          ))}
          {resource.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground font-mono">
              +{resource.tags.length - 3}
            </span>
          )}
        </div>

        {/* Source and Relative Time */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 font-mono">
          <span className="truncate max-w-[130px]">
            {resource.author || "DevVault"}
          </span>
          <span>{formatRelativeTime(resource.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
