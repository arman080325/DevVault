"use client";

import * as React from "react";
import {
  Activity,
  BookmarkPlus,
  Compass,
  CheckCircle2,
  Star,
} from "lucide-react";
import { ActivityEvent } from "@/types/resource";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";

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
        return <Star className="h-3 w-3 text-amber-400" />;
      default:
        return <Activity className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2.5">
        <CardTitle className="text-xs font-heading font-semibold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span>Activity Stream</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-2.5 text-xs">
              <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-secondary/80 text-muted-foreground">
                {getActivityIcon(act.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-foreground truncate">
                    {act.resourceTitle}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0">
                    {formatRelativeTime(act.timestamp)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground/80 leading-tight truncate">
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
