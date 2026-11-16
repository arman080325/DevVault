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
  const queue = resources.slice(0, 3);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2.5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-heading font-semibold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
            <Compass className="h-3.5 w-3.5 text-primary" />
            <span>Explore Next Queue</span>
          </CardTitle>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
            >
              <span>View all ({resources.length})</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {queue.length === 0 ? (
          <p className="text-xs text-muted-foreground/70 text-center py-4 font-mono">
            Queue is clear. Mark any resource as &quot;Exploring&quot; to queue it here.
          </p>
        ) : (
          queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-secondary/30 p-2.5 transition-colors hover:border-border hover:bg-secondary/60 group"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                  <span className="capitalize">{item.platform.toLowerCase()}</span>
                  <span>•</span>
                  <span>{item.category}</span>
                  {item.readTimeMin && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {item.readTimeMin}m
                      </span>
                    </>
                  )}
                </div>
                <h4 className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
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
                <button
                  onClick={() => onStatusChange?.(item.id, "COMPLETED")}
                  title="Mark completed"
                  className="rounded p-1 text-muted-foreground/60 hover:text-primary hover:bg-muted transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
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
