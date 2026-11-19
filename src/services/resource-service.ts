import { getBrowserSupabase } from "@/lib/supabase/client";
import { type ResourceRow } from "@/lib/supabase/types";
import { FigmaResource } from "@/data/figmaResources";
import { ResourceKind } from "@/components/resources/resource-art";
import {
  searchResources as searchMatcherResources,
  SearchMatchOptions,
  resolveDatePresetBoundaries,
} from "@/lib/search/search-matcher";

export interface SearchResourceCriteria {
  query?: string;
  platform?: string;
  category?: string;
  status?: string;
  collection?: string;
  tag?: string;
  tags?: string[];
  favorite?: boolean;
  pinned?: boolean;
  bookmarked?: boolean;
  dateFrom?: string | Date;
  dateTo?: string | Date;
  datePreset?: "all" | "today" | "7d" | "30d" | "year";
  signal?: AbortSignal;
}

const LOCAL_STORAGE_KEY = "devvault-local-resources";

export function normalizeUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    // Lowercase host and pathname, trim trailing slash
    let clean = (parsed.hostname + parsed.pathname).toLowerCase();
    if (clean.endsWith("/")) {
      clean = clean.slice(0, -1);
    }
    return clean;
  } catch {
    return rawUrl.trim().toLowerCase().replace(/\/$/, "");
  }
}

export function mapRowToFigmaResource(
  row: ResourceRow,
  tags: string[] = [],
  collectionName?: string
): FigmaResource {
  // Map platform to ResourceKind
  let kind: ResourceKind = "article";
  const p = (row.platform || "").toUpperCase();
  if (p === "GITHUB") kind = "github";
  else if (p === "YOUTUBE") kind = "video";
  else if (p === "INSTAGRAM") kind = "instagram";
  else if (p === "DOCS") kind = "docs";
  else if (p === "MOTION") kind = "motion";
  else if (p === "DESIGN" || p === "TOOL") kind = "article";

  // Deterministic numeric ID for frontend compatibility
  const numId = parseInt(row.id.replace(/-/g, "").slice(0, 8), 16) || Date.now();

  return {
    id: numId,
    remoteId: row.id,
    kind,
    source: row.platform || "Web",
    domain: row.source_domain || "web",
    title: row.title,
    description: row.description || "",
    category: row.category || "General",
    length: row.read_time || "5 min read",
    saved: new Date(row.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    status: row.status,
    progress: row.progress || 0,
    collection: collectionName,
    url: row.original_url || undefined,
    notes: row.personal_notes || undefined,
    tags: tags.length > 0 ? tags : [row.category || "General"],
    pinned: row.is_pinned,
    favorite: row.is_favorite,
    imageUrl: row.thumbnail_url || undefined,
    createdAt: row.created_at,
  };
}

export const resourceService = {
  // Check if resource already exists by URL
  async checkDuplicateUrl(
    userId: string,
    url?: string
  ): Promise<boolean> {
    const norm = normalizeUrl(url);
    if (!norm) return false;

    const supabase = getBrowserSupabase();
    if (!supabase) {
      // Local fallback check
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const list: FigmaResource[] = JSON.parse(raw);
          return list.some((r) => normalizeUrl(r.url) === norm);
        }
      } catch {}
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("resources")
        .select("id")
        .eq("user_id", userId)
        .eq("normalized_url", norm)
        .maybeSingle();

      if (error) return false;
      return Boolean(data);
    } catch {
      return false;
    }
  },

  // Fetch all resources with tags & collections for current user
  async fetchResources(userId?: string): Promise<FigmaResource[]> {
    const supabase = getBrowserSupabase();

    if (!supabase || !userId) {
      // Return local stored resources or fallback
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          return JSON.parse(raw);
        }
      } catch {}
      return [];
    }

    try {
      // Fetch resources
      const { data: rows, error } = await supabase
        .from("resources")
        .select(`
          *,
          resource_tags (
            tags ( name )
          ),
          collection_resources (
            collections ( name )
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!rows) return [];

      return rows.map((r: any) => {
        const tags = (r.resource_tags || [])
          .map((rt: any) => rt.tags?.name)
          .filter(Boolean);
        const colName = r.collection_resources?.[0]?.collections?.name;
        return mapRowToFigmaResource(r, tags, colName);
      });
    } catch (err) {
      console.warn("fetchResources error, falling back to local storage:", err);
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
      return [];
    }
  },

  // Local cache search fallback using normalized search-matcher
  searchLocalCache(criteria?: SearchResourceCriteria): FigmaResource[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const list: FigmaResource[] = raw ? JSON.parse(raw) : [];
      return searchMatcherResources(list, criteria?.query, {
        platform: criteria?.platform,
        status: criteria?.status,
        category: criteria?.category,
        collection: criteria?.collection,
        tag: criteria?.tag,
        tags: criteria?.tags,
        favorite: criteria?.favorite,
        pinned: criteria?.pinned,
        bookmarked: criteria?.bookmarked,
        dateFrom: criteria?.dateFrom,
        dateTo: criteria?.dateTo,
        datePreset: criteria?.datePreset,
      });
    } catch {
      return [];
    }
  },

  // Dedicated search service supporting Supabase RLS, AbortSignal, and local fallback
  async searchResources(
    userId?: string | null,
    criteria?: SearchResourceCriteria
  ): Promise<FigmaResource[]> {
    const supabase = getBrowserSupabase();

    // 1. Fallback immediately if unauthenticated or no Supabase client
    if (!supabase || !userId) {
      return this.searchLocalCache(criteria);
    }

    if (criteria?.signal?.aborted) {
      return [];
    }

    const cleanQ = (criteria?.query || "").trim();

    // Normalize tags
    const combinedTags: string[] = [];
    if (Array.isArray(criteria?.tags) && criteria.tags.length > 0) {
      combinedTags.push(...criteria.tags.filter(Boolean));
    }
    if (criteria?.tag && !combinedTags.includes(criteria.tag)) {
      combinedTags.push(criteria.tag);
    }

    // Resolve date preset boundaries
    const dateBoundaries = resolveDatePresetBoundaries(criteria?.datePreset);
    const resolvedFrom = criteria?.dateFrom
      ? new Date(criteria.dateFrom).toISOString()
      : dateBoundaries.dateFrom
      ? dateBoundaries.dateFrom.toISOString()
      : null;
    const resolvedTo = criteria?.dateTo
      ? new Date(criteria.dateTo).toISOString()
      : dateBoundaries.dateTo
      ? dateBoundaries.dateTo.toISOString()
      : null;

    // If query is empty and no specific filters are active, use fetchResources
    const hasActiveFilters = Boolean(
      cleanQ ||
      (criteria?.platform && criteria.platform !== "All") ||
      (criteria?.category && criteria.category !== "All") ||
      (criteria?.status && criteria.status !== "All") ||
      (criteria?.collection && criteria.collection !== "All") ||
      combinedTags.length > 0 ||
      typeof criteria?.favorite === "boolean" ||
      typeof criteria?.pinned === "boolean" ||
      typeof criteria?.bookmarked === "boolean" ||
      resolvedFrom ||
      resolvedTo
    );

    if (!hasActiveFilters) {
      return this.fetchResources(userId);
    }

    try {
      // 2. Try the PostgreSQL search RPC function if available (from 008_advanced_filtering.sql / 007_search_indexes.sql)
      try {
        const rpcParams: Record<string, any> = {
          search_query: cleanQ || null,
          filter_platform:
            criteria?.platform && criteria.platform !== "All"
              ? criteria.platform
              : null,
          filter_category:
            criteria?.category && criteria.category !== "All"
              ? criteria.category
              : null,
          filter_status:
            criteria?.status && criteria.status !== "All"
              ? criteria.status
              : null,
          filter_collection:
            criteria?.collection && criteria.collection !== "All"
              ? criteria.collection
              : null,
          filter_tags: combinedTags.length > 0 ? combinedTags : null,
          filter_favorite:
            typeof criteria?.favorite === "boolean" ? criteria.favorite : null,
          filter_pinned:
            typeof criteria?.pinned === "boolean" ? criteria.pinned : null,
          filter_date_from: resolvedFrom,
          filter_date_to: resolvedTo,
          filter_bookmarked:
            typeof criteria?.bookmarked === "boolean" ? criteria.bookmarked : null,
        };

        let rpcBuilder = (supabase.rpc as any)("search_user_resources", rpcParams);

        if (criteria?.signal && typeof (rpcBuilder as any).abortSignal === "function") {
          rpcBuilder = (rpcBuilder as any).abortSignal(criteria.signal);
        }

        const { data: rpcRows, error: rpcError } = await rpcBuilder;

        if (!rpcError && Array.isArray(rpcRows)) {
          const resourceIds = rpcRows.map((r: any) => r.id);
          if (resourceIds.length === 0) return [];

          let junctionQuery = supabase
            .from("resources")
            .select(`
              id,
              resource_tags ( tags ( name ) ),
              collection_resources ( collections ( name ) )
            `)
            .in("id", resourceIds)
            .eq("user_id", userId);

          if (criteria?.signal && typeof (junctionQuery as any).abortSignal === "function") {
            junctionQuery = (junctionQuery as any).abortSignal(criteria.signal);
          }

          const { data: junctionRows } = await junctionQuery;
          const junctionMap = new Map<string, { tags: string[]; colName?: string }>();
          if (junctionRows) {
            for (const jr of junctionRows as any[]) {
              const tags = (jr.resource_tags || [])
                .map((t: any) => t.tags?.name)
                .filter(Boolean);
              const colName = jr.collection_resources?.[0]?.collections?.name;
              junctionMap.set(jr.id, { tags, colName });
            }
          }

          let mapped = rpcRows.map((r: any) => {
            const j = junctionMap.get(r.id);
            return mapRowToFigmaResource(r, j?.tags || [], j?.colName);
          });

          // In case the deployed RPC was Migration 007 without advanced filters,
          // apply defensive client-side matcher pass if any advanced filter was requested
          if (
            criteria?.collection ||
            combinedTags.length > 0 ||
            typeof criteria?.favorite === "boolean" ||
            typeof criteria?.pinned === "boolean" ||
            typeof criteria?.bookmarked === "boolean" ||
            resolvedFrom ||
            resolvedTo
          ) {
            mapped = searchMatcherResources(mapped, cleanQ, {
              platform: criteria?.platform,
              status: criteria?.status,
              category: criteria?.category,
              collection: criteria?.collection,
              tag: criteria?.tag,
              tags: combinedTags,
              favorite: criteria?.favorite,
              pinned: criteria?.pinned,
              bookmarked: criteria?.bookmarked,
              dateFrom: resolvedFrom || undefined,
              dateTo: resolvedTo || undefined,
            });
          }

          return mapped;
        }
      } catch {
        // Fallback to PostgREST query if RPC function is not installed or fails
      }

      if (criteria?.signal?.aborted) return [];

      // 3. Fallback PostgREST query with RLS enforcement
      let queryBuilder = supabase
        .from("resources")
        .select(`
          *,
          resource_tags (
            tags ( name )
          ),
          collection_resources (
            collections ( name )
          )
        `)
        .eq("user_id", userId);

      if (criteria?.signal && typeof (queryBuilder as any).abortSignal === "function") {
        queryBuilder = (queryBuilder as any).abortSignal(criteria.signal);
      }

      if (criteria?.platform && criteria.platform !== "All") {
        queryBuilder = queryBuilder.ilike("platform", criteria.platform);
      }
      if (criteria?.category && criteria.category !== "All") {
        queryBuilder = queryBuilder.ilike("category", criteria.category);
      }
      if (criteria?.status && criteria.status !== "All") {
        queryBuilder = queryBuilder.ilike("status", criteria.status);
      }
      if (typeof criteria?.favorite === "boolean") {
        queryBuilder = queryBuilder.eq("is_favorite", criteria.favorite);
      }
      if (typeof criteria?.pinned === "boolean") {
        queryBuilder = queryBuilder.eq("is_pinned", criteria.pinned);
      }
      if (criteria?.bookmarked === true) {
        queryBuilder = queryBuilder.or("is_favorite.eq.true,is_pinned.eq.true");
      }
      if (resolvedFrom) {
        queryBuilder = queryBuilder.gte("created_at", resolvedFrom);
      }
      if (resolvedTo) {
        queryBuilder = queryBuilder.lte("created_at", resolvedTo);
      }

      if (cleanQ) {
        const sanitized = cleanQ.replace(/[%_,]/g, " ").trim();
        if (sanitized) {
          queryBuilder = queryBuilder.or(
            `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%,personal_notes.ilike.%${sanitized}%,original_url.ilike.%${sanitized}%,source_domain.ilike.%${sanitized}%`
          );
        }
      }

      const { data: rows, error } = await queryBuilder.order("created_at", {
        ascending: false,
      });

      if (error) {
        if (criteria?.signal?.aborted) return [];
        throw error;
      }

      let results: FigmaResource[] = (rows || []).map((r: any) => {
        const tags = (r.resource_tags || [])
          .map((rt: any) => rt.tags?.name)
          .filter(Boolean);
        const colName = r.collection_resources?.[0]?.collections?.name;
        return mapRowToFigmaResource(r, tags, colName);
      });

      // Apply client-side searchMatcherResources for high-precision multi-tag AND, collections, and relevance
      results = searchMatcherResources(results, cleanQ, {
        platform: criteria?.platform,
        status: criteria?.status,
        category: criteria?.category,
        collection: criteria?.collection,
        tag: criteria?.tag,
        tags: combinedTags,
        favorite: criteria?.favorite,
        pinned: criteria?.pinned,
        bookmarked: criteria?.bookmarked,
        dateFrom: resolvedFrom || undefined,
        dateTo: resolvedTo || undefined,
      });

      return results;
    } catch (err: any) {
      if (criteria?.signal?.aborted || err?.name === "AbortError") {
        return [];
      }
      console.warn("searchResources error, falling back to local storage:", err);
      return this.searchLocalCache(criteria);
    }
  },

  // Create a new resource
  async createResource(
    userId: string | null,
    resource: Partial<FigmaResource>
  ): Promise<FigmaResource> {
    const norm = normalizeUrl(resource.url);

    // Default object
    const created: FigmaResource = {
      id: resource.id || Date.now(),
      kind: resource.kind || "article",
      source: resource.source || "Web",
      domain: resource.domain || "example.com",
      title: resource.title || "Untitled resource",
      description: resource.description || "A captured resource.",
      category: resource.category || "General",
      length: resource.length || "5 min read",
      saved: "Today",
      status: resource.status || "To explore",
      progress: resource.progress || 0,
      collection: resource.collection,
      url: resource.url,
      notes: resource.notes,
      tags: resource.tags || [resource.category || "General"],
      pinned: resource.pinned || false,
      favorite: resource.favorite || false,
      imageUrl: resource.imageUrl,
    };

    const supabase = getBrowserSupabase();

    if (supabase && userId) {
      try {
        const { data: inserted, error } = await (supabase.from("resources") as any)
          .insert({
            user_id: userId,
            title: created.title,
            original_url: created.url || null,
            normalized_url: norm,
            description: created.description || null,
            thumbnail_url: created.imageUrl || null,
            source_domain: created.domain || null,
            platform: created.source || "WEBSITE",
            category: created.category || "General",
            status: created.status,
            personal_notes: created.notes || null,
            read_time: created.length || null,
            is_pinned: created.pinned || false,
            is_favorite: created.favorite || false,
            progress: created.progress || 0,
          })
          .select()
          .single();

        if (error) {
          console.warn("Error inserting resource into Supabase:", error);
          throw error;
        } else if (inserted) {
          created.remoteId = inserted.id;

          // Log Activity Event: CAPTURED
          try {
            await (supabase.from("activity_events") as any).insert({
              user_id: userId,
              resource_id: inserted.id,
              event_type: "CAPTURED",
              metadata: { title: created.title, platform: created.source },
            });
          } catch {}

          // Insert tags
          if (created.tags && created.tags.length > 0) {
            for (const tagName of created.tags) {
              try {
                const { data: tagRow } = await (supabase.from("tags") as any)
                  .upsert({ user_id: userId, name: tagName }, { onConflict: "user_id,name" })
                  .select("id")
                  .single();

                if (tagRow) {
                  await (supabase.from("resource_tags") as any).insert({
                    resource_id: inserted.id,
                    tag_id: tagRow.id,
                  });
                }
              } catch {}
            }
          }

          // Link collection if specified
          if (created.collection) {
            try {
              const { data: colRow } = await (supabase.from("collections") as any)
                .select("id")
                .eq("user_id", userId)
                .eq("name", created.collection)
                .maybeSingle();

              if (colRow) {
                await (supabase.from("collection_resources") as any).insert({
                  collection_id: colRow.id,
                  resource_id: inserted.id,
                });
              }
            } catch {}
          }
        }
      } catch (err) {
        console.warn("createResource remote error:", err);
      }
    }

    // Update local cache if not authenticated or as an offline fallback
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const existing: FigmaResource[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([created, ...existing]));
    } catch {}

    return created;
  },

  // Update resource status, notes, pinned, favorite, title, description, category
  async updateResource(
    userId: string | null,
    id: number,
    updates: Partial<FigmaResource>,
    remoteId?: string
  ): Promise<void> {
    const supabase = getBrowserSupabase();

    if (supabase && userId) {
      try {
        const updatePayload: any = {};
        if (updates.title !== undefined) updatePayload.title = updates.title;
        if (updates.description !== undefined) updatePayload.description = updates.description;
        if (updates.category !== undefined) updatePayload.category = updates.category;
        if (updates.status !== undefined) updatePayload.status = updates.status;
        if (updates.progress !== undefined) updatePayload.progress = updates.progress;
        if (updates.notes !== undefined) updatePayload.personal_notes = updates.notes;
        if (updates.pinned !== undefined) updatePayload.is_pinned = updates.pinned;
        if (updates.favorite !== undefined) updatePayload.is_favorite = updates.favorite;
        if (updates.length !== undefined) updatePayload.read_time = updates.length;
        if (updates.url !== undefined) {
          updatePayload.original_url = updates.url;
          updatePayload.normalized_url = normalizeUrl(updates.url);
        }
        if (updates.status === "Completed") {
          updatePayload.explored_at = new Date().toISOString();
        }

        let query = supabase.from("resources").update(updatePayload).eq("user_id", userId);
        if (remoteId) {
          query = query.eq("id", remoteId);
        } else if (updates.url) {
          const norm = normalizeUrl(updates.url);
          if (norm) query = query.eq("normalized_url", norm);
        }

        const { error } = await query;
        if (error) {
          console.warn("updateResource query error:", error);
          throw error;
        }

        // Log Activity Event for specific mutations
        if (updates.status === "Completed") {
          await (supabase.from("activity_events") as any).insert({
            user_id: userId,
            resource_id: remoteId || null,
            event_type: "COMPLETED",
            metadata: { title: updates.title, id },
          });
        } else if (updates.pinned !== undefined) {
          await (supabase.from("activity_events") as any).insert({
            user_id: userId,
            resource_id: remoteId || null,
            event_type: updates.pinned ? "PINNED" : "UNPINNED",
            metadata: { title: updates.title, id },
          });
        } else {
          await (supabase.from("activity_events") as any).insert({
            user_id: userId,
            resource_id: remoteId || null,
            event_type: "UPDATED",
            metadata: { title: updates.title, id },
          });
        }
      } catch (err) {
        console.warn("updateResource remote error:", err);
      }
    }

    // Sync to local cache
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const list: FigmaResource[] = JSON.parse(raw);
        const updated = list.map((item) =>
          item.id === id || (remoteId && item.remoteId === remoteId)
            ? { ...item, ...updates }
            : item
        );
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {}
  },

  // Delete resource
  async deleteResource(
    userId: string | null,
    id: number,
    url?: string,
    remoteId?: string
  ): Promise<void> {
    const supabase = getBrowserSupabase();
    if (supabase && userId) {
      try {
        let query = supabase.from("resources").delete().eq("user_id", userId);
        if (remoteId) {
          query = query.eq("id", remoteId);
        } else if (url) {
          const norm = normalizeUrl(url);
          if (norm) query = query.eq("normalized_url", norm);
        }

        const { error } = await query;
        if (error) throw error;
      } catch (err) {
        console.warn("deleteResource remote error:", err);
      }
    }

    // Remove from local cache
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const list: FigmaResource[] = JSON.parse(raw);
        const filtered = list.filter((item) =>
          remoteId ? item.remoteId !== remoteId : item.id !== id
        );
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch {}
  },

  // Save full resource collection to local cache (for initial hydration)
  saveLocalCache(resources: FigmaResource[]) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(resources));
    } catch {}
  },
};
