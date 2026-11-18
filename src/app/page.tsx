"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { type NavPage, type UserProfile } from "@/components/layout/sidebar";
import { HomeView } from "@/components/views/home-view";
import { LibraryView } from "@/components/views/library-view";
import { ExploreView } from "@/components/views/explore-view";
import { CollectionsView } from "@/components/views/collections-view";
import { ActivityView } from "@/components/views/activity-view";
import { SettingsView } from "@/components/views/settings-view";
import { ResourceDetailDrawer } from "@/components/modals/resource-detail-drawer";
import { QuickCaptureModal } from "@/components/modals/quick-capture-modal";
import { Icon } from "@/components/shared/icon";
import {
  INITIAL_FIGMA_RESOURCES,
  INITIAL_COLLECTIONS,
  FigmaResource,
  CollectionItem,
} from "@/data/figmaResources";

function DashboardContent() {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as NavPage | null;
  const isModalParam = searchParams.get("modal") === "capture";

  const [page, setPage] = React.useState<NavPage>(urlTab || "home");
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [resources, setResources] = React.useState<FigmaResource[]>(INITIAL_FIGMA_RESOURCES);
  const [collections, setCollections] = React.useState<CollectionItem[]>(INITIAL_COLLECTIONS);
  const [selectedResource, setSelectedResource] = React.useState<FigmaResource | null>(null);
  const [isCaptureOpen, setIsCaptureOpen] = React.useState(isModalParam);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [toast, setToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // User Profile State
  const [userProfile, setUserProfile] = React.useState<UserProfile>({
    name: "Alex Lin",
    email: "alex@devvault.app",
    role: "Personal vault",
  });

  // Synchronize profile & theme from localStorage
  React.useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("devvault-theme") as "light" | "dark" | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
      const savedName = localStorage.getItem("devvault-user-name");
      const savedEmail = localStorage.getItem("devvault-user-email");
      const savedRole = localStorage.getItem("devvault-user-role");
      if (savedName || savedEmail || savedRole) {
        setUserProfile({
          name: savedName || "Alex Lin",
          email: savedEmail || "alex@devvault.app",
          role: savedRole || "Personal vault",
        });
      }
    } catch {}
  }, []);

  const showToast = React.useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleToggleTheme = React.useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem("devvault-theme", next);
        if (next === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
        }
      } catch {}
      return next;
    });
  }, []);

  const handleUpdateProfile = React.useCallback((updated: UserProfile) => {
    setUserProfile(updated);
    try {
      localStorage.setItem("devvault-user-name", updated.name);
      localStorage.setItem("devvault-user-email", updated.email);
      localStorage.setItem("devvault-user-role", updated.role);
    } catch {}
    showToast("Profile updated");
  }, [showToast]);

  React.useEffect(() => {
    if (isModalParam) {
      setIsCaptureOpen(true);
    }
  }, [isModalParam]);

  React.useEffect(() => {
    if (urlTab) {
      setPage(urlTab);
    }
  }, [urlTab]);

  const handleNavigate = React.useCallback((next: NavPage) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleOpenSearch = React.useCallback(() => {
    setPage("library");
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>(".library-search input")?.focus();
    }, 60);
  }, []);

  const handleSelectCollection = React.useCallback((name: string) => {
    setSearchQuery(name);
    setPage("library");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSaveResource = (newRes: Partial<FigmaResource>) => {
    const created: FigmaResource = {
      id: Date.now(),
      kind: newRes.kind || "article",
      source: newRes.source || "Web",
      domain: newRes.domain || "example.com",
      title: newRes.title || "Untitled resource",
      description: newRes.description || "A captured resource.",
      category: newRes.category || "General",
      length: newRes.length || "5 min read",
      saved: "Today",
      status: (newRes.status as FigmaResource["status"]) || "To explore",
      progress: 0,
      url: newRes.url,
      notes: newRes.notes,
      tags: [newRes.category || "General"],
    };

    setResources((prev) => [created, ...prev]);
    setToast(true);
    window.setTimeout(() => setToast(false), 3200);
  };

  const handleToggleStatus = (id: number) => {
    setResources((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = {
            ...r,
            status: (r.status === "Completed" ? "Exploring" : "Completed") as FigmaResource["status"],
            progress: r.status === "Completed" ? 30 : 100,
          };
          if (selectedResource?.id === id) {
            setSelectedResource(updated);
          }
          return updated;
        }
        return r;
      })
    );
  };

  const handleToggleBookmark = (id: number) => {
    setResources((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const isCurrentlyBookmarked = Boolean(r.pinned || r.favorite);
          const next = !isCurrentlyBookmarked;
          const updated = { ...r, pinned: next, favorite: next };
          if (selectedResource?.id === id) {
            setSelectedResource(updated);
          }
          return updated;
        }
        return r;
      })
    );
  };

  const handleUpdateNotes = (id: number, notes: string) => {
    setResources((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, notes };
          if (selectedResource?.id === id) {
            setSelectedResource(updated);
          }
          return updated;
        }
        return r;
      })
    );
  };

  const handleRemoveFromQueue = (id: number) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Completed" } : r))
    );
  };

  const handleExportData = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify({ resources, collections, userProfile }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `devvault-backup-${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.resources)) {
          setResources(parsed.resources);
        }
        if (Array.isArray(parsed.collections)) {
          setCollections(parsed.collections);
        }
        if (parsed.userProfile && parsed.userProfile.name) {
          handleUpdateProfile(parsed.userProfile);
        }
        showToast("Vault backup restored successfully");
      } catch {
        showToast("Failed to parse backup JSON");
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    setResources([]);
    setCollections([]);
  };

  const exploreCount = resources.filter((r) => r.status !== "Completed").length;
  const exploredCount = resources.filter((r) => r.status === "Completed").length;
  const vaultSizeKb = Math.max(12, Math.round(JSON.stringify({ resources, collections }).length / 1024));

  return (
    <AppShell
      page={page}
      onPage={handleNavigate}
      onCapture={() => setIsCaptureOpen(true)}
      onSearch={handleOpenSearch}
      exploreCount={exploreCount}
      onSelectCollection={handleSelectCollection}
      userProfile={userProfile}
      theme={theme}
      onTheme={handleToggleTheme}
    >
      {page === "home" && (
        <HomeView
          resources={resources}
          collections={collections}
          onCapture={() => setIsCaptureOpen(true)}
          onOpenResource={setSelectedResource}
          onNavigate={handleNavigate}
          onToggleBookmark={handleToggleBookmark}
          userProfile={userProfile}
        />
      )}

      {page === "library" && (
        <LibraryView
          resources={resources}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onCapture={() => setIsCaptureOpen(true)}
          onOpenResource={setSelectedResource}
          onToggleBookmark={handleToggleBookmark}
          onToast={showToast}
        />
      )}

      {page === "explore" && (
        <ExploreView
          resources={resources}
          onOpenResource={setSelectedResource}
          onRemoveFromQueue={handleRemoveFromQueue}
        />
      )}

      {page === "collections" && (
        <CollectionsView
          collections={collections}
          onOpenCollection={(col) => handleSelectCollection(col.name)}
          onCreateCollection={(col) => setCollections((prev) => [...prev, col])}
        />
      )}

      {page === "activity" && <ActivityView />}

      {page === "settings" && (
        <SettingsView
          theme={theme}
          onTheme={handleToggleTheme}
          onExportData={handleExportData}
          onImportData={handleImportData}
          onClearData={handleClearData}
          onToast={showToast}
          userProfile={userProfile}
          onUpdateProfile={handleUpdateProfile}
          resourcesCount={resources.length}
          collectionsCount={collections.length}
          exploredCount={exploredCount}
          vaultSizeKb={vaultSizeKb}
        />
      )}

      {/* Resource Detail Drawer */}
      {selectedResource && (
        <ResourceDetailDrawer
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          onToggleStatus={handleToggleStatus}
          onToggleBookmark={handleToggleBookmark}
          onUpdateNotes={handleUpdateNotes}
          onToast={showToast}
        />
      )}

      {/* Quick Capture Modal */}
      {isCaptureOpen && (
        <QuickCaptureModal
          isOpen={isCaptureOpen}
          onClose={() => setIsCaptureOpen(false)}
          onSaveResource={handleSaveResource}
          existingResources={resources}
        />
      )}

      {/* Save Resource Toast */}
      {toast && (
        <div className="save-toast" role="status" aria-live="polite">
          <span>
            <Icon name="check" />
          </span>
          <div>
            <b>Saved to your vault</b>
            <small>Ready whenever you are.</small>
          </div>
          <button
            onClick={() => {
              setToast(false);
              handleNavigate("library");
            }}
          >
            View
          </button>
        </div>
      )}

      {/* Generic Feedback Toast */}
      {toastMessage && (
        <div className="save-toast" role="status" aria-live="polite">
          <span>
            <Icon name="check" />
          </span>
          <div>
            <b>{toastMessage}</b>
            <small>DevVault index updated</small>
          </div>
          <button onClick={() => setToastMessage(null)}>Dismiss</button>
        </div>
      )}
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
