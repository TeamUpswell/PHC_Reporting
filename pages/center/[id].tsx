import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { HealthcareCenter, MonthlyReport } from "../../types";
import {
  format,
  startOfMonth,
  parseISO,
  subMonths,
  endOfMonth,
} from "date-fns";
import MonthSelector from "../../components/MonthSelector";
import MonthlyReportForm from "../../components/MonthlyReportForm";
import dynamic from "next/dynamic";
import DashboardCard from "../../components/DashboardCard";

// Add this dynamic import to prevent SSR issues with the map
const Map = dynamic(() => import("../../components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-72 bg-gray-100 rounded-lg flex items-center justify-center">
      Loading map...
    </div>
  ),
});

// Add this dynamic import for the chart component
const VaccinationChart = dynamic(
  () => import("../../components/VaccinationChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-white rounded-lg shadow-md flex items-center justify-center">
        Loading chart...
      </div>
    ),
  }
);

interface CenterStats {
  monthlyData: Array<{
    month: string;
    fullLabel: string;
    doses: number;
  }>;
  currentMonthDoses: number;
  previousMonthDoses: number;
  growthPercent: number;
}

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
  const [showReportForm, setShowReportForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [centerStats, setCenterStats] = useState<CenterStats>({
    monthlyData: [],
    currentMonthDoses: 0,
    previousMonthDoses: 0,
    growthPercent: 0,
  });

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

  // Function to delete center
  const deleteCenter = async () => {
    setDeleteLoading(true);
    try {
      if (!center) {
        setError("Cannot delete: center not found");
        setShowDeleteModal(false);
        setDeleteLoading(false);
        return;
      }

      const { error: reportsError } = await supabase
        .from("monthly_reports")
        .delete()
        .eq("center_id", center.id);

      if (reportsError) throw reportsError;

      const { error: centerError } = await supabase
        .from("healthcare_centers")
        .delete()
        .eq("id", center.id);

      if (centerError) throw centerError;

      router.push("/");
    } catch (err: any) {
      console.error("Error deleting center:", err);
      setError(`Failed to delete center: ${err.message}`);
      setShowDeleteModal(false);
      setDeleteLoading(false);
    }
  };

  const fetchCenterStats = useCallback(async () => {
    if (!center?.id) return;

    try {
      const now = new Date();
      const previousMonth = subMonths(now, 1);
      const sixMonthsAgo = format(subMonths(now, 5), "yyyy-MM-dd");

      const { data: reports, error } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("center_id", center.id)
        .gte("report_month", sixMonthsAgo)
        .order("report_month", { ascending: true });

      if (error) throw error;

      const monthlyData = [];

      for (let i = 5; i >= 0; i--) {
        const targetDate = subMonths(now, i);
        const fullLabel = format(targetDate, "MMM yyyy");
        const monthReports =
          reports?.filter((report) => {
            if (!report.report_month) return false;
            const reportDate = parseISO(report.report_month);
            return (
              format(reportDate, "yyyy-MM") === format(targetDate, "yyyy-MM")
            );
          }) || [];

        const monthDoses = monthReports.reduce((sum, report) => {
          let reportDoses = 0;
          if (typeof report.total_doses === "number") {
            reportDoses = report.total_doses;
          } else {
            const fixedDoses =
              typeof report.fixed_doses === "number" ? report.fixed_doses : 0;
            const outreachDoses =
              typeof report.outreach_doses === "number"
                ? report.outreach_doses
                : 0;
            reportDoses = fixedDoses + outreachDoses;
          }
          return sum + reportDoses;
        }, 0);

        monthlyData.push({
          month: format(targetDate, "MMM"),
          fullLabel: fullLabel,
          doses: monthDoses,
        });
      }

      const currentMonthDoses = monthlyData[5]?.doses || 0;
      const previousMonthDoses = monthlyData[4]?.doses || 0;

      let growthPercent = 0;
      if (previousMonthDoses > 0) {
        growthPercent =
          ((currentMonthDoses - previousMonthDoses) / previousMonthDoses) * 100;
      }

      setCenterStats({
        monthlyData,
        currentMonthDoses,
        previousMonthDoses,
        growthPercent,
      });
    } catch (error) {
      console.error("Error fetching center stats:", error);
    }
  }, [center?.id]);

  useEffect(() => {
    fetchCenterStats();
  }, [fetchCenterStats]);

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
            <div className="mt-2">
              <p className="text-gray-700 mb-1">
                <span className="font-medium">Treatment Area:</span>{" "}
                <span
                  className={
                    center.is_treatment_area
                      ? "text-green-600"
                      : "text-gray-500"
                  }
                >
                  {center.is_treatment_area ? "Yes" : "No"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex space-x-4 mt-4">
            <Link
              href={`/center/edit/${center.id}`}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center"
            >
              Edit Center
            </Link>
          </div>
        </div>

        {/* Month Selector moved above statistics and map */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">
            Monthly HPV Vaccination Reports
          </h2>
          <MonthSelector value={selectedMonth} onChange={handleMonthChange} />
        </div>

        {/* Vaccination Statistics moved above map */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">
            Vaccination Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DashboardCard
              title="Current Month Doses"
              value={centerStats.currentMonthDoses}
            />
            <DashboardCard
              title="Previous Month Doses"
              value={centerStats.previousMonthDoses}
            />
            <DashboardCard
              title="Growth Percentage"
              value={`${centerStats.growthPercent.toFixed(2)}%`}
              color={centerStats.growthPercent >= 0 ? "green" : "red"}
              icon={
                centerStats.growthPercent >= 0 ? "trending-up" : "trending-down"
              }
            />
          </div>
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <VaccinationChart data={centerStats.monthlyData} />
          </div>
        </div>

        {/* Map moved below statistics */}
        {center && center.latitude && center.longitude ? (
          <div className="mt-6 mb-8 bg-white shadow-md rounded-lg overflow-hidden">
            <h2 className="text-lg font-medium px-4 py-3 bg-gray-50 border-b">
              Center Location
            </h2>
            <div className="h-72">
              <Map centers={[center]} height="100%" onCenterSelect={() => {}} />
            </div>
          </div>
        ) : (
          <div className="mt-6 mb-8 p-4 bg-gray-50 text-gray-500 rounded-lg text-center">
            No location coordinates available for this center
          </div>
        )}

        {/* Monthly Report Form */}
        <MonthlyReportForm
          centerId={center.id}
          centerName={center.name}
          onSave={handleReportSaved}
          onCancel={() => setShowReportForm(false)}
          initialReport={report || undefined}
        />
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Delete Healthcare Center</h3>
            <p className="mb-6">
              Are you sure you want to delete {center.name}? This action cannot
              be undone, and all associated reports will be removed.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={deleteCenter}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete Center"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-blue-900 text-white text-center p-4 mt-12">
        <p>PHC Data Collection - HPV Vaccination Tracking System</p>
      </footer>
    </div>
  );
}
