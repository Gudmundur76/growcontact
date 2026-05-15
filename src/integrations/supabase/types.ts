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
      blog_posts: {
        Row: {
          author: string
          author_role: string
          body: string
          category: string
          created_at: string
          excerpt: string
          id: string
          published_at: string | null
          read_time: string
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          author_role?: string
          body: string
          category: string
          created_at?: string
          excerpt: string
          id?: string
          published_at?: string | null
          read_time?: string
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          author_role?: string
          body?: string
          category?: string
          created_at?: string
          excerpt?: string
          id?: string
          published_at?: string | null
          read_time?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          team_size: string | null
          user_agent: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          team_size?: string | null
          user_agent?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          team_size?: string | null
          user_agent?: string | null
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
      interview_events: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          metadata: Json | null
          session_id: string
          speaker: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          kind: string
          metadata?: Json | null
          session_id: string
          speaker?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json | null
          session_id?: string
          speaker?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_rubrics: {
        Row: {
          competencies: Json
          created_at: string
          focus: string | null
          id: string
          is_default: boolean
          name: string
          role_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          competencies?: Json
          created_at?: string
          focus?: string | null
          id?: string
          is_default?: boolean
          name: string
          role_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          competencies?: Json
          created_at?: string
          focus?: string | null
          id?: string
          is_default?: boolean
          name?: string
          role_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_scorecards: {
        Row: {
          competencies: Json
          concerns: Json
          created_at: string
          follow_ups: Json
          id: string
          overall_rating: number | null
          recommendation: string | null
          session_id: string
          strengths: Json
          summary: string
          updated_at: string
        }
        Insert: {
          competencies?: Json
          concerns?: Json
          created_at?: string
          follow_ups?: Json
          id?: string
          overall_rating?: number | null
          recommendation?: string | null
          session_id: string
          strengths?: Json
          summary: string
          updated_at?: string
        }
        Update: {
          competencies?: Json
          concerns?: Json
          created_at?: string
          follow_ups?: Json
          id?: string
          overall_rating?: number | null
          recommendation?: string | null
          session_id?: string
          strengths?: Json
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_scorecards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          archived: boolean
          candidate_name: string
          created_at: string
          deleted_at: string | null
          ended_at: string | null
          id: string
          job_description: string | null
          meeting_platform: string
          meeting_url: string
          recall_bot_id: string | null
          role_title: string
          rubric_id: string | null
          share_expires_at: string | null
          share_token: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          candidate_name: string
          created_at?: string
          deleted_at?: string | null
          ended_at?: string | null
          id?: string
          job_description?: string | null
          meeting_platform: string
          meeting_url: string
          recall_bot_id?: string | null
          role_title: string
          rubric_id?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          candidate_name?: string
          created_at?: string
          deleted_at?: string | null
          ended_at?: string | null
          id?: string
          job_description?: string | null
          meeting_platform?: string
          meeting_url?: string
          recall_bot_id?: string | null
          role_title?: string
          rubric_id?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "interview_rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          source: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          source?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          source?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          id: string
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sourcing_candidates: {
        Row: {
          ai_summary: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          external_id: string
          first_seen_at: string
          fit_score: number | null
          headline: string | null
          id: string
          last_search_id: string | null
          location: string | null
          name: string
          profile_url: string
          signals: Json
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          external_id: string
          first_seen_at?: string
          fit_score?: number | null
          headline?: string | null
          id?: string
          last_search_id?: string | null
          location?: string | null
          name: string
          profile_url: string
          signals?: Json
          source: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          external_id?: string
          first_seen_at?: string
          fit_score?: number | null
          headline?: string | null
          id?: string
          last_search_id?: string | null
          location?: string | null
          name?: string
          profile_url?: string
          signals?: Json
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_candidates_last_search_id_fkey"
            columns: ["last_search_id"]
            isOneToOne: false
            referencedRelation: "sourcing_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_searches: {
        Row: {
          alert_enabled: boolean
          alert_frequency: string
          created_at: string
          filters: Json
          id: string
          last_alert_at: string | null
          last_run_at: string | null
          name: string
          query: string
          role_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_enabled?: boolean
          alert_frequency?: string
          created_at?: string
          filters?: Json
          id?: string
          last_alert_at?: string | null
          last_run_at?: string | null
          name: string
          query: string
          role_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_enabled?: boolean
          alert_frequency?: string
          created_at?: string
          filters?: Json
          id?: string
          last_alert_at?: string | null
          last_run_at?: string | null
          name?: string
          query?: string
          role_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sourcing_sends: {
        Row: {
          body: string
          candidate_id: string
          error_message: string | null
          id: string
          recipient_email: string
          sent_at: string
          sequence_id: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          body: string
          candidate_id: string
          error_message?: string | null
          id?: string
          recipient_email: string
          sent_at?: string
          sequence_id?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          body?: string
          candidate_id?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          sent_at?: string
          sequence_id?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_sends_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "sourcing_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_sends_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sourcing_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_sequences: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          sender_name: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          sender_name?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          sender_name?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sourcing_shortlist_members: {
        Row: {
          added_at: string
          candidate_id: string
          id: string
          notes: string | null
          shortlist_id: string
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          added_at?: string
          candidate_id: string
          id?: string
          notes?: string | null
          shortlist_id: string
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          added_at?: string
          candidate_id?: string
          id?: string
          notes?: string | null
          shortlist_id?: string
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_shortlist_members_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "sourcing_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_shortlist_members_shortlist_id_fkey"
            columns: ["shortlist_id"]
            isOneToOne: false
            referencedRelation: "sourcing_shortlists"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_shortlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          role_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          role_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          role_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
