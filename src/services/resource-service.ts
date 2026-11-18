import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { type ResourceRow } from "@/lib/supabase/types";
import { FigmaResource } from "@/data/figmaResources";
import { ResourceKind } from "@/components/resources/resource-art";

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
  // Numeric ID derived from row.id hash if needed, or date timestamp
  const numId = parseInt(row.id.replace(/-/g, "").slice(0, 8), 16) || Date.now();

  return {
    id: numId,
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
        } else if (inserted) {
          // Log Activity Event
          await (supabase.from("activity_events") as any).insert({
            user_id: userId,
            resource_id: inserted.id,
            event_type: "CAPTURED",
            metadata: { title: created.title, platform: created.source },
          });

          // Insert tags
          if (created.tags && created.tags.length > 0) {
            for (const tagName of created.tags) {
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
            }
          }
        }
      } catch (err) {
        console.warn("createResource remote error:", err);
      }
    }

    // Always update local cache for smooth instant UI and offline safety
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const existing: FigmaResource[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([created, ...existing]));
    } catch {}

    return created;
  },

  // Update resource status, notes, pinned, favorite
  async updateResource(
    userId: string | null,
    id: number,
    updates: Partial<FigmaResource>
  ): Promise<void> {
    const supabase = getBrowserSupabase();

    if (supabase && userId && updates.url) {
      const norm = normalizeUrl(updates.url);
      if (norm) {
        try {
          const updatePayload: any = {};
          if (updates.status !== undefined) updatePayload.status = updates.status;
          if (updates.progress !== undefined) updatePayload.progress = updates.progress;
          if (updates.notes !== undefined) updatePayload.personal_notes = updates.notes;
          if (updates.pinned !== undefined) updatePayload.is_pinned = updates.pinned;
          if (updates.favorite !== undefined) updatePayload.is_favorite = updates.favorite;
          if (updates.status === "Completed") updatePayload.explored_at = new Date().toISOString();

          await supabase
            .from("resources")
            .update(updatePayload)
            .eq("user_id", userId)
            .eq("normalized_url", norm);
        } catch (err) {
          console.warn("updateResource remote error:", err);
        }
      }
    }

    // Sync to local cache
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const list: FigmaResource[] = JSON.parse(raw);
        const updated = list.map((item) => (item.id === id ? { ...item, ...updates } : item));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {}
  },

  // Delete resource
  async deleteResource(
    userId: string | null,
    id: number,
    url?: string
  ): Promise<void> {
    const supabase = getBrowserSupabase();
    if (supabase && userId && url) {
      const norm = normalizeUrl(url);
      if (norm) {
        try {
          await supabase
            .from("resources")
            .delete()
            .eq("user_id", userId)
            .eq("normalized_url", norm);
        } catch (err) {
          console.warn("deleteResource remote error:", err);
        }
      }
    }

    // Remove from local cache
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const list: FigmaResource[] = JSON.parse(raw);
        const filtered = list.filter((item) => item.id !== id);
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
