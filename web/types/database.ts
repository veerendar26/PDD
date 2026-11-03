/**
 * Hand-crafted TypeScript types matching the Supabase Postgres schema.
 *
 * Shaped to match @supabase/supabase-js v2 generic expectations exactly —
 * every table entry must have Row, Insert, Update, and Relationships.
 *
 * In production, regenerate with:
 *   supabase gen types typescript --local > web/types/database.ts
 */

// ── Enums ─────────────────────────────────────────────────────────────────────

export type UserRole           = "customer" | "technician" | "admin"
export type BookingStatus      = "booked" | "assigned" | "diagnosis" | "awaiting_approval" | "in_repair" | "quality_check" | "completed" | "cancelled"
export type ServiceType        = "doorstep" | "pickup" | "in_store"
export type VerificationStatus = "pending" | "approved" | "rejected"
export type PaymentStatus      = "pending" | "paid" | "failed" | "refunded"
export type PaymentMethod      = "razorpay" | "cash" | "upi" | "bank_transfer"
export type NotificationType   = "booking_update" | "quotation_received" | "payment_received" | "review_received" | "system"

// ── Inline row shapes ──────────────────────────────────────────────────────────

export interface AiDiagnosis {
  issue_labels:      string[]
  confidence_scores: number[]
}

// ── Database type (exact v2 shape) ────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id:          string
          role:        UserRole
          name:        string
          email:       string
          phone:       string | null
          avatar_url:  string | null
          fcm_token:   string | null
          created_at:  string
          updated_at:  string
        }
        Insert: {
          id?:         string
          role?:       UserRole
          name:        string
          email:       string
          phone?:      string | null
          avatar_url?: string | null
          fcm_token?:  string | null
        }
        Update: {
          role?:       UserRole
          name?:       string
          email?:      string
          phone?:      string | null
          avatar_url?: string | null
          fcm_token?:  string | null
        }
        Relationships: []
      }

      categories: {
        Row: {
          id:            string
          name:          string
          parent_id:     string | null
          icon_url:      string | null
          display_order: number
          created_at:    string
        }
        Insert: {
          id?:            string
          name:           string
          parent_id?:     string | null
          icon_url?:      string | null
          display_order?: number
        }
        Update: {
          name?:          string
          parent_id?:     string | null
          icon_url?:      string | null
          display_order?: number
        }
        Relationships: [
          { foreignKeyName: "categories_parent_id_fkey"; columns: ["parent_id"]; referencedRelation: "categories"; referencedColumns: ["id"] }
        ]
      }

      provider_profiles: {
        Row: {
          id:                  string
          user_id:             string
          business_name:       string
          description:         string | null
          categories:          string[]
          verification_status: VerificationStatus
          rating_avg:          number
          total_reviews:       number
          service_radius_km:   number
          doorstep_available:  boolean
          address:             string | null
          location?:           string | null
          working_hours?:      any
          accepting_bookings?: boolean
          identity_doc_url?:   string | null
          verification_notes?: string | null
          rejection_reason?:   string | null
          verified_at?:        string | null
          verified_by?:        string | null
          approved_by?:        string | null
          approved_at?:        string | null
          application_submitted_at?: string | null
          is_active?:          boolean
          created_at:          string
          updated_at:          string
        }
        Insert: {
          id?:                  string
          user_id:              string
          business_name:        string
          description?:         string | null
          categories?:          string[]
          verification_status?: VerificationStatus
          service_radius_km?:   number
          doorstep_available?:  boolean
          address?:             string | null
          location?:            string | null
          working_hours?:       any
          accepting_bookings?:  boolean
          identity_doc_url?:    string | null
          verification_notes?:  string | null
          rejection_reason?:    string | null
          verified_at?:         string | null
          verified_by?:         string | null
          approved_by?:         string | null
          approved_at?:         string | null
          application_submitted_at?: string | null
          is_active?:           boolean
        }
        Update: {
          business_name?:       string
          description?:         string | null
          categories?:          string[]
          verification_status?: VerificationStatus
          service_radius_km?:   number
          doorstep_available?:  boolean
          address?:             string | null
          location?:            string | null
          working_hours?:       any
          accepting_bookings?:  boolean
          identity_doc_url?:    string | null
          verification_notes?:  string | null
          rejection_reason?:    string | null
          verified_at?:         string | null
          verified_by?:         string | null
          approved_by?:         string | null
          approved_at?:         string | null
          application_submitted_at?: string | null
          is_active?:           boolean
        }
        Relationships: [
          { foreignKeyName: "provider_profiles_user_id_fkey"; columns: ["user_id"]; referencedRelation: "users"; referencedColumns: ["id"] }
        ]
      }

      products: {
        Row: {
          id:                string
          customer_id:       string
          category_id:       string
          brand:             string | null
          model:             string | null
          issue_description: string
          media_urls:        string[]
          ai_diagnosis:      AiDiagnosis | null
          created_at:        string
        }
        Insert: {
          id?:                string
          customer_id:        string
          category_id:        string
          brand?:             string | null
          model?:             string | null
          issue_description:  string
          media_urls?:        string[]
          ai_diagnosis?:      AiDiagnosis | null
        }
        Update: {
          brand?:             string | null
          model?:             string | null
          issue_description?: string
          media_urls?:        string[]
          ai_diagnosis?:      AiDiagnosis | null
        }
        Relationships: [
          { foreignKeyName: "products_customer_id_fkey";  columns: ["customer_id"];  referencedRelation: "users";      referencedColumns: ["id"] },
          { foreignKeyName: "products_category_id_fkey";  columns: ["category_id"];  referencedRelation: "categories"; referencedColumns: ["id"] }
        ]
      }

      bookings: {
        Row: {
          id:               string
          product_id:       string
          customer_id:      string
          provider_id:      string | null
          status:           BookingStatus
          estimated_cost:   number | null
          final_cost:       number | null
          scheduled_at:     string | null
          service_type:     ServiceType
          customer_address: string | null
          notes:            string | null
          created_at:       string
          updated_at:       string
        }
        Insert: {
          id?:               string
          product_id:        string
          customer_id:       string
          provider_id?:      string | null
          status?:           BookingStatus
          estimated_cost?:   number | null
          final_cost?:       number | null
          scheduled_at?:     string | null
          service_type?:     ServiceType
          customer_address?: string | null
          notes?:            string | null
        }
        Update: {
          provider_id?:      string | null
          status?:           BookingStatus
          estimated_cost?:   number | null
          final_cost?:       number | null
          scheduled_at?:     string | null
          service_type?:     ServiceType
          customer_address?: string | null
          notes?:            string | null
          updated_at?:       string
        }
        Relationships: [
          { foreignKeyName: "bookings_product_id_fkey";   columns: ["product_id"];   referencedRelation: "products";          referencedColumns: ["id"] },
          { foreignKeyName: "bookings_customer_id_fkey";  columns: ["customer_id"];  referencedRelation: "users";             referencedColumns: ["id"] },
          { foreignKeyName: "bookings_provider_id_fkey";  columns: ["provider_id"];  referencedRelation: "provider_profiles"; referencedColumns: ["id"] }
        ]
      }

      repair_status_log: {
        Row: {
          id:         string
          booking_id: string
          status:     BookingStatus
          note:       string | null
          changed_by: string
          changed_at: string
        }
        Insert: {
          id?:         string
          booking_id:  string
          status:      BookingStatus
          note?:       string | null
          changed_by:  string
        }
        Update: {
          note?: string | null
        }
        Relationships: [
          { foreignKeyName: "repair_status_log_booking_id_fkey"; columns: ["booking_id"]; referencedRelation: "bookings"; referencedColumns: ["id"] },
          { foreignKeyName: "repair_status_log_changed_by_fkey"; columns: ["changed_by"]; referencedRelation: "users";    referencedColumns: ["id"] }
        ]
      }

      quotations: {
        Row: {
          id:                   string
          booking_id:           string
          diagnosis_notes:      string
          quoted_amount:        number
          parts_breakdown:      string | null
          labour_cost:          number | null
          approved_by_customer: boolean | null
          responded_at:         string | null
          created_at:           string
        }
        Insert: {
          id?:                   string
          booking_id:            string
          diagnosis_notes:       string
          quoted_amount:         number
          parts_breakdown?:      string | null
          labour_cost?:          number | null
          approved_by_customer?: boolean | null
        }
        Update: {
          diagnosis_notes?:      string
          quoted_amount?:        number
          parts_breakdown?:      string | null
          labour_cost?:          number | null
          approved_by_customer?: boolean | null
          responded_at?:         string | null
        }
        Relationships: [
          { foreignKeyName: "quotations_booking_id_fkey"; columns: ["booking_id"]; referencedRelation: "bookings"; referencedColumns: ["id"] }
        ]
      }

      payments: {
        Row: {
          id:              string
          booking_id:      string
          amount:          number
          method:          PaymentMethod
          status:          PaymentStatus
          transaction_ref: string | null
          paid_at:         string | null
          created_at:      string
        }
        Insert: {
          id?:              string
          booking_id:       string
          amount:           number
          method:           PaymentMethod
          status?:          PaymentStatus
          transaction_ref?: string | null
          paid_at?:         string | null
        }
        Update: {
          status?:          PaymentStatus
          transaction_ref?: string | null
          paid_at?:         string | null
        }
        Relationships: [
          { foreignKeyName: "payments_booking_id_fkey"; columns: ["booking_id"]; referencedRelation: "bookings"; referencedColumns: ["id"] }
        ]
      }

      warranties: {
        Row: {
          id:            string
          booking_id:    string
          duration_days: number
          starts_at:     string
          expires_at:    string
          terms:         string | null
          created_at:    string
        }
        Insert: {
          id?:            string
          booking_id:     string
          duration_days:  number
          starts_at:      string
          expires_at:     string
          terms?:         string | null
        }
        Update: {
          terms?: string | null
        }
        Relationships: [
          { foreignKeyName: "warranties_booking_id_fkey"; columns: ["booking_id"]; referencedRelation: "bookings"; referencedColumns: ["id"] }
        ]
      }

      reviews: {
        Row: {
          id:               string
          booking_id:       string
          customer_id:      string
          provider_id:      string
          rating:           number
          quality_score:    number | null
          price_score:      number | null
          timeliness_score: number | null
          comment:          string | null
          created_at:       string
        }
        Insert: {
          id?:               string
          booking_id:        string
          customer_id:       string
          provider_id:       string
          rating:            number
          quality_score?:    number | null
          price_score?:      number | null
          timeliness_score?: number | null
          comment?:          string | null
        }
        Update: {
          rating?:           number
          quality_score?:    number | null
          price_score?:      number | null
          timeliness_score?: number | null
          comment?:          string | null
        }
        Relationships: [
          { foreignKeyName: "reviews_booking_id_fkey";   columns: ["booking_id"];   referencedRelation: "bookings";          referencedColumns: ["id"] },
          { foreignKeyName: "reviews_customer_id_fkey";  columns: ["customer_id"];  referencedRelation: "users";             referencedColumns: ["id"] },
          { foreignKeyName: "reviews_provider_id_fkey";  columns: ["provider_id"];  referencedRelation: "provider_profiles"; referencedColumns: ["id"] }
        ]
      }

      notifications: {
        Row: {
          id:         string
          user_id:    string
          type:       NotificationType
          title:      string
          body:       string
          payload:    Record<string, unknown>
          read:       boolean
          created_at: string
        }
        Insert: {
          id?:         string
          user_id:     string
          type:        NotificationType
          title:       string
          body:        string
          payload?:    Record<string, unknown>
          read?:       boolean
        }
        Update: {
          read?:    boolean
          payload?: Record<string, unknown>
        }
        Relationships: [
          { foreignKeyName: "notifications_user_id_fkey"; columns: ["user_id"]; referencedRelation: "users"; referencedColumns: ["id"] }
        ]
      }

      admin_audit_logs: {
        Row: {
          id:          string
          admin_id:    string
          action:      string
          target_type: string
          target_id:   string | null
          details:     Record<string, unknown>
          ip_address:  string | null
          user_agent:  string | null
          created_at:  string
        }
        Insert: {
          id?:          string
          admin_id:     string
          action:       string
          target_type:  string
          target_id?:   string | null
          details?:     Record<string, unknown>
          ip_address?:  string | null
          user_agent?:  string | null
        }
        Update: {
          details?: Record<string, unknown>
        }
        Relationships: [
          { foreignKeyName: "admin_audit_logs_admin_id_fkey"; columns: ["admin_id"]; referencedRelation: "users"; referencedColumns: ["id"] }
        ]
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      find_nearby_providers: {
        Args: {
          lat:         number
          lng:         number
          radius_km?:  number
          category_id?: string
        }
        Returns: Array<{
          id:                  string
          user_id:             string
          business_name:       string
          description:         string | null
          categories:          string[]
          verification_status: string
          rating_avg:          number
          total_reviews:       number
          service_radius_km:   number
          doorstep_available:  boolean
          address:             string | null
          distance_km:         number
          provider_name:       string
          provider_avatar_url: string | null
        }>
      }
      submit_technician_application: {
        Args: {
          p_business_name:      string
          p_description?:        string | null
          p_categories?:         string[]
          p_service_radius_km?:  number
          p_doorstep_available?: boolean
          p_address?:            string | null
          p_identity_doc_url?:   string | null
          p_contact_name?:       string | null
          p_phone?:              string | null
        }
        Returns: Record<string, unknown>
      }
    }

    Enums: {
      user_role:           UserRole
      booking_status:      BookingStatus
      service_type:        ServiceType
      verification_status: VerificationStatus
      payment_status:      PaymentStatus
      payment_method:      PaymentMethod
      notification_type:   NotificationType
    }

    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ── Convenience row type aliases ───────────────────────────────────────────────

export type User            = Database["public"]["Tables"]["users"]["Row"]
export type Category        = Database["public"]["Tables"]["categories"]["Row"]
export type ProviderProfile = Database["public"]["Tables"]["provider_profiles"]["Row"]
export type Product         = Database["public"]["Tables"]["products"]["Row"]
export type Booking         = Database["public"]["Tables"]["bookings"]["Row"]
export type RepairStatusLog = Database["public"]["Tables"]["repair_status_log"]["Row"]
export type Quotation       = Database["public"]["Tables"]["quotations"]["Row"]
export type Payment         = Database["public"]["Tables"]["payments"]["Row"]
export type Warranty        = Database["public"]["Tables"]["warranties"]["Row"]
export type Review          = Database["public"]["Tables"]["reviews"]["Row"]
export type Notification    = Database["public"]["Tables"]["notifications"]["Row"]
export type AdminAuditLog   = Database["public"]["Tables"]["admin_audit_logs"]["Row"]

export type NearbyProvider  = Database["public"]["Functions"]["find_nearby_providers"]["Returns"][number]

// ── Enriched join type used in UI ──────────────────────────────────────────────

export interface BookingWithDetails extends Booking {
  products:          (Product & { categories: Pick<Category, "name" | "icon_url"> | null }) | null
  provider_profiles: (Pick<ProviderProfile, "id" | "business_name" | "rating_avg" | "verification_status"> & {
    users: Pick<User, "name" | "avatar_url"> | null
  }) | null
  payments:          Payment | null
  warranties:        Warranty | null
  reviews:           Review | null
}
