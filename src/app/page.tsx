"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { PlatformBreakdown } from "@/components/dashboard/platform-breakdown";
import { CategoryExplorer } from "@/components/dashboard/category-explorer";
import { ExploreLaterPreview } from "@/components/dashboard/explore-later-preview";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { ResourceGrid } from "@/components/resources/resource-grid";
import {
  MOCK_RESOURCES,
  MOCK_STATS,
  MOCK_CATEGORY_STATS,
  MOCK_ACTIVITIES,
} from "@/data/mockResources";
import {
  ResourceItem,
  ResourceStats,
  PlatformStat,
  CategoryStat,
  ActivityEvent,
} from "@/types/resource";
import { PLATFORM_CONFIG } from "@/config/platforms";

function DashboardContent() {
  const searchParams = useSearchParams();
  const isModalParam = searchParams.get("modal") === "capture";

  const [resources, setResources] = React.useState<ResourceItem[]>(MOCK_RESOURCES);
  const [stats, setStats] = React.useState<ResourceStats>(MOCK_STATS);
  const [activities, setActivities] = React.useState<ActivityEvent[]>(MOCK_ACTIVITIES);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null);
  const [statusTab, setStatusTab] = React.useState<string>("ALL");
  const [mobileTab, setMobileTab] = React.useState<string>("home");
  const [isQuickCaptureModalOpen, setIsQuickCaptureModalOpen] = React.useState(isModalParam);

  React.useEffect(() => {
    if (isModalParam) {
      setIsQuickCaptureModalOpen(true);
    }
  }, [isModalParam]);

  // Recalculate platform stats dynamically
  const platformStats: PlatformStat[] = React.useMemo(() => {
    const total = resources.length;
    const platforms: Record<string, number> = {};
    resources.forEach((r) => {
      platforms[r.platform] = (platforms[r.platform] || 0) + 1;
    });

    const list: PlatformStat[] = [
      {
        platform: "GITHUB",
        count: platforms["GITHUB"] || 0,
        percentage: total ? Math.round(((platforms["GITHUB"] || 0) / total) * 100) : 0,
        color: PLATFORM_CONFIG.GITHUB.dotColor,
      },
      {
        platform: "YOUTUBE",
        count: platforms["YOUTUBE"] || 0,
        percentage: total ? Math.round(((platforms["YOUTUBE"] || 0) / total) * 100) : 0,
        color: PLATFORM_CONFIG.YOUTUBE.dotColor,
      },
      {
        platform: "DOCS",
        count: platforms["DOCS"] || 0,
        percentage: total ? Math.round(((platforms["DOCS"] || 0) / total) * 100) : 0,
        color: PLATFORM_CONFIG.DOCS.dotColor,
      },
      {
        platform: "INSTAGRAM",
        count: platforms["INSTAGRAM"] || 0,
        percentage: total ? Math.round(((platforms["INSTAGRAM"] || 0) / total) * 100) : 0,
        color: PLATFORM_CONFIG.INSTAGRAM.dotColor,
      },
      {
        platform: "WEBSITE",
        count: platforms["WEBSITE"] || 0,
        percentage: total ? Math.round(((platforms["WEBSITE"] || 0) / total) * 100) : 0,
        color: PLATFORM_CONFIG.WEBSITE.dotColor,
      },
      {
        platform: "DESIGN",
        count: platforms["DESIGN"] || 0,
        percentage: total ? Math.round(((platforms["DESIGN"] || 0) / total) * 100) : 0,
        color: PLATFORM_CONFIG.DESIGN.dotColor,
      },
    ];
    return list;
  }, [resources]);

  // Recalculate category stats dynamically
  const categoryStats: CategoryStat[] = React.useMemo(() => {
    const counts: Record<string, number> = {};
    resources.forEach((r) => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });

    return MOCK_CATEGORY_STATS.map((c) => ({
      ...c,
      count: counts[c.category] || 0,
    }));
  }, [resources]);

  // Filter resources based on search, active filter, tag, and status tab
  const filteredResources = React.useMemo(() => {
    return resources.filter((res) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = res.title.toLowerCase().includes(q);
        const matchesDesc = res.description.toLowerCase().includes(q);
        const matchesCategory = res.category.toLowerCase().includes(q);
        const matchesAuthor = res.author?.toLowerCase().includes(q);
        const matchesTag = res.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesCategory && !matchesAuthor && !matchesTag) {
          return false;
        }
      }

      // Active Platform, Category, or Pinned filter
      if (activeFilter) {
        if (
          res.platform !== activeFilter &&
          res.category !== activeFilter &&
          (activeFilter !== "PINNED" || !res.isPinned)
        ) {
          return false;
        }
      }

      // Selected Tag filter
      if (selectedTag) {
        if (!res.tags.includes(selectedTag)) {
          return false;
        }
      }

      // Status Tab filter
      if (statusTab !== "ALL") {
        if (res.status !== statusTab) {
          return false;
        }
      }

      return true;
    });
  }, [resources, searchQuery, activeFilter, selectedTag, statusTab]);

  // Handler: Add new resource
  const handleAddResource = (newResource: ResourceItem) => {
    setResources((prev) => [newResource, ...prev]);
    setStats((prev) => ({
      ...prev,
      totalResources: prev.totalResources + 1,
      pinnedCount: newResource.isPinned ? prev.pinnedCount + 1 : prev.pinnedCount,
      exploreLaterCount:
        newResource.status === "EXPLORING"
          ? prev.exploreLaterCount + 1
          : prev.exploreLaterCount,
    }));

    // Prepend activity log
    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      type: "CAPTURED",
      resourceId: newResource.id,
      resourceTitle: newResource.title,
      platform: newResource.platform,
      timestamp: new Date().toISOString(),
      summary: `Captured ${newResource.platform.toLowerCase()} resource in ${newResource.category}`,
    };
    setActivities((prev) => [newActivity, ...prev]);
  };

  // Handler: Toggle Pin
  const handleTogglePin = (id: string) => {
    setResources((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextPinned = !r.isPinned;
          setStats((s) => ({
            ...s,
            pinnedCount: nextPinned ? s.pinnedCount + 1 : Math.max(0, s.pinnedCount - 1),
          }));
          return { ...r, isPinned: nextPinned };
        }
        return r;
      })
    );
  };

  // Handler: Toggle Favorite
  const handleToggleFavorite = (id: string) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    );
  };

  // Handler: Change Status
  const handleStatusChange = (id: string, newStatus: ResourceItem["status"]) => {
    setResources((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, status: newStatus };
        }
        return r;
      })
    );

    setStats((prev) => {
      const isNowCompleted = newStatus === "COMPLETED";
      return {
        ...prev,
        completedThisWeek: isNowCompleted
          ? prev.completedThisWeek + 1
          : prev.completedThisWeek,
      };
    });
  };

  // Handler: Filter selection
  const handleSelectFilter = (
    type: "platform" | "category" | "all",
    value: string
  ) => {
    if (activeFilter === value) {
      setActiveFilter(null);
    } else {
      setActiveFilter(value);
    }
  };

  // Clear all filters
  const handleClearFilter = () => {
    setActiveFilter(null);
    setSelectedTag(null);
    setSearchQuery("");
    setStatusTab("ALL");
  };

  // Mobile Bottom Navigation handler
  const handleMobileTabSelect = (tab: string) => {
    setMobileTab(tab);
    if (tab === "home") {
      handleClearFilter();
    } else if (tab === "library") {
      setStatusTab("ALL");
    } else if (tab === "explore") {
      setStatusTab("EXPLORING");
    } else if (tab === "collections") {
      setActiveFilter("PINNED");
    }
  };

  return (
    <AppShell
      resources={resources}
      onAddResource={handleAddResource}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      activeFilter={activeFilter || selectedTag}
      onSelectFilter={handleSelectFilter}
      onClearFilter={handleClearFilter}
      isQuickCaptureOpen={isQuickCaptureModalOpen}
      onOpenQuickCapture={() => setIsQuickCaptureModalOpen(true)}
      onCloseQuickCapture={() => setIsQuickCaptureModalOpen(false)}
      mobileActiveTab={mobileTab}
      onSelectMobileTab={handleMobileTabSelect}
    >
      {/* 1. Compact Editorial Welcome & Quick Capture Action Bar */}
      <WelcomeBanner
        onOpenQuickCapture={() => setIsQuickCaptureModalOpen(true)}
        streakDays={stats.currentStreakDays}
        totalCount={stats.totalResources}
      />

      {/* 2. Restrained Statistics Overview (Clickable Filters) */}
      <StatsOverview
        stats={stats}
        onFilterClick={(filter) => {
          if (filter === "ALL") {
            handleClearFilter();
          } else if (filter === "PINNED") {
            setActiveFilter("PINNED");
          } else {
            setStatusTab(filter);
          }
        }}
        activeStatusTab={activeFilter === "PINNED" ? "PINNED" : statusTab}
      />

      {/* 3. Category & Platform Filtering Strip */}
      <div className="space-y-3 pt-1">
        <CategoryExplorer
          categoryStats={categoryStats}
          activeCategory={activeFilter}
          onSelectCategory={(category) => handleSelectFilter("category", category)}
        />
        <PlatformBreakdown
          platformStats={platformStats}
          activePlatform={activeFilter}
          onSelectPlatform={(platform) => handleSelectFilter("platform", platform)}
        />
      </div>

      {/* 4. Primary Resource Library Feed */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-heading font-semibold text-foreground tracking-tight">
              Resource Feed
            </h2>
            <p className="text-xs text-muted-foreground">
              Collected engineering references, libraries, guides and talks.
            </p>
          </div>
          {(activeFilter || selectedTag || searchQuery || statusTab !== "ALL") && (
            <button
              onClick={handleClearFilter}
              className="text-xs text-primary hover:underline font-mono"
            >
              Reset filter
            </button>
          )}
        </div>

        <ResourceGrid
          resources={filteredResources}
          onTogglePin={handleTogglePin}
          onToggleFavorite={handleToggleFavorite}
          onStatusChange={handleStatusChange}
          onSelectTag={(tag) => setSelectedTag(selectedTag === tag ? null : tag)}
          selectedTag={selectedTag}
          onOpenQuickCapture={() => setIsQuickCaptureModalOpen(true)}
          activeStatusTab={statusTab}
          onStatusTabChange={setStatusTab}
        />
      </section>

      {/* 5. Secondary Queue & Stream: Explore Later + Activity Timeline */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/60">
        <ExploreLaterPreview
          resources={resources.filter((r) => r.status === "EXPLORING" || r.status === "SAVED")}
          onStatusChange={handleStatusChange}
          onViewAll={() => setStatusTab("EXPLORING")}
        />
        <RecentActivity activities={activities.slice(0, 4)} />
      </section>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
