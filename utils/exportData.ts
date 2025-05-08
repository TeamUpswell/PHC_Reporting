import { saveAs } from "file-saver";
import { format, parseISO } from "date-fns";
import { supabase } from "../lib/supabase";
import { HealthcareCenter, MonthlyReport } from "../types";
import Papa from "papaparse";

/**
 * Export healthcare centers to CSV
 */
export const exportCentersToCSV = async () => {
  try {
    // Fetch all healthcare centers
    const { data: centers, error } = await supabase
      .from("healthcare_centers")
      .select("*")
      .order("name");

    if (error) throw error;
    if (!centers || centers.length === 0) {
      throw new Error("No healthcare centers found to export");
    }

    // Define CSV headers based on your center data structure
    const headers = [
      "ID",
      "Area",
      "Name",
      "LGA",
      "Address",
      "Phone",
      "Vaccination Days",
      "Working Hours",
      "Latitude",
      "Longitude",
      "State",
      "Is Treatment Area",
      "Created By"
    ];

    // Convert data to CSV rows
    const rows = centers.map((center) => [
      center.id || "",
      `"${center.area?.replace(/"/g, '""') || ""}"`,
      `"${center.name?.replace(/"/g, '""') || ""}"`,
      `"${center.lga?.replace(/"/g, '""') || ""}"`,
      `"${center.address?.replace(/"/g, '""') || ""}"`,
      `"${center.phone?.replace(/"/g, '""') || ""}"`,
      `"${center.vaccination_days?.replace(/"/g, '""') || ""}"`,
      `"${center.working_hours?.replace(/"/g, '""') || ""}"`,
      center.latitude || "",
      center.longitude || "",
      `"${center.state?.replace(/"/g, '""') || ""}"`,
      center.is_treatment_area ? "Yes" : "No",
      `"${center.created_by?.replace(/"/g, '""') || ""}"`,
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Create a Blob and save the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const fileName = `healthcare-centers-${format(
      new Date(),
      "yyyy-MM-dd"
    )}.csv`;
    saveAs(blob, fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error("Error exporting centers:", error);
    return { success: false, error };
  }
};

/**
 * Export monthly reports to CSV
 */
export async function exportReportsToCSV(dateRange?: { start: Date; end: Date }) {
  try {
    // Fetch all monthly reports
    let query = supabase.from("monthly_reports").select(`
      *,
      center:healthcare_centers(id, name, area, lga, state)
    `);
    
    // Apply date range filter if provided
    if (dateRange) {
      const startDate = format(dateRange.start, "yyyy-MM-dd");
      const endDate = format(dateRange.end, "yyyy-MM-dd");
      query = query.gte("report_month", startDate).lte("report_month", endDate);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return { success: false, error: "No data found" };
    }
    
    // Format data for CSV with all columns
    const csvData = data.map(report => ({
      "ID": report.id || "",
      "Report Month": format(parseISO(report.report_month), "MMMM yyyy"),
      "In Stock": report.in_stock ? "Yes" : "No",
      "Stock Beginning": report.stock_beginning || 0,
      "Stock End": report.stock_end || 0,
      "Shortage": report.shortage ? "Yes" : "No",
      "Shortage Response": report.shortage_response || "",
      "Outreach": report.outreach ? "Yes" : "No",
      "Fixed Doses": report.fixed_doses || 0,
      "Outreach Doses": report.outreach_doses || 0,
      "Total Doses": report.total_doses || 0,
      "Misinformation": report.misinformation || "",
      "DHIS Check": report.dhis_check ? "Yes" : "No",
      "Created At": report.created_at ? format(parseISO(report.created_at), "yyyy-MM-dd HH:mm:ss") : "",
      "Center ID": report.center_id || "",
      "Center Name": report.center?.name || "Unknown",
      "Created By": report.created_by || "",
      "Center Area": report.center?.area || "",
      "Center LGA": report.center?.lga || "",
      "Center State": report.center?.state || ""
    }));
    
    // Generate CSV string
    const csv = Papa.unparse(csvData);
    
    // Create file name
    const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
    const fileName = `monthly_reports_${timestamp}.csv`;
    
    // Create download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return { success: true, fileName };
  } catch (error) {
    console.error("Error in exportReportsToCSV:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Export combined data to Excel (XLSX)
 * Note: This requires xlsx package to be installed
 */
export const exportToExcel = async () => {
  try {
    // This is a placeholder in case you want to implement Excel export later
    // You would need to install the xlsx package: npm install xlsx
    throw new Error("Excel export not implemented yet");
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    return { success: false, error };
  }
};
