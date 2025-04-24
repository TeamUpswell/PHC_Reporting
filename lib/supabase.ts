import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      healthcare_centers: {
        Row: {
          id: string;
          name: string;
          state?: string; // Added state field
          area?: string;  // Made area optional
          lga?: string;   // Made lga optional
          address: string;
          phone?: string;
          vaccination_days?: string;
          working_hours?: string;
          latitude?: number | null;
          longitude?: number | null;
          [key: string]: any; // Add index signature for flexibility
        };
        Insert: {
          id?: string;
          name: string;
          state?: string;
          area?: string;
          lga?: string;
          address: string;
          phone?: string;
          vaccination_days?: string;
          working_hours?: string;
          latitude?: number | null;
          longitude?: number | null;
          [key: string]: any;
        };
        Update: {
          id?: string;
          name?: string;
          state?: string;
          area?: string;
          lga?: string;
          address?: string;
          phone?: string;
          vaccination_days?: string;
          working_hours?: string;
          latitude?: number | null;
          longitude?: number | null;
          [key: string]: any;
        };
      };
      monthly_reports: {
        Row: {
          id: string;
          center_id: string;
          report_month: string;
          in_stock: boolean;
          stock_beginning: number;
          stock_end: number;
          shortage: boolean;
          shortage_response: string | null;
          outreach: boolean;
          fixed_doses: number;
          outreach_doses: number;
          total_doses: number;
          misinformation: string | null;
          dhis_check: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          center_id: string;
          report_month: string;
          in_stock: boolean;
          stock_beginning: number;
          stock_end: number;
          shortage: boolean;
          shortage_response?: string | null;
          outreach: boolean;
          fixed_doses: number;
          outreach_doses: number;
          total_doses?: number;
          misinformation?: string | null;
          dhis_check: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          center_id?: string;
          report_month?: string;
          in_stock?: boolean;
          stock_beginning?: number;
          stock_end?: number;
          shortage?: boolean;
          shortage_response?: string | null;
          outreach?: boolean;
          fixed_doses?: number;
          outreach_doses?: number;
          total_doses?: number;
          misinformation?: string | null;
          dhis_check?: boolean;
          created_at?: string;
        };
      };
    };
  };
};

export type HealthcareCenter =
  Database["public"]["Tables"]["healthcare_centers"]["Row"];
export type MonthlyReport =
  Database["public"]["Tables"]["monthly_reports"]["Row"];
