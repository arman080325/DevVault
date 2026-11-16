"use client";

import * as React from "react";
import {
  Activity,
  BookmarkPlus,
  Compass,
  CheckCircle2,
  Star,
  Clock,
} from "lucide-react";
import { ActivityEvent } from "@/types/resource";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatRelativeTime, cn } from "@/lib/utils";

interface RecentActivityProps {
  activities: ActivityEvent[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getActivityIcon = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "CAPTURED":
        return <BookmarkPlus className="h-3 w-3 text-primary" />;
      case "COMPLETED":
        return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
      case "EXPLORED":
        return <Compass className="h-3 w-3 text-blue-400" />;
      case "FAVORITED":
        return <Star className="h-3 w-3 text-rose-400" />;
      default:
        return <Activity className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span>Vault Activity Stream</span>
          </CardTitle>
          <span className="text-[11px] text-muted-foreground font-mono">
            Audit Trail
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-border/60">
          {activities.map((act) => (
            <div key={act.id} className="relative group">
              {/* Timeline marker */}
              <div className="absolute -left-4 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-card border border-border/80 shadow-xs">
                {getActivityIcon(act.type)}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground truncate">
                    {act.resourceTitle}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
                    {formatRelativeTime(act.timestamp)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {act.summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
