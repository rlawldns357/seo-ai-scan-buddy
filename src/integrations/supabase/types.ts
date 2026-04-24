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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      analysis_history: {
        Row: {
          aeo_score: number
          created_at: string
          geo_score: number
          id: string
          result_data: Json
          seo_score: number
          url: string
        }
        Insert: {
          aeo_score: number
          created_at?: string
          geo_score: number
          id?: string
          result_data: Json
          seo_score: number
          url: string
        }
        Update: {
          aeo_score?: number
          created_at?: string
          geo_score?: number
          id?: string
          result_data?: Json
          seo_score?: number
          url?: string
        }
        Relationships: []
      }
      analysis_usage: {
        Row: {
          created_at: string
          email_unlocked: boolean
          id: string
          ip_address: string
          updated_at: string
          usage_count: number
          used_date: string
        }
        Insert: {
          created_at?: string
          email_unlocked?: boolean
          id?: string
          ip_address: string
          updated_at?: string
          usage_count?: number
          used_date?: string
        }
        Update: {
          created_at?: string
          email_unlocked?: boolean
          id?: string
          ip_address?: string
          updated_at?: string
          usage_count?: number
          used_date?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_name: string
          id: string
          session_id: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_name: string
          id?: string
          session_id?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_name?: string
          id?: string
          session_id?: string | null
          url?: string | null
        }
        Relationships: []
      }
      autoblog_engine_config: {
        Row: {
          config_key: string
          config_value: string
          created_at: string
          id: string
          updated_at: string
          version: number
        }
        Insert: {
          config_key: string
          config_value: string
          created_at?: string
          id?: string
          updated_at?: string
          version?: number
        }
        Update: {
          config_key?: string
          config_value?: string
          created_at?: string
          id?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      autoblog_engine_log: {
        Row: {
          changes_summary: string
          config_key: string
          created_at: string
          id: string
          new_value: string | null
          previous_value: string | null
          status: string
          trends_found: Json | null
          version: number
        }
        Insert: {
          changes_summary: string
          config_key: string
          created_at?: string
          id?: string
          new_value?: string | null
          previous_value?: string | null
          status?: string
          trends_found?: Json | null
          version: number
        }
        Update: {
          changes_summary?: string
          config_key?: string
          created_at?: string
          id?: string
          new_value?: string | null
          previous_value?: string | null
          status?: string
          trends_found?: Json | null
          version?: number
        }
        Relationships: []
      }
      autopublish_settings: {
        Row: {
          auto_topup: boolean
          created_at: string
          daily_limit: number
          enabled: boolean
          hours_kst: number[]
          id: string
          last_run_at: string | null
          min_queue: number
          site_id: string
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          auto_topup?: boolean
          created_at?: string
          daily_limit?: number
          enabled?: boolean
          hours_kst?: number[]
          id?: string
          last_run_at?: string | null
          min_queue?: number
          site_id: string
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          auto_topup?: boolean
          created_at?: string
          daily_limit?: number
          enabled?: boolean
          hours_kst?: number[]
          id?: string
          last_run_at?: string | null
          min_queue?: number
          site_id?: string
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "autopublish_settings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "user_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_at: string | null
          reason: string | null
          site_url: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_at?: string | null
          reason?: string | null
          site_url?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_at?: string | null
          reason?: string | null
          site_url?: string | null
          status?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          category: string
          content: string
          created_at: string
          date: string
          excerpt: string
          failure_attempts: number | null
          failure_reason: string | null
          faq_short: Json | null
          featured: boolean
          id: string
          og_image: string | null
          published: boolean
          read_time: string
          slug: string
          thumbnail: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          category?: string
          content: string
          created_at?: string
          date?: string
          excerpt: string
          failure_attempts?: number | null
          failure_reason?: string | null
          faq_short?: Json | null
          featured?: boolean
          id?: string
          og_image?: string | null
          published?: boolean
          read_time?: string
          slug: string
          thumbnail?: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          content?: string
          created_at?: string
          date?: string
          excerpt?: string
          failure_attempts?: number | null
          failure_reason?: string | null
          faq_short?: Json | null
          featured?: boolean
          id?: string
          og_image?: string | null
          published?: boolean
          read_time?: string
          slug?: string
          thumbnail?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      consultation_requests: {
        Row: {
          budget: string | null
          company: string | null
          concerns: string | null
          created_at: string
          email: string
          id: string
          interests: string[] | null
          job_title: string | null
          name: string
          phone: string | null
          site_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: string | null
          company?: string | null
          concerns?: string | null
          created_at?: string
          email: string
          id?: string
          interests?: string[] | null
          job_title?: string | null
          name: string
          phone?: string | null
          site_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: string | null
          company?: string | null
          concerns?: string | null
          created_at?: string
          email?: string
          id?: string
          interests?: string[] | null
          job_title?: string | null
          name?: string
          phone?: string | null
          site_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      engine_config: {
        Row: {
          config_key: string
          config_value: string
          created_at: string
          id: string
          updated_at: string
          version: number
        }
        Insert: {
          config_key: string
          config_value: string
          created_at?: string
          id?: string
          updated_at?: string
          version?: number
        }
        Update: {
          config_key?: string
          config_value?: string
          created_at?: string
          id?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      engine_update_log: {
        Row: {
          changes_summary: string
          created_at: string
          id: string
          new_prompt: string | null
          previous_prompt: string | null
          status: string
          trends_found: Json | null
          version: number
        }
        Insert: {
          changes_summary: string
          created_at?: string
          id?: string
          new_prompt?: string | null
          previous_prompt?: string | null
          status?: string
          trends_found?: Json | null
          version: number
        }
        Update: {
          changes_summary?: string
          created_at?: string
          id?: string
          new_prompt?: string | null
          previous_prompt?: string | null
          status?: string
          trends_found?: Json | null
          version?: number
        }
        Relationships: []
      }
      regeneration_credits: {
        Row: {
          addon_balance: number
          balance: number
          created_at: string
          id: string
          monthly_quota: number
          reset_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          addon_balance?: number
          balance?: number
          created_at?: string
          id?: string
          monthly_quota?: number
          reset_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          addon_balance?: number
          balance?: number
          created_at?: string
          id?: string
          monthly_quota?: number
          reset_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      regeneration_log: {
        Row: {
          cost_credits: number
          created_at: string
          id: string
          model_used: string | null
          post_id: string | null
          tier: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          cost_credits?: number
          created_at?: string
          id?: string
          model_used?: string | null
          post_id?: string | null
          tier: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          cost_credits?: number
          created_at?: string
          id?: string
          model_used?: string | null
          post_id?: string | null
          tier?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regeneration_log_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "site_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      site_post_views: {
        Row: {
          created_at: string
          id: string
          post_id: string
          referrer: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          referrer?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          referrer?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "site_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      site_posts: {
        Row: {
          aeo_score: number | null
          content: string
          created_at: string
          excerpt: string | null
          faq: Json | null
          geo_score: number | null
          id: string
          internal_links: Json | null
          is_auto_generated: boolean
          keywords: string[] | null
          last_viewed_at: string | null
          og_image: string | null
          product_links: Json
          published_at: string | null
          queue_position: number | null
          scored_at: string | null
          seo_score: number | null
          site_id: string
          slug: string
          source_axis: string | null
          status: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          aeo_score?: number | null
          content: string
          created_at?: string
          excerpt?: string | null
          faq?: Json | null
          geo_score?: number | null
          id?: string
          internal_links?: Json | null
          is_auto_generated?: boolean
          keywords?: string[] | null
          last_viewed_at?: string | null
          og_image?: string | null
          product_links?: Json
          published_at?: string | null
          queue_position?: number | null
          scored_at?: string | null
          seo_score?: number | null
          site_id: string
          slug: string
          source_axis?: string | null
          status?: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          aeo_score?: number | null
          content?: string
          created_at?: string
          excerpt?: string | null
          faq?: Json | null
          geo_score?: number | null
          id?: string
          internal_links?: Json | null
          is_auto_generated?: boolean
          keywords?: string[] | null
          last_viewed_at?: string | null
          og_image?: string | null
          product_links?: Json
          published_at?: string | null
          queue_position?: number | null
          scored_at?: string | null
          seo_score?: number | null
          site_id?: string
          slug?: string
          source_axis?: string | null
          status?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_posts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "user_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_products: {
        Row: {
          click_count: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          keywords: string[] | null
          price: string | null
          site_id: string
          sort_order: number
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          keywords?: string[] | null
          price?: string | null
          site_id: string
          sort_order?: number
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          click_count?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          keywords?: string[] | null
          price?: string | null
          site_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_products_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "user_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          expires_at: string | null
          granted_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sites: {
        Row: {
          created_at: string
          id: string
          owner_email: string
          site_slug: string
          site_url: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          owner_email: string
          site_slug: string
          site_url: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          owner_email?: string
          site_slug?: string
          site_url?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_site_products: { Args: { _site_id: string }; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_user_tier: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      grant_beta_by_email: { Args: { _email: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_site_product_click: {
        Args: { _product_id: string }
        Returns: undefined
      }
      log_site_post_view: {
        Args: { _post_id: string; _referrer?: string; _session_id: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "free" | "beta" | "lite" | "pro" | "studio" | "admin"
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
      app_role: ["free", "beta", "lite", "pro", "studio", "admin"],
    },
  },
} as const
