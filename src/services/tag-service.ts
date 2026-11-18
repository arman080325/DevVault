import { getBrowserSupabase } from "@/lib/supabase/client";
import { FigmaResource } from "@/data/figmaResources";
import { mapRowToFigmaResource } from "./resource-service";

export const tagService = {
  // Get all unique tags for user
  async getTags(userId?: string): Promise<string[]> {
    const supabase = getBrowserSupabase();
    if (!supabase || !userId) return [];

    try {
      const { data, error } = await supabase
        .from("tags")
        .select("name")
        .eq("user_id", userId)
        .order("name", { ascending: true });

      if (error || !data) return [];
      return data.map((t: any) => t.name);
    } catch (err) {
      console.warn("getTags error:", err);
      return [];
    }
  },

  // Create or reuse tag
  async createTag(userId: string, name: string): Promise<string | null> {
    const supabase = getBrowserSupabase();
    if (!supabase || !userId || !name.trim()) return null;

    try {
      const cleanName = name.trim();
      const { data, error } = await (supabase.from("tags") as any)
        .upsert({ user_id: userId, name: cleanName }, { onConflict: "user_id,name" })
        .select("id")
        .single();

      if (error) throw error;
      return data ? data.id : null;
    } catch (err) {
      console.warn("createTag error:", err);
      return null;
    }
  },

  // Assign tags to a resource
  async assignTagsToResource(
    userId: string,
    resourceRemoteId: string,
    tagNames: string[]
  ): Promise<void> {
    const supabase = getBrowserSupabase();
    if (!supabase || !userId || !resourceRemoteId || tagNames.length === 0) return;

    for (const name of tagNames) {
      try {
        const cleanName = name.trim();
        if (!cleanName) continue;

        // Upsert tag
        const { data: tagRow } = await (supabase.from("tags") as any)
          .upsert({ user_id: userId, name: cleanName }, { onConflict: "user_id,name" })
          .select("id")
          .single();

        if (tagRow) {
          // Link in resource_tags
          await (supabase.from("resource_tags") as any).upsert(
            {
              resource_id: resourceRemoteId,
              tag_id: tagRow.id,
            },
            { onConflict: "resource_id,tag_id" }
          );
        }
      } catch (err) {
        console.warn(`assignTagsToResource error for "${name}":`, err);
      }
    }
  },

  // Remove a tag from a resource
  async removeTagFromResource(
    userId: string,
    resourceRemoteId: string,
    tagName: string
  ): Promise<void> {
    const supabase = getBrowserSupabase();
    if (!supabase || !userId || !resourceRemoteId) return;

    try {
      const { data: tagRow } = await (supabase.from("tags") as any)
        .select("id")
        .eq("user_id", userId)
        .eq("name", tagName)
        .maybeSingle();

      if (tagRow) {
        await (supabase.from("resource_tags") as any)
          .delete()
          .eq("resource_id", resourceRemoteId)
          .eq("tag_id", tagRow.id);
      }
    } catch (err) {
      console.warn("removeTagFromResource error:", err);
    }
  },

  // Search resources by tag name
  async searchByTag(userId: string, tagName: string): Promise<FigmaResource[]> {
    const supabase = getBrowserSupabase();
    if (!supabase || !userId) return [];

    try {
      const { data, error } = await supabase
        .from("tags")
        .select(`
          id,
          name,
          resource_tags (
            resources (
              *,
              resource_tags (
                tags ( name )
              ),
              collection_resources (
                collections ( name )
              )
            )
          )
        `)
        .eq("user_id", userId)
        .eq("name", tagName)
        .single();

      if (error || !data) return [];

      const list: any[] = data.resource_tags || [];
      return list
        .map((item: any) => {
          const r = item.resources;
          if (!r) return null;
          const tags = (r.resource_tags || [])
            .map((rt: any) => rt.tags?.name)
            .filter(Boolean);
          const colName = r.collection_resources?.[0]?.collections?.name;
          return mapRowToFigmaResource(r, tags, colName);
        })
        .filter(Boolean) as FigmaResource[];
    } catch (err) {
      console.warn("searchByTag error:", err);
      return [];
    }
  },
};
