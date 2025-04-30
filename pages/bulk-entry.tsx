import { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { HealthcareCenter } from "../types";

// Define structure for center data
interface CenterReportData {
  // Stock information
  in_stock: boolean;
  stock_beginning: number;
  stock_end: number;
  shortage: boolean;
  shortage_response: string;

  // Doses information
  fixed_doses: number;
  outreach: boolean;
  outreach_doses: number;
  total_doses: number;

  // Additional information
  misinformation: string;
  dhis_check: boolean;
}

export default function BulkEntry() {
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [centers, setCenters] = useState<HealthcareCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      const { data, error } = await supabase
        .from("healthcare_centers")
        .select("*")
        .eq("state", state)
        .order("name");

      if (error) throw error;

      setCenters(data || []);

      // Initialize center data for all centers
      const initialData: Record<string, CenterReportData> = {};
      data?.forEach((center) => {
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
      setCenterData(initialData);
    } catch (error) {
      console.error("Error fetching centers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generic handlers for different field types
  const handleNumberChange = (
    centerId: string,
    field: keyof CenterReportData,
    value: number
  ) => {
    setHasUnsavedChanges(true);
    setCenterData((prev) => {
      const centerDataCopy = { ...prev };
      centerDataCopy[centerId] = {
        ...centerDataCopy[centerId],
        [field]: value,
      };

      // If we're changing fixed or outreach doses, update total_doses
      if (field === "fixed_doses" || field === "outreach_doses") {
        const fixedDoses =
          field === "fixed_doses"
            ? value
            : centerDataCopy[centerId].fixed_doses;
        const outreachDoses =
          field === "outreach_doses"
            ? value
            : centerDataCopy[centerId].outreach_doses;
        centerDataCopy[centerId].total_doses =
          fixedDoses + (centerDataCopy[centerId].outreach ? outreachDoses : 0);
      }

      return centerDataCopy;
    });
  };

  const handleBooleanChange = (
    centerId: string,
    field: keyof CenterReportData,
    value: boolean
  ) => {
    setCenterData((prev) => {
      const centerDataCopy = { ...prev };
      centerDataCopy[centerId] = {
        ...centerDataCopy[centerId],
        [field]: value,
      };

      // If we're toggling outreach, update total_doses
      if (field === "outreach") {
        const outreachDoses = value
          ? centerDataCopy[centerId].outreach_doses
          : 0;
        centerDataCopy[centerId].total_doses =
          centerDataCopy[centerId].fixed_doses + outreachDoses;
      }

      return centerDataCopy;
    });
  };

  const handleTextChange = (
    centerId: string,
    field: keyof CenterReportData,
    value: string
  ) => {
    setCenterData((prev) => ({
      ...prev,
      [centerId]: { ...prev[centerId], [field]: value },
    }));
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
    setSaving(true);
    setMessage(null);

    try {
      // Format date for database
      const reportDate = new Date(`${reportMonth}-01`).toISOString();

      // Prepare batch insert data
      const reportsToInsert = Object.entries(centerData).map(
        ([centerId, data]) => ({
          center_id: centerId,
          report_month: reportDate,
          in_stock: data.in_stock,
          stock_beginning: data.stock_beginning,
          stock_end: data.stock_end,
          shortage: data.shortage,
          shortage_response: data.shortage_response || null,
          outreach: data.outreach,
          fixed_doses: data.fixed_doses,
          outreach_doses: data.outreach_doses,
          total_doses: data.total_doses,
          misinformation: data.misinformation || null,
          dhis_check: data.dhis_check,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      );

      // Insert data in batches of 20 to avoid request size limitations
      for (let i = 0; i < reportsToInsert.length; i += 20) {
        const batch = reportsToInsert.slice(i, i + 20);
        const { error } = await supabase.from("monthly_reports").upsert(batch, {
          onConflict: "center_id,report_month",
          ignoreDuplicates: false,
        });

        if (error) throw error;
      }

      setMessage({
        text: `Successfully saved data for ${reportsToInsert.length} centers.`,
        type: "success",
      });
    } catch (error: any) {
      console.error("Error saving data:", error);
      setMessage({
        text: `Error: ${error.message || "Failed to save data"}`,
        type: "error",
      });
    } finally {
      setSaving(false);
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
          {centers.map((center) => (
            <tr
              key={center.id}
              className={center.is_treatment_area ? "bg-green-50" : ""}
            >
              <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                <div className="text-sm font-medium text-gray-900">
                  {center.name}
                </div>
                {center.is_treatment_area && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Treatment Area
                  </span>
                )}
              </td>
              {/* Stock fields */}
              <td className="px-6 py-4 whitespace-nowrap">
                <select
                  value={centerData[center.id]?.in_stock ? "true" : "false"}
                  onChange={(e) =>
                    handleBooleanChange(
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
                  min="0"
                  value={centerData[center.id]?.stock_beginning || 0}
                  onChange={(e) =>
                    handleNumberChange(
                      center.id,
                      "stock_beginning",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-24 border border-gray-300 rounded-md p-1 text-sm"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  min="0"
                  value={centerData[center.id]?.stock_end || 0}
                  onChange={(e) =>
                    handleNumberChange(
                      center.id,
                      "stock_end",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-24 border border-gray-300 rounded-md p-1 text-sm"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  <select
                    value={centerData[center.id]?.shortage ? "true" : "false"}
                    onChange={(e) =>
                      handleBooleanChange(
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
                  <button
                    onClick={() =>
                      openNotesModal(
                        { id: center.id, name: center.name },
                        "shortage"
                      )
                    }
                    className="ml-2 p-1 text-blue-600 hover:text-blue-800"
                    disabled={!centerData[center.id]?.shortage}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                </div>
              </td>
              {/* Doses fields */}
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  min="0"
                  value={centerData[center.id]?.fixed_doses || 0}
                  onChange={(e) =>
                    handleNumberChange(
                      center.id,
                      "fixed_doses",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-24 border border-gray-300 rounded-md p-1 text-sm"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <select
                  value={centerData[center.id]?.outreach ? "true" : "false"}
                  onChange={(e) =>
                    handleBooleanChange(
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
                  min="0"
                  value={centerData[center.id]?.outreach_doses || 0}
                  onChange={(e) =>
                    handleNumberChange(
                      center.id,
                      "outreach_doses",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className={`w-24 border border-gray-300 rounded-md p-1 text-sm ${
                    !centerData[center.id]?.outreach ? "bg-gray-100" : ""
                  }`}
                  disabled={!centerData[center.id]?.outreach}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  value={centerData[center.id]?.total_doses || 0}
                  className="w-24 border border-gray-300 rounded-md p-1 text-sm bg-gray-100"
                  disabled
                />
              </td>
              {/* Additional fields */}
              <td className="px-6 py-4 whitespace-nowrap">
                <select
                  value={centerData[center.id]?.dhis_check ? "true" : "false"}
                  onChange={(e) =>
                    handleBooleanChange(
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
    <Layout showNavbar={true}>
      <div className="container mx-auto px-4 py-8">
        <Head>
          <title>Bulk Data Entry - HPV Vaccination Reports</title>
        </Head>

        <h1 className="text-2xl font-bold mb-6">
          Bulk HPV Vaccination Data Entry
        </h1>

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
              disabled={saving || centers.length === 0}
              className={`font-medium py-2 px-4 rounded disabled:opacity-50 ${
                hasUnsavedChanges
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {saving
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
            <div className="border-b border-gray-200 bg-gray-50 p-4">
              <h2 className="text-lg font-medium text-gray-800">
                Monthly HPV Vaccination Data
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Enter data for all centers in {selectedState} for {reportMonth}
              </p>
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
        {selectedState && centers.length > 0 && (
          <div className="fixed bottom-8 right-8 z-20">
            <button
              onClick={saveAllData}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full shadow-lg disabled:opacity-50 flex items-center"
            >
              {saving ? (
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
                <>Save All</>
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
