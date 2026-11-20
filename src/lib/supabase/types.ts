export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlatformEnum =
  | "GITHUB"
  | "YOUTUBE"
  | "INSTAGRAM"
  | "WEBSITE"
  | "DOCS"
  | "DESIGN"
  | "TOOL";

export type ResourceStatusEnum = "To explore" | "Exploring" | "Completed";

export type CoverTone = "rust" | "ink" | "sage" | "sand" | "paper";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          role_title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          role_title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          role_title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      resources: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          original_url: string | null;
          normalized_url: string | null;
          description: string | null;
          thumbnail_url: string | null;
          source_domain: string | null;
          platform: string;
          category: string;
          status: ResourceStatusEnum;
          personal_notes: string | null;
          read_time: string | null;
          author_name: string | null;
          is_pinned: boolean;
          is_favorite: boolean;
          progress: number;
          created_at: string;
          updated_at: string;
          explored_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          original_url?: string | null;
          normalized_url?: string | null;
          description?: string | null;
          thumbnail_url?: string | null;
          source_domain?: string | null;
          platform?: string;
          category?: string;
          status?: ResourceStatusEnum;
          personal_notes?: string | null;
          read_time?: string | null;
          author_name?: string | null;
          is_pinned?: boolean;
          is_favorite?: boolean;
          progress?: number;
          created_at?: string;
          updated_at?: string;
          explored_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          original_url?: string | null;
          normalized_url?: string | null;
          description?: string | null;
          thumbnail_url?: string | null;
          source_domain?: string | null;
          platform?: string;
          category?: string;
          status?: ResourceStatusEnum;
          personal_notes?: string | null;
          read_time?: string | null;
          author_name?: string | null;
          is_pinned?: boolean;
          is_favorite?: boolean;
          progress?: number;
          created_at?: string;
          updated_at?: string;
          explored_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "resources_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      collections: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          cover_tone: CoverTone;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          cover_tone?: CoverTone;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          cover_tone?: CoverTone;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      collection_resources: {
        Row: {
          id: string;
          collection_id: string;
          resource_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          resource_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          collection_id?: string;
          resource_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_resources_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_resources_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          }
        ];
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      resource_tags: {
        Row: {
          resource_id: string;
          tag_id: string;
        };
        Insert: {
          resource_id: string;
          tag_id: string;
        };
        Update: {
          resource_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resource_tags_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resource_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          }
        ];
      };
      activity_events: {
        Row: {
          id: string;
          user_id: string;
          resource_id: string | null;
          event_type: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          resource_id?: string | null;
          event_type: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          resource_id?: string | null;
          event_type?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_events_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          }
        ];
      };
      saved_searches: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          search_query: string | null;
          platform: string | null;
          category: string | null;
          status: string | null;
          collection: string | null;
          tags: string[];
          is_favorite: boolean | null;
          is_pinned: boolean | null;
          is_bookmarked: boolean | null;
          date_preset: string | null;
          date_from: string | null;
          date_to: string | null;
          sort_order: string;
          created_at: string;
          updated_at: string;
          last_used_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          search_query?: string | null;
          platform?: string | null;
          category?: string | null;
          status?: string | null;
          collection?: string | null;
          tags?: string[];
          is_favorite?: boolean | null;
          is_pinned?: boolean | null;
          is_bookmarked?: boolean | null;
          date_preset?: string | null;
          date_from?: string | null;
          date_to?: string | null;
          sort_order?: string;
          created_at?: string;
          updated_at?: string;
          last_used_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          search_query?: string | null;
          platform?: string | null;
          category?: string | null;
          status?: string | null;
          collection?: string | null;
          tags?: string[];
          is_favorite?: boolean | null;
          is_pinned?: boolean | null;
          is_bookmarked?: boolean | null;
          date_preset?: string | null;
          date_from?: string | null;
          date_to?: string | null;
          sort_order?: string;
          created_at?: string;
          updated_at?: string;
          last_used_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];
export type CollectionRow = Database["public"]["Tables"]["collections"]["Row"];
export type TagRow = Database["public"]["Tables"]["tags"]["Row"];
export type ActivityEventRow = Database["public"]["Tables"]["activity_events"]["Row"];
export type SavedSearchRow = Database["public"]["Tables"]["saved_searches"]["Row"];
export type SavedSearchInsert = Database["public"]["Tables"]["saved_searches"]["Insert"];
export type SavedSearchUpdate = Database["public"]["Tables"]["saved_searches"]["Update"];
