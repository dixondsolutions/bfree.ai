export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          timezone: string | null
          working_hours_start: string | null
          working_hours_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string | null
          working_hours_start?: string | null
          working_hours_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string | null
          working_hours_start?: string | null
          working_hours_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      calendars: {
        Row: {
          id: string
          user_id: string
          name: string
          provider: string
          provider_calendar_id: string
          is_primary: boolean
          sync_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          provider: string
          provider_calendar_id: string
          is_primary?: boolean
          sync_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          provider?: string
          provider_calendar_id?: string
          is_primary?: boolean
          sync_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendars_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      events: {
        Row: {
          id: string
          user_id: string
          calendar_id: string | null
          title: string
          description: string | null
          start_time: string
          end_time: string
          location: string | null
          ai_generated: boolean
          confidence_score: number | null
          source_email_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          calendar_id?: string | null
          title: string
          description?: string | null
          start_time: string
          end_time: string
          location?: string | null
          ai_generated?: boolean
          confidence_score?: number | null
          source_email_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          calendar_id?: string | null
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          location?: string | null
          ai_generated?: boolean
          confidence_score?: number | null
          source_email_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_calendar_id_fkey"
            columns: ["calendar_id"]
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          }
        ]
      }
      email_accounts: {
        Row: {
          id: string
          user_id: string
          email: string
          provider: string
          access_token: string
          refresh_token: string | null
          expires_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          provider: string
          access_token: string
          refresh_token?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          provider?: string
          access_token?: string
          refresh_token?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_suggestions: {
        Row: {
          id: string
          user_id: string
          source_email_id: string
          suggestion_type: string
          title: string
          description: string | null
          suggested_time: string | null
          confidence_score: number
          status: string
          feedback: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_email_id: string
          suggestion_type: string
          title: string
          description?: string | null
          suggested_time?: string | null
          confidence_score: number
          status?: string
          feedback?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source_email_id?: string
          suggestion_type?: string
          title?: string
          description?: string | null
          suggested_time?: string | null
          confidence_score?: number
          status?: string
          feedback?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          preference_key: string
          preference_value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preference_key: string
          preference_value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preference_key?: string
          preference_value?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      processing_queue: {
        Row: {
          id: string
          user_id: string
          email_id: string
          status: string
          error_message: string | null
          retry_count: number
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_id: string
          status?: string
          error_message?: string | null
          retry_count?: number
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_id?: string
          status?: string
          error_message?: string | null
          retry_count?: number
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_queue_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string
          record_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name: string
          record_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          table_name?: string
          record_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      rate_limits: {
        Row: {
          id: string
          user_id: string | null
          endpoint: string
          requests_count: number
          window_start: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          endpoint: string
          requests_count?: number
          window_start?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          endpoint?: string
          requests_count?: number
          window_start?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_email_account_tokens: {
        Args: {
          p_user_id: string
        }
        Returns: {
          id: string
          email: string
          access_token: string
          refresh_token: string | null
          expires_at: string | null
        }[]
      }
    }
    Enums: {
      event_status: "pending" | "confirmed" | "cancelled" | "rejected"
      suggestion_type: "meeting" | "task" | "deadline" | "reminder"
      suggestion_status: "pending" | "approved" | "rejected" | "processed"
      processing_status: "pending" | "processing" | "completed" | "failed" | "retrying"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}