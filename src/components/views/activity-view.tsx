"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { FigmaResource, CollectionItem } from "@/data/figmaResources";
import { activityService, ActivityEventItem } from "@/services/activity-service";

interface ActivityViewProps {
  resources?: FigmaResource[];
  collections?: CollectionItem[];
  userId?: string | null;
}

export function ActivityView({
  resources = [],
  collections = [],
  userId,
}: ActivityViewProps) {
  const [remoteEvents, setRemoteEvents] = useState<ActivityEventItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      activityService
        .fetchActivityEvents(userId)
        .then((events) => {
          setRemoteEvents(events);
        })
        .finally(() => setLoading(false));
    }
  }, [userId]);

  const insights = activityService.calculateInsights(resources, collections, remoteEvents);

  // Derive display events: either from remote database events, or generated from real resources
  const displayEvents = React.useMemo(() => {
    if (remoteEvents.length > 0) {
      return remoteEvents.slice(0, 8);
    }

    // Fallback: derive from real resources in vault
    return resources.slice(0, 5).map((r) => {
      let type = "Captured";
      if (r.status === "Completed") type = "Completed";
      else if (r.notes) type = "Added a note";
      else if (r.pinned) type = "Pinned";

      return {
        id: String(r.id),
        type,
        title: r.title,
        time: r.saved || "Recently",
        timestamp: new Date().toISOString(),
      };
    });
  }, [remoteEvents, resources]);

  const now = new Date();
  const monthYearLabel = now.toLocaleString("en-US", { month: "short", year: "numeric" }).toUpperCase();

  return (
    <div className="page stage-page">
      <header className="library-head stage-head">
        <div>
          <span className="date-label">{monthYearLabel}</span>
          <h1>Activity & insights</h1>
          <p>A gentle look at what you have been collecting and learning.</p>
        </div>
      </header>

      <section className="insight-hero">
        <div>
          <span className="date-label">THIS MONTH</span>
          <b>{insights.totalExplored}</b>
          <p>resources explored</p>
          <small>{insights.monthlyGrowth} added recently</small>
        </div>

        <div className="activity-chart">
          <div className="chart-head">
            <h2>Your rhythm</h2>
            <span>12 weeks</span>
          </div>
          <div className="bars">
            {insights.rhythmBars.map((bar, index) => (
              <i key={index} style={{ height: `${bar}%` }}>
                <span>{bar}</span>
              </i>
            ))}
          </div>
          <div className="chart-axis">
            <span>PREV</span>
            <span>RECENT</span>
            <span>NOW</span>
          </div>
        </div>
      </section>

      <section className="insight-grid">
        <article>
          <span className="date-label">VAULT TOTAL</span>
          <b>{insights.totalSaved}</b>
          <h3>Resources saved</h3>
          <p>Your library contains {insights.totalSaved} intentioned discoveries across {collections.length} shelves.</p>
        </article>

        <article>
          <span className="date-label">TOP INTEREST</span>
          <b>{insights.topCategoryPercentage}%</b>
          <h3>{insights.topCategoryName}</h3>
          <p>{insights.topCategoryName} remains your most populated knowledge category.</p>
        </article>

        <article>
          <span className="date-label">RETURN RATE</span>
          <b>{insights.returnRate}%</b>
          <h3>Worth coming back to</h3>
          <p>Portion of saved resources revisited with notes, active progress, or marked explored.</p>
        </article>
      </section>

      <section className="activity-feed">
        <div className="section-heading">
          <div>
            <span>01</span>
            <h2>Recent activity</h2>
          </div>
          <button type="button">
            Timeline
            <Icon name="arrow" size={15} />
          </button>
        </div>

        {displayEvents.length > 0 ? (
          displayEvents.map((item) => (
            <div key={item.id + item.title}>
              <span>{item.type}</span>
              <b>{item.title}</b>
              <time>{item.time}</time>
            </div>
          ))
        ) : (
          <div className="p-4 text-[var(--muted,#7c7468)] text-sm">
            No activity recorded yet. Save a link or create a shelf to start your journal.
          </div>
        )}
      </section>
    </div>
  );
}
