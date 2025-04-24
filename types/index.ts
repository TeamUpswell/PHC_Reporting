export interface HealthcareCenter {
  id: string;
  name: string;
  address: string;
  area?: string;
  lga?: string;
  state?: string;
  coordinates?: [number, number]; // [longitude, latitude]
  created_at?: string;
  phone?: string;
  working_hours?: string;
  vaccination_days?: string;
  is_treatment_area: boolean; // Add this field
  [key: string]: any; // For any other properties
}

export interface MonthlyReport {
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
}
