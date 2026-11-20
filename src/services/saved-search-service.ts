import { getBrowserSupabase } from "@/lib/supabase/client";
import { type SavedSearchRow, type SavedSearchUpdate } from "@/lib/supabase/types";
import {
  type SavedSearchItem,
  type SortOption,
  type AdvancedSortOption,
} from "@/data/figmaResources";

export const LOCAL_SAVED_SEARCHES_KEY = "devvault-local-saved-searches";

export interface CreateSavedSearchInput {
  name: string;
  query?: string;
  platform?: string;
  category?: string;
  status?: string;
  collection?: string;
  tags?: string[];
  favorite?: boolean;
  pinned?: boolean;
  bookmarked?: boolean;
  datePreset?: "all" | "today" | "7d" | "30d" | "year";
  dateFrom?: string;
  dateTo?: string;
  sortOrder?: SortOption;
}

export type UpdateSavedSearchInput = Partial<CreateSavedSearchInput>;

/**
 * Validates a saved search name:
 * Must be non-empty after trimming and at most 100 characters.
 */
export function validateSavedSearchName(name: string): string {
  if (typeof name !== "string") {
    throw new Error("Saved search name is required");
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error("Saved search name cannot be empty");
  }
  if (trimmed.length > 100) {
    throw new Error("Saved search name must be 100 characters or fewer");
  }
  return trimmed;
}

/**
 * Validates date boundaries:
 * If both dateFrom and dateTo are present, dateFrom must be <= dateTo.
 */
export function validateDateBoundaries(dateFrom?: string, dateTo?: string): void {
  if (dateFrom && dateTo) {
    const fromTime = new Date(dateFrom).getTime();
    const toTime = new Date(dateTo).getTime();
    if (!isNaN(fromTime) && !isNaN(toTime) && fromTime > toTime) {
      throw new Error("Start date cannot be after end date");
    }
  }
}

/**
 * Normalizes sort order to an AdvancedSortOption,
 * transparently mapping the legacy "title" alias to "title-asc".
 */
export function normalizeSortOrder(order?: SortOption): AdvancedSortOption {
  if (!order || order === "recent") return "recent";
  if (order === "title" || order === "title-asc") return "title-asc";
  if (
    order === "oldest" ||
    order === "title-desc" ||
    order === "updated" ||
    order === "relevance"
  ) {
    return order;
  }
  return "recent";
}

/**
 * Maps a Supabase database row to the client-facing SavedSearchItem model.
 * Preserves false boolean values and empty tag arrays.
 */
export function mapRowToSavedSearchItem(row: SavedSearchRow): SavedSearchItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    query: row.search_query || undefined,
    platform: row.platform || undefined,
    category: row.category || undefined,
    status: row.status || undefined,
    collection: row.collection || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    favorite: row.is_favorite === null ? undefined : row.is_favorite,
    pinned: row.is_pinned === null ? undefined : row.is_pinned,
    bookmarked: row.is_bookmarked === null ? undefined : row.is_bookmarked,
    datePreset:
      row.date_preset && row.date_preset !== "all"
        ? (row.date_preset as SavedSearchItem["datePreset"])
        : undefined,
    dateFrom: row.date_from || undefined,
    dateTo: row.date_to || undefined,
    sortOrder: normalizeSortOrder(row.sort_order as SortOption),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
  };
}

/**
 * Maps client create input to Supabase database row payload.
 * Normalizes optional values consistently with migration 009 schema.
 */
export function mapInputToDatabaseRow(
  input: CreateSavedSearchInput,
  userId: string
): Omit<SavedSearchRow, "id" | "created_at" | "updated_at" | "last_used_at"> {
  const validatedName = validateSavedSearchName(input.name);
  validateDateBoundaries(input.dateFrom, input.dateTo);

  return {
    user_id: userId,
    name: validatedName,
    search_query: input.query?.trim() || null,
    platform: input.platform && input.platform !== "All" ? input.platform.trim() : null,
    category: input.category && input.category !== "All" ? input.category.trim() : null,
    status: input.status && input.status !== "All" ? input.status.trim() : null,
    collection: input.collection && input.collection !== "All" ? input.collection.trim() : null,
    tags: Array.isArray(input.tags)
      ? input.tags.map((t) => t.trim()).filter(Boolean)
      : [],
    is_favorite: typeof input.favorite === "boolean" ? input.favorite : null,
    is_pinned: typeof input.pinned === "boolean" ? input.pinned : null,
    is_bookmarked: typeof input.bookmarked === "boolean" ? input.bookmarked : null,
    date_preset: input.datePreset && input.datePreset !== "all" ? input.datePreset : null,
    date_from: input.dateFrom ? new Date(input.dateFrom).toISOString() : null,
    date_to: input.dateTo ? new Date(input.dateTo).toISOString() : null,
    sort_order: normalizeSortOrder(input.sortOrder),
  };
}

/**
 * Sorts saved searches in memory:
 * Primary: lastUsedAt DESC (falling back to createdAt)
 * Secondary: createdAt DESC
 * Tertiary: name A-Z
 */
export function sortSavedSearches(items: SavedSearchItem[]): SavedSearchItem[] {
  return [...items].sort((a, b) => {
    const timeA = new Date(a.lastUsedAt || a.createdAt).getTime();
    const timeB = new Date(b.lastUsedAt || b.createdAt).getTime();
    if (timeB !== timeA) return timeB - timeA;

    const createdA = new Date(a.createdAt).getTime();
    const createdB = new Date(b.createdAt).getTime();
    if (createdB !== createdA) return createdB - createdA;

    return a.name.localeCompare(b.name);
  });
}

/**
 * Local storage persistence helpers for guest and offline operation.
 */
function getLocalSavedSearches(): SavedSearchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_SAVED_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setLocalSavedSearches(items: SavedSearchItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_SAVED_SEARCHES_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn("setLocalSavedSearches error:", err);
  }
}

/**
 * Resolves the authenticated user ID from Supabase auth session,
 * preventing arbitrary user ID spoofing from untrusted client input.
 */
async function resolveAuthenticatedUserId(providedUserId?: string | null): Promise<string | null> {
  const supabase = getBrowserSupabase();
  if (!supabase) return providedUserId || null;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }
    return user.id;
  } catch {
    return providedUserId || null;
  }
}

export const savedSearchService = {
  /**
   * Retrieves saved searches for the active user.
   * Respects Supabase RLS and orders by last_used_at DESC, created_at DESC.
   * Falls back to localStorage when unauthenticated or in offline mode.
   */
  async getSavedSearches(userId?: string | null): Promise<SavedSearchItem[]> {
    const supabase = getBrowserSupabase();
    const resolvedUserId = await resolveAuthenticatedUserId(userId);

    // Guest / Offline fallback
    if (!supabase || !resolvedUserId) {
      const local = getLocalSavedSearches();
      return sortSavedSearches(local);
    }

    try {
      const { data, error } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", resolvedUserId)
        .order("last_used_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (!data) return [];
      const mapped = data.map(mapRowToSavedSearchItem);

      // Keep local storage cache in sync for offline availability
      setLocalSavedSearches(mapped);
      return mapped;
    } catch (err) {
      console.warn("getSavedSearches remote error, falling back to local storage:", err);
      const local = getLocalSavedSearches();
      return sortSavedSearches(local);
    }
  },

  /**
   * Creates a new saved search.
   * Validates name and criteria, enforces RLS ownership via auth context,
   * handles duplicate names gracefully, and returns the created item.
   */
  async createSavedSearch(
    input: CreateSavedSearchInput,
    userId?: string | null
  ): Promise<SavedSearchItem> {
    const validatedName = validateSavedSearchName(input.name);
    validateDateBoundaries(input.dateFrom, input.dateTo);

    const supabase = getBrowserSupabase();
    const resolvedUserId = await resolveAuthenticatedUserId(userId);

    // Guest / Demo mode via localStorage
    if (!supabase || !resolvedUserId) {
      const existing = getLocalSavedSearches();
      const isDuplicate = existing.some(
        (s) => s.name.toLowerCase() === validatedName.toLowerCase()
      );
      if (isDuplicate) {
        throw new Error(`A saved search with the name "${validatedName}" already exists`);
      }

      const now = new Date().toISOString();
      const newItem: SavedSearchItem = {
        id: `local-search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: validatedName,
        query: input.query?.trim() || undefined,
        platform: input.platform && input.platform !== "All" ? input.platform.trim() : undefined,
        category: input.category && input.category !== "All" ? input.category.trim() : undefined,
        status: input.status && input.status !== "All" ? input.status.trim() : undefined,
        collection: input.collection && input.collection !== "All" ? input.collection.trim() : undefined,
        tags: Array.isArray(input.tags)
          ? input.tags.map((t) => t.trim()).filter(Boolean)
          : [],
        favorite: typeof input.favorite === "boolean" ? input.favorite : undefined,
        pinned: typeof input.pinned === "boolean" ? input.pinned : undefined,
        bookmarked: typeof input.bookmarked === "boolean" ? input.bookmarked : undefined,
        datePreset: input.datePreset && input.datePreset !== "all" ? input.datePreset : undefined,
        dateFrom: input.dateFrom || undefined,
        dateTo: input.dateTo || undefined,
        sortOrder: normalizeSortOrder(input.sortOrder),
        createdAt: now,
        updatedAt: now,
        lastUsedAt: now,
      };

      setLocalSavedSearches([newItem, ...existing]);
      return newItem;
    }

    // Authenticated Supabase persistence
    const dbPayload = mapInputToDatabaseRow(input, resolvedUserId);

    const { data, error } = await supabase
      .from("saved_searches")
      .insert(dbPayload)
      .select("*")
      .single();

    if (error) {
      if (
        error.code === "23505" ||
        error.message?.includes("uq_user_saved_search_name") ||
        error.message?.toLowerCase().includes("unique constraint")
      ) {
        throw new Error(`A saved search with the name "${validatedName}" already exists`);
      }
      throw new Error(`Failed to create saved search: ${error.message}`);
    }

    const created = mapRowToSavedSearchItem(data);

    // Update local cache
    const existing = getLocalSavedSearches();
    setLocalSavedSearches([created, ...existing.filter((s) => s.id !== created.id)]);

    return created;
  },

  /**
   * Updates an existing saved search.
   * Modifies only provided fields, preserves omitted criteria, protects
   * server-managed timestamps and foreign keys, and respects RLS.
   */
  async updateSavedSearch(
    id: string,
    updates: UpdateSavedSearchInput,
    userId?: string | null
  ): Promise<SavedSearchItem> {
    if (!id || typeof id !== "string") {
      throw new Error("Saved search ID is required for updates");
    }

    const validatedName =
      updates.name !== undefined ? validateSavedSearchName(updates.name) : undefined;

    validateDateBoundaries(updates.dateFrom, updates.dateTo);

    const supabase = getBrowserSupabase();
    const resolvedUserId = await resolveAuthenticatedUserId(userId);

    // Guest / Offline mode
    if (!supabase || !resolvedUserId) {
      const existing = getLocalSavedSearches();
      const index = existing.findIndex((s) => s.id === id);
      if (index === -1) {
        throw new Error(`Saved search with ID "${id}" not found`);
      }

      if (validatedName) {
        const isDuplicate = existing.some(
          (s) => s.id !== id && s.name.toLowerCase() === validatedName.toLowerCase()
        );
        if (isDuplicate) {
          throw new Error(`A saved search with the name "${validatedName}" already exists`);
        }
      }

      const current = existing[index];
      const now = new Date().toISOString();

      const updated: SavedSearchItem = {
        ...current,
        name: validatedName !== undefined ? validatedName : current.name,
        query:
          updates.query !== undefined ? updates.query?.trim() || undefined : current.query,
        platform:
          updates.platform !== undefined
            ? updates.platform !== "All"
              ? updates.platform.trim()
              : undefined
            : current.platform,
        category:
          updates.category !== undefined
            ? updates.category !== "All"
              ? updates.category.trim()
              : undefined
            : current.category,
        status:
          updates.status !== undefined
            ? updates.status !== "All"
              ? updates.status.trim()
              : undefined
            : current.status,
        collection:
          updates.collection !== undefined
            ? updates.collection !== "All"
              ? updates.collection.trim()
              : undefined
            : current.collection,
        tags:
          updates.tags !== undefined
            ? Array.isArray(updates.tags)
              ? updates.tags.map((t) => t.trim()).filter(Boolean)
              : []
            : current.tags,
        favorite: updates.favorite !== undefined ? updates.favorite : current.favorite,
        pinned: updates.pinned !== undefined ? updates.pinned : current.pinned,
        bookmarked: updates.bookmarked !== undefined ? updates.bookmarked : current.bookmarked,
        datePreset:
          updates.datePreset !== undefined
            ? updates.datePreset !== "all"
              ? updates.datePreset
              : undefined
            : current.datePreset,
        dateFrom:
          updates.dateFrom !== undefined ? updates.dateFrom || undefined : current.dateFrom,
        dateTo: updates.dateTo !== undefined ? updates.dateTo || undefined : current.dateTo,
        sortOrder:
          updates.sortOrder !== undefined
            ? normalizeSortOrder(updates.sortOrder)
            : current.sortOrder,
        updatedAt: now,
      };

      existing[index] = updated;
      setLocalSavedSearches(existing);
      return updated;
    }

    // Authenticated Supabase update
    const dbPayload: SavedSearchUpdate = {};
    if (validatedName !== undefined) dbPayload.name = validatedName;
    if (updates.query !== undefined) dbPayload.search_query = updates.query.trim() || null;
    if (updates.platform !== undefined)
      dbPayload.platform = updates.platform !== "All" ? updates.platform.trim() : null;
    if (updates.category !== undefined)
      dbPayload.category = updates.category !== "All" ? updates.category.trim() : null;
    if (updates.status !== undefined)
      dbPayload.status = updates.status !== "All" ? updates.status.trim() : null;
    if (updates.collection !== undefined)
      dbPayload.collection = updates.collection !== "All" ? updates.collection.trim() : null;
    if (updates.tags !== undefined)
      dbPayload.tags = Array.isArray(updates.tags)
        ? updates.tags.map((t) => t.trim()).filter(Boolean)
        : [];
    if (updates.favorite !== undefined) dbPayload.is_favorite = updates.favorite;
    if (updates.pinned !== undefined) dbPayload.is_pinned = updates.pinned;
    if (updates.bookmarked !== undefined) dbPayload.is_bookmarked = updates.bookmarked;
    if (updates.datePreset !== undefined)
      dbPayload.date_preset = updates.datePreset !== "all" ? updates.datePreset : null;
    if (updates.dateFrom !== undefined)
      dbPayload.date_from = updates.dateFrom ? new Date(updates.dateFrom).toISOString() : null;
    if (updates.dateTo !== undefined)
      dbPayload.date_to = updates.dateTo ? new Date(updates.dateTo).toISOString() : null;
    if (updates.sortOrder !== undefined)
      dbPayload.sort_order = normalizeSortOrder(updates.sortOrder);

    const { data, error } = await supabase
      .from("saved_searches")
      .update(dbPayload)
      .eq("id", id)
      .eq("user_id", resolvedUserId)
      .select("*")
      .single();

    if (error) {
      if (
        error.code === "23505" ||
        error.message?.includes("uq_user_saved_search_name") ||
        error.message?.toLowerCase().includes("unique constraint")
      ) {
        throw new Error(
          `A saved search with the name "${updates.name?.trim()}" already exists`
        );
      }
      throw new Error(`Failed to update saved search: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Saved search with ID "${id}" not found`);
    }

    const updated = mapRowToSavedSearchItem(data);

    // Update local cache
    const existing = getLocalSavedSearches();
    const idx = existing.findIndex((s) => s.id === id);
    if (idx !== -1) {
      existing[idx] = updated;
      setLocalSavedSearches(existing);
    }

    return updated;
  },

  /**
   * Deletes a saved search by ID.
   * Scoped to the authenticated user via RLS and user_id.
   * Returns true on success or if record was already removed.
   */
  async deleteSavedSearch(id: string, userId?: string | null): Promise<boolean> {
    if (!id || typeof id !== "string") return false;

    const supabase = getBrowserSupabase();
    const resolvedUserId = await resolveAuthenticatedUserId(userId);

    // Guest / Offline mode
    if (!supabase || !resolvedUserId) {
      const existing = getLocalSavedSearches();
      const filtered = existing.filter((s) => s.id !== id);
      setLocalSavedSearches(filtered);
      return true;
    }

    // Authenticated Supabase deletion
    const { error } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", id)
      .eq("user_id", resolvedUserId);

    if (error) {
      throw new Error(`Failed to delete saved search: ${error.message}`);
    }

    // Keep local cache in sync
    const existing = getLocalSavedSearches();
    setLocalSavedSearches(existing.filter((s) => s.id !== id));
    return true;
  },

  /**
   * Records usage timestamp when a user opens or restores a saved view.
   * Updates last_used_at without modifying criteria or filter settings.
   */
  async recordSavedSearchUsed(id: string, userId?: string | null): Promise<void> {
    if (!id || typeof id !== "string") return;

    const now = new Date().toISOString();
    const supabase = getBrowserSupabase();
    const resolvedUserId = await resolveAuthenticatedUserId(userId);

    // Guest / Offline mode
    if (!supabase || !resolvedUserId) {
      const existing = getLocalSavedSearches();
      const item = existing.find((s) => s.id === id);
      if (item) {
        item.lastUsedAt = now;
        setLocalSavedSearches(existing);
      }
      return;
    }

    // Authenticated Supabase timestamp update
    try {
      const { error } = await supabase
        .from("saved_searches")
        .update({ last_used_at: now })
        .eq("id", id)
        .eq("user_id", resolvedUserId);

      if (error) {
        console.warn("recordSavedSearchUsed remote error:", error);
      }
    } catch (err) {
      console.warn("recordSavedSearchUsed error:", err);
    }

    // Keep local cache in sync
    const existing = getLocalSavedSearches();
    const item = existing.find((s) => s.id === id);
    if (item) {
      item.lastUsedAt = now;
      setLocalSavedSearches(existing);
    }
  },

  /**
   * Directly read cached local saved searches.
   */
  getLocalSavedSearches(): SavedSearchItem[] {
    return getLocalSavedSearches();
  },

  /**
   * Directly replace cached local saved searches.
   */
  setLocalSavedSearches(items: SavedSearchItem[]): void {
    setLocalSavedSearches(items);
  },
};
