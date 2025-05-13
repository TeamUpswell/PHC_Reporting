import { supabase } from "../lib/supabase";
import { ParsedRow } from "./spreadsheetParser";

interface HealthcareCenter {
  id: string;
  name: string;
  state: string;
  lga: string;
}

interface ProcessedReport {
  center_id: string;
  center_name: string;
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
}

export async function processBulkReports(
  rawData: ParsedRow[],
  userId: string
): Promise<{
  processedReports: ProcessedReport[];
  errors: { row: number; message: string }[];
  unmatchedCenters: string[];
}> {
  // Fetch all healthcare centers for mapping
  const { data: centers, error } = await supabase
    .from("healthcare_centers")
    .select("id, name, state, lga");

  if (error) {
    throw new Error(`Error fetching healthcare centers: ${error.message}`);
  }

  const healthcareCenters = centers as HealthcareCenter[];
  const centerMap = new Map<string, HealthcareCenter>();

  // Create normalized name mapping for fuzzy matching
  healthcareCenters.forEach((center) => {
    // Store with normalized name as key for easier matching
    const normalizedName = normalizeName(center.name);
    centerMap.set(normalizedName, center);
  });

  const processedReports: ProcessedReport[] = [];
  const errors: { row: number; message: string }[] = [];
  const unmatchedCenters = new Set<string>();

  // Process each row
  rawData.forEach((row, index) => {
    try {
      // Find healthcare center by name (with fuzzy matching)
      const phcName = findColumnValue(row, [
        "PHC Name",
        "PHCName",
        "Center Name",
        "Healthcare Center",
      ]);

      if (!phcName) {
        errors.push({ row: index + 1, message: "Missing PHC name" });
        return;
      }

      const normalizedPhcName = normalizeName(phcName.toString());
      const center = centerMap.get(normalizedPhcName);

      if (!center) {
        unmatchedCenters.add(phcName.toString());
        errors.push({ row: index + 1, message: `PHC not found: "${phcName}"` });
        return;
      }

      // Extract month and year
      const month = findColumnValue(row, ["Month", "Report Month"]);
      const year = findColumnValue(row, ["Year", "Report Year"]);

      if (!month || !year) {
        errors.push({ row: index + 1, message: "Missing month or year" });
        return;
      }

      // Create date in YYYY-MM-01 format
      const reportMonth = formatReportMonth(year.toString(), month.toString());

      // Extract numeric values
      const stockBeginning = parseNumericValue(
        findColumnValue(row, [
          "Stock Beginning",
          "StockBeginning",
          "Beginning Stock",
        ])
      );
      const stockEnd = parseNumericValue(
        findColumnValue(row, ["Stock End", "StockEnd", "Ending Stock"])
      );
      const fixedDoses = parseNumericValue(
        findColumnValue(row, ["Fixed Doses", "FixedDoses"])
      );
      const outreachDoses = parseNumericValue(
        findColumnValue(row, ["Outreach Doses", "OutreachDoses"])
      );

      if (
        stockBeginning === null ||
        stockEnd === null ||
        fixedDoses === null ||
        outreachDoses === null
      ) {
        errors.push({
          row: index + 1,
          message: "Missing or invalid numeric values",
        });
        return;
      }

      // Extract boolean values with defaults
      const inStock = parseBooleanValue(
        findColumnValue(row, ["In Stock", "InStock"]),
        true
      );
      const shortage = parseBooleanValue(
        findColumnValue(row, ["Shortage"]),
        false
      );
      const outreach = parseBooleanValue(
        findColumnValue(row, ["Outreach"]),
        false
      );
      const dhisCheck = parseBooleanValue(
        findColumnValue(row, ["DHIS Check", "DHISCheck"]),
        false
      );

      // Extract optional text values
      const shortageResponse =
        findColumnValue(row, [
          "Shortage Response",
          "ShortageResponse",
        ])?.toString() || null;
      const misinformation =
        findColumnValue(row, ["Misinformation"])?.toString() || null;

      // Create processed report
      const processedReport: ProcessedReport = {
        center_id: center.id,
        center_name: center.name,
        report_month: reportMonth,
        in_stock: inStock,
        stock_beginning: stockBeginning,
        stock_end: stockEnd,
        shortage: shortage,
        shortage_response: shortageResponse,
        outreach: outreach,
        fixed_doses: fixedDoses,
        outreach_doses: outreachDoses,
        total_doses: fixedDoses + outreachDoses,
        misinformation: misinformation,
        dhis_check: dhisCheck,
      };

      processedReports.push(processedReport);
    } catch (error) {
      errors.push({
        row: index + 1,
        message:
          error instanceof Error
            ? error.message
            : "Unknown error processing row",
      });
    }
  });

  return {
    processedReports,
    errors,
    unmatchedCenters: Array.from(unmatchedCenters),
  };
}

// Helper to find column value with multiple possible column names
function findColumnValue(
  row: ParsedRow,
  possibleNames: string[]
): string | number | boolean | null {
  for (const name of possibleNames) {
    if (row[name] !== undefined) return row[name];

    // Try case-insensitive match
    const keys = Object.keys(row);
    const key = keys.find((k) => k.toLowerCase() === name.toLowerCase());
    if (key !== undefined) return row[key];
  }
  return null;
}

// Helper to normalize center names for better matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // Remove non-alphanumeric
    .trim();
}

// Helper to parse numeric values
function parseNumericValue(
  value: string | number | boolean | null
): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") return value;

  const parsed = parseInt(value.toString(), 10);
  return isNaN(parsed) ? null : parsed;
}

// Helper to parse boolean values
function parseBooleanValue(
  value: string | number | boolean | null,
  defaultValue: boolean
): boolean {
  if (value === null || value === undefined || value === "")
    return defaultValue;

  if (typeof value === "boolean") return value;

  if (typeof value === "number") return value !== 0;

  const normalized = value.toString().toLowerCase().trim();

  if (["yes", "true", "1", "y"].includes(normalized)) return true;
  if (["no", "false", "0", "n"].includes(normalized)) return false;

  return defaultValue;
}

// Helper to format report month
function formatReportMonth(year: string, month: string): string {
  // Convert month name to month number if needed
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  let monthNumber: number;

  // Check if month is a number already
  const parsedMonth = parseInt(month, 10);
  if (!isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
    monthNumber = parsedMonth;
  } else {
    // Try to parse month name
    const monthIndex = monthNames.findIndex((m) =>
      month.toLowerCase().includes(m)
    );

    if (monthIndex >= 0) {
      monthNumber = monthIndex + 1;
    } else {
      throw new Error(`Invalid month: ${month}`);
    }
  }

  // Ensure 4-digit year
  let yearNumber = parseInt(year, 10);
  if (yearNumber < 100) {
    // Assume 20xx for 2-digit years
    yearNumber = yearNumber < 50 ? 2000 + yearNumber : 1900 + yearNumber;
  }

  // Format as YYYY-MM-01
  return `${yearNumber}-${monthNumber.toString().padStart(2, "0")}-01`;
}

// Function to save the processed reports to the database
export async function saveProcessedReports(
  reports: ProcessedReport[],
  userId: string
): Promise<{ success: boolean; savedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let savedCount = 0;

  // Add created_by and created_at to each report
  const reportsToInsert = reports.map((report) => ({
    ...report,
    created_by: userId,
    created_at: new Date().toISOString(),
  }));

  // Process in batches of 100 to avoid hitting limits
  const batchSize = 100;
  for (let i = 0; i < reportsToInsert.length; i += batchSize) {
    const batch = reportsToInsert.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from("monthly_reports")
      .upsert(batch, {
        onConflict: "center_id,report_month",
        ignoreDuplicates: false,
      });

    if (error) {
      errors.push(`Batch ${i / batchSize + 1} error: ${error.message}`);
    } else {
      savedCount += batch.length;
    }
  }

  return {
    success: errors.length === 0,
    savedCount,
    errors,
  };
}
