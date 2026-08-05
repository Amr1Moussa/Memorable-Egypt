/**
 * Supabase generated database types.
 *
 * Hand-authored to mirror `supabase/migrations/*.sql` exactly. Supabase's
 * `gen types typescript` produces this shape automatically; we maintain it
 * here so the app is fully typed even before a live database is connected.
 *
 * Convention (matches Supabase's generated output):
 *   - Row:     the full row shape (for SELECT results)
 *   - Insert:  columns you can set on INSERT (PKs optional, defaults optional)
 *   - Update:  Partial<Row> — any subset of columns for UPDATE
 *
 * Regenerate from a live DB after schema changes:
 *   pnpm supabase gen types typescript \
 *     --project-id <ref> > src/lib/supabase/types.ts
 *
 * Source: docs 07 (Database Design), supabase/migrations/.
 */

// ---- Enums (mirror src/types/domain.ts + migration 0001) ----
export type UserRole = "user" | "admin";
export type Visibility = "public" | "private" | "unlisted";
export type PinType = "standard" | "legacy";
export type PaymentStatus =
  | "draft"
  | "awaiting_payment"
  | "receipt_uploaded"
  | "pending_verification"
  | "approved"
  | "rejected"
  | "published"
  | "failed";
export type PaymentMethod = "instapay" | "bank_transfer";
export type ContentStatus = "active" | "hidden" | "deleted";
export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "violence"
  | "adult_content"
  | "misinformation"
  | "copyright"
  | "fake_location"
  | "other";
export type ReportStatus = "pending" | "approved" | "rejected";
export type ReactionType = "love" | "nostalgic" | "emotional" | "inspiring";
export type NotificationType =
  | "comment"
  | "reaction"
  | "payment_approved"
  | "payment_rejected"
  | "featured"
  | "genesis"
  | "system";

export type SettingType = "string" | "number" | "boolean" | "json";

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          home_city: string | null;
          role: UserRole;
          genesis_claimed: boolean;
          pending_deletion: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          home_city?: string | null;
          role?: UserRole;
          genesis_claimed?: boolean;
          pending_deletion?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          home_city?: string | null;
          role?: UserRole;
          genesis_claimed?: boolean;
          pending_deletion?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      locations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          governorate: string | null;
          city: string | null;
          address: string | null;
          place_type: string | null;
          tier: number;
          latitude: number;
          longitude: number;
          coordinates: string;
          description: string | null;
          status: "pending" | "active" | "disabled";
          memory_count: number;
          legacy_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string;
          governorate?: string | null;
          city?: string | null;
          address?: string | null;
          place_type?: string | null;
          tier: number;
          latitude: number;
          longitude: number;
          description?: string | null;
          status?: "pending" | "active" | "disabled";
          memory_count?: number;
          legacy_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          governorate?: string | null;
          city?: string | null;
          address?: string | null;
          place_type?: string | null;
          tier?: number;
          latitude?: number;
          longitude?: number;
          description?: string | null;
          status?: "pending" | "active" | "disabled";
          memory_count?: number;
          legacy_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string;
          icon?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          icon?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      tags: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
        Relationships: [];
      };

      memories: {
        Row: {
          id: string;
          user_id: string;
          location_id: string;
          category_id: string | null;
          title: string;
          slug: string;
          story: string;
          pin_type: PinType;
          visibility: Visibility;
          status: ContentStatus;
          ai_enhanced: boolean;
          is_featured: boolean;
          featured_at: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          location_id: string;
          category_id?: string | null;
          title: string;
          slug?: string;
          story: string;
          pin_type?: PinType;
          visibility?: Visibility;
          status?: ContentStatus;
          ai_enhanced?: boolean;
          is_featured?: boolean;
          featured_at?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          location_id?: string;
          category_id?: string | null;
          title?: string;
          slug?: string;
          story?: string;
          pin_type?: PinType;
          visibility?: Visibility;
          status?: ContentStatus;
          ai_enhanced?: boolean;
          is_featured?: boolean;
          featured_at?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };

      memory_media: {
        Row: {
          id: string;
          memory_id: string;
          storage_path: string;
          public_url: string;
          alt_text: string | null;
          width: number | null;
          height: number | null;
          size_bytes: number;
          mime_type: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          memory_id: string;
          storage_path: string;
          public_url: string;
          alt_text?: string | null;
          width?: number | null;
          height?: number | null;
          size_bytes: number;
          mime_type: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          memory_id?: string;
          storage_path?: string;
          public_url?: string;
          alt_text?: string | null;
          width?: number | null;
          height?: number | null;
          size_bytes?: number;
          mime_type?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      memory_tags: {
        Row: { memory_id: string; tag_id: string; created_at: string };
        Insert: { memory_id: string; tag_id: string; created_at?: string };
        Update: { memory_id?: string; tag_id?: string; created_at?: string };
        Relationships: [];
      };

      payments: {
        Row: {
          id: string;
          user_id: string;
          memory_id: string;
          reference: string;
          pin_type: PinType;
          tier: number;
          amount: number;
          currency: string;
          method: PaymentMethod | null;
          status: PaymentStatus;
          is_genesis: boolean;
          reviewed_by: string | null;
          reviewed_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          memory_id: string;
          reference: string;
          pin_type: PinType;
          tier: number;
          amount: number;
          currency?: string;
          method?: PaymentMethod | null;
          status?: PaymentStatus;
          is_genesis?: boolean;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          memory_id?: string;
          reference?: string;
          pin_type?: PinType;
          tier?: number;
          amount?: number;
          currency?: string;
          method?: PaymentMethod | null;
          status?: PaymentStatus;
          is_genesis?: boolean;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      payment_receipts: {
        Row: {
          id: string;
          payment_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          storage_path?: string;
          file_name?: string;
          mime_type?: string;
          size_bytes?: number;
          uploaded_at?: string;
        };
        Relationships: [];
      };

      comments: {
        Row: {
          id: string;
          memory_id: string;
          user_id: string;
          content: string;
          status: ContentStatus;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          memory_id: string;
          user_id: string;
          content: string;
          status?: ContentStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          memory_id?: string;
          user_id?: string;
          content?: string;
          status?: ContentStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };

      reactions: {
        Row: {
          id: string;
          memory_id: string;
          user_id: string;
          reaction: ReactionType;
          created_at: string;
        };
        Insert: {
          id?: string;
          memory_id: string;
          user_id: string;
          reaction: ReactionType;
          created_at?: string;
        };
        Update: {
          id?: string;
          memory_id?: string;
          user_id?: string;
          reaction?: ReactionType;
          created_at?: string;
        };
        Relationships: [];
      };

      bookmarks: {
        Row: { id: string; user_id: string; memory_id: string; created_at: string };
        Insert: { id?: string; user_id: string; memory_id: string; created_at?: string };
        Update: { id?: string; user_id?: string; memory_id?: string; created_at?: string };
        Relationships: [];
      };

      reports: {
        Row: {
          id: string;
          reporter_id: string;
          memory_id: string;
          reason: ReportReason;
          description: string | null;
          status: ReportStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          memory_id: string;
          reason: ReportReason;
          description?: string | null;
          status?: ReportStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          memory_id?: string;
          reason?: ReportReason;
          description?: string | null;
          status?: ReportStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string | null;
          entity_type: string | null;
          entity_id: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          body?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      settings: {
        Row: {
          id: string;
          category: string;
          key: string;
          value: string;
          type: SettingType;
          description: string | null;
          updated_by: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          category: string;
          key: string;
          value: string;
          type?: SettingType;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          category?: string;
          key?: string;
          value?: string;
          type?: SettingType;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json | null;
          request_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json | null;
          request_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json | null;
          request_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_id: { Args: Record<string, never>; Returns: string };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_owner: { Args: { owner_id: string }; Returns: boolean };
      slugify: { Args: { input: string }; Returns: string };
    };
    Enums: {
      user_role: UserRole;
      visibility: Visibility;
      pin_type: PinType;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      content_status: ContentStatus;
      report_reason: ReportReason;
      report_status: ReportStatus;
      reaction_type: ReactionType;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type DatabasePublic = Database["public"];
