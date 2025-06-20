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
          status?: string
          last_sync?: string | null
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
          status?: string
          last_sync?: string | null
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
          status?: string
          last_sync?: string | null
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
          attendees: Json | null
          ai_generated: boolean
          confidence_score: number | null
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
          attendees?: Json | null
          ai_generated?: boolean
          confidence_score?: number | null
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
          attendees?: Json | null
          ai_generated?: boolean
          confidence_score?: number | null
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
          status?: string
          last_sync?: string | null
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
          status?: string
          last_sync?: string | null
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
          status?: string
          last_sync?: string | null
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
      emails: {
        Row: {
          id: string
          user_id: string
          gmail_id: string
          thread_id: string | null
          message_id: string | null
          subject: string
          from_address: string
          from_name: string | null
          to_address: string
          cc_addresses: string[] | null
          bcc_addresses: string[] | null
          content_text: string | null
          content_html: string | null
          snippet: string | null
          labels: string[] | null
          received_at: string
          sent_at: string | null
          processed_at: string | null
          ai_analyzed: boolean
          ai_analysis_at: string | null
          has_attachments: boolean
          attachment_count: number
          attachment_info: Json | null
          has_scheduling_content: boolean
          scheduling_keywords: string[] | null
          importance_level: string
          is_unread: boolean
          is_starred: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gmail_id: string
          thread_id?: string | null
          message_id?: string | null
          subject: string
          from_address: string
          from_name?: string | null
          to_address: string
          cc_addresses?: string[] | null
          bcc_addresses?: string[] | null
          content_text?: string | null
          content_html?: string | null
          snippet?: string | null
          labels?: string[] | null
          received_at: string
          sent_at?: string | null
          processed_at?: string | null
          ai_analyzed?: boolean
          ai_analysis_at?: string | null
          has_attachments?: boolean
          attachment_count?: number
          attachment_info?: Json | null
          has_scheduling_content?: boolean
          scheduling_keywords?: string[] | null
          importance_level?: string
          is_unread?: boolean
          is_starred?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gmail_id?: string
          thread_id?: string | null
          message_id?: string | null
          subject?: string
          from_address?: string
          from_name?: string | null
          to_address?: string
          cc_addresses?: string[] | null
          bcc_addresses?: string[] | null
          content_text?: string | null
          content_html?: string | null
          snippet?: string | null
          labels?: string[] | null
          received_at?: string
          sent_at?: string | null
          processed_at?: string | null
          ai_analyzed?: boolean
          ai_analysis_at?: string | null
          has_attachments?: boolean
          attachment_count?: number
          attachment_info?: Json | null
          has_scheduling_content?: boolean
          scheduling_keywords?: string[] | null
          importance_level?: string
          is_unread?: boolean
          is_starred?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_user_id_fkey"
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
          email_id: string | null
          suggestion_type: string
          content: Json
          confidence_score: number
          status: string
          task_category: string | null
          estimated_duration: number | null
          suggested_due_date: string | null
          energy_level: number | null
          suggested_tags: string[] | null
          converted_to_task_id: string | null
          converted_at: string | null
          priority: string | null
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_id?: string | null
          suggestion_type: string
          content: Json
          confidence_score: number
          status: string
          task_category?: string | null
          estimated_duration?: number | null
          suggested_due_date?: string | null
          energy_level?: number | null
          suggested_tags?: string[] | null
          converted_to_task_id?: string | null
          converted_at?: string | null
          priority?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_id?: string | null
          suggestion_type?: string
          content?: Json
          confidence_score?: number
          status?: string
          task_category?: string | null
          estimated_duration?: number | null
          suggested_due_date?: string | null
          energy_level?: number | null
          suggested_tags?: string[] | null
          converted_to_task_id?: string | null
          converted_at?: string | null
          priority?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_converted_to_task_id_fkey"
            columns: ["converted_to_task_id"]
            referencedRelation: "tasks"
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
          email_record_id?: string
          status: string
          error_message: string | null
          retry_count: number
          processed_at: string | null
          content: Json | null
          metadata: Json | null
          data_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_id: string
          email_record_id?: string
          status: string
          error_message?: string | null
          retry_count?: number
          processed_at?: string | null
          content?: Json | null
          metadata?: Json | null
          data_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_id?: string
          email_record_id?: string
          status?: string
          error_message?: string | null
          retry_count?: number
          processed_at?: string | null
          content?: Json | null
          metadata?: Json | null
          data_type?: string
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
          resource_type: string
          resource_id: string | null
          details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          details?: Json | null
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
          user_id: string
          endpoint: string
          requests_count: number
          window_start: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          requests_count?: number
          window_start: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
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
      email_attachments: {
        Row: {
          id: string
          email_id: string
          user_id: string
          filename: string
          mime_type: string | null
          size_bytes: number | null
          attachment_id: string | null
          is_downloaded: boolean
          download_url: string | null
          local_path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email_id: string
          user_id: string
          filename: string
          mime_type?: string | null
          size_bytes?: number | null
          attachment_id?: string | null
          is_downloaded?: boolean
          download_url?: string | null
          local_path?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email_id?: string
          user_id?: string
          filename?: string
          mime_type?: string | null
          size_bytes?: number | null
          attachment_id?: string | null
          is_downloaded?: boolean
          download_url?: string | null
          local_path?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_email_id_fkey"
            columns: ["email_id"]
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_attachments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      automation_logs: {
        Row: {
          id: string
          user_id: string | null
          automation_type: string
          trigger_source: string | null
          emails_processed: number
          tasks_created: number
          suggestions_generated: number
          errors_count: number
          status: string
          start_time: string
          end_time: string | null
          duration_seconds: number | null
          results: Json | null
          error_details: Json | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          automation_type: string
          trigger_source?: string | null
          emails_processed?: number
          tasks_created?: number
          suggestions_generated?: number
          errors_count?: number
          status?: string
          start_time?: string
          end_time?: string | null
          duration_seconds?: number | null
          results?: Json | null
          error_details?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          automation_type?: string
          trigger_source?: string | null
          emails_processed?: number
          tasks_created?: number
          suggestions_generated?: number
          errors_count?: number
          status?: string
          start_time?: string
          end_time?: string | null
          duration_seconds?: number | null
          results?: Json | null
          error_details?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      email_statistics: {
        Row: {
          user_id: string
          total_emails: number
          analyzed_emails: number
          scheduling_emails: number
          unread_emails: number
          high_importance_emails: number
          emails_with_attachments: number
          emails_last_7_days: number
          analyzed_last_7_days: number
          processing_efficiency: number
          latest_email_time: string | null
          latest_analysis_time: string | null
        }
      }
      task_overview: {
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
          is_overdue: boolean
          is_due_soon: boolean
          subtask_count: number
          completed_subtask_count: number
          comment_count: number
          attachment_count: number
          dependency_count: number
          calculated_actual_duration: number
          progress_percentage: number
          creation_source: string
          task_origin: string
        }
      }
      automation_statistics: {
        Row: {
          user_id: string
          automation_type: string
          total_runs: number
          total_emails_processed: number
          total_tasks_created: number
          total_suggestions_generated: number
          total_errors: number
          avg_duration_seconds: number
          last_run_time: string
          success_rate: number
          runs_last_7_days: number
          tasks_created_last_7_days: number
        }
      }
    }
    Functions: {
      get_emails_with_counts: {
        Args: {
          p_user_id: string
          p_limit?: number
          p_offset?: number
          p_unread_only?: boolean
          p_scheduling_only?: boolean
        }
        Returns: {
          email_id: string
          subject: string
          from_address: string
          from_name: string | null
          received_at: string
          snippet: string | null
          is_unread: boolean
          importance_level: string
          has_scheduling_content: boolean
          ai_analyzed: boolean
          task_count: number
          suggestion_count: number
          attachment_count: number
        }[]
      }
      calculate_task_actual_duration: {
        Args: {
          p_task_id: string
        }
        Returns: number
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
      get_task_stats_for_period: {
        Args: {
          p_user_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          total_tasks: number
          completed_tasks: number
          pending_tasks: number
          in_progress_tasks: number
          overdue_tasks: number
          ai_generated_tasks: number
          average_completion_time_hours: number
          productivity_score: number
        }[]
      }
      get_automation_health: {
        Args: {
          p_user_id?: string | null
        }
        Returns: {
          user_id: string
          overall_health: string
          issues: Json
          recommendations: Json
          last_successful_run: string
          failure_rate: number
        }[]
      }
      clean_old_automation_logs: {
        Args: {}
        Returns: number
      }
      get_email_task_calendar_data: {
        Args: {
          p_user_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          email_id: string
          gmail_id: string
          subject: string
          from_address: string
          from_name: string | null
          received_at: string
          importance_level: string
          processing_status: string
          task_id: string | null
          task_title: string | null
          task_status: string | null
          task_priority: string | null
          task_category: string | null
          scheduled_start: string | null
          scheduled_end: string | null
          due_date: string | null
          estimated_duration: number | null
          ai_generated: boolean | null
          confidence_score: number | null
          task_created_at: string | null
          suggestion_id: string | null
          suggestion_status: string | null
          suggested_time: string | null
          suggestion_type: string | null
          suggestion_confidence: number | null
        }[]
      }
      get_active_email_account_tokens: {
        Args: {
          p_user_id: string
        }
        Returns: {
          account_id: string
          email: string
          provider: string
          access_token: string
          refresh_token: string | null
          expires_at: string | null
          last_sync: string | null
        }[]
      }
      get_processing_queue_stats: {
        Args: {
          p_user_id?: string | null
        }
        Returns: {
          user_id: string
          pending_count: number
          processing_count: number
          failed_count: number
          completed_count: number
          total_count: number
          avg_processing_time_minutes: number
          oldest_pending_age_hours: number
          error_rate: number
        }[]
      }
      search_emails_advanced: {
        Args: {
          p_user_id: string
          p_search_query: string
          p_search_fields?: string[]
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          email_id: string
          subject: string
          from_address: string
          from_name: string | null
          received_at: string
          snippet: string | null
          importance_level: string
          match_score: number
          match_field: string
        }[]
      }
    }
    Enums: {
      task_status: 'pending' | 'pending_schedule' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'blocked' | 'deferred'
      task_priority: 'low' | 'medium' | 'high' | 'urgent'
      task_category: 'work' | 'personal' | 'health' | 'finance' | 'education' | 'social' | 'household' | 'travel' | 'project' | 'other'
      suggestion_status: 'pending' | 'approved' | 'rejected' | 'auto_converted' | 'converted'
    }
    CompositeTypes: {}
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Common type aliases
export type User = Tables<'users'>
export type Calendar = Tables<'calendars'>
export type Event = Tables<'events'>
export type EmailAccount = Tables<'email_accounts'>
export type Email = Tables<'emails'>
export type AiSuggestion = Tables<'ai_suggestions'>
export type UserPreferences = Tables<'user_preferences'>
export type ProcessingQueue = Tables<'processing_queue'>
export type AuditLog = Tables<'audit_logs'>
export type RateLimit = Tables<'rate_limits'>
export type Task = Tables<'tasks'>
export type TaskDependency = Tables<'task_dependencies'>
export type TaskAttachment = Tables<'task_attachments'>
export type TaskComment = Tables<'task_comments'>
export type TaskTimeEntry = Tables<'task_time_entries'>
export type AutomationLog = Tables<'automation_logs'>
export type EmailAttachment = Tables<'email_attachments'>

// Type aliases for easier usage
export type CalendarData = Calendar
export type EmailStatistics = Database['public']['Views']['email_statistics']['Row']
export type TaskOverview = Database['public']['Views']['task_overview']['Row']
export type TaskStatus = Enums<'task_status'>
export type TaskPriority = Enums<'task_priority'>
export type TaskCategory = Enums<'task_category'>
export type SuggestionStatus = Enums<'suggestion_status'>