import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Layout from "../components/Layout";
import SpreadsheetUploader from "../components/SpreadsheetUploader";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { ParsedRow } from "../utils/spreadsheetParser";
import {
  processBulkReports,
  saveProcessedReports,
} from "../utils/monthlyReportProcessor";

export const requiredColumns = [
  "PHC Name",
  "Month",
  "Year",
  // Remove the other fields from required - they can be blank
];

// Move the previously required fields to optional
export const optionalColumns = [
  "Stock Beginning",
  "Stock End",
  "Fixed Doses",
  "Outreach Doses",
  "In Stock",
  "Shortage",
  "Shortage Response",
  "Outreach",
  "Misinformation",
  "DHIS Check",
];

export default function SpreadsheetUploadPage() {
  const { user } = useAuth();
  const [uploadedData, setUploadedData] = useState<ParsedRow[] | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingErrors, setProcessingErrors] = useState<
    { row: number; message: string }[]
  >([]);
  const [unmatchedCenters, setUnmatchedCenters] = useState<string[]>([]);

  const handleFileLoaded = (data: ParsedRow[]) => {
    setUploadedData(data);
    setIsPreviewMode(true);
    setMessage(null);
    setProcessingErrors([]);
    setUnmatchedCenters([]);
  };

  const handleError = (error: string) => {
    setMessage({ text: error, type: "error" });
    setUploadedData(null);
  };

  const handleImport = async () => {
    if (!user) {
      setMessage({
        text: "You must be logged in to import data",
        type: "error",
      });
      return;
    }

    // Add extensive debugging
    console.log("=== AUTHENTICATION DEBUG ===");
    console.log("User from context:", user);
    console.log("User ID from context:", user.id);

    // Check the actual auth state
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    console.log("Auth user from supabase:", authUser);
    console.log("Auth error:", authError);

    // Check if they match
    console.log("IDs match:", user.id === authUser?.id);
    console.log("=== END DEBUG ===");

    if (!uploadedData || uploadedData.length === 0) {
      setMessage({
        text: "No data to import",
        type: "error",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Process the spreadsheet data
      const { processedReports, errors, unmatchedCenters } =
        await processBulkReports(uploadedData, user.id);

      setProcessingErrors(errors);
      setUnmatchedCenters(unmatchedCenters);

      // If there are errors or unmatched centers, show them but don't proceed
      if (errors.length > 0 || unmatchedCenters.length > 0) {
        setMessage({
          text: "Please fix the errors below before importing",
          type: "error",
        });
        setIsProcessing(false);
        return;
      }

      // Save the processed reports - use the auth user ID instead
      const saveResult = await saveProcessedReports(
        processedReports,
        authUser?.id || user.id
      );

      if (saveResult.success) {
        setMessage({
          text: `Successfully imported ${saveResult.savedCount} reports.`,
          type: "success",
        });
        // Reset state after successful import
        setUploadedData(null);
        setIsPreviewMode(false);
        setProcessingErrors([]);
        setUnmatchedCenters([]);
      } else {
        setMessage({
          text: `Import partially completed with errors: ${saveResult.errors.join(
            ", "
          )}`,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Import error:", error);
      setMessage({
        text: `Error during import: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setUploadedData(null);
    setIsPreviewMode(false);
    setMessage(null);
    setProcessingErrors([]);
    setUnmatchedCenters([]);
  };

  return (
    <Layout showNavbar={false}>
      <Head>
        <title>Import Monthly Reports - HPV Vaccination</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Import Monthly Reports</h1>

        <div className="mb-4">
          <Link
            href="/bulk-entry"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="mr-2 -ml-1 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to Bulk Entry
          </Link>
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
          {!isPreviewMode ? (
            <>
              <p className="mb-4">
                Upload an Excel (.xlsx, .xls) or CSV file containing monthly
                vaccination reports. The file should have the following columns:
              </p>
              <ul className="list-disc pl-8 mb-6 text-gray-700">
                <li>
                  <strong>PHC Name</strong> - Must match exactly with the
                  healthcare center name in the system
                </li>
                <li>
                  <strong>Month</strong> - Month number (1-12) or name (January)
                </li>
                <li>
                  <strong>Year</strong> - Four digit year (e.g., 2023)
                </li>
                <li>
                  <em>Stock Beginning</em> - (Optional) Number of doses at
                  beginning of month
                </li>
                <li>
                  <em>Stock End</em> - (Optional) Number of doses at end of
                  month
                </li>
                <li>
                  <em>Fixed Doses</em> - (Optional) Number of doses administered
                  at the facility
                </li>
                <li>
                  <em>Outreach Doses</em> - (Optional) Number of doses
                  administered during outreach
                </li>
                <li>
                  <em>In Stock</em> - (Optional) Yes/No or True/False
                </li>
                <li>
                  <em>Shortage</em> - (Optional) Yes/No or True/False
                </li>
                <li>
                  <em>Shortage Response</em> - (Optional) Text response if
                  shortage occurred
                </li>
                <li>
                  <em>Outreach</em> - (Optional) Yes/No or True/False
                </li>
                <li>
                  <em>Misinformation</em> - (Optional) Text field for
                  misinformation notes
                </li>
                <li>
                  <em>DHIS Check</em> - (Optional) Yes/No or True/False
                </li>
              </ul>
              <p className="mb-4 text-sm text-gray-600">
                <strong>Note:</strong> Only PHC Name, Month, and Year are
                required. All other fields can be left blank and will default to
                appropriate values (0 for numbers, false for checkboxes).
              </p>
              <div className="mb-6 flex">
                <a
                  href="/templates/monthly_reports_template.xlsx"
                  download
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                  Download Template
                </a>
              </div>
              <SpreadsheetUploader
                onFileLoaded={handleFileLoaded}
                onError={handleError}
              />
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-4">Data Preview</h2>

              {processingErrors.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
                  <h3 className="text-lg font-medium text-red-800 mb-2">
                    Errors Found ({processingErrors.length} total)
                  </h3>
                  <div className="max-h-60 overflow-y-auto">
                    <ul className="list-disc pl-8 text-red-700 space-y-1">
                      {processingErrors.map((error, index) => (
                        <li key={index} className="text-sm">
                          <strong>Row {error.row}:</strong> {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {unmatchedCenters.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <h3 className="text-lg font-medium text-yellow-800 mb-2">
                    Unmatched Healthcare Centers
                  </h3>
                  <p className="mb-2 text-yellow-700">
                    The following PHC names don't match any centers in the
                    database:
                  </p>
                  <ul className="list-disc pl-8 text-yellow-700">
                    {unmatchedCenters.map((center, index) => (
                      <li key={index}>{center}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {uploadedData &&
                        uploadedData.length > 0 &&
                        Object.keys(uploadedData[0]).map((header) => (
                          <th
                            key={header}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadedData?.slice(0, 5).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {Object.values(row).map((value, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            {value?.toString() || ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {uploadedData && uploadedData.length > 5 && (
                <div className="text-gray-500 mt-2 text-sm">
                  Showing first 5 of {uploadedData.length} rows
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={
                    isProcessing ||
                    processingErrors.length > 0 ||
                    unmatchedCenters.length > 0
                  }
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    processingErrors.length > 0 || unmatchedCenters.length > 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  }`}
                >
                  {isProcessing ? "Processing..." : "Import Data"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
