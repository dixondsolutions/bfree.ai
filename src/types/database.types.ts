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
          task_category: string | null
          estimated_duration: number | null
          suggested_due_date: string | null
          energy_level: number | null
          suggested_tags: string[] | null
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
          task_category?: string | null
          estimated_duration?: number | null
          suggested_due_date?: string | null
          energy_level?: number | null
          suggested_tags?: string[] | null
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
          task_category?: string | null
          estimated_duration?: number | null
          suggested_due_date?: string | null
          energy_level?: number | null
          suggested_tags?: string[] | null
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
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          category: string
          status: string
          priority: string
          estimated_duration: number | null
          actual_duration: number | null
          due_date: string | null
          scheduled_start: string | null
          scheduled_end: string | null
          completed_at: string | null
          ai_generated: boolean
          source_email_id: string | null
          source_suggestion_id: string | null
          confidence_score: number | null
          parent_task_id: string | null
          project_id: string | null
          location: string | null
          tags: string[] | null
          notes: string | null
          energy_level: number | null
          is_recurring: boolean
          recurrence_pattern: Json | null
          external_id: string | null
          external_source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          category?: string
          status?: string
          priority?: string
          estimated_duration?: number | null
          actual_duration?: number | null
          due_date?: string | null
          scheduled_start?: string | null
          scheduled_end?: string | null
          completed_at?: string | null
          ai_generated?: boolean
          source_email_id?: string | null
          source_suggestion_id?: string | null
          confidence_score?: number | null
          parent_task_id?: string | null
          project_id?: string | null
          location?: string | null
          tags?: string[] | null
          notes?: string | null
          energy_level?: number | null
          is_recurring?: boolean
          recurrence_pattern?: Json | null
          external_id?: string | null
          external_source?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          category?: string
          status?: string
          priority?: string
          estimated_duration?: number | null
          actual_duration?: number | null
          due_date?: string | null
          scheduled_start?: string | null
          scheduled_end?: string | null
          completed_at?: string | null
          ai_generated?: boolean
          source_email_id?: string | null
          source_suggestion_id?: string | null
          confidence_score?: number | null
          parent_task_id?: string | null
          project_id?: string | null
          location?: string | null
          tags?: string[] | null
          notes?: string | null
          energy_level?: number | null
          is_recurring?: boolean
          recurrence_pattern?: Json | null
          external_id?: string | null
          external_source?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_suggestion_id_fkey"
            columns: ["source_suggestion_id"]
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      task_dependencies: {
        Row: {
          id: string
          task_id: string
          depends_on_task_id: string
          dependency_type: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          depends_on_task_id: string
          dependency_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          depends_on_task_id?: string
          dependency_type?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      task_attachments: {
        Row: {
          id: string
          task_id: string
          file_name: string
          file_url: string
          file_size: number | null
          file_type: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          file_name: string
          file_url: string
          file_size?: number | null
          file_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          file_name?: string
          file_url?: string
          file_size?: number | null
          file_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      task_comments: {
        Row: {
          id: string
          task_id: string
          user_id: string
          comment: string
          is_system_comment: boolean
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          comment: string
          is_system_comment?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          comment?: string
          is_system_comment?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      task_time_entries: {
        Row: {
          id: string
          task_id: string
          user_id: string
          start_time: string
          end_time: string | null
          duration: number | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          start_time: string
          end_time?: string | null
          duration?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          start_time?: string
          end_time?: string | null
          duration?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_time_entries_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_time_entries_user_id_fkey"
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
      get_task_completion_stats: {
        Args: {
          p_user_id: string
          p_days?: number
        }
        Returns: {
          total_tasks: number
          completed_tasks: number
          completion_rate: number
          avg_completion_time_days: number
          tasks_by_priority: Json
          tasks_by_category: Json
        }[]
      }
    }
    Enums: {
      event_status: "pending" | "confirmed" | "cancelled" | "rejected"
      suggestion_type: "meeting" | "task" | "deadline" | "reminder"
      suggestion_status: "pending" | "approved" | "rejected" | "processed"
      processing_status: "pending" | "processing" | "completed" | "failed" | "retrying"
      task_status: "pending" | "in_progress" | "completed" | "cancelled" | "blocked" | "deferred"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_category: "work" | "personal" | "health" | "finance" | "education" | "social" | "household" | "travel" | "project" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}