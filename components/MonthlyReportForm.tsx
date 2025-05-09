import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import MonthSelector from "./MonthSelector";
import { HealthcareCenter, MonthlyReport } from "../types";

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

  // Load initial data if available
  useEffect(() => {
    if (initialReport) {
      setFormData(initialReport);
    } else {
      // Reset form with default values but keep the center_id
      setFormData({
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
    }
  }, [centerId, initialReport]);

  // Calculate total doses when fixed or outreach doses change
  useEffect(() => {
    const fixed = formData.fixed_doses || 0;
    const outreach = formData.outreach_doses || 0;
    setFormData((prev) => ({
      ...prev,
      total_doses: fixed + outreach,
    }));
  }, [formData.fixed_doses, formData.outreach_doses]);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
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
      };

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
    } catch (err: any) {
      setError(err.message);
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

      {/* Vaccine Stock Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">
          Vaccine Stock Information
        </h3>

        <div className="mb-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              name="in_stock"
              checked={formData.in_stock}
              onChange={handleCheckboxChange}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span>HPV vaccine was in stock during this month</span>
          </label>
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
              onChange={handleNumberChange}
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
              onChange={handleNumberChange}
              className="w-full border rounded-lg px-3 py-2"
              min="0"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              name="shortage"
              checked={formData.shortage}
              onChange={handleCheckboxChange}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span>Experienced shortage during this month</span>
          </label>
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
              onChange={handleNumberChange}
              className="w-full border rounded-lg px-3 py-2"
              min="0"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center space-x-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                name="outreach"
                checked={formData.outreach}
                onChange={handleCheckboxChange}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span>Conducted outreach this month</span>
            </label>

            <input
              type="number"
              name="outreach_doses"
              value={formData.outreach_doses || 0}
              onChange={handleNumberChange}
              className={`w-full border rounded-lg px-3 py-2 ${
                !formData.outreach ? "bg-gray-100" : ""
              }`}
              min="0"
              disabled={!formData.outreach}
            />
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
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              name="dhis_check"
              checked={formData.dhis_check}
              onChange={handleCheckboxChange}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span>Data has been entered in DHIS2</span>
          </label>
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
          className="px-6 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : initialReport
            ? "Update Report"
            : "Submit Report"}
        </button>
      </div>
    </form>
  );
};

export default MonthlyReportForm;
