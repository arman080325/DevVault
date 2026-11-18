import { getBrowserSupabase } from "@/lib/supabase/client";
import { CollectionItem } from "@/data/figmaResources";

const LOCAL_COLLECTIONS_KEY = "devvault-local-collections";

export const collectionService = {
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

  async createCollection(
    userId: string | null,
    item: CollectionItem
  ): Promise<CollectionItem> {
    const supabase = getBrowserSupabase();

    if (supabase && userId) {
      try {
        await (supabase.from("collections") as any).upsert(
          {
            user_id: userId,
            name: item.name,
            description: item.note,
            cover_tone: item.tone,
          },
          { onConflict: "user_id,name" }
        );
      } catch (err) {
        console.warn("createCollection remote error:", err);
      }
    }

    try {
      const raw = localStorage.getItem(LOCAL_COLLECTIONS_KEY);
      const existing: CollectionItem[] = raw ? JSON.parse(raw) : [];
      const updated = [item, ...existing.filter((c) => c.name !== item.name)];
      localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(updated));
    } catch {}

    return item;
  },

  saveLocalCollections(collections: CollectionItem[]) {
    try {
      localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(collections));
    } catch {}
  },
};
