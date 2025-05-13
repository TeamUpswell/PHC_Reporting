import * as XLSX from "xlsx";

export interface ParsedRow {
  [key: string]: string | number | boolean | null;
}

// Define expected columns based on your database schema
export const requiredColumns = [
  "PHC Name",
  "Month",
  "Year",
  "Stock Beginning",
  "Stock End",
  "Fixed Doses",
  "Outreach Doses",
];

// Define optional columns
export const optionalColumns = [
  "In Stock",
  "Shortage",
  "Shortage Response",
  "Outreach",
  "Misinformation",
  "DHIS Check",
];

export async function parseSpreadsheet(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error("Failed to read file"));
          return;
        }

        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON with header row as keys
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet);

        // Validate required columns
        const validationResult = validateRequiredColumns(
          jsonData,
          requiredColumns
        );
        if (!validationResult.valid) {
          reject(
            new Error(
              `Missing required columns: ${validationResult.missingColumns.join(
                ", "
              )}`
            )
          );
          return;
        }

        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };

    reader.readAsBinaryString(file);
  });
}

export function validateRequiredColumns(
  data: ParsedRow[],
  requiredColumns: string[]
): { valid: boolean; missingColumns: string[] } {
  if (!data || data.length === 0) {
    return { valid: false, missingColumns: ["No data found"] };
  }

  const firstRow = data[0];
  const headers = Object.keys(firstRow);

  // Case-insensitive check for required columns
  const missingColumns = requiredColumns.filter((required) => {
    const normalizedRequired = required.toLowerCase().replace(/\s+/g, "");
    return !headers.some(
      (header) =>
        header.toLowerCase().replace(/\s+/g, "") === normalizedRequired
    );
  });

  return {
    valid: missingColumns.length === 0,
    missingColumns,
  };
}
