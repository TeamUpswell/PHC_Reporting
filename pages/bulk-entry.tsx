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
}
