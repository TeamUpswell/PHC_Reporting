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
export const exportReportsToCSV = async () => {
  try {
    // Fetch all monthly reports
    const { data, error } = await supabase
      .from("monthly_reports")
      .select(`
        id,
        center_id,
        report_month,
        in_stock,
        stock_beginning,
        stock_end,
        shortage,
        shortage_response,
        fixed_doses,
        outreach,
        outreach_doses,
        total_doses,
        misinformation,
        dhis_check,
        created_at,
        created_by,
        updated_at
      `);

    if (error) throw error;

    if (!data || data.length === 0) {
      return { success: false, error: "No data found" };
    }

    // Define CSV headers
    const headers = [
      "ID",
      "Report Month",
      "In Stock",
      "Stock Beginning",
      "Stock End",
      "Shortage",
      "Shortage Response",
      "Outreach",
      "Fixed Doses",
      "Outreach Doses",
      "Total Doses",
      "Misinformation",
      "DHIS Check",
      "Created At",
      "Center ID",
      "Created By",
      "Updated At"
    ];

    // Convert data to CSV rows
    const rows = data.map((report) => [
      report.id || "",
      report.report_month ? format(parseISO(report.report_month), "MMMM yyyy") : "",
      report.in_stock ? "Yes" : "No",
      report.stock_beginning || 0,
      report.stock_end || 0,
      report.shortage ? "Yes" : "No",
      report.shortage_response || "",
      report.outreach ? "Yes" : "No",
      report.fixed_doses || 0,
      report.outreach_doses || 0,
      report.total_doses || 0,
      report.misinformation || "",
      report.dhis_check ? "Yes" : "No",
      report.created_at ? format(parseISO(report.created_at), "yyyy-MM-dd HH:mm:ss") : "",
      report.center_id || "",
      report.created_by || "",
      report.updated_at ? new Date(report.updated_at).toLocaleString() : ""
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");

    // Create a Blob and save the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const fileName = `monthly_reports-${format(new Date(), "yyyy-MM-dd")}.csv`;
    saveAs(blob, fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error("Error exporting reports:", error);
    return { success: false, error };
  }
};

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
