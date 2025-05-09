import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import MonthSelector from "./MonthSelector";
import { HealthcareCenter, MonthlyReport } from "../types";
import { useAuth } from "../context/AuthContext"; // Add this import

interface MonthlyReportFormProps {
  centerId: string;
  centerName?: string;
  onSave: () => void;
  onCancel: () => void;
  initialReport?: MonthlyReport;
}

const MonthlyReportForm: React.FC<MonthlyReportFormProps> = ({
  centerId,
  centerName,
  onSave,
  onCancel,
  initialReport,
}) => {
  const { user } = useAuth(); // Add this line to get the authenticated user
  const [formData, setFormData] = useState<Partial<MonthlyReport>>({
    center_id: centerId,
    report_month: format(new Date(), "yyyy-MM-dd"),
    in_stock: false,
    stock_beginning: 0,
    stock_end: 0,
    shortage: false,
    shortage_response: "",
    outreach: false,
    fixed_doses: 0,
    outreach_doses: 0,
    total_doses: 0,
    misinformation: "",
    dhis_check: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lastReportMonth, setLastReportMonth] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [hasChanges, setHasChanges] = useState(false);

  // Load initial data if available
  useEffect(() => {
    if (initialReport) {
      setFormData(initialReport);
      
      // Extract month from report_month for the month selector
      if (initialReport.report_month) {
        const monthStr = initialReport.report_month.substring(0, 7);
        setSelectedMonth(monthStr);
      }
    } else {
      // Reset form with default values but keep the center_id
      setFormData({
        center_id: centerId,
        report_month: `${selectedMonth}-01`,
        in_stock: false,
        stock_beginning: 0,
        stock_end: 0,
        shortage: false,
        shortage_response: "",
        outreach: false,
        fixed_doses: 0,
        outreach_doses: 0,
        total_doses: 0,
        misinformation: "",
        dhis_check: false,
      });
    }
    
    // Fetch last report month for this center
    fetchLastReportMonth();
  }, [centerId, initialReport]);

  // Fetch the last report month for this center
  const fetchLastReportMonth = async () => {
    try {
      const { data, error } = await supabase
        .from("monthly_reports")
        .select("report_month")
        .eq("center_id", centerId)
        .order("report_month", { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setLastReportMonth(data[0].report_month.substring(0, 7));
      }
    } catch (error) {
      console.error("Error fetching last report month:", error);
    }
  };

  // Update form data when month selector changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      report_month: `${selectedMonth}-01` // Set to first day of month
    }));
  }, [selectedMonth]);

  // Calculate total doses when fixed or outreach doses change
  useEffect(() => {
    const fixed = formData.fixed_doses || 0;
    const outreach = formData.outreach_doses || 0;
    setFormData((prev) => ({
      ...prev,
      total_doses: fixed + outreach,
    }));
  }, [formData.fixed_doses, formData.outreach_doses]);

  // Track changes in form data
  useEffect(() => {
    // Compare current form data with initial data
    if (initialReport) {
      setHasChanges(JSON.stringify(formData) !== JSON.stringify(initialReport));
    } else {
      // Check if any non-default values exist (excluding center_id and report_month)
      const hasNonDefaultValues = Object.entries(formData).some(([key, val]) => {
        if (key === 'center_id' || key === 'report_month') return false;
        return val !== 0 && val !== false && val !== "";
      });
      setHasChanges(hasNonDefaultValues);
    }
  }, [formData, initialReport]);

  // New handler for boolean fields using select dropdowns
  const handleBooleanChange = (field: string, value: string) => {
    setFormData((prev) => ({ 
      ...prev, 
      [field]: value === "true" 
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (field: string, value: number) => {
    // Update the form data
    const updatedData = { ...formData, [field]: value };
    
    // Auto-calculate total doses when either doses field changes
    if (field === 'fixed_doses' || field === 'outreach_doses') {
      const fixedDoses = field === 'fixed_doses' 
        ? value 
        : (formData.fixed_doses || 0);
        
      const outreachDoses = field === 'outreach_doses' 
        ? value 
        : (formData.outreach_doses || 0);
        
      updatedData.total_doses = fixedDoses + outreachDoses;
    }
    
    setFormData(updatedData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const reportData = {
        ...formData,
        total_doses: (formData.fixed_doses || 0) + (formData.outreach_doses || 0),
        updated_at: new Date().toISOString()
      };

      // If it's a new report, also add created_at and created_by
      if (!initialReport?.id) {
        reportData.created_at = new Date().toISOString();
        // Add created_by if you have the user context
        if (user?.id) {
          reportData.created_by = user.id;
        }
      }

      if (initialReport?.id) {
        // Update existing report
        const { error: updateError } = await supabase
          .from("monthly_reports")
          .update(reportData)
          .eq("id", initialReport.id);

        if (updateError) throw updateError;
      } else {
        // Insert new report using upsert with conflict handling
        const { error: insertError } = await supabase
          .from("monthly_reports")
          .upsert([reportData], {
            onConflict: 'center_id,report_month',
            ignoreDuplicates: false
          });

        if (insertError) throw insertError;
      }

      setSuccess(true);
      onSave();
    } catch (error) {
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">
        Monthly HPV Vaccination Report - {centerName || "Unknown Center"}
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Report saved successfully!
        </div>
      )}

      {/* Month selector */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">Report Month</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>
      
      {lastReportMonth && (
        <div className="mb-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
            lastReportMonth === selectedMonth
              ? "bg-green-100 text-green-800 border border-green-300" 
              : "bg-gray-100 text-gray-600 border border-gray-300"
          }`}>
            Last report: {lastReportMonth}
          </span>
        </div>
      )}

      {/* Vaccine Stock Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">
          Vaccine Stock Information
        </h3>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            HPV vaccine in stock during this month
          </label>
          <select
            value={formData.in_stock ? "true" : "false"}
            onChange={(e) => handleBooleanChange("in_stock", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Stock at beginning of month
            </label>
            <input
              type="number"
              name="stock_beginning"
              value={formData.stock_beginning || 0}
              onChange={(e) => handleNumberChange("stock_beginning", parseInt(e.target.value) || 0)}
              className="w-full border rounded-lg px-3 py-2"
              min="0"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Stock at end of month
            </label>
            <input
              type="number"
              name="stock_end"
              value={formData.stock_end || 0}
              onChange={(e) => handleNumberChange("stock_end", parseInt(e.target.value) || 0)}
              className="w-full border rounded-lg px-3 py-2"
              min="0"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Experienced shortage during this month
          </label>
          <select
            value={formData.shortage ? "true" : "false"}
            onChange={(e) => handleBooleanChange("shortage", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        {formData.shortage && (
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Shortage Response Actions
            </label>
            <textarea
              name="shortage_response"
              value={formData.shortage_response || ""}
              onChange={handleInputChange}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Describe actions taken to address the shortage"
            />
          </div>
        )}
      </div>

      {/* Vaccine Administration Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">
          Vaccine Administration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Fixed Sessions Doses Given
            </label>
            <input
              type="number"
              name="fixed_doses"
              value={formData.fixed_doses || 0}
              onChange={(e) => handleNumberChange("fixed_doses", parseInt(e.target.value) || 0)}
              className="w-full border rounded-lg px-3 py-2"
              min="0"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Conducted outreach this month
            </label>
            <select
              value={formData.outreach ? "true" : "false"}
              onChange={(e) => handleBooleanChange("outreach", e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>

            <div className="mt-4">
              <label className="block text-gray-700 font-medium mb-2">
                Outreach Doses Given
              </label>
              <input
                type="number"
                value={formData.outreach_doses || 0}
                onChange={(e) => handleNumberChange("outreach_doses", parseInt(e.target.value) || 0)}
                className={`w-full border rounded-lg px-3 py-2 ${
                  !formData.outreach ? "bg-gray-100" : ""
                }`}
                disabled={!formData.outreach}
                min="0"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Total Doses Given
            </label>
            <input
              type="number"
              value={formData.total_doses || 0}
              className="w-full border rounded-lg px-3 py-2 bg-gray-100"
              disabled
            />
            <p className="text-sm text-gray-500 mt-1">
              Calculated automatically (Fixed + Outreach)
            </p>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">
          Additional Information
        </h3>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Misinformation or Challenges
          </label>
          <textarea
            name="misinformation"
            value={formData.misinformation || ""}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2"
            rows={3}
            placeholder="Note any misinformation in the community or challenges faced"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Data has been entered in DHIS2
          </label>
          <select
            value={formData.dhis_check ? "true" : "false"}
            onChange={(e) => handleBooleanChange("dhis_check", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end space-x-4 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !hasChanges}
          className={`px-6 py-2 border border-transparent rounded-md shadow-sm font-medium ${
            hasChanges 
              ? "bg-yellow-500 hover:bg-yellow-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {loading
            ? "Saving..."
            : hasChanges
            ? "Save Changes*"
            : initialReport
            ? "Update Report"
            : "Submit Report"}
        </button>
      </div>
    </form>
  );
};

export default MonthlyReportForm;
