import React from "react";
import { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { HealthcareCenter } from "../types";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import Link from "next/link";

// Define structure for center data
interface CenterReportData {
  // Stock information
  in_stock: boolean;
  stock_beginning: number | "";
  stock_end: number | "";
  shortage: boolean;
  shortage_response: string;

  // Doses information
  fixed_doses: number | "";
  outreach: boolean;
  outreach_doses: number | "";
  total_doses: number; // Keep this as number only since it's calculated

  // Additional information
  misinformation: string;
  dhis_check: boolean;
}

// Add this type near your other interface definitions
type NumericField =
  | "stock_beginning"
  | "stock_end"
  | "fixed_doses"
  | "outreach_doses"
  | "total_doses";

// Add this interface near the top of your file with other type definitions:
interface DuplicateRecord {
  row: number;
  centerName: string;
  month: string;
  year: string;
}

export default function BulkEntry() {
  const router = useRouter();
  const { user } = useAuth(); // Add this line to get the authenticated user
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [centers, setCenters] = useState<HealthcareCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [reportMonth, setReportMonth] = useState<string>(
    new Date().toISOString().substring(0, 7) // Default to current month (YYYY-MM)
  );

  // Center data state
  const [centerData, setCenterData] = useState<
    Record<string, CenterReportData>
  >({});

  // Add this near your other state declarations
  const [centerLastReportMonths, setCenterLastReportMonths] = useState<
    Record<string, string>
  >({});

  // Notes modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCenter, setActiveCenter] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [notesText, setNotesText] = useState("");
  const [notesType, setNotesType] = useState<"misinformation" | "shortage">(
    "misinformation"
  );

  // Unsaved changes state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track modified center IDs
  const [modifiedCenterIds, setModifiedCenterIds] = useState<Set<string>>(
    new Set()
  );

  // Track centers with existing data
  const [centersWithExistingData, setCentersWithExistingData] = useState<
    Set<string>
  >(new Set());

  // Hide reported centers state
  const [hideReportedCenters, setHideReportedCenters] = useState(false);

  useEffect(() => {
    fetchStates();
  }, []);

  useEffect(() => {
    if (selectedState) {
      fetchCenters(selectedState);
    } else {
      setCenters([]);
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedState) {
      fetchCenters(selectedState);
    }
  }, [reportMonth]); // Re-fetch when month changes

  useEffect(() => {
    // Check for URL parameters
    const queryParams = router.query;
    if (queryParams.state) {
      setSelectedState(queryParams.state as string);
    }

    if (queryParams.month) {
      setReportMonth(queryParams.month as string);
    }

    if (queryParams.center) {
      // This will pre-select a specific center for editing
      const centerId = queryParams.center as string;
      // You may need to implement logic to scroll to or highlight this center in your UI
    }
  }, [router.query]);

  const fetchStates = async () => {
    try {
      const { data: centersData, error } = await supabase
        .from("healthcare_centers")
        .select("state")
        .not("state", "is", null);

      if (error) throw error;

      // Extract unique states
      const uniqueStates = Array.from(
        new Set(centersData.map((center) => center.state))
      ).sort();

      setStates(uniqueStates as string[]);
    } catch (error) {
      console.error("Error fetching states:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCenters = async (state: string) => {
    setLoading(true);
    try {
      // Fetch centers first
      const { data: centersData, error: centersError } = await supabase
        .from("healthcare_centers")
        .select("*")
        .eq("state", state)
        .order("name");

      if (centersError) throw centersError;
      setCenters(centersData || []);

      // Format date for database
      const reportDate = new Date(`${reportMonth}-01`).toISOString();

      // Initialize empty data structure
      const initialData: Record<string, CenterReportData> = {};
      centersData?.forEach((center) => {
        initialData[center.id] = {
          in_stock: false,
          stock_beginning: 0,
          stock_end: 0,
          shortage: false,
          shortage_response: "",
          fixed_doses: 0,
          outreach: false,
          outreach_doses: 0,
          total_doses: 0,
          misinformation: "",
          dhis_check: false,
        };
      });

      // Fetch existing reports for the selected month
      const { data: reportsData, error: reportsError } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("report_month", reportDate.substring(0, 10));

      if (reportsError) throw reportsError;

      console.log("Reports data fetched:", reportsData);

      // Track centers that already have data for this month
      const centersWithData = new Set<string>();
      if (reportsData && reportsData.length > 0) {
        reportsData.forEach((report) => {
          if (initialData[report.center_id]) {
            centersWithData.add(report.center_id);
            initialData[report.center_id] = {
              in_stock: report.in_stock,
              stock_beginning: report.stock_beginning,
              stock_end: report.stock_end,
              shortage: report.shortage,
              shortage_response: report.shortage_response || "",
              fixed_doses: report.fixed_doses,
              outreach: report.outreach,
              outreach_doses: report.outreach_doses,
              total_doses:
                Number(report.fixed_doses || 0) +
                Number(report.outreach_doses || 0),
              misinformation: report.misinformation || "",
              dhis_check: report.dhis_check,
            };
          }
        });
      }
      setCentersWithExistingData(centersWithData);

      // Fetch the latest reports for each center
      const { data: latestReportsData, error: latestReportsError } =
        await supabase
          .from("monthly_reports")
          .select("center_id, report_month, created_at")
          .in(
            "center_id",
            centersData.map((center) => center.id)
          )
          .order("report_month", { ascending: false });

      if (latestReportsError) throw latestReportsError;

      // Process to get the latest month for each center
      const lastReportMonths: Record<string, string> = {};
      if (latestReportsData && latestReportsData.length > 0) {
        // Group reports by center_id
        const centerReports: Record<string, any[]> = {};
        latestReportsData.forEach((report) => {
          if (!centerReports[report.center_id]) {
            centerReports[report.center_id] = [];
          }
          centerReports[report.center_id].push(report);
        });

        // Get most recent report for each center
        Object.entries(centerReports).forEach(([centerId, reports]) => {
          // Sort by date (newest first)
          reports.sort(
            (a, b) =>
              new Date(b.report_month).getTime() -
              new Date(a.report_month).getTime()
          );
          // Get the month of the most recent report
          if (reports.length > 0) {
            lastReportMonths[centerId] = reports[0].report_month.substring(
              0,
              7
            );
          }
        });
      }

      setCenterLastReportMonths(lastReportMonths);

      setCenterData(initialData);
      setHasUnsavedChanges(false); // Reset since we just loaded data
      setModifiedCenterIds(new Set()); // Reset modified centers
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generic handlers for different field types
  const handleCheckboxChange = (
    centerId: string,
    field: string,
    checked: boolean
  ) => {
    setCenterData((prev) => ({
      ...prev,
      [centerId]: {
        ...prev[centerId],
        [field]: checked,
      },
    }));

    // Track this center as modified
    setModifiedCenterIds((prev) => new Set(prev).add(centerId));
    setHasUnsavedChanges(true);
  };

  const handleNumberChange = (
    centerId: string,
    field: string,
    value: string
  ) => {
    const numValue = parseInt(value, 10) || 0;

    setCenterData((prev) => {
      const updatedCenter = { ...prev[centerId], [field]: numValue };

      // Auto-calculate total doses if fixed_doses or outreach_doses changes
      if (field === "fixed_doses" || field === "outreach_doses") {
        const fixedDoses =
          field === "fixed_doses" ? numValue : prev[centerId]?.fixed_doses || 0;

        const outreachDoses =
          field === "outreach_doses"
            ? numValue
            : prev[centerId]?.outreach_doses || 0;

        updatedCenter.total_doses = fixedDoses + outreachDoses;
      }

      return {
        ...prev,
        [centerId]: updatedCenter,
      };
    });

    // Track this center as modified
    setModifiedCenterIds((prev) => new Set(prev).add(centerId));
    setHasUnsavedChanges(true);
  };

  const handleTextChange = (centerId: string, field: string, value: string) => {
    setCenterData((prev) => ({
      ...prev,
      [centerId]: {
        ...prev[centerId],
        [field]: value,
      },
    }));

    // Track this center as modified
    setModifiedCenterIds((prev) => new Set(prev).add(centerId));
    setHasUnsavedChanges(true);
  };

  const handleInputFocus = (centerId: string, field: NumericField) => {
    if (centerData[centerId]?.[field] === 0) {
      // Create a temporary copy without modifying the actual data
      const updatedData = {
        ...centerData,
        [centerId]: {
          ...centerData[centerId],
          [field]: "",
        },
      };
      setCenterData(updatedData);
    }
  };

  const handleInputBlur = (centerId: string, field: NumericField) => {
    if (centerData[centerId]?.[field] === "") {
      // When field is left empty, revert to zero
      const updatedData = {
        ...centerData,
        [centerId]: {
          ...centerData[centerId],
          [field]: 0,
        },
      };
      setCenterData(updatedData);
    }
  };

  const openNotesModal = (
    center: { id: string; name: string },
    type: "misinformation" | "shortage"
  ) => {
    setActiveCenter(center);
    setNotesType(type);

    if (type === "misinformation") {
      setNotesText(centerData[center.id]?.misinformation || "");
    } else {
      setNotesText(centerData[center.id]?.shortage_response || "");
    }

    setModalOpen(true);
  };

  const saveNotes = () => {
    if (activeCenter) {
      if (notesType === "misinformation") {
        handleTextChange(activeCenter.id, "misinformation", notesText);
      } else {
        handleTextChange(activeCenter.id, "shortage_response", notesText);
      }
    }
    setModalOpen(false);
  };

  const saveAllData = async () => {
    setIsSaving(true);

    try {
      // Add before saving
      if (!user) {
        setMessage({
          text: "You must be logged in to save data",
          type: "error",
        });
        setIsSaving(false);
        return;
      }

      // Filter reports to only include modified centers
      const reportsToInsert = Object.entries(centerData)
        .filter(([centerId]) => modifiedCenterIds.has(centerId))
        .map(([centerId, report]) => {
          const fixedDoses = report.fixed_doses;
          const outreachDoses = report.outreach_doses;
          const shortage = report.shortage;
          const outreach = report.outreach;
          const dhisCheck = report.dhis_check;

          // Add default values for all required fields
          const dataToSubmit = {
            center_id: centerId,
            report_month: `${reportMonth}-01`,
            in_stock: report.in_stock,
            stock_beginning: report.stock_beginning,
            stock_end: report.stock_end,
            shortage_response: report.shortage_response || null,
            misinformation: report.misinformation || null,
            created_at: new Date().toISOString(),
            created_by: user.id,
            fixed_doses: fixedDoses || 0, // Default to 0 if blank
            outreach_doses: outreachDoses || 0, // Default to 0 if blank
            total_doses: (fixedDoses || 0) + (outreachDoses || 0), // Calculate total
            shortage: shortage || false, // Default to false if not specified
            outreach: outreach || false,
            dhis_check: dhisCheck || false,
          };

          return dataToSubmit;
        });

      if (reportsToInsert.length === 0) {
        setMessage({
          text: "No changes were made to any centers.",
          type: "error",
        });
        setIsSaving(false);
        return;
      }

      // Insert/upsert data only for modified centers
      const { error } = await supabase
        .from("monthly_reports")
        .upsert(reportsToInsert, {
          onConflict: "center_id,report_month",
          ignoreDuplicates: false,
        });

      if (error) {
        let errorMessage = "An error occurred while saving data";
        // For Supabase specific errors
        if ("code" in error && error.code === "23505") {
          errorMessage = "A report already exists for this center and month";
        }
        setMessage({
          text: errorMessage,
          type: "error",
        });
        throw error;
      }

      // Refetch all centers data for the current state and month
      await fetchCenters(selectedState);

      setMessage({
        text: `Updated data for ${reportsToInsert.length} centers`,
        type: "success",
      });

      // Reset the modified centers tracking after successful save
      setModifiedCenterIds(new Set());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving data:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to convert month name to number
  const getMonthNumber = (monthName: string): string => {
    const months: Record<string, string> = {
      January: "01",
      February: "02",
      March: "03",
      April: "04",
      May: "05",
      June: "06",
      July: "07",
      August: "08",
      September: "09",
      October: "10",
      November: "11",
      December: "12",
    };
    return months[monthName] || "01";
  };

  // Helper to lookup center ID from name
  const getCenterIdFromName = (centerName: string): string => {
    // You'll need to implement this based on your centers data
    // This should return the UUID of the center matching the name
    const center = centers.find((c) => c.name === centerName);
    return center?.id || "";
  };

  // Add this function to your bulk upload component:
  const removeDuplicates = (csvData: any[]) => {
    const uniqueRecords = new Map();
    const duplicates: DuplicateRecord[] = [];

    csvData.forEach((row, index) => {
      // Create a unique key based on center name and month/year
      const key = `${row["PHC Name"]}-${row["Month"]}-${row["Year"]}`;

      if (uniqueRecords.has(key)) {
        console.warn(`Duplicate found at row ${index + 2}:`, row); // +2 because CSV is 1-indexed + header
        duplicates.push({
          row: index + 2,
          centerName: row["PHC Name"],
          month: row["Month"],
          year: row["Year"],
        });
      } else {
        uniqueRecords.set(key, { ...row, originalRow: index + 2 });
      }
    });

    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicates:`, duplicates);
      alert(
        `Warning: Found ${duplicates.length} duplicate entries. Only the first occurrence of each will be processed.`
      );
    }

    return {
      cleanData: Array.from(uniqueRecords.values()),
      duplicates,
      originalCount: csvData.length,
      uniqueCount: uniqueRecords.size,
    };
  };

  // Then in your upload processing:
  const processCSVUpload = async (csvData: any[]) => {
    try {
      // Remove duplicates first
      const { cleanData, duplicates, originalCount, uniqueCount } =
        removeDuplicates(csvData);

      if (duplicates.length > 0) {
        console.log(`Removed ${originalCount - uniqueCount} duplicate records`);
      }

      // Process the clean data
      const processedData = cleanData.map((row) => {
        // Your existing CSV processing logic here
        return {
          center_id: getCenterIdFromName(row["PHC Name"]), // You'll need this lookup
          report_month: `${row["Year"]}-${getMonthNumber(row["Month"])}-01`,
          stock_beginning: parseInt(row["Stock Beginning"]) || 0,
          stock_end: parseInt(row["Stock End"]) || 0,
          fixed_doses: parseInt(row["Fixed Doses"]) || 0,
          outreach_doses: parseInt(row["Outreach Doses"]) || 0,
          total_doses:
            (parseInt(row["Fixed Doses"]) || 0) +
            (parseInt(row["Outreach Doses"]) || 0),
          in_stock: row["In Stock"]?.toLowerCase() === "yes",
          shortage: row["Shortage"]?.toLowerCase() === "yes",
          shortage_response: row["Shortage Response"] || null,
          outreach: row["Outreach"]?.toLowerCase() === "yes",
          misinformation: row["Misinformation"] || null,
          dhis_check: row["DHIS Check"]?.toLowerCase() === "yes",
          created_by: user?.id,
          created_at: new Date().toISOString(),
        };
      });

      // Upload to Supabase
      const { error } = await supabase
        .from("monthly_reports")
        .upsert(processedData, {
          onConflict: "center_id,report_month",
          ignoreDuplicates: false,
        });

      if (error) throw error;

      return {
        success: true,
        processed: uniqueCount,
        duplicatesRemoved: originalCount - uniqueCount,
      };
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  // Render the all fields table
  const renderAllFieldsTable = () => {
    if (!centers || centers.length === 0) return null;

    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10"
            >
              Center Name
            </th>
            {/* Stock columns */}
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              In Stock
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Stock Begin
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Stock End
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Shortage
            </th>
            {/* Doses columns */}
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Fixed Doses
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Outreach
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Outreach Doses
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Total Doses
            </th>
            {/* Additional columns */}
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              DHIS2
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Notes
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {centers
            .filter(
              (center) =>
                !hideReportedCenters || !centersWithExistingData.has(center.id)
            )
            .map((center, index) => (
              <tr
                key={`${center.id}-${index}`}
                className={`
                  ${center.is_treatment_area ? "bg-green-50" : ""}
                  ${modifiedCenterIds.has(center.id) ? "bg-blue-50" : ""}
                  ${
                    centersWithExistingData.has(center.id)
                      ? "border-l-4 border-green-500"
                      : ""
                  }
                `}
              >
                <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                  <div className="text-sm font-medium text-gray-900">
                    {center.name}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {center.is_treatment_area && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Treatment Area
                      </span>
                    )}
                    {centersWithExistingData.has(center.id) && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Reported
                      </span>
                    )}
                    {centerLastReportMonths[center.id] && (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          centerLastReportMonths[center.id] === reportMonth
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                        title="Last reported month"
                      >
                        Last: {centerLastReportMonths[center.id]}
                      </span>
                    )}
                  </div>
                </td>
                {/* Stock fields */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    id={`in-stock-${center.id}-${index}`}
                    aria-label={`In stock status for ${center.name}`}
                    value={centerData[center.id]?.in_stock ? "true" : "false"}
                    onChange={(e) =>
                      handleCheckboxChange(
                        center.id,
                        "in_stock",
                        e.target.value === "true"
                      )
                    }
                    className="border border-gray-300 rounded-md p-1 text-sm"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    id={`stock-beginning-${center.id}-${index}`}
                    aria-label={`Stock beginning for ${center.name}`}
                    min="0"
                    value={centerData[center.id]?.stock_beginning}
                    onChange={(e) =>
                      handleNumberChange(
                        center.id,
                        "stock_beginning",
                        e.target.value
                      )
                    }
                    onFocus={() =>
                      handleInputFocus(center.id, "stock_beginning")
                    }
                    onBlur={() => handleInputBlur(center.id, "stock_beginning")}
                    className="w-24 border border-gray-300 rounded-md p-1 text-sm"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    id={`stock-end-${center.id}-${index}`}
                    aria-label={`Stock end for ${center.name}`}
                    min="0"
                    value={centerData[center.id]?.stock_end}
                    onChange={(e) =>
                      handleNumberChange(center.id, "stock_end", e.target.value)
                    }
                    onFocus={() => handleInputFocus(center.id, "stock_end")}
                    onBlur={() => handleInputBlur(center.id, "stock_end")}
                    className="w-24 border border-gray-300 rounded-md p-1 text-sm"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    id={`shortage-${center.id}-${index}`}
                    aria-label={`Shortage status for ${center.name}`}
                    value={centerData[center.id]?.shortage ? "true" : "false"}
                    onChange={(e) =>
                      handleCheckboxChange(
                        center.id,
                        "shortage",
                        e.target.value === "true"
                      )
                    }
                    className="border border-gray-300 rounded-md p-1 text-sm"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </td>
                {/* Doses fields */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    id={`fixed-doses-${center.id}-${index}`}
                    aria-label={`Fixed doses for ${center.name}`}
                    min="0"
                    value={centerData[center.id]?.fixed_doses}
                    onChange={(e) =>
                      handleNumberChange(
                        center.id,
                        "fixed_doses",
                        e.target.value
                      )
                    }
                    onFocus={() => handleInputFocus(center.id, "fixed_doses")}
                    onBlur={() => handleInputBlur(center.id, "fixed_doses")}
                    className="w-24 border border-gray-300 rounded-md p-1 text-sm"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    id={`outreach-${center.id}-${index}`}
                    aria-label={`Outreach status for ${center.name}`}
                    value={centerData[center.id]?.outreach ? "true" : "false"}
                    onChange={(e) =>
                      handleCheckboxChange(
                        center.id,
                        "outreach",
                        e.target.value === "true"
                      )
                    }
                    className="border border-gray-300 rounded-md p-1 text-sm"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    id={`outreach-doses-${center.id}-${index}`}
                    aria-label={`Outreach doses for ${center.name}`}
                    min="0"
                    value={centerData[center.id]?.outreach_doses}
                    onChange={(e) =>
                      handleNumberChange(
                        center.id,
                        "outreach_doses",
                        e.target.value
                      )
                    }
                    onFocus={() =>
                      handleInputFocus(center.id, "outreach_doses")
                    }
                    onBlur={() => handleInputBlur(center.id, "outreach_doses")}
                    className={`w-24 border border-gray-300 rounded-md p-1 text-sm ${
                      !centerData[center.id]?.outreach ? "bg-gray-100" : ""
                    }`}
                    disabled={!centerData[center.id]?.outreach}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    id={`total-doses-${center.id}-${index}`}
                    aria-label={`Total doses for ${center.name} (calculated automatically)`}
                    value={centerData[center.id]?.total_doses || 0}
                    className="w-24 border border-gray-300 rounded-md p-1 text-sm bg-gray-100"
                    disabled
                  />
                </td>
                {/* Additional fields */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    id={`dhis-check-${center.id}-${index}`}
                    aria-label={`DHIS2 status for ${center.name}`}
                    value={centerData[center.id]?.dhis_check ? "true" : "false"}
                    onChange={(e) =>
                      handleCheckboxChange(
                        center.id,
                        "dhis_check",
                        e.target.value === "true"
                      )
                    }
                    className="border border-gray-300 rounded-md p-1 text-sm"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        openNotesModal(
                          { id: center.id, name: center.name },
                          "misinformation"
                        )
                      }
                      className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-100"
                    >
                      Notes
                    </button>
                    {centerData[center.id]?.misinformation && (
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-blue-500"
                        title="Has notes"
                      ></span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    );
  };

  return (
    // showNavbar to false to hide the Layout navbar
    <Layout showNavbar={false}>
      {/* Add your own single navbar here if needed */}
      {/* <Navbar /> */}

      <div className="container mx-auto px-4 py-8">
        <Head>
          <title>Bulk Data Entry - HPV Vaccination Reports</title>
        </Head>

        <h1 className="text-2xl font-bold mb-6">
          Bulk HPV Vaccination Data Entry
        </h1>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            {/* Your existing month selector likely goes here */}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => router.push("/spreadsheet-upload")}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="mr-2 -ml-1 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Import from Spreadsheet
            </button>

            {/* Your existing buttons (like Save, Export, etc) would go here */}
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 p-4 rounded ${
              message.type === "success"
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-100 text-red-700 border border-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* State selection */}
            <div>
              <label
                htmlFor="state-select"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select State
              </label>
              <select
                id="state-select"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
                disabled={loading}
              >
                <option value="">-- Select a State --</option>
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Month selection */}
            <div>
              <label
                htmlFor="month-select"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Report Month
              </label>
              <input
                id="month-select"
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>

          {selectedState && (
            <button
              onClick={saveAllData}
              disabled={
                isSaving || centers.length === 0 || modifiedCenterIds.size === 0
              }
              className={`font-medium py-2 px-4 rounded disabled:opacity-50 ${
                hasUnsavedChanges
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isSaving
                ? "Saving..."
                : hasUnsavedChanges
                ? "Save Changes*"
                : "Save All Data"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-10">Loading centers...</div>
        ) : centers.length > 0 ? (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            {/* Section header and instructions */}
            <div className="border-b border-gray-200 bg-gray-50 p-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-800">
                  Monthly HPV Vaccination Data
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Enter data for all centers in {selectedState} for{" "}
                  {reportMonth}
                </p>
              </div>
              <div className="flex items-center">
                <input
                  id="hide-reported"
                  type="checkbox"
                  checked={hideReportedCenters}
                  onChange={(e) => setHideReportedCenters(e.target.checked)}
                  className="h-4 w-4 text-blue-600"
                />
                <label
                  htmlFor="hide-reported"
                  className="ml-2 text-sm text-gray-700"
                >
                  Hide reported centers
                </label>
              </div>
            </div>

            {/* Table area with horizontal scrolling */}
            <div className="overflow-x-auto">{renderAllFieldsTable()}</div>
          </div>
        ) : selectedState ? (
          <div className="text-center py-10 bg-white shadow-md rounded-lg">
            No centers found in {selectedState}.
          </div>
        ) : (
          <div className="text-center py-10 bg-white shadow-md rounded-lg">
            Select a state to see centers.
          </div>
        )}

        {/* Floating save button for when users scroll down */}
        {selectedState && centers.length > 0 && modifiedCenterIds.size > 0 && (
          <div className="fixed bottom-8 right-8 z-20">
            <button
              onClick={saveAllData}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full shadow-lg disabled:opacity-50 flex items-center"
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>Save Changes ({modifiedCenterIds.size})</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Notes Modal */}
      {modalOpen && activeCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-medium mb-4">
              {notesType === "misinformation"
                ? `Misinformation/Challenges for ${activeCenter.name}`
                : `Shortage Response for ${activeCenter.name}`}
            </h3>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              className="w-full h-32 border border-gray-300 rounded-md p-2 mb-4"
              placeholder={
                notesType === "misinformation"
                  ? "Enter any notes about misinformation in the community or challenges faced"
                  : "Describe actions taken to address the shortage"
              }
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
