import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { HealthcareCenter, MonthlyReport } from "../../types"; // Updated import
import { format, startOfMonth } from "date-fns";
import MonthSelector from "../../components/MonthSelector";
import MonthlyReportForm from "../../components/MonthlyReportForm";

export default function CenterDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [center, setCenter] = useState<HealthcareCenter | null>(null);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(
    startOfMonth(new Date())
  );

  // Fetch center details
  useEffect(() => {
    if (!id) return;

    const fetchCenterDetails = async () => {
      setLoading(true);
      try {
        // Get center details
        const { data: centerData, error: centerError } = await supabase
          .from("healthcare_centers")
          .select("*")
          .eq("id", id)
          .single();

        if (centerError) throw centerError;
        setCenter(centerData);

        // Get report for the selected month
        await fetchMonthlyReport(id as string, selectedMonth);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCenterDetails();
  }, [id]);

  // Fetch report data when month changes
  useEffect(() => {
    if (id && !loading) {
      fetchMonthlyReport(id as string, selectedMonth);
    }
  }, [selectedMonth]);

  // Function to fetch monthly report
  const fetchMonthlyReport = async (centerId: string, month: Date) => {
    try {
      const reportMonth = format(month, "yyyy-MM-dd");

      const { data, error: reportError } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("center_id", centerId)
        .eq("report_month", reportMonth)
        .maybeSingle();

      if (reportError) throw reportError;

      setReport(data);
    } catch (err: any) {
      console.error("Error fetching monthly report:", err);
      setError(err.message);
    }
  };

  // Handle month selection
  const handleMonthChange = (newMonth: Date) => {
    setSelectedMonth(newMonth);
  };

  // After submitting a report
  const handleReportSaved = async () => {
    await fetchMonthlyReport(id as string, selectedMonth);
  };

  if (loading && !center) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-500">Loading center details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
        <div className="mt-4">
          <Link href="/" className="text-blue-600 hover:underline">
            &larr; Back to Centers
          </Link>
        </div>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Center not found
        </div>
        <div className="mt-4">
          <Link href="/" className="text-blue-600 hover:underline">
            &larr; Back to Centers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{center?.name || "Center"} - HPV Vaccination Reports</title>
        <meta
          name="description"
          content={`Track HPV vaccination data at ${center?.name || "center"}`}
        />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline">
            &larr; Back to Centers
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">
            {center.name}
          </h1>
          <div>
            <p className="text-gray-700 mb-1">
              <span className="font-medium">Area:</span> {center.area}
            </p>
            <p className="text-gray-700 mb-1">
              <span className="font-medium">LGA:</span> {center.lga}
            </p>
            <p className="text-gray-700 mb-1">
              <span className="font-medium">Address:</span> {center.address}
            </p>
            {center.phone && (
              <p className="text-gray-700 mb-1">
                <span className="font-medium">Phone:</span> {center.phone}
              </p>
            )}
            {center.vaccination_days && (
              <p className="text-gray-700 mb-1">
                <span className="font-medium">Vaccination Days:</span>{" "}
                {center.vaccination_days}
              </p>
            )}
            {center.working_hours && (
              <p className="text-gray-700 mb-1">
                <span className="font-medium">Working Hours:</span>{" "}
                {center.working_hours}
              </p>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">
            Monthly HPV Vaccination Reports
          </h2>
          <MonthSelector value={selectedMonth} onChange={handleMonthChange} />
        </div>

        <MonthlyReportForm
          centerId={center.id}
          reportMonth={selectedMonth}
          existingReport={report || undefined}
          onSaved={handleReportSaved}
        />
      </main>

      <footer className="bg-blue-900 text-white text-center p-4 mt-12">
        <p>PHC Data Collection - HPV Vaccination Tracking System</p>
      </footer>
    </div>
  );
}
