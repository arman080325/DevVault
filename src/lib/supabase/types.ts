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
      };
    };
  };
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];
export type CollectionRow = Database["public"]["Tables"]["collections"]["Row"];
export type TagRow = Database["public"]["Tables"]["tags"]["Row"];
export type ActivityEventRow = Database["public"]["Tables"]["activity_events"]["Row"];
