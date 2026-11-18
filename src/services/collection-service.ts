import { getBrowserSupabase } from "@/lib/supabase/client";
import { CollectionItem, FigmaResource } from "@/data/figmaResources";
import { mapRowToFigmaResource } from "./resource-service";

const LOCAL_COLLECTIONS_KEY = "devvault-local-collections";

export const collectionService = {
  // Fetch all collections with accurate counts derived from collection_resources
  async fetchCollections(userId?: string): Promise<CollectionItem[]> {
    const supabase = getBrowserSupabase();

    if (!supabase || !userId) {
      try {
        const raw = localStorage.getItem(LOCAL_COLLECTIONS_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("collections")
        .select(`
          id,
          name,
          description,
          cover_tone,
          collection_resources ( count )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!data) return [];

      return data.map((c: any) => ({
        id: c.id,
        name: c.name,
        note: c.description || "",
        tone: c.cover_tone || "rust",
        count: c.collection_resources?.[0]?.count || 0,
      }));
    } catch (err) {
      console.warn("fetchCollections remote error:", err);
      try {
        const raw = localStorage.getItem(LOCAL_COLLECTIONS_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
      return [];
    }
  },

  // Create a new collection
  async createCollection(
    userId: string | null,
    item: CollectionItem
  ): Promise<CollectionItem> {
    const supabase = getBrowserSupabase();
    let createdItem: CollectionItem = { ...item };

    if (supabase && userId) {
      try {
        const { data, error } = await (supabase.from("collections") as any)
          .upsert(
            {
              user_id: userId,
              name: item.name,
              description: item.note,
              cover_tone: item.tone,
            },
            { onConflict: "user_id,name" }
          )
          .select("id, name, description, cover_tone")
          .single();

        if (error) throw error;
        if (data) {
          createdItem.id = data.id;

          // Log Activity: COLLECTION_CREATED
          try {
            await (supabase.from("activity_events") as any).insert({
              user_id: userId,
              event_type: "COLLECTION_CREATED",
              metadata: { name: item.name },
            });
          } catch {}
        }
      } catch (err) {
        console.warn("createCollection remote error:", err);
      }
    }

    try {
      const raw = localStorage.getItem(LOCAL_COLLECTIONS_KEY);
      const existing: CollectionItem[] = raw ? JSON.parse(raw) : [];
      const updated = [createdItem, ...existing.filter((c) => c.name !== item.name)];
      localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(updated));
    } catch {}

    return createdItem;
  },

  // Rename a collection
  async renameCollection(
    userId: string | null,
    oldName: string,
    newName: string
  ): Promise<void> {
    const supabase = getBrowserSupabase();

    if (supabase && userId) {
      try {
        const { error } = await (supabase.from("collections") as any)
          .update({ name: newName })
          .eq("user_id", userId)
          .eq("name", oldName);
        if (error) throw error;
      } catch (err) {
        console.warn("renameCollection remote error:", err);
      }
    }

    try {
      const raw = localStorage.getItem(LOCAL_COLLECTIONS_KEY);
      if (raw) {
        const list: CollectionItem[] = JSON.parse(raw);
        const updated = list.map((c) => (c.name === oldName ? { ...c, name: newName } : c));
        localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(updated));
      }
    } catch {}
  },

  // Update collection note and tone
  async updateCollection(
    userId: string | null,
    name: string,
    updates: { note?: string; tone?: CollectionItem["tone"] }
  ): Promise<void> {
    const supabase = getBrowserSupabase();

    if (supabase && userId) {
      try {
        const payload: any = {};
        if (updates.note !== undefined) payload.description = updates.note;
        if (updates.tone !== undefined) payload.cover_tone = updates.tone;

        const { error } = await (supabase.from("collections") as any)
          .update(payload)
          .eq("user_id", userId)
          .eq("name", name);
        if (error) throw error;
      } catch (err) {
        console.warn("updateCollection remote error:", err);
      }
    }

    try {
      const raw = localStorage.getItem(LOCAL_COLLECTIONS_KEY);
      if (raw) {
        const list: CollectionItem[] = JSON.parse(raw);
        const updated = list.map((c) =>
          c.name === name ? { ...c, ...updates } : c
        );
        localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(updated));
      }
    } catch {}
  },

  // Delete a collection
  async deleteCollection(
    userId: string | null,
    name: string,
    collectionId?: string
  ): Promise<void> {
    const supabase = getBrowserSupabase();

    if (supabase && userId) {
      try {
        let query = (supabase.from("collections") as any).delete().eq("user_id", userId);
        if (collectionId) {
          query = query.eq("id", collectionId);
        } else {
          query = query.eq("name", name);
        }
        const { error } = await query;
        if (error) throw error;
      } catch (err) {
        console.warn("deleteCollection remote error:", err);
      }
    }

    try {
      const raw = localStorage.getItem(LOCAL_COLLECTIONS_KEY);
      if (raw) {
        const list: CollectionItem[] = JSON.parse(raw);
        const filtered = list.filter((c) =>
          collectionId ? c.id !== collectionId : c.name !== name
        );
        localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(filtered));
      }
    } catch {}
  },

  // Add resource to collection
  async addResourceToCollection(
    userId: string | null,
    collectionName: string,
    resourceRemoteId: string
  ): Promise<void> {
    const supabase = getBrowserSupabase();
    if (!supabase || !userId) return;

    try {
      // Find collection id
      const { data: col } = await (supabase.from("collections") as any)
        .select("id")
        .eq("user_id", userId)
        .eq("name", collectionName)
        .single();

      if (!col) return;

      await (supabase.from("collection_resources") as any).insert({
        collection_id: col.id,
        resource_id: resourceRemoteId,
      });

      // Log activity
      await (supabase.from("activity_events") as any).insert({
        user_id: userId,
        resource_id: resourceRemoteId,
        event_type: "COLLECTION_ADDED",
        metadata: { collection: collectionName },
      });
    } catch (err) {
      console.warn("addResourceToCollection error:", err);
    }
  },

  // Remove resource from collection
  async removeResourceFromCollection(
    userId: string | null,
    collectionName: string,
    resourceRemoteId: string
  ): Promise<void> {
    const supabase = getBrowserSupabase();
    if (!supabase || !userId) return;

    try {
      const { data: col } = await (supabase.from("collections") as any)
        .select("id")
        .eq("user_id", userId)
        .eq("name", collectionName)
        .single();

      if (!col) return;

      await (supabase.from("collection_resources") as any)
        .delete()
        .eq("collection_id", col.id)
        .eq("resource_id", resourceRemoteId);
    } catch (err) {
      console.warn("removeResourceFromCollection error:", err);
    }
  },

  // Fetch collection contents (all resources inside a collection)
  async fetchCollectionContents(
    userId: string | null,
    collectionName: string
  ): Promise<FigmaResource[]> {
    const supabase = getBrowserSupabase();
    if (!supabase || !userId) return [];

    try {
      const { data, error } = await supabase
        .from("collections")
        .select(`
          id,
          name,
          collection_resources (
            resources (
              *,
              resource_tags (
                tags ( name )
              )
            )
          )
        `)
        .eq("user_id", userId)
        .eq("name", collectionName)
        .single();

      if (error || !data) return [];

      const collectionResources: any[] = data.collection_resources || [];
      return collectionResources
        .map((cr: any) => {
          const r = cr.resources;
          if (!r) return null;
          const tags = (r.resource_tags || [])
            .map((rt: any) => rt.tags?.name)
            .filter(Boolean);
          return mapRowToFigmaResource(r, tags, collectionName);
        })
        .filter(Boolean) as FigmaResource[];
    } catch (err) {
      console.warn("fetchCollectionContents error:", err);
      return [];
    }
  },

  // Save collections to local cache
  saveLocalCollections(collections: CollectionItem[]) {
    try {
      localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(collections));
    } catch {}
  },
};
