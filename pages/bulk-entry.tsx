import { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { HealthcareCenter } from "../types";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext"; // Add this import

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
  const [modifiedCenterIds, setModifiedCenterIds] = useState<Set<string>>(new Set());

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

      // Merge existing report data with initial data
      if (reportsData && reportsData.length > 0) {
        reportsData.forEach((report) => {
          if (initialData[report.center_id]) {
            initialData[report.center_id] = {
              in_stock: report.in_stock,
              stock_beginning: report.stock_beginning,
              stock_end: report.stock_end,
              shortage: report.shortage,
              shortage_response: report.shortage_response || "",
              fixed_doses: report.fixed_doses,
              outreach: report.outreach,
              outreach_doses: report.outreach_doses,
              total_doses: report.total_doses,
              misinformation: report.misinformation || "",
              dhis_check: report.dhis_check,
            };
          }
        });
      }

      setCenterData(initialData);
      setHasUnsavedChanges(false); // Reset since we just loaded data
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generic handlers for different field types
  const handleCheckboxChange = (centerId: string, field: string, checked: boolean) => {
    setCenterData((prev) => ({
      ...prev,
      [centerId]: {
        ...prev[centerId],
        [field]: checked,
      },
    }));
    
    // Track this center as modified
    setModifiedCenterIds((prev) => new Set(prev).add(centerId));
  };

  const handleNumberChange = (centerId: string, field: string, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    
    setCenterData((prev) => {
      const updatedCenter = { ...prev[centerId], [field]: numValue };
      
      // Auto-calculate total doses if fixed_doses or outreach_doses changes
      if (field === 'fixed_doses' || field === 'outreach_doses') {
        const fixedDoses = field === 'fixed_doses' 
          ? numValue 
          : (prev[centerId]?.fixed_doses || 0);
          
        const outreachDoses = field === 'outreach_doses' 
          ? numValue 
          : (prev[centerId]?.outreach_doses || 0);
          
        updatedCenter.total_doses = fixedDoses + outreachDoses;
      }
      
      return {
        ...prev,
        [centerId]: updatedCenter,
      };
    });
    
    // Track this center as modified
    setModifiedCenterIds((prev) => new Set(prev).add(centerId));
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
      // Check if user exists
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Filter reports to only include modified centers
      const reportsToInsert = Object.entries(centerData)
        .filter(([centerId]) => modifiedCenterIds.has(centerId))
        .map(([centerId, report]) => ({
          center_id: centerId,
          report_month: `${reportMonth}-01`,
          in_stock: report.in_stock,
          stock_beginning: report.stock_beginning,
          stock_end: report.stock_end,
          shortage: report.shortage,
          shortage_response: report.shortage_response || null,
          outreach: report.outreach,
          fixed_doses: report.fixed_doses,
          outreach_doses: report.outreach_doses,
          total_doses: report.fixed_doses + report.outreach_doses,
          misinformation: report.misinformation || null,
          dhis_check: report.dhis_check,
          created_at: new Date().toISOString(),
          created_by: user.id,
        }));

      if (reportsToInsert.length === 0) {
        setMessage({
          text: "No changes were made to any centers.",
          type: "error"
        });
        setIsSaving(false);
        return;
      }

      // Insert/upsert data only for modified centers
      const { error } = await supabase
        .from("monthly_reports")
        .upsert(reportsToInsert, {
          onConflict: 'center_id,report_month',
          ignoreDuplicates: false
        });

      if (error) throw error;

      // Refetch all centers data for the current state and month
      await fetchCenters(selectedState);

      setMessage({
        text: `Updated data for ${reportsToInsert.length} centers`,
        type: "success"
      });
      
      // Reset the modified centers tracking after successful save
      setModifiedCenterIds(new Set());
      setHasUnsavedChanges(false);
      
    } catch (error) {
      console.error("Error saving data:", error);
      
      // Type-safe error handling
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      
      setMessage({
        text: errorMessage,
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Bulk Data Entry - PHC Data Collection</title>
      </Head>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Bulk Data Entry</h1>
        
        <div className="flex flex-col md:flex-row md:items-center mb-6 space-y-4 md:space-y-0 md:space-x-4">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium mb-1">Select State</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Select State --</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium mb-1">Select Month</label>
            <input
              type="month"
              className="w-full p-2 border rounded"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="w-full md:w-1/3 flex items-end">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
              onClick={saveAllData}
              disabled={loading || isSaving || !selectedState || modifiedCenterIds.size === 0}
            >
              {isSaving ? "Saving..." : "Save All Changes"}
            </button>
          </div>
        </div>
        
        {message && (
          <div
            className={`p-4 mb-4 rounded ${
              message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : centers.length === 0 ? (
          <div className="text-center py-8">
            {selectedState
              ? "No centers found for this state"
              : "Please select a state to view centers"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-3 border text-left">Center</th>
                  <th className="py-2 px-3 border text-center">In Stock</th>
                  <th className="py-2 px-3 border text-center">Stock Beginning</th>
                  <th className="py-2 px-3 border text-center">Stock End</th>
                  <th className="py-2 px-3 border text-center">Shortage</th>
                  <th className="py-2 px-3 border text-center">Outreach</th>
                  <th className="py-2 px-3 border text-center">Fixed Doses</th>
                  <th className="py-2 px-3 border text-center">Outreach Doses</th>
                  <th className="py-2 px-3 border text-center">Total Doses</th>
                  <th className="py-2 px-3 border text-center">Misinformation</th>
                  <th className="py-2 px-3 border text-center">DHIS Check</th>
                </tr>
              </thead>
              <tbody>
                {centers.map((center) => (
                  <tr 
                    key={center.id}
                    className={modifiedCenterIds.has(center.id) ? "bg-blue-50" : ""}
                  >
                    <td className="py-2 px-3 border">
                      <div className="font-medium">{center.name}</div>
                      <div className="text-sm text-gray-500">{center.area}</div>
                    </td>
                    <td className="py-2 px-3 border text-center">
                      <input
                        type="checkbox"
                        checked={centerData[center.id]?.in_stock || false}
                        onChange={(e) =>
                          handleCheckboxChange(center.id, "in_stock", e.target.checked)
                        }
                      />
                    </td>
                    <td className="py-2 px-3 border text-center">
                      <input
                        type="number"
                        className="w-16 p-1 border rounded text-center"
                        value={centerData[center.id]?.stock_beginning || 0}
                        onChange={(e) =>
                          handleNumberChange(center.id, "stock_beginning", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2 px-3 border text-center">
                      <input
                        type="number"
                        className="w-16 p-1 border rounded text-center"
                        value={centerData[center.id]?.stock_end || 0}
                        onChange={(e) =>
                          handleNumberChange(center.id, "stock_end", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2 px-3 border text-center">
                      <div className="flex flex-col items-center">
                        <input
                          type="checkbox"
                          checked={centerData[center.id]?.shortage || false}
                          onChange={(e) =>
                            handleCheckboxChange(center.id, "shortage", e.target.checked)
                          }
                        />
                        {centerData[center.id]?.shortage && (
                          <button
                            className="text-xs text-blue-500 mt-1"
                            onClick={() => openNotesModal(center, "shortage")}
                          >
                            Add details
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 border text-center">
                      <input
                        type="checkbox"
                        checked={centerData[center.id]?.outreach || false}
                        onChange={(e) =>
                          handleCheckboxChange(center.id, "outreach", e.target.checked)
                        }
                      />
                    </td>
                    <td className="py-2 px-3 border text-center">
                      <input
                        type="number"
                        className="w-16 p-1 border rounded text-center"
                        value={centerData[center.id]?.fixed_doses || 0}
                        onChange={(e) =>
                          handleNumberChange(center.id, "fixed_doses", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2 px-3 border text-center">
                      <input
                        type="number"
                        className="w-16 p-1 border rounded text-center"
                        value={centerData[center.id]?.outreach_doses || 0}
                        onChange={(e) =>
                          handleNumberChange(center.id, "outreach_doses", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2 px-3 border text-center">
                      <span className="font-bold">
                        {centerData[center.id]?.total_doses || 0}
                      </span>
                    </td>
                    <td className="py-2 px-3 border text-center">
                      <button
                        className="text-sm text-blue-500"
                        onClick={() => openNotesModal(center, "misinformation")}
                      >
                        {centerData[center.id]?.misinformation ? "Edit" : "Add"}
                      </button>
                    </td>
                    <td className="py-2 px-3 border text-center">
                      <input
                        type="checkbox"
                        checked={centerData[center.id]?.dhis_check || false}
                        onChange={(e) =>
                          handleCheckboxChange(center.id, "dhis_check", e.target.checked)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Notes Modal */}
      {modalOpen && activeCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {notesType === "misinformation"
                ? "Misinformation Notes"
                : "Shortage Response Details"}
              <span className="block text-sm font-normal text-gray-500 mt-1">
                {activeCenter.name}
              </span>
            </h2>
            
            <textarea
              className="w-full p-2 border rounded h-32"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder={
                notesType === "misinformation"
                  ? "Enter any misinformation details..."
                  : "Enter shortage response details..."
              }
            ></textarea>
            
            <div className="flex justify-end mt-4 space-x-2">
              <button
                className="px-4 py-2 border rounded hover:bg-gray-100"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={saveNotes}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
