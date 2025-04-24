import { useState, useEffect, useMemo, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import useSWR from "swr";
import {
  format,
  subMonths,
  parseISO,
  startOfMonth,
  endOfMonth,
  addMonths,
} from "date-fns";
import dynamic from "next/dynamic";
import DashboardCard from "../components/DashboardCard";
import ErrorBoundary from "../components/ErrorBoundary";
import { HealthcareCenter, MonthlyReport } from "../types";

const VaccinationChart = dynamic(
  () => import("../components/VaccinationChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-white rounded-lg shadow-md flex items-center justify-center">
        Loading chart...
      </div>
    ),
  }
);

const Map = dynamic(() => import("../components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-white rounded-lg shadow-md flex items-center justify-center">
      Loading map...
    </div>
  ),
});

interface DashboardStats {
  totalCenters: number;
  totalDoses: number;
  stockoutCenters: number;
  recentReports: number;
  areaStats: Record<string, number>;
  monthlyData: Array<{
    month: string;
    fullLabel: string;
    doses: number;
  }>;
}

const DashboardSkeleton = () => (
  <div>
    <div className="mb-8 flex justify-between items-center">
      <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
      <div className="h-8 bg-gray-200 rounded w-1/6 animate-pulse"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-white p-6 rounded-lg shadow-md h-32 animate-pulse"
        >
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
    <div className="h-96 bg-gray-200 rounded animate-pulse mb-8"></div>
  </div>
);

export default function Dashboard() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });

  const { data: centersData, error: centersError } = useSWR(
    "healthcare_centers",
    async () => {
      const { data, error } = await supabase
        .from("healthcare_centers")
        .select("*")
        .order("name")
        .limit(200);

      if (error) throw error;
      return data || [];
    }
  );

  const { data: reportsData, error: reportsError } = useSWR(
    [`monthly_reports`, dateRange],
    async () => {
      const sixMonthsAgo = format(subMonths(dateRange.start, 5), "yyyy-MM-dd");
      const endOfCurrentMonth = format(dateRange.end, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("monthly_reports")
        .select("*")
        .gte("report_month", sixMonthsAgo)
        .lte("report_month", endOfCurrentMonth)
        .limit(500);

      if (error) throw error;
      return data;
    }
  );

  const [centers, setCenters] = useState<HealthcareCenter[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCenters: 0,
    totalDoses: 0,
    stockoutCenters: 0,
    recentReports: 0,
    areaStats: {},
    monthlyData: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [stateStats, setStateStats] = useState<Record<string, number>>({});
  const [showTreatmentAreas, setShowTreatmentAreas] = useState(false);

  const handleStateChange = useCallback((newState: string) => {
    setSelectedState(newState);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log("Reports data from API:", reportsData);
        console.log(
          "Reports data structure:",
          reportsData && reportsData.length > 0 ? reportsData[0] : "No reports"
        );
        console.log("Total reports:", reportsData?.length || 0);
        console.log(
          "Reports with dates:",
          reportsData?.filter((r) => r.report_month).length || 0
        );

        if (reportsError) throw reportsError;

        if (isMounted && centersData && reportsData) {
          // Extract the data from centersData if it's in a Supabase response format
          const centers = Array.isArray(centersData)
            ? centersData
            : centersData || [];

          setCenters(centers as HealthcareCenter[]);

          const areaStats: Record<string, number> = {};

          // Make sure we're iterating over the array
          centers.forEach((center) => {
            if (center && center.area) {
              if (!areaStats[center.area]) {
                areaStats[center.area] = 0;
              }
            }
          });

          // Same for reportsData
          const reports = Array.isArray(reportsData)
            ? reportsData
            : reportsData || [];

          // After fetching reports, filter them for the selected month only:
          const selectedMonthReports = reports.filter((report) => {
            if (!report.report_month) return false;
            try {
              const reportDate = parseISO(report.report_month);
              return (
                format(reportDate, "yyyy-MM") ===
                format(selectedDate, "yyyy-MM")
              );
            } catch (err) {
              console.error("Error parsing date:", err);
              return false;
            }
          });

          // Initialize stateStats with zeroes for all states
          const stateStats: Record<string, number> = {};
          centers.forEach((center) => {
            if (center && center.state) {
              if (!stateStats[center.state]) {
                stateStats[center.state] = 0;
              }
            }
          });

          // Then calculate state stats using ONLY the selected month reports
          selectedMonthReports.forEach((report) => {
            const center = centers.find((c) => c.id === report.center_id);
            if (center) {
              if (center.state && report.total_doses) {
                stateStats[center.state] += report.total_doses;
              }
            }
          });

          reports.forEach((report) => {
            const center = centers.find((c) => c.id === report.center_id);
            if (center) {
              if (center.area && report.total_doses) {
                areaStats[center.area] += report.total_doses;
              }
            }
          });

          const now = new Date();
          const monthlyData = [];

          // Get the current year and month
          const currentYear = format(now, "yyyy");
          const currentMonth = parseInt(format(now, "M"), 10);

          // Generate data for the past 6 months
          for (let i = 5; i >= 0; i--) {
            const targetDate = subMonths(now, i);
            const targetYear = format(targetDate, "yyyy");
            const targetMonth = format(targetDate, "MMM");
            const fullLabel = format(targetDate, "MMM yyyy");

            // Filter reports for this specific year AND month
            const monthDoses = reports
              .filter((report) => {
                if (!report.report_month) return false;
                try {
                  const reportDate = parseISO(report.report_month);
                  return (
                    format(reportDate, "yyyy") === targetYear &&
                    format(reportDate, "MMM") === targetMonth
                  );
                } catch (err) {
                  return false;
                }
              })
              .reduce((sum, report) => sum + (report.total_doses || 0), 0);

            monthlyData.push({
              month: targetMonth, // Keep the short month label for display
              fullLabel: fullLabel, // Add full month+year for tooltips
              doses: monthDoses,
            });
          }

          console.log("Monthly data for chart:", monthlyData);

          // Filter reports for the selected month only
          const selectedMonthReportsForStats = reports.filter((report) => {
            if (!report.report_month) return false;
            try {
              const reportDate = parseISO(report.report_month);
              return (
                format(reportDate, "yyyy-MM") ===
                format(selectedDate, "yyyy-MM")
              );
            } catch (err) {
              console.error("Error parsing date:", err);
              return false;
            }
          });

          // Calculate doses for the selected month
          const totalDoses = selectedMonthReportsForStats.reduce(
            (sum, report) => sum + (report.total_doses || 0),
            0
          );

          // Update recentReports to only count reports from the selected month
          const recentReports = selectedMonthReportsForStats.length;

          const stockoutCenters = reports
            .filter(
              (report) =>
                report.has_stockout === true &&
                report.report_date &&
                parseISO(report.report_date) >= subMonths(new Date(), 1)
            )
            .reduce((centers, report) => {
              centers.add(report.center_id);
              return centers;
            }, new Set()).size;

          console.log("Original monthly data:", monthlyData);

          setStats({
            totalCenters: centers.length,
            totalDoses,
            stockoutCenters,
            recentReports,
            areaStats,
            monthlyData,
          });

          setStateStats(stateStats);
        }
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [dateRange, reportsData, reportsError]);

  useEffect(() => {
    console.log("Stats monthly data:", stats.monthlyData);
  }, [stats.monthlyData]);

  const filteredCenters = useMemo(() => {
    if (!centers || !Array.isArray(centers)) {
      return [];
    }

    return centers.filter(
      (center) =>
        (selectedState === "all" || center.state === selectedState) &&
        (!showTreatmentAreas || center.is_treatment_area)
    );
  }, [centers, selectedState, showTreatmentAreas]);

  const treatmentAreaCount = Array.isArray(centers)
    ? centers.filter((center) => center.is_treatment_area).length
    : 0;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <Head>
              <title>Dashboard - PHC Data Collection</title>
            </Head>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">
                Dashboard
              </h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const newDate = subMonths(selectedDate, 1);
                      setSelectedDate(newDate);
                      setDateRange({
                        start: startOfMonth(newDate),
                        end: endOfMonth(newDate),
                      });
                    }}
                    className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                    aria-label="Previous month"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fillRule="evenodd"
                        d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"
                      />
                    </svg>
                  </button>

                  <span className="text-lg font-medium px-2">
                    {format(selectedDate, "MMMM yyyy")}
                  </span>

                  <button
                    onClick={() => {
                      const now = new Date();
                      const newDate = addMonths(selectedDate, 1);
                      // Don't allow selection of future months
                      if (newDate <= now) {
                        setSelectedDate(newDate);
                        setDateRange({
                          start: startOfMonth(newDate),
                          end: endOfMonth(newDate),
                        });
                      }
                    }}
                    className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                    aria-label="Next month"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={() => {
                      const now = new Date();
                      setSelectedDate(now);
                      setDateRange({
                        start: startOfMonth(now),
                        end: endOfMonth(now),
                      });
                    }}
                    className={`ml-2 px-3 py-1 text-sm ${
                      format(selectedDate, "yyyy-MM") ===
                      format(new Date(), "yyyy-MM")
                        ? "bg-blue-100 text-blue-800"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    } rounded`}
                  >
                    Current Month
                  </button>
                </div>

                <Link
                  href="/add-center"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center"
                >
                  Add New Center
                </Link>
              </div>
            </div>

            <div className="mb-8">
              {/* Two Column Layout - Chart on Left, Stats on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Left Column - Vaccination Chart */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4">
                      Vaccination Doses ({format(selectedDate, "MMMM yyyy")})
                    </h2>
                    <ErrorBoundary
                      fallback={<div>Chart could not be displayed</div>}
                    >
                      <VaccinationChart
                        data={stats.monthlyData}
                        height="300px"
                      />
                    </ErrorBoundary>
                  </div>
                </div>

                {/* Right Column - Stats and Links */}
                <div className="space-y-8">
                  {/* Doses by State Card */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4">
                      Doses by State ({format(selectedDate, "MMMM yyyy")})
                    </h2>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {Object.entries(stateStats).map(([state, doses]) => (
                        <div
                          key={`state-${state}`}
                          className="flex justify-between items-center"
                        >
                          <span>{state}</span>
                          <span className="font-semibold">{doses} doses</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Links Card */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4">Quick Links</h2>
                    <div className="space-y-2">
                      <Link
                        href="/add-center"
                        className="block w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        Add New Healthcare Center
                      </Link>
                      <Link
                        href="/"
                        className="block w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        View All Centers
                      </Link>
                      <Link
                        href="/reports"
                        className="block w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        View All Reports
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map - Full Width - Now below other elements */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Center Locations</h2>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center text-sm space-x-2">
                      <input
                        type="checkbox"
                        checked={showTreatmentAreas}
                        onChange={(e) =>
                          setShowTreatmentAreas(e.target.checked)
                        }
                        className="h-4 w-4 text-blue-600"
                      />
                      <span>Show treatment areas only</span>
                    </label>
                    <select
                      value={selectedState}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="px-3 py-1 border rounded"
                    >
                      <option value="all">All States</option>
                      {Object.keys(stateStats).map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ height: "500px", width: "100%" }}>
                  <ErrorBoundary
                    fallback={<div>Map could not be displayed</div>}
                  >
                    <Map
                      centers={filteredCenters}
                      height="100%"
                      onCenterSelect={(id) => router.push(`/center/${id}`)}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
