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
import { AuthModal } from "@/components/auth/auth-modal";
import { Icon } from "@/components/shared/icon";
import { authService } from "@/services/auth-service";
import { avatarService } from "@/services/avatar-service";
import { resourceService } from "@/services/resource-service";
import { collectionService } from "@/services/collection-service";
import { migrationService } from "@/services/migration-service";
import { executeThemeTransition } from "@/lib/theme-transition";
import { type User, type Session } from "@supabase/supabase-js";
import {
  INITIAL_FIGMA_RESOURCES,
  INITIAL_COLLECTIONS,
  FigmaResource,
  CollectionItem,
} from "@/data/figmaResources";

function resolveProfileDisplayName(
  remoteProfile: {
    full_name?: string | null;
    email?: string | null;
    role_title?: string | null;
    avatar_url?: string | null;
    avatar_path?: string | null;
  } | null,
  user: { email?: string; user_metadata?: Record<string, any> } | null
): UserProfile {
  const meta = (user?.user_metadata || {}) as Record<string, any>;
  const metaName = (meta.full_name || meta.name || meta.display_name || meta.first_name) as string | undefined;
  const email = remoteProfile?.email || user?.email || "alex@devvault.app";
  const emailHandle = email.split("@")[0]?.toLowerCase();

  let nameCandidate = (remoteProfile?.full_name || metaName || "").trim();
  // If remoteProfile.full_name was auto-filled with raw email handle, prefer metadata or saved local name if human
  if (nameCandidate.toLowerCase() === emailHandle && metaName && metaName.toLowerCase() !== emailHandle) {
    nameCandidate = metaName.trim();
  }
  const savedName = typeof window !== "undefined" ? localStorage.getItem("devvault-user-name") : null;
  if (
    (!nameCandidate || nameCandidate.toLowerCase() === emailHandle) &&
    savedName &&
    !savedName.includes("@") &&
    !/\d/.test(savedName)
  ) {
    nameCandidate = savedName.trim();
  }

  const avatarPath =
    remoteProfile?.avatar_path ||
    meta.avatar_path ||
    (typeof window !== "undefined" ? localStorage.getItem("devvault-user-avatar-path") : null) ||
    null;

  let avatarUrl =
    remoteProfile?.avatar_url ||
    meta.avatar_url ||
    (typeof window !== "undefined" ? localStorage.getItem("devvault-user-avatar-url") : null) ||
    null;

  if (!avatarUrl && avatarPath) {
    avatarUrl = avatarService.getPublicAvatarUrl(avatarPath);
  }

  return {
    name: nameCandidate || remoteProfile?.full_name || "Alex Lin",
    email,
    role: remoteProfile?.role_title || "Personal vault",
    avatar_url: avatarUrl,
    avatar_path: avatarPath,
  };
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as NavPage | null;
  const urlTheme = searchParams.get("theme") as "light" | "dark" | null;
  const isModalParam = searchParams.get("modal") === "capture";

  const [page, setPage] = React.useState<NavPage>(urlTab || "home");
  const [theme, setTheme] = React.useState<"light" | "dark">(urlTheme || "light");
  const [resources, setResources] = React.useState<FigmaResource[]>(INITIAL_FIGMA_RESOURCES);
  const [collections, setCollections] = React.useState<CollectionItem[]>(INITIAL_COLLECTIONS);
  const [selectedResource, setSelectedResource] = React.useState<FigmaResource | null>(null);
  const [isCaptureOpen, setIsCaptureOpen] = React.useState(isModalParam);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [toast, setToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Authentication & Session State (Phase 02)
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [authSession, setAuthSession] = React.useState<Session | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [authModalMode, setAuthModalMode] = React.useState<"sign-in" | "sign-up">("sign-in");

  // Migration & Sync State (Phase 02 & Polish)
  const [migrationAvailable, setMigrationAvailable] = React.useState(false);
  const [isMigrating, setIsMigrating] = React.useState(false);
  const [migrationProgress, setMigrationProgress] = React.useState({ current: 0, total: 0 });
  const [isOnline, setIsOnline] = React.useState<boolean>(true);
  const [syncError, setSyncError] = React.useState<boolean>(false);
  const [isSyncBannerDismissed, setIsSyncBannerDismissed] = React.useState<boolean>(false);
  const [isLocalBannerDismissed, setIsLocalBannerDismissed] = React.useState<boolean>(false);

  // User Profile State
  const [userProfile, setUserProfile] = React.useState<UserProfile>({
    name: "Alex Lin",
    email: "alex@devvault.app",
    role: "Personal vault",
  });

  // Synchronize profile & theme from localStorage and Supabase session
  React.useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("devvault-theme") as "light" | "dark" | null;
      const activeTheme = urlTheme || savedTheme;
      if (activeTheme) {
        setTheme(activeTheme);
        if (activeTheme === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
        }
      }

      // Initialize font typography preference and display density
      const savedFont = localStorage.getItem("devvault-font-preference") || "newsreader";
      document.documentElement.setAttribute("data-font-pref", savedFont);
      const savedDensity = localStorage.getItem("devvault-density");
      if (savedDensity === "compact") {
        document.documentElement.classList.add("compact-density");
      } else {
        document.documentElement.classList.remove("compact-density");
      }

      const savedName = localStorage.getItem("devvault-user-name");
      const savedEmail = localStorage.getItem("devvault-user-email");
      const savedRole = localStorage.getItem("devvault-user-role");
      const savedAvatarUrl = localStorage.getItem("devvault-user-avatar-url");
      const savedAvatarPath = localStorage.getItem("devvault-user-avatar-path");
      if (savedName || savedEmail || savedRole || savedAvatarUrl) {
        setUserProfile({
          name: savedName || "Alex Lin",
          email: savedEmail || "alex@devvault.app",
          role: savedRole || "Personal vault",
          avatar_url: savedAvatarUrl || null,
          avatar_path: savedAvatarPath || null,
        });
      }

      // Check local cache for resources if not yet loaded
      const localResRaw = localStorage.getItem("devvault-local-resources");
      if (localResRaw) {
        try {
          const parsed = JSON.parse(localResRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setResources(parsed);
          }
        } catch { }
      } else {
        // Save initial fixtures to local storage
        resourceService.saveLocalCache(INITIAL_FIGMA_RESOURCES);
      }

      // Check local collections
      const localColRaw = localStorage.getItem("devvault-local-collections");
      if (localColRaw) {
        try {
          const parsedCols = JSON.parse(localColRaw);
          if (Array.isArray(parsedCols) && parsedCols.length > 0) {
            setCollections(parsedCols);
          }
        } catch { }
      } else {
        collectionService.saveLocalCollections(INITIAL_COLLECTIONS);
      }
    } catch { }

    // Check Auth Session & listen to changes
    const loadSessionAndData = async () => {
      try {
        const session = await authService.getSession();
        setAuthSession(session);
        setAuthUser(session?.user ?? null);

        if (session?.user) {
          // Fetch remote profile
          const remoteProfile = await authService.getProfile(session.user.id);
          setUserProfile(resolveProfileDisplayName(remoteProfile, session.user));

          // Fetch cloud resources
          const cloudResources = await resourceService.fetchResources(session.user.id);
          if (cloudResources.length > 0) {
            setResources(cloudResources);
          }

          // Fetch cloud collections
          const cloudCollections = await collectionService.fetchCollections(session.user.id);
          if (cloudCollections.length > 0) {
            setCollections(cloudCollections);
          }

          // Check if local data is eligible for migration
          const detection = migrationService.detectLocalData();
          if (detection.hasData) {
            setMigrationAvailable(true);
          }
        }
      } catch (err) {
        console.warn("Error initializing auth state:", err);
      }
    };

    loadSessionAndData();

    // Subscribe to auth state updates
    const unsubscribe = authService.onAuthStateChange(async (session, user) => {
      setAuthSession(session);
      setAuthUser(user);

      // Invalidate in-memory query cache on auth session changes to guarantee user isolation
      resourceService.invalidateCache();

      if (user) {
        const remoteProfile = await authService.getProfile(user.id);
        setUserProfile(resolveProfileDisplayName(remoteProfile, user));
        const cloudResources = await resourceService.fetchResources(user.id);
        setResources(cloudResources);
        const cloudCols = await collectionService.fetchCollections(user.id);
        if (cloudCols.length > 0) {
          setCollections(cloudCols);
        }
        const detection = migrationService.detectLocalData();
        if (detection.hasData) {
          setMigrationAvailable(true);
        }
      } else {
        // Clear authenticated state and restore local cache
        const localResRaw = localStorage.getItem("devvault-local-resources");
        if (localResRaw) {
          try {
            const parsed = JSON.parse(localResRaw);
            setResources(Array.isArray(parsed) ? parsed : INITIAL_FIGMA_RESOURCES);
          } catch {
            setResources(INITIAL_FIGMA_RESOURCES);
          }
        } else {
          setResources(INITIAL_FIGMA_RESOURCES);
        }

        const localColsRaw = localStorage.getItem("devvault-local-collections");
        if (localColsRaw) {
          try {
            const parsedCols = JSON.parse(localColsRaw);
            setCollections(Array.isArray(parsedCols) ? parsedCols : INITIAL_COLLECTIONS);
          } catch {
            setCollections(INITIAL_COLLECTIONS);
          }
        } else {
          setCollections(INITIAL_COLLECTIONS);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [urlTheme]);

  const showToast = React.useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Network & Session Banner State (Polish Sprint)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    try {
      setIsSyncBannerDismissed(sessionStorage.getItem("devvault-dismiss-sync-banner") === "true");
      setIsLocalBannerDismissed(sessionStorage.getItem("devvault-dismiss-local-banner") === "true");
    } catch { }

    const handleOnline = () => {
      setIsOnline(true);
      setSyncError(false);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const syncStatus: "synced" | "local" | "syncing" | "error" | "offline" = React.useMemo(() => {
    if (!isOnline) return "offline";
    if (isMigrating) return "syncing";
    if (syncError) return "error";
    if (authUser) {
      return migrationAvailable ? "local" : "synced";
    }
    return "local";
  }, [isOnline, isMigrating, syncError, authUser, migrationAvailable]);

  const handleOpenAuth = React.useCallback((mode: "sign-in" | "sign-up" = "sign-in") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const handleSignOut = React.useCallback(async () => {
    try {
      await authService.signOut();
      setAuthUser(null);
      setAuthSession(null);
      setMigrationAvailable(false);

      // Invalidate in-memory query cache on sign out
      resourceService.invalidateCache();

      // Restore local data so unauthenticated view does not leak cloud data
      const localResRaw = localStorage.getItem("devvault-local-resources");
      if (localResRaw) {
        try {
          const parsed = JSON.parse(localResRaw);
          setResources(Array.isArray(parsed) ? parsed : INITIAL_FIGMA_RESOURCES);
        } catch {
          setResources(INITIAL_FIGMA_RESOURCES);
        }
      } else {
        setResources(INITIAL_FIGMA_RESOURCES);
      }

      const localColsRaw = localStorage.getItem("devvault-local-collections");
      if (localColsRaw) {
        try {
          const parsedCols = JSON.parse(localColsRaw);
          setCollections(Array.isArray(parsedCols) ? parsedCols : INITIAL_COLLECTIONS);
        } catch {
          setCollections(INITIAL_COLLECTIONS);
        }
      } else {
        setCollections(INITIAL_COLLECTIONS);
      }

      setUserProfile({
        name: localStorage.getItem("devvault-user-name") || "Alex Lin",
        email: localStorage.getItem("devvault-user-email") || "alex@devvault.app",
        role: localStorage.getItem("devvault-user-role") || "Personal vault",
      });

      showToast("Signed out of vault");
    } catch (err) {
      console.warn("Sign out error:", err);
    }
  }, [showToast]);

  const handleRunMigration = React.useCallback(async () => {
    if (!authUser) return;
    setIsMigrating(true);
    setSyncError(false);
    try {
      const detection = migrationService.detectLocalData();
      const res = await migrationService.migrateLocalToCloud(
        authUser.id,
        detection.resources.length > 0 ? detection.resources : resources,
        collections,
        (cur, tot) => setMigrationProgress({ current: cur, total: tot })
      );

      // Reload fresh data from PostgreSQL
      const refreshedResources = await resourceService.fetchResources(authUser.id);
      if (refreshedResources.length > 0) {
        setResources(refreshedResources);
      }
      const refreshedCols = await collectionService.fetchCollections(authUser.id);
      if (refreshedCols.length > 0) {
        setCollections(refreshedCols);
      }

      setMigrationAvailable(false);
      setSyncError(false);
      showToast(`Migrated ${res.migratedCount} resources to cloud vault`);
    } catch (err) {
      console.warn("Migration failed:", err);
      setSyncError(true);
      showToast("Migration failed. Please check network.");
    } finally {
      setIsMigrating(false);
    }
  }, [authUser, resources, collections, showToast]);

  const isThemeTransitioningRef = React.useRef(false);

  const handleToggleTheme = React.useCallback(
    (event?: React.MouseEvent<HTMLElement> | MouseEvent) => {
      if (isThemeTransitioningRef.current) return;
      isThemeTransitioningRef.current = true;

      const next = theme === "light" ? "dark" : "light";
      executeThemeTransition({
        nextTheme: next,
        event,
        applyTheme: () => {
          setTheme(next);
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
        },
        onEnd: () => {
          isThemeTransitioningRef.current = false;
        },
      });
    },
    [theme]
  );

  const handleUpdateProfile = React.useCallback(async (updated: UserProfile) => {
    setUserProfile(updated);
    try {
      localStorage.setItem("devvault-user-name", updated.name);
      localStorage.setItem("devvault-user-email", updated.email);
      localStorage.setItem("devvault-user-role", updated.role);
      if (updated.avatar_url) {
        localStorage.setItem("devvault-user-avatar-url", updated.avatar_url);
      } else {
        localStorage.removeItem("devvault-user-avatar-url");
      }
      if (updated.avatar_path) {
        localStorage.setItem("devvault-user-avatar-path", updated.avatar_path);
      } else {
        localStorage.removeItem("devvault-user-avatar-path");
      }
    } catch { }

    // Persist to Supabase if authenticated
    if (authUser) {
      try {
        await authService.updateProfile(authUser.id, {
          full_name: updated.name,
          role_title: updated.role,
          avatar_url: updated.avatar_url ?? null,
          avatar_path: updated.avatar_path ?? null,
        });
      } catch (err) {
        console.warn("Error persisting profile update to Supabase:", err);
      }
    }

    showToast("Profile updated");
  }, [authUser, showToast]);

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

  const handleSaveResource = async (newRes: Partial<FigmaResource>) => {
    // Duplicate URL detection
    if (newRes.url && authUser) {
      const isDupe = await resourceService.checkDuplicateUrl(authUser.id, newRes.url);
      if (isDupe) {
        showToast("Notice: URL already in your vault");
      }
    }

    const created = await resourceService.createResource(authUser?.id || null, newRes);
    setResources((prev) => [created, ...prev]);

    // Refresh collection counts if assigned to a shelf
    if (authUser && created.collection) {
      const refreshedCols = await collectionService.fetchCollections(authUser.id);
      if (refreshedCols.length > 0) setCollections(refreshedCols);
    }

    setToast(true);
    window.setTimeout(() => setToast(false), 3200);
  };

  const handleUpdateResource = React.useCallback(
    async (id: number, updates: Partial<FigmaResource>, remoteId?: string) => {
      const previous = resources;
      // Optimistic update
      setResources((prev) =>
        prev.map((r) =>
          r.id === id || (remoteId && r.remoteId === remoteId)
            ? { ...r, ...updates }
            : r
        )
      );
      if (
        selectedResource &&
        (selectedResource.id === id || (remoteId && selectedResource.remoteId === remoteId))
      ) {
        setSelectedResource((prev) => (prev ? { ...prev, ...updates } : null));
      }

      try {
        await resourceService.updateResource(
          authUser?.id || null,
          id,
          updates,
          remoteId
        );
      } catch (err) {
        console.warn("Failed to persist update, rolling back:", err);
        setResources(previous);
        showToast("Update failed. Reverting changes.");
      }
    },
    [authUser, resources, selectedResource, showToast]
  );

  const handleDeleteResource = React.useCallback(
    async (id: number, url?: string, remoteId?: string) => {
      const previous = resources;
      // Optimistic delete
      setResources((prev) =>
        prev.filter((r) => (remoteId ? r.remoteId !== remoteId : r.id !== id))
      );
      if (
        selectedResource &&
        (selectedResource.id === id || (remoteId && selectedResource.remoteId === remoteId))
      ) {
        setSelectedResource(null);
      }

      try {
        await resourceService.deleteResource(
          authUser?.id || null,
          id,
          url,
          remoteId
        );
        // Refresh collection count
        if (authUser) {
          const refreshedCols = await collectionService.fetchCollections(authUser.id);
          if (refreshedCols.length > 0) setCollections(refreshedCols);
        }
      } catch (err) {
        console.warn("Failed to delete resource, rolling back:", err);
        setResources(previous);
        showToast("Delete failed. Reverting.");
      }
    },
    [authUser, resources, selectedResource, showToast]
  );

  const handleCreateCollection = React.useCallback(
    async (newCol: CollectionItem) => {
      try {
        const created = await collectionService.createCollection(authUser?.id || null, newCol);
        setCollections((prev) => [...prev.filter((c) => c.name !== created.name), created]);
        showToast(`Shelf "${created.name}" created`);
      } catch (err) {
        console.warn("Failed to create collection:", err);
        showToast("Failed to create shelf.");
      }
    },
    [authUser, showToast]
  );

  const handleUpdateCollection = React.useCallback(
    async (oldName: string, updates: Partial<CollectionItem>) => {
      try {
        if (updates.name && updates.name !== oldName) {
          await collectionService.renameCollection(authUser?.id || null, oldName, updates.name);
        }
        if (updates.note !== undefined || updates.tone !== undefined) {
          await collectionService.updateCollection(authUser?.id || null, updates.name || oldName, {
            note: updates.note,
            tone: updates.tone,
          });
        }
        setCollections((prev) =>
          prev.map((c) => (c.name === oldName ? { ...c, ...updates } : c))
        );
        // Rename collection reference in resources
        if (updates.name && updates.name !== oldName) {
          setResources((prev) =>
            prev.map((r) => (r.collection === oldName ? { ...r, collection: updates.name } : r))
          );
        }
        resourceService.invalidateCache(authUser?.id);
        showToast("Shelf updated");
      } catch (err) {
        console.warn("Failed to update collection:", err);
        showToast("Failed to update shelf.");
      }
    },
    [authUser, showToast]
  );

  const handleDeleteCollection = React.useCallback(
    async (name: string, id?: string) => {
      try {
        await collectionService.deleteCollection(authUser?.id || null, name, id);
        setCollections((prev) => prev.filter((c) => (id ? c.id !== id : c.name !== name)));
        setResources((prev) =>
          prev.map((r) => (r.collection === name ? { ...r, collection: undefined } : r))
        );
        resourceService.invalidateCache(authUser?.id);
        showToast(`Shelf "${name}" deleted`);
      } catch (err) {
        console.warn("Failed to delete collection:", err);
        showToast("Failed to delete shelf.");
      }
    },
    [authUser, showToast]
  );

  const handleToggleStatus = async (id: number) => {
    const target = resources.find((r) => r.id === id);
    const nextStatus = target?.status === "Completed" ? "Exploring" : "Completed";
    const nextProgress = target?.status === "Completed" ? 30 : 100;

    setResources((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = {
            ...r,
            status: nextStatus as FigmaResource["status"],
            progress: nextProgress,
          };
          if (selectedResource?.id === id) {
            setSelectedResource(updated);
          }
          return updated;
        }
        return r;
      })
    );

    await resourceService.updateResource(
      authUser?.id || null,
      id,
      {
        status: nextStatus as FigmaResource["status"],
        progress: nextProgress,
        url: target?.url,
        title: target?.title,
      },
      target?.remoteId
    );
  };

  const handleToggleBookmark = async (id: number) => {
    const target = resources.find((r) => r.id === id);
    const isCurrentlyBookmarked = Boolean(target?.pinned || target?.favorite);
    const next = !isCurrentlyBookmarked;

    setResources((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, pinned: next, favorite: next };
          if (selectedResource?.id === id) {
            setSelectedResource(updated);
          }
          return updated;
        }
        return r;
      })
    );

    await resourceService.updateResource(
      authUser?.id || null,
      id,
      {
        pinned: next,
        favorite: next,
        url: target?.url,
        title: target?.title,
      },
      target?.remoteId
    );
  };

  const handleUpdateNotes = async (id: number, notes: string) => {
    const target = resources.find((r) => r.id === id);

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

    await resourceService.updateResource(
      authUser?.id || null,
      id,
      {
        notes,
        url: target?.url,
        title: target?.title,
      },
      target?.remoteId
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
      isAuthenticated={Boolean(authUser)}
      onOpenAuth={handleOpenAuth}
      onSignOut={handleSignOut}
      syncStatus={syncStatus}
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
          collections={collections}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onCapture={() => setIsCaptureOpen(true)}
          onOpenResource={setSelectedResource}
          onToggleBookmark={handleToggleBookmark}
          onToast={showToast}
          userId={authUser?.id || null}
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
          onCreateCollection={handleCreateCollection}
          onUpdateCollection={handleUpdateCollection}
          onDeleteCollection={handleDeleteCollection}
        />
      )}

      {page === "activity" && (
        <ActivityView
          resources={resources}
          collections={collections}
          userId={authUser?.id}
        />
      )}

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
          isAuthenticated={Boolean(authUser)}
          authUserId={authUser?.id || null}
          authEmail={authUser?.email || null}
          onOpenAuth={handleOpenAuth}
          onSignOut={handleSignOut}
          onMigrateLocal={handleRunMigration}
          migrationAvailable={migrationAvailable}
          isMigrating={isMigrating}
          migrationProgress={migrationProgress}
        />
      )}

      {/* Authentication Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
          onSuccess={() => {
            showToast("Vault synchronized");
          }}
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
          onUpdateResource={handleUpdateResource}
          onDeleteResource={handleDeleteResource}
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
          collections={collections}
          session={authSession}
        />
      )}

      {/* Cloud Migration Toast (Modern UI/UX Toast for Phone and Desktop) */}
      {authUser && migrationAvailable && !isSyncBannerDismissed && (
        <div className="vault-sync-toast" role="status" aria-live="polite">
          <div className="vault-sync-toast-content">
            <div className="vault-sync-toast-icon">
              <Icon name="upload" size={17} />
            </div>
            <div className="vault-sync-toast-body">
              <div className="vault-sync-toast-header">
                <span className="vault-sync-toast-title">Local resources waiting to sync</span>
                <button
                  type="button"
                  className="vault-sync-toast-close"
                  onClick={() => {
                    setIsSyncBannerDismissed(true);
                    try {
                      sessionStorage.setItem("devvault-dismiss-sync-banner", "true");
                    } catch { }
                  }}
                  aria-label="Dismiss toast"
                  title="Dismiss"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
              <p className="vault-sync-toast-text">
                You have resources saved in this browser that aren&apos;t in your cloud vault yet.
              </p>
              {isMigrating && (
                <div className="vault-sync-toast-progress">
                  <div
                    className="vault-sync-toast-progress-bar"
                    style={{
                      width: `${(migrationProgress.current / Math.max(migrationProgress.total, 1)) * 100}%`,
                    }}
                  />
                </div>
              )}
              <div className="vault-sync-toast-actions">
                <button
                  type="button"
                  className="vault-sync-btn-primary"
                  disabled={isMigrating}
                  onClick={handleRunMigration}
                >
                  {isMigrating
                    ? `Syncing (${migrationProgress.current}/${migrationProgress.total})...`
                    : "Sync now"}
                </button>
                <button
                  type="button"
                  className="vault-sync-btn-secondary"
                  disabled={isMigrating}
                  onClick={() => {
                    setIsSyncBannerDismissed(true);
                    try {
                      sessionStorage.setItem("devvault-dismiss-sync-banner", "true");
                    } catch { }
                  }}
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Local Mode Invitation Toast */}
      {!authUser && !isLocalBannerDismissed && (
        <div className="vault-sync-toast local-mode-toast" role="status" aria-live="polite">
          <div className="vault-sync-toast-content">
            <div className="vault-sync-toast-icon">
              <Icon name="log-in" size={17} />
            </div>
            <div className="vault-sync-toast-body">
              <div className="vault-sync-toast-header">
                <span className="vault-sync-toast-title">Local Vault Active</span>
                <button
                  type="button"
                  className="vault-sync-toast-close"
                  onClick={() => {
                    setIsLocalBannerDismissed(true);
                    try {
                      sessionStorage.setItem("devvault-dismiss-local-banner", "true");
                    } catch { }
                  }}
                  aria-label="Dismiss notice"
                  title="Dismiss"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
              <p className="vault-sync-toast-text">
                Your resources are saved in this browser. Sign in or create an account for persistent cloud sync.
              </p>
              <div className="vault-sync-toast-actions">
                <button
                  type="button"
                  className="vault-sync-btn-primary"
                  onClick={() => handleOpenAuth("sign-in")}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="vault-sync-btn-secondary"
                  onClick={() => handleOpenAuth("sign-up")}
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
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
