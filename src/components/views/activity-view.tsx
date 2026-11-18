"use client";

import React from "react";
import { Icon } from "@/components/shared/icon";

export function ActivityView() {
  const bars = [32, 48, 38, 70, 52, 86, 64, 94, 58, 76, 44, 68];

  const activityEvents = [
    { type: "Completed", title: "A friendly introduction to container queries", time: "Today, 10:42" },
    { type: "Added a note", title: "Layout animations: the missing guide", time: "Yesterday" },
    { type: "Created collection", title: "Weekend experiments", time: "May 18" },
  ];

  return (
    <div className="page stage-page">
      <header className="library-head stage-head">
        <div>
          <span className="date-label">MAY / 2025</span>
          <h1>Activity & insights</h1>
          <p>A gentle look at what you have been collecting and learning.</p>
        </div>
      </header>

      <section className="insight-hero">
        <div>
          <span className="date-label">THIS MONTH</span>
          <b>18</b>
          <p>resources explored</p>
          <small>5 more than April</small>
        </div>

        <div className="activity-chart">
          <div className="chart-head">
            <h2>Your rhythm</h2>
            <span>12 weeks</span>
          </div>
          <div className="bars">
            {bars.map((bar, index) => (
              <i key={index} style={{ height: `${bar}%` }}>
                <span>{bar}</span>
              </i>
            ))}
          </div>
          <div className="chart-axis">
            <span>MAR</span>
            <span>APR</span>
            <span>MAY</span>
          </div>
        </div>
      </section>

      <section className="insight-grid">
        <article>
          <span className="date-label">VAULT TOTAL</span>
          <b>248</b>
          <h3>Resources saved</h3>
          <p>Your library grew by 31 discoveries this month.</p>
        </article>

        <article>
          <span className="date-label">TOP INTEREST</span>
          <b>34%</b>
          <h3>Interface craft</h3>
          <p>Animation and CSS remain your most revisited topics.</p>
        </article>

        <article>
          <span className="date-label">RETURN RATE</span>
          <b>72%</b>
          <h3>Worth coming back to</h3>
          <p>Most completed resources were opened more than once.</p>
        </article>
      </section>

      <section className="activity-feed">
        <div className="section-heading">
          <div>
            <span>01</span>
            <h2>Recent activity</h2>
          </div>
          <button>
            This month
            <Icon name="arrow" size={15} />
          </button>
        </div>

        {activityEvents.map((item) => (
          <div key={item.title}>
            <span>{item.type}</span>
            <b>{item.title}</b>
            <time>{item.time}</time>
          </div>
        ))}
      </section>
    </div>
  );
}
