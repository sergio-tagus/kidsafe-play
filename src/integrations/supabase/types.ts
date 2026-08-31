export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          icon: string
          id: string
          is_default: boolean
          name_en: string
          name_es: string
          name_pt: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          name_en: string
          name_es: string
          name_pt: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          name_en?: string
          name_es?: string
          name_pt?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      channel_recommendations_cache: {
        Row: {
          generated_at: string
          payload: Json
          user_id: string
        }
        Insert: {
          generated_at?: string
          payload: Json
          user_id: string
        }
        Update: {
          generated_at?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      child_profiles: {
        Row: {
          age: number | null
          avatar_emoji: string
          created_at: string
          daily_screen_time_minutes: number
          id: string
          parent_user_id: string
          profile_name: string
        }
        Insert: {
          age?: number | null
          avatar_emoji?: string
          created_at?: string
          daily_screen_time_minutes?: number
          id?: string
          parent_user_id: string
          profile_name: string
        }
        Update: {
          age?: number | null
          avatar_emoji?: string
          created_at?: string
          daily_screen_time_minutes?: number
          id?: string
          parent_user_id?: string
          profile_name?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          child_profile_id: string
          created_at: string
          id: string
          youtube_video_id: string
        }
        Insert: {
          child_profile_id: string
          created_at?: string
          id?: string
          youtube_video_id: string
        }
        Update: {
          child_profile_id?: string
          created_at?: string
          id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_pins: {
        Row: {
          created_at: string
          pin_hash: string
          unlocked_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          pin_hash: string
          unlocked_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          pin_hash?: string
          unlocked_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      screen_time_daily: {
        Row: {
          child_profile_id: string
          date: string
          id: string
          minutes_watched: number
        }
        Insert: {
          child_profile_id: string
          date: string
          id?: string
          minutes_watched?: number
        }
        Update: {
          child_profile_id?: string
          date?: string
          id?: string
          minutes_watched?: number
        }
        Relationships: [
          {
            foreignKeyName: "screen_time_daily_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_settings: {
        Row: {
          created_at: string
          frequency: Database["public"]["Enums"]["sync_frequency"]
          last_run_at: string | null
          parent_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          frequency?: Database["public"]["Enums"]["sync_frequency"]
          last_run_at?: string | null
          parent_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          frequency?: Database["public"]["Enums"]["sync_frequency"]
          last_run_at?: string | null
          parent_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      videos_cache: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          parent_user_id: string
          published_at: string | null
          thumbnail_url: string | null
          title: string
          whitelist_channel_id: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          parent_user_id: string
          published_at?: string | null
          thumbnail_url?: string | null
          title: string
          whitelist_channel_id: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          parent_user_id?: string
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string
          whitelist_channel_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_cache_whitelist_channel_id_fkey"
            columns: ["whitelist_channel_id"]
            isOneToOne: false
            referencedRelation: "whitelist_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_history: {
        Row: {
          child_profile_id: string
          id: string
          total_seconds: number | null
          watch_progress_seconds: number
          watched_at: string
          youtube_video_id: string
        }
        Insert: {
          child_profile_id: string
          id?: string
          total_seconds?: number | null
          watch_progress_seconds?: number
          watched_at?: string
          youtube_video_id: string
        }
        Update: {
          child_profile_id?: string
          id?: string
          total_seconds?: number | null
          watch_progress_seconds?: number
          watched_at?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whitelist_channels: {
        Row: {
          active: boolean
          category: string
          channel_description: string | null
          channel_handle: string | null
          channel_name: string
          channel_thumbnail_url: string | null
          created_at: string
          id: string
          language: string
          parent_user_id: string
          pending_updates: Json | null
          pending_updates_at: string | null
          youtube_channel_id: string
        }
        Insert: {
          active?: boolean
          category: string
          channel_description?: string | null
          channel_handle?: string | null
          channel_name: string
          channel_thumbnail_url?: string | null
          created_at?: string
          id?: string
          language?: string
          parent_user_id: string
          pending_updates?: Json | null
          pending_updates_at?: string | null
          youtube_channel_id: string
        }
        Update: {
          active?: boolean
          category?: string
          channel_description?: string | null
          channel_handle?: string | null
          channel_name?: string
          channel_thumbnail_url?: string | null
          created_at?: string
          id?: string
          language?: string
          parent_user_id?: string
          pending_updates?: Json | null
          pending_updates_at?: string | null
          youtube_channel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whitelist_channels_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      sync_frequency: "off" | "daily" | "weekly" | "monthly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      sync_frequency: ["off", "daily", "weekly", "monthly"],
    },
  },
} as const
