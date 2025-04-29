import { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { HealthcareCenter } from "../types";

export default function BulkEntry() {
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [centers, setCenters] = useState<HealthcareCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [reportMonth, setReportMonth] = useState<string>(
    new Date().toISOString().substring(0, 7) // Default to current month (YYYY-MM)
  );
  
  // Center data state
  const [centerData, setCenterData] = useState<Record<string, {
    totalDoses: number;
    inStock: boolean;
    notes: string;
  }>>({});
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCenter, setActiveCenter] = useState<{id: string; name: string} | null>(null);
  const [notesText, setNotesText] = useState("");
  
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
      const initialData: Record<string, { totalDoses: number; inStock: boolean; notes: string }> = {};
      data?.forEach(center => {
        initialData[center.id] = { totalDoses: 0, inStock: true, notes: "" };
      });
      setCenterData(initialData);
      
    } catch (error) {
      console.error("Error fetching centers:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTotalDosesChange = (centerId: string, value: number) => {
    setCenterData(prev => ({
      ...prev,
      [centerId]: { ...prev[centerId], totalDoses: value }
    }));
  };
  
  const handleInStockChange = (centerId: string, value: boolean) => {
    setCenterData(prev => ({
      ...prev,
      [centerId]: { ...prev[centerId], inStock: value }
    }));
  };
  
  const openNotesModal = (center: {id: string; name: string}) => {
    setActiveCenter(center);
    setNotesText(centerData[center.id]?.notes || "");
    setModalOpen(true);
  };
  
  const saveNotes = () => {
    if (activeCenter) {
      setCenterData(prev => ({
        ...prev,
        [activeCenter.id]: { ...prev[activeCenter.id], notes: notesText }
      }));
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
      const reportsToInsert = Object.entries(centerData).map(([centerId, data]) => ({
        center_id: centerId,
        report_month: reportDate,
        total_doses: data.totalDoses,
        in_stock: data.inStock,
        notes: data.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      // Insert data in batches of 20 to avoid request size limitations
      for (let i = 0; i < reportsToInsert.length; i += 20) {
        const batch = reportsToInsert.slice(i, i + 20);
        const { error } = await supabase
          .from("monthly_reports")
          .upsert(batch, { 
            onConflict: 'center_id,report_month',
            ignoreDuplicates: false
          });
        
        if (error) throw error;
      }
      
      setMessage({
        text: `Successfully saved data for ${reportsToInsert.length} centers.`,
        type: "success"
      });
      
      // Reset form data
      const resetData: Record<string, { totalDoses: number; inStock: boolean; notes: string }> = {};
      centers.forEach(center => {
        resetData[center.id] = { totalDoses: 0, inStock: true, notes: "" };
      });
      setCenterData(resetData);
      
    } catch (error: any) {
      console.error("Error saving data:", error);
      setMessage({
        text: `Error: ${error.message || "Failed to save data"}`,
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Layout>
      <Head>
        <title>Bulk Data Entry - HPV Vaccination Reports</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Bulk Data Entry</h1>
        
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
              <label htmlFor="state-select" className="block text-sm font-medium text-gray-700 mb-1">
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
              <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 mb-1">
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save All Data"}
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="text-center py-10">Loading centers...</div>
        ) : centers.length > 0 ? (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Center Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Area/LGA
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Doses
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    In Stock
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {centers.map((center) => (
                  <tr key={center.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {center.name}
                      </div>
                      {center.is_treatment_area && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Treatment Area
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {center.area} / {center.lga}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        value={centerData[center.id]?.totalDoses || 0}
                        onChange={(e) => handleTotalDosesChange(center.id, parseInt(e.target.value) || 0)}
                        className="w-24 border border-gray-300 rounded-md p-1 text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={centerData[center.id]?.inStock ? "true" : "false"}
                        onChange={(e) => handleInStockChange(center.id, e.target.value === "true")}
                        className="border border-gray-300 rounded-md p-1 text-sm"
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openNotesModal({id: center.id, name: center.name})}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-100"
                      >
                        {centerData[center.id]?.notes ? "Edit Notes" : "Add Notes"}
                      </button>
                      {centerData[center.id]?.notes && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Has notes
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      </div>
      
      {/* Notes Modal */}
      {modalOpen && activeCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-medium mb-4">
              Notes for {activeCenter.name}
            </h3>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              className="w-full h-32 border border-gray-300 rounded-md p-2 mb-4"
              placeholder="Enter any notes about vaccine supply, challenges, or additional information..."
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