import React, { useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import SpreadsheetUploader from "../components/SpreadsheetUploader";
import { useAuth } from "../context/AuthContext";
import { ParsedRow } from "../utils/spreadsheetParser";
import {
  processBulkReports,
  saveProcessedReports,
} from "../utils/monthlyReportProcessor";

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

      // Save the processed reports
      const saveResult = await saveProcessedReports(processedReports, user.id);

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
      setMessage({
        text: error instanceof Error ? error.message : "Failed to import data",
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
    <Layout>
      <Head>
        <title>Import Monthly Reports - HPV Vaccination</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Import Monthly Reports</h1>

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
                  <strong>Stock Beginning</strong> - Number of doses at
                  beginning of month
                </li>
                <li>
                  <strong>Stock End</strong> - Number of doses at end of month
                </li>
                <li>
                  <strong>Fixed Doses</strong> - Number of doses administered at
                  the facility
                </li>
                <li>
                  <strong>Outreach Doses</strong> - Number of doses administered
                  during outreach
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
                    Errors Found
                  </h3>
                  <ul className="list-disc pl-8 text-red-700">
                    {processingErrors.slice(0, 10).map((error, index) => (
                      <li key={index}>
                        Row {error.row}: {error.message}
                      </li>
                    ))}
                    {processingErrors.length > 10 && (
                      <li>...and {processingErrors.length - 10} more errors</li>
                    )}
                  </ul>
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
