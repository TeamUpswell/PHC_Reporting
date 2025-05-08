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
import { ToastContainer, toast } from "react-toastify";
import ProtectedRoute from "../components/ProtectedRoute";
import "react-toastify/dist/ReactToastify.css";

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

const MapComponent = dynamic(() => import("../components/Map"), {
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
  zeroDoses?: {
    treatmentCenters: {
      count: number;
      total: number;
      percent: number;
      change?: number;
    };
    controlCenters: {
      count: number;
      total: number;
      percent: number;
      change?: number;
    };
  };
}

interface SummaryData {
  totalCenters: number;
  treatmentCenters: number;
  controlCenters: number;
  totalVaccinations: number;
  treatmentVaccinations: number;
  controlVaccinations: number;
  treatmentGrowthPercent: number;
  controlGrowthPercent: number;
  prevTreatmentVaccinations: number;
  prevControlVaccinations: number;
  recentReports: number;
}

interface RecentCenterReport {
  id: string;
  reporting_month: string;
  healthcare_center: HealthcareCenter | null;
  total_vaccinations: number;
  created_at: string;
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

const Dashboard = () => {
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
    zeroDoses: {
      treatmentCenters: { count: 0, total: 0, percent: 0, change: 0 },
      controlCenters: { count: 0, total: 0, percent: 0, change: 0 },
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [stateStats, setStateStats] = useState<Record<string, number>>({});
  const [showTreatmentAreas, setShowTreatmentAreas] = useState(false);

  const [summaryData, setSummaryData] = useState<SummaryData>({
    totalCenters: 0,
    treatmentCenters: 0,
    controlCenters: 0,
    totalVaccinations: 0,
    treatmentVaccinations: 0,
    controlVaccinations: 0,
    treatmentGrowthPercent: 0,
    controlGrowthPercent: 0,
    prevTreatmentVaccinations: 0,
    prevControlVaccinations: 0,
    recentReports: 0,
  });

  const [recentCenterReports, setRecentCenterReports] = useState<
    RecentCenterReport[]
  >([]);

  const handleStateChange = useCallback((newState: string) => {
    setSelectedState(newState);
  }, []);

  const handleCenterSelect = useCallback(
    (center: HealthcareCenter) => {
      if (center && center.id) {
        router.push(`/center/${center.id}`);
      }
    },
    [router]
  );

  const handleTreatmentToggle = async (
    centerId: string,
    isTreatment: boolean
  ) => {
    try {
      // Update the center in the database
      const { error } = await supabase
        .from("healthcare_centers")
        .update({ is_treatment_area: isTreatment })
        .eq("id", centerId);

      if (error) throw error;

      // Update the local state to reflect the change
      setCenters((prevCenters) =>
        prevCenters.map((center) =>
          center.id === centerId
            ? { ...center, is_treatment_area: isTreatment }
            : center
        )
      );

      // Show success message
      toast.success(
        `${isTreatment ? "Added" : "Removed"} treatment status successfully`
      );
    } catch (error) {
      console.error("Failed to update treatment status:", error);
      toast.error("Failed to update treatment status");
      throw error; // Re-throw to let the UI handle it
    }
  };

  const fetchSummaryData = useCallback(async () => {
    try {
      console.log("Fetching summary data...");

      // Get centers count
      const { data: centers, error: centersError } = await supabase
        .from("healthcare_centers") // Make sure this matches your table name exactly
        .select("*");

      if (centersError) {
        console.error("Error fetching centers:", centersError);
        throw centersError;
      }

      const totalCenters = centers?.length || 0;
      const treatmentCenters =
        centers?.filter((c) => c.is_treatment_area === true).length || 0;
      const controlCenters = totalCenters - treatmentCenters;

      // Filter reports for the selected month only
      const selectedMonthStart = format(selectedDate, "yyyy-MM-01");
      const selectedMonthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");

      console.log("Date range:", { selectedMonthStart, selectedMonthEnd });

      // Get monthly reports for the selected month
      // Note: Updating to match your actual table structure
      const { data: monthlyReports, error } = await supabase
        .from("monthly_reports")
        .select(
          `
        id,
        report_month,
        fixed_doses,
        outreach_doses,
        total_doses,
        center_id,
        center_name
      `
        )
        .eq("report_month", selectedMonthStart); // Use equals instead of range for exact month match

      // Add debug logging
      console.log("Query parameters:", {
        selectedMonth: selectedMonthStart,
        format: "yyyy-MM-01",
      });

      if (error) {
        console.error("Error fetching reports:", error);
        throw error;
      }

      console.log("Selected month reports:", monthlyReports?.length || 0);

      // Calculate vaccinations by center type for the selected month
      let totalVaccinations = 0;
      let treatmentVaccinations = 0;
      let controlVaccinations = 0;

      // Create a map of center IDs to their treatment status for quick lookup
      const centerTreatmentMap = new Map();
      centers?.forEach((center) => {
        centerTreatmentMap.set(center.id, center.is_treatment_area);
      });

      if (monthlyReports && monthlyReports.length > 0) {
        monthlyReports.forEach((report) => {
          // Calculate total vaccinations for this report
          let reportVaccinations = 0;

          // Use the most specific data available
          if (typeof report.total_doses === "number") {
            reportVaccinations = report.total_doses;
          } else {
            // Fall back to calculating from fixed and outreach doses
            const fixedDoses =
              typeof report.fixed_doses === "number" ? report.fixed_doses : 0;
            const outreachDoses =
              typeof report.outreach_doses === "number"
                ? report.outreach_doses
                : 0;
            reportVaccinations = fixedDoses + outreachDoses;
          }

          // Add to total vaccinations
          totalVaccinations += reportVaccinations;

          // Add to treatment or control based on center type
          const isTreatmentCenter = centerTreatmentMap.get(report.center_id);

          if (isTreatmentCenter === true) {
            treatmentVaccinations += reportVaccinations;
          } else {
            controlVaccinations += reportVaccinations;
          }
        });
      }

      // Log the results for debugging
      console.log("Vaccination calculations:", {
        total: totalVaccinations,
        treatment: treatmentVaccinations,
        control: controlVaccinations,
        reportCount: monthlyReports?.length || 0,
      });

      // Calculate previous month data and growth percentages
      const prevMonth = subMonths(selectedDate, 1);
      const prevMonthStart = format(startOfMonth(prevMonth), "yyyy-MM-01");
      const { data: prevMonthReports } = await supabase
        .from("monthly_reports")
        .select(
          `id, report_month, fixed_doses, outreach_doses, total_doses, center_id`
        )
        .eq("report_month", prevMonthStart); // Use equals instead of range

      // Process previous month data
      let prevTreatmentVaccinations = 0;
      let prevControlVaccinations = 0;

      if (prevMonthReports && prevMonthReports.length > 0) {
        prevMonthReports.forEach((report) => {
          let reportVaccinations = 0;

          if (typeof report.total_doses === "number") {
            reportVaccinations = report.total_doses;
          } else {
            const fixedDoses =
              typeof report.fixed_doses === "number" ? report.fixed_doses : 0;
            const outreachDoses =
              typeof report.outreach_doses === "number"
                ? report.outreach_doses
                : 0;
            reportVaccinations = fixedDoses + outreachDoses;
          }

          const isTreatmentCenter = centerTreatmentMap.get(report.center_id);

          if (isTreatmentCenter === true) {
            prevTreatmentVaccinations += reportVaccinations;
          } else {
            prevControlVaccinations += reportVaccinations;
          }
        });
      }

      // Calculate growth percentages
      let treatmentGrowthPercent = 0;
      let controlGrowthPercent = 0;

      if (prevTreatmentVaccinations > 0) {
        treatmentGrowthPercent =
          ((treatmentVaccinations - prevTreatmentVaccinations) /
            prevTreatmentVaccinations) *
          100;
      }

      if (prevControlVaccinations > 0) {
        controlGrowthPercent =
          ((controlVaccinations - prevControlVaccinations) /
            prevControlVaccinations) *
          100;
      }

      console.log("Growth calculations:", {
        treatmentGrowth: treatmentGrowthPercent.toFixed(1) + "%",
        controlGrowth: controlGrowthPercent.toFixed(1) + "%",
      });

      // Get recent reports count
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: recentReportsCount } = await supabase
        .from("monthly_reports")
        .select("id", { count: "exact" })
        .gte("created_at", thirtyDaysAgo.toISOString());

      // Update the state with the correct data
      setSummaryData({
        totalCenters,
        treatmentCenters,
        controlCenters,
        totalVaccinations,
        treatmentVaccinations,
        controlVaccinations,
        treatmentGrowthPercent,
        controlGrowthPercent,
        prevTreatmentVaccinations,
        prevControlVaccinations,
        recentReports: recentReportsCount || 0,
      });
    } catch (error) {
      console.error("Error in fetchSummaryData:", error);
      toast.error("Failed to load summary data. Please try again.");
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchSummaryData();
  }, [fetchSummaryData]);

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
            const targetMonthDate = format(targetDate, "yyyy-MM-01"); // Format for DB matching

            // Filter reports for this specific month
            const monthDoses = reports
              .filter((report) => {
                if (!report.report_month) return false;
                return report.report_month === targetMonthDate;
              })
              .reduce((sum, report) => sum + (report.total_doses || 0), 0);

            const targetMonth = format(targetDate, "MMM");
            const fullLabel = format(targetDate, "MMM yyyy");

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

          // Calculate doses for the selected month only
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

          // Get the current month in yyyy-MM-01 format for filtering
          const currentDate = new Date();
          const currentYearMonth = format(currentDate, "yyyy-MM");
          const currentMonthFormatted = `${currentYearMonth}-01`;

          // Track centers with zero doses
          let treatmentCentersWithZeroDoses = 0;
          let controlCentersWithZeroDoses = 0;
          let totalTreatmentCenters = 0;
          let totalControlCenters = 0;

          // Count treatment vs control centers
          centers.forEach((center) => {
            if (center.is_treatment_area) {
              totalTreatmentCenters++;
            } else {
              totalControlCenters++;
            }
          });

          // Create a map to track which centers have reports
          const centerReportsMap = new Map();

          // Process reports to find centers with zero doses
          reports.forEach((report) => {
            // Only consider current month reports
            if (report.report_month?.startsWith(currentYearMonth)) {
              const center = centers.find((c) => c.id === report.center_id);
              if (center) {
                centerReportsMap.set(report.center_id, report.total_doses || 0);
              }
            }
          });

          // Count centers with zero doses (reported zero or missing reports)
          centers.forEach((center) => {
            const doses = centerReportsMap.get(center.id);
            const hasZeroDoses = doses === 0 || doses === undefined;

            if (hasZeroDoses) {
              if (center.is_treatment_area) {
                treatmentCentersWithZeroDoses++;
              } else {
                controlCentersWithZeroDoses++;
              }
            }
          });

          // Calculate percentages
          const treatmentZeroPercent =
            totalTreatmentCenters > 0
              ? (treatmentCentersWithZeroDoses / totalTreatmentCenters) * 100
              : 0;

          const controlZeroPercent =
            totalControlCenters > 0
              ? (controlCentersWithZeroDoses / totalControlCenters) * 100
              : 0;

          // Calculate changes
          const treatmentChange =
            stats.zeroDoses?.treatmentCenters.percent !== undefined
              ? treatmentZeroPercent - stats.zeroDoses?.treatmentCenters.percent
              : 0;

          const controlChange =
            stats.zeroDoses?.controlCenters.percent !== undefined
              ? controlZeroPercent - stats.zeroDoses?.controlCenters.percent
              : 0;

          // Add these values to your stats
          setStats((prevStats) => ({
            ...prevStats,
            zeroDoses: {
              treatmentCenters: {
                count: treatmentCentersWithZeroDoses,
                total: totalTreatmentCenters,
                percent: treatmentZeroPercent,
                change: treatmentChange,
              },
              controlCenters: {
                count: controlCentersWithZeroDoses,
                total: totalControlCenters,
                percent: controlZeroPercent,
                change: controlChange,
              },
            },
          }));

          setStats((prevStats) => ({
            totalCenters: centers.length,
            totalDoses,
            stockoutCenters,
            recentReports,
            areaStats,
            monthlyData,
            zeroDoses: prevStats.zeroDoses, // Preserve the previously set zeroDoses
          }));

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

  useEffect(() => {
    async function checkAuthAndData() {
      // Check current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("Current user:", user);

      // Test healthcare_centers access
      const { data: centers, error: centersError } = await supabase
        .from("healthcare_centers")
        .select("count(*)")
        .limit(1);
      console.log("Centers access:", { data: centers, error: centersError });

      // Test monthly_reports access
      const { data: reports, error: reportsError } = await supabase
        .from("monthly_reports")
        .select("count(*)")
        .limit(1);
      console.log("Reports access:", { data: reports, error: reportsError });
    }

    checkAuthAndData();
  }, []);

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
                        d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6-6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <DashboardCard
                title="Total Centers"
                value={summaryData.totalCenters}
                icon="🏥"
                trend={undefined}
              />
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-2">
                  <div className="text-green-500 mr-3">💉</div>
                  <h3 className="text-lg font-medium text-gray-700">
                    Treatment Centers
                  </h3>
                </div>
                <div className="text-2xl font-bold">
                  {summaryData.treatmentVaccinations.toLocaleString()} doses
                </div>
                <div className="text-green-600 font-medium mt-1 text-sm">
                  {summaryData.treatmentCenters} centers
                  <span className="text-gray-500 ml-1">
                    ({format(selectedDate, "MMM yyyy")})
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-2">
                  <div className="text-red-500 mr-3">🔍</div>
                  <h3 className="text-lg font-medium text-gray-700">
                    Control Centers
                  </h3>
                </div>
                <div className="text-2xl font-bold">
                  {summaryData.controlVaccinations.toLocaleString()} doses
                </div>
                <div className="text-red-600 font-medium mt-1 text-sm">
                  {summaryData.controlCenters} centers
                  <span className="text-gray-500 ml-1">
                    ({format(selectedDate, "MMM yyyy")})
                  </span>
                </div>
              </div>
              <DashboardCard
                title="Total Vaccinations"
                value={summaryData.totalVaccinations.toLocaleString()}
                icon="💪"
                trend={undefined}
                color="blue"
              />
            </div>

            {/* Zero Doses Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Treatment Areas Zero Doses Card */}
              <DashboardCard
                title="Treatment Centers with Zero Doses"
                value={`${stats.zeroDoses?.treatmentCenters.percent?.toFixed(1) || 0}%`}
                subValue={`${stats.zeroDoses?.treatmentCenters.count || 0} of ${stats.zeroDoses?.treatmentCenters.total || 0} centers`}
                icon="exclamation-triangle"
                color="red"${stats.zeroDoses?.treatmentCenters.count || 0} of ${
                trend={.zeroDoses?.treatmentCenters.total || 0
                  stats.zeroDoses?.treatmentCenters.change !== undefined &&
                  stats.zeroDoses?.treatmentCenters.change !== 0
                    ? {red"
                        direction:
                          (stats.zeroDoses?.treatmentCenters.change ?? 0) < 0
                            ? "down"reatmentCenters.change !== 0
                            : "up",
                        percentage: `${Math.abs(
                          stats.zeroDoses?.treatmentCenters.change ?? 00) < 0
                        ).toFixed(1)}%`,
                      }     : "up",
                    : nullrcentage: `${Math.abs(
                }         stats.zeroDoses?.treatmentCenters.change ?? 0
              />        ).toFixed(1)}%`,
                      }
              {/* Control Areas Zero Doses Card */}
              <DashboardCard
                title="Control Centers with Zero Doses"
                value={`${stats.zeroDoses?.controlCenters.percent?.toFixed(1) || 0}%`}
                subValue={`${stats.zeroDoses?.controlCenters.count || 0} of ${stats.zeroDoses?.controlCenters.total || 0} centers`}
                icon="exclamation-triangle"
                color="yellow" Centers with Zero Doses"
                trend={`${
                  stats.zeroDoses?.controlCenters.change !== undefined &&0
                  stats.zeroDoses?.controlCenters.change !== 0
                    ? {e={`${stats.zeroDoses?.controlCenters.count || 0} of ${
                        direction:.controlCenters.total || 0
                          (stats.zeroDoses?.controlCenters.change ?? 0) < 0
                            ? "down"iangle"
                            : "up",
                        percentage: `${Math.abs(
                          stats.zeroDoses?.controlCenters.change ?? 0d &&
                        ).toFixed(1)}%`,olCenters.change !== 0
                      }
                    : nullrection:
                }         (stats.zeroDoses?.controlCenters.change ?? 0) < 0
              />            ? "down"
            </div>          : "up",
                        percentage: `${Math.abs(
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Treatment Growth Box */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Treatment Area Growth
                </h2>
                <div className="flex items-center mb-4">
                  <div className="text-2xl font-bold">
                    {summaryData.treatmentGrowthPercent.toFixed(1)}%-8">
                  </div>ent Growth Box */}
                  <div className="ml-3">ounded-lg shadow p-6">
                    {summaryData.treatmentGrowthPercent > 0 ? (
                      <svgt Area Growth
                        className="w-8 h-8 text-green-500"
                        fill="none"x items-center mb-4">
                        stroke="currentColor"nt-bold">
                        viewBox="0 0 24 24"rowthPercent.toFixed(1)}%
                        xmlns="http://www.w3.org/2000/svg"
                      >className="ml-3">
                        <pathata.treatmentGrowthPercent > 0 ? (
                          strokeLinecap="round"
                          strokeLinejoin="round"green-500"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />ewBox="0 0 24 24"
                      </svg>s="http://www.w3.org/2000/svg"
                    ) : summaryData.treatmentGrowthPercent < 0 ? (
                      <svgath
                        className="w-8 h-8 text-red-500"
                        fill="none"ejoin="round"
                        stroke="currentColor"
                        viewBox="0 0 24 24"0-8l-8 8-4-4-6 6"
                        xmlns="http://www.w3.org/2000/svg"
                      >/svg>
                        <pathryData.treatmentGrowthPercent < 0 ? (
                          strokeLinecap="round"
                          strokeLinejoin="round"red-500"
                          strokeWidth={2}
                          d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
                        />ewBox="0 0 24 24"
                      </svg>s="http://www.w3.org/2000/svg"
                    ) : (
                      <svgath
                        className="w-8 h-8 text-gray-400"
                        fill="none"ejoin="round"
                        stroke="currentColor"
                        viewBox="0 0 24 24"8m0 8l-8-8-4 4-6-6"
                        xmlns="http://www.w3.org/2000/svg"
                      >/svg>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"gray-400"
                          strokeWidth={2}
                          d="M5 12h14"tColor"
                        />ewBox="0 0 24 24"
                      </svg>s="http://www.w3.org/2000/svg"
                    )}>
                  </div><path
                </div>    strokeLinecap="round"
                <div className="text-sm text-gray-600">
                  <p className="mb-1">{2}
                    Current month:{" "}
                    {summaryData.treatmentVaccinations.toLocaleString()} doses
                  </p></svg>
                  <p>}
                    Previous month:{" "}
                    {summaryData.prevTreatmentVaccinations.toLocaleString()}{" "}
                    dosessName="text-sm text-gray-600">
                  </p>lassName="mb-1">
                  <p className="mt-2 text-xs text-gray-500">
                    Month-over-month growth for Treatment AreasString()} doses
                  </p>
                </div>
              </div>Previous month:{" "}
                    {summaryData.prevTreatmentVaccinations.toLocaleString()}{" "}
              {/* Control Growth Box */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">>
                  Control Area Growthgrowth for Treatment Areas
                </h2>>
                <div className="flex items-center mb-4">
                  <div className="text-2xl font-bold">
                    {summaryData.controlGrowthPercent.toFixed(1)}%
                  </div>l Growth Box */}
                  <div className="ml-3">ounded-lg shadow p-6">
                    {summaryData.controlGrowthPercent > 0 ? (
                      <svgArea Growth
                        className="w-8 h-8 text-green-500"
                        fill="none"x items-center mb-4">
                        stroke="currentColor"nt-bold">
                        viewBox="0 0 24 24"wthPercent.toFixed(1)}%
                        xmlns="http://www.w3.org/2000/svg"
                      >className="ml-3">
                        <pathata.controlGrowthPercent > 0 ? (
                          strokeLinecap="round"
                          strokeLinejoin="round"green-500"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />ewBox="0 0 24 24"
                      </svg>s="http://www.w3.org/2000/svg"
                    ) : summaryData.controlGrowthPercent < 0 ? (
                      <svgath
                        className="w-8 h-8 text-red-500"
                        fill="none"ejoin="round"
                        stroke="currentColor"
                        viewBox="0 0 24 24"0-8l-8 8-4-4-6 6"
                        xmlns="http://www.w3.org/2000/svg"
                      >/svg>
                        <pathryData.controlGrowthPercent < 0 ? (
                          strokeLinecap="round"
                          strokeLinejoin="round"red-500"
                          strokeWidth={2}
                          d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
                        />ewBox="0 0 24 24"
                      </svg>s="http://www.w3.org/2000/svg"
                    ) : (
                      <svgath
                        className="w-8 h-8 text-gray-400"
                        fill="none"ejoin="round"
                        stroke="currentColor"
                        viewBox="0 0 24 24"8m0 8l-8-8-4 4-6-6"
                        xmlns="http://www.w3.org/2000/svg"
                      >/svg>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"gray-400"
                          strokeWidth={2}
                          d="M5 12h14"tColor"
                        />ewBox="0 0 24 24"
                      </svg>s="http://www.w3.org/2000/svg"
                    )}>
                  </div><path
                </div>    strokeLinecap="round"
                <div className="text-sm text-gray-600">
                  <p className="mb-1">{2}
                    Current month:{" "}
                    {summaryData.controlVaccinations.toLocaleString()} doses
                  </p></svg>
                  <p>}
                    Previous month:{" "}
                    {summaryData.prevControlVaccinations.toLocaleString()} doses
                  </p>lassName="text-sm text-gray-600">
                  <p className="mt-2 text-xs text-gray-500">
                    Month-over-month growth for Control Areas
                  </p>ummaryData.controlVaccinations.toLocaleString()} doses
                </div>
              </div>>
            </div>  Previous month:{" "}
                    {summaryData.prevControlVaccinations.toLocaleString()} doses
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Activity</h2>
                <span className="text-sm text-gray-600">
                  Last updated: {format(new Date(), "PPpp")}
                </span>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>ssName="text-xl font-semibold">Recent Activity</h2>
                    <h3 className="text-lg font-medium mb-2">Reports</h3>
                    <div className="flex items-end gap-2">)}
                      <span className="text-2xl font-bold">
                        {summaryData.recentReports}
                      </span>
                      <span className="text-sm text-gray-600">
                        in the last 30 daysols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      </span>
                    </div>assName="text-lg font-medium mb-2">Reports</h3>
                  </div> className="flex items-end gap-2">
                </div><span className="text-2xl font-bold">
              </div>    {summaryData.recentReports}
            </div>    </span>
                      <span className="text-sm text-gray-600">
            <div className="mb-8">t 30 days
              {/* Two Column Layout - Chart on Left, Stats on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Left Column - Vaccination Chart */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4">
                      Vaccination Doses ({format(selectedDate, "MMMM yyyy")})
                    </h2>e="mb-8">
                    <ErrorBoundaryt - Chart on Left, Stats on Right */}
                      fallback={<div>Chart could not be displayed</div>}">
                    >eft Column - Vaccination Chart */}
                      <VaccinationChartspan-2">
                        data={stats.monthlyData}ed-lg shadow-md p-6">
                        height="300px"t-xl font-bold mb-4">
                      />ccination Doses ({format(selectedDate, "MMMM yyyy")})
                    </ErrorBoundary>
                  </div>orBoundary
                </div>fallback={<div>Chart could not be displayed</div>}
                    >
                {/* Right Column - Stats and Links */}
                <div className="space-y-8">Data}
                  {/* Doses by State Card */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4">
                      Doses by State ({format(selectedDate, "MMMM yyyy")})
                    </h2>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {Object.entries(stateStats).map(([state, doses]) => (
                        <divme="space-y-8">
                          key={`state-${state}`}
                          className="flex justify-between items-center"
                        >lassName="text-xl font-bold mb-4">
                          <span>{state}</span>selectedDate, "MMMM yyyy")})
                          <span className="font-semibold">{doses} doses</span>
                        </div>Name="space-y-2 max-h-48 overflow-y-auto">
                      ))}ject.entries(stateStats).map(([state, doses]) => (
                    </div>iv
                  </div>  key={`state-${state}`}
                          className="flex justify-between items-center"
                  {/* Quick Links Card */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4">Quick Links</h2>an>
                    <div className="space-y-2">
                      <Link
                        href="/add-center"
                        className="block w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        Add New Healthcare Center
                      </Link>ame="bg-white rounded-lg shadow-md p-6">
                      <LinkssName="text-xl font-bold mb-4">Quick Links</h2>
                        href="/"me="space-y-2">
                        className="block w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded"
                      > href="/add-center"
                        View All Centers w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded"
                      </Link>
                      <Link New Healthcare Center
                        href="/reports"
                        className="block w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded"
                      > href="/"
                        View All Reports w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded"
                      </Link>
                    </div>ew All Centers
                  </div>Link>
                </div><Link
              </div>    href="/reports"
                        className="block w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded"
              {/* Map - Full Width - Now below other elements */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Healthcare Centers Map
                </h2>iv>
                <div style={{ height: "500px", width: "100%" }}>
                  <ErrorBoundary
                    fallback={<div>Map could not be displayed</div>}
                  >ap - Full Width - Now below other elements */}
                    <MapComponentwhite rounded-lg shadow-md p-6">
                      centers={filteredCenters}ibold mb-4">
                      height="500px" Map
                      onCenterSelect={(center) => {
                        console.log("Center clicked:", center.name);
                      }}Boundary
                      onTreatmentToggle={handleTreatmentToggle}div>}
                    />
                  </ErrorBoundary>
                </div>centers={filteredCenters}
              </div>  height="500px"
            </div>    onCenterSelect={(center) => {
                        console.log("Center clicked:", center.name);
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Reports</h2>
                <LinkrrorBoundary>
                  href="/reports"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >>
                  View all reports →
                </Link>ame="mb-8">
              </div>lassName="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Reports</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">:text-blue-800 text-sm font-medium"
                    <tr>
                      <thl reports →
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Centerbg-white rounded-lg shadow overflow-hidden">
                      </th>sName="min-w-full divide-y divide-gray-200">
                      <thclassName="bg-gray-50">
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      > scope="col"
                        MonthName="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      </th>
                      <thenter
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      > scope="col"
                        Vaccinationsx-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      </th>
                      <thonth
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      > scope="col"
                        TypesName="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      </th>
                      <thaccinations
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      > scope="col"
                        Date Submitted6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      </th>
                    </tr>ype
                  </thead>>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentCenterReports && recentCenterReports.length > 0 ? (
                      recentCenterReports.map((report) => (-xs font-medium text-gray-500 uppercase tracking-wider"
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {report.healthcare_center?.name ||
                                "Unknown Center"}
                            </div>="bg-white divide-y divide-gray-200">
                            <div className="text-sm text-gray-500">gth > 0 ? (
                              {report.healthcare_center ? (
                                <>eport.id} className="hover:bg-gray-50">
                                  {report.healthcare_center.state ||">
                                    "Unknown State"}ium text-gray-900">
                                  ,{" "}althcare_center?.name ||
                                  {report.healthcare_center.lga ||
                                    "Unknown LGA"}
                                </>assName="text-sm text-gray-500">
                              ) : (rt.healthcare_center ? (
                                "Location unavailable"
                              )}  {report.healthcare_center.state ||
                            </div>  "Unknown State"}
                          </td>   ,{" "}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {report.reporting_month
                              ? format(
                                  new Date(report.reporting_month),
                                  "MMMM yyyy"vailable"
                                )
                              : "Unknown Date"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">">
                            {typeof report.total_vaccinations === "number"
                              ? report.total_vaccinations
                              : 0}new Date(report.reporting_month),
                          </td>   "MMMM yyyy"
                          <td className="px-6 py-4 whitespace-nowrap">
                            <spanUnknown Date"}
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                report.healthcare_center?.is_treatment_aream font-medium">
                                  ? "bg-green-100 text-green-800" "number"
                                  : "bg-red-100 text-red-800"
                              }`}}
                            >d>
                              {report.healthcare_center?.is_treatment_area
                                ? "Treatment"
                                : "Control"}-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            </span>ort.healthcare_center?.is_treatment_area
                          </td>   ? "bg-green-100 text-green-800"
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {report.created_at
                              ? format(new Date(report.created_at), "PP")
                              : "Unknown"}thcare_center?.is_treatment_area
                          </td> ? "Treatment"
                        </tr>   : "Control"}
                      ))    </span>
                    ) : ( </td>
                      <tr><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <td {report.created_at
                          colSpan={5}t(new Date(report.created_at), "PP")
                          className="px-6 py-4 text-center text-sm text-gray-500"
                        > </td>
                          No recent reports found
                        </td>
                      </tr>
                    )}<tr>
                  </tbody>d
                </table>  colSpan={5}
              </div>      className="px-6 py-4 text-center text-sm text-gray-500"
            </div>      >
          </>             No recent reports found
        )}              </td>
      </main>         </tr>
    </div>          )}
  );              </tbody>
};              </table>
              </div>
import { GetServerSidePropsContext } from "next";
          </>
export async function getServerSideProps({ req }: GetServerSidePropsContext) {
  // We'll let the client-side ProtectedRoute component handle authentication
  // This simplifies the server-side logic
  return { props: {} };
};

export default Dashboard;psContext } from "next";

export async function getServerSideProps({ req }: GetServerSidePropsContext) {
  // We'll let the client-side ProtectedRoute component handle authentication
  // This simplifies the server-side logic
  return { props: {} };
}

export default Dashboard;
