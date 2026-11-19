import { getBrowserSupabase } from "@/lib/supabase/client";
import { normalizeUrl } from "./resource-service";
import { FigmaResource, CollectionItem } from "@/data/figmaResources";

export interface MigrationResult {
  totalDetected: number;
  migratedCount: number;
  skippedDuplicates: number;
  errors: string[];
}

export const migrationService = {
  // Detect whether there are local resources that haven't been migrated yet
  detectLocalData(): {
    resources: FigmaResource[];
    collections: CollectionItem[];
    hasData: boolean;
  } {
    if (typeof window === "undefined") {
      return { resources: [], collections: [], hasData: false };
    }

    try {
      const rawRes = localStorage.getItem("devvault-local-resources");
      const rawCols = localStorage.getItem("devvault-local-collections");
      const alreadyMigrated = localStorage.getItem("devvault-migrated-to-cloud");

      const resources: FigmaResource[] = rawRes ? JSON.parse(rawRes) : [];
      const collections: CollectionItem[] = rawCols ? JSON.parse(rawCols) : [];

      return {
        resources,
        collections,
        hasData: !alreadyMigrated && resources.length > 0,
      };
    } catch {
      return { resources: [], collections: [], hasData: false };
    }
  },

  // Perform migration for an authenticated user
  async migrateLocalToCloud(
    userId: string,
    resources: FigmaResource[],
    collections: CollectionItem[],
    onProgress?: (current: number, total: number) => void
  ): Promise<MigrationResult> {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      throw new Error("Supabase is not configured. Cannot perform cloud migration.");
    }

    const result: MigrationResult = {
      totalDetected: resources.length,
      migratedCount: 0,
      skippedDuplicates: 0,
      errors: [],
    };

    // 1. Create safety backup before touching anything
    try {
      const backupKey = `devvault-backup-${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify({ resources, collections }));
    } catch (err) {
      console.warn("Could not save backup:", err);
    }

    // 2. Migrate collections first
    for (const col of collections) {
      try {
        await (supabase.from("collections") as any).upsert(
          {
            user_id: userId,
            name: col.name,
            description: col.note,
            cover_tone: col.tone,
          },
          { onConflict: "user_id,name" }
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Collection ${col.name}: ${msg}`);
      }
    }

    // 3. Migrate resources with duplicate detection
    for (let i = 0; i < resources.length; i++) {
      const item = resources[i];
      onProgress?.(i + 1, resources.length);

      const norm = normalizeUrl(item.url);

      // Check for duplicate in DB
      if (norm) {
        const { data: existing } = await (supabase.from("resources") as any)
          .select("id")
          .eq("user_id", userId)
          .eq("normalized_url", norm)
          .maybeSingle();

        if (existing) {
          result.skippedDuplicates++;
          continue;
        }
      }

      try {
        const { data: inserted, error } = await (supabase.from("resources") as any)
          .insert({
            user_id: userId,
            title: item.title,
            original_url: item.url || null,
            normalized_url: norm,
            description: item.description || null,
            thumbnail_url: item.imageUrl || null,
            source_domain: item.domain || null,
            platform: item.source || "WEBSITE",
            category: item.category || "General",
            status: item.status,
            personal_notes: item.notes || null,
            read_time: item.length || null,
            is_pinned: item.pinned || false,
            is_favorite: item.favorite || false,
            progress: item.progress || 0,
          })
          .select()
          .single();

        if (error) throw error;

        // Associate tags
        if (inserted && item.tags && item.tags.length > 0) {
          for (const tagName of item.tags) {
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

        // Associate collection if specified
        if (inserted && item.collection) {
          const { data: colRow } = await (supabase.from("collections") as any)
            .select("id")
            .eq("user_id", userId)
            .eq("name", item.collection)
            .maybeSingle();

          if (colRow) {
            await (supabase.from("collection_resources") as any).insert({
              collection_id: colRow.id,
              resource_id: inserted.id,
            });
          }
        }

        result.migratedCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Resource "${item.title}": ${msg}`);
      }
    }

    // Mark migration complete in localStorage only after verification
    try {
      localStorage.setItem("devvault-migrated-to-cloud", "true");
    } catch {}

    return result;
  },
};
