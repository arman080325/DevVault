"use client";

import * as React from "react";
import {
  Compass,
  ArrowRight,
  ExternalLink,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { ResourceItem } from "@/types/resource";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ExploreLaterPreviewProps {
  resources: ResourceItem[];
  onStatusChange?: (id: string, status: ResourceItem["status"]) => void;
  onViewAll?: () => void;
}

export function ExploreLaterPreview({
  resources,
  onStatusChange,
  onViewAll,
}: ExploreLaterPreviewProps) {
  const queue = resources.slice(0, 4);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Compass className="h-4 w-4 text-blue-400" />
            <span>Explore Later Queue</span>
          </CardTitle>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
            >
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {queue.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Your reading queue is empty. Mark any resource as &quot;Exploring&quot; to queue it here.
          </p>
        ) : (
          queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 p-2.5 transition-all hover:border-border hover:bg-accent/40"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="rounded bg-muted/80 px-1.5 py-0.2 text-[9px] font-mono text-muted-foreground uppercase">
                    {item.platform}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {item.category}
                  </span>
                  {item.readTimeMin && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-mono">
                      <Clock className="h-2.5 w-2.5" />
                      {item.readTimeMin}m
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-medium text-foreground truncate hover:text-primary transition-colors">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {item.title}
                  </a>
                </h4>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onStatusChange?.(item.id, "COMPLETED")}
                  title="Mark as completed"
                  className="text-muted-foreground hover:text-emerald-400"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </Button>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                  title="Open resource"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
