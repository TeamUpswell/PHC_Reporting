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
import { toast } from "react-toastify";

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

  const [recentCenterReports, setRecentCenterReports] = useState([]);

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
        .from("healthcare_centers")
        .select("*");

      if (centersError) {
        console.error("Error fetching centers:", centersError);
        throw centersError;
      }

      const totalCenters = centers?.length || 0;
      const treatmentCenters =
        centers?.filter((c) => c.is_treatment_area === true).length || 0;
      const controlCenters = totalCenters - treatmentCenters;

      // Filter reports for the selected month only (new code)
      const selectedMonthStart = format(selectedDate, "yyyy-MM-01");
      const selectedMonthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");

      // Get reports for the selected month only
      const { data: reportsWithCenters, error: reportsError } = await supabase
        .from("monthly_reports")
        .select(`*, center:center_id(id, is_treatment_area)`)
        .gte("report_month", selectedMonthStart)
        .lte("report_month", selectedMonthEnd);

      if (reportsError) {
        console.error("Error fetching reports:", reportsError);
        throw reportsError;
      }

      console.log("Selected month reports:", reportsWithCenters?.length);
      console.log("Date range:", { selectedMonthStart, selectedMonthEnd });

      // Calculate vaccinations by center type for the selected month only
      let totalVaccinations = 0;
      let treatmentVaccinations = 0;
      let controlVaccinations = 0;

      if (reportsWithCenters && reportsWithCenters.length > 0) {
        reportsWithCenters.forEach((report) => {
          let reportVaccinations = 0;

          // Calculate total vaccinations for this report
          if (typeof report.total_vaccinations === "number") {
            reportVaccinations = report.total_vaccinations;
          } else if (typeof report.total_doses === "number") {
            reportVaccinations = report.total_doses;
          } else {
            const dose1 =
              typeof report.dose1_count === "number" ? report.dose1_count : 0;
            const dose2 =
              typeof report.dose2_count === "number" ? report.dose2_count : 0;
            reportVaccinations = dose1 + dose2;
          }

          totalVaccinations += reportVaccinations;

          // Add to treatment or control count based on the center type
          if (report.center && report.center.is_treatment_area === true) {
            treatmentVaccinations += reportVaccinations;
          } else {
            controlVaccinations += reportVaccinations;
          }
        });
      }

      // After calculating current month's vaccinations, get previous month data
      const previousMonthDate = subMonths(selectedDate, 1);
      const previousMonthStart = format(previousMonthDate, "yyyy-MM-01");
      const previousMonthEnd = format(
        endOfMonth(previousMonthDate),
        "yyyy-MM-dd"
      );

      // Get reports for the previous month
      const { data: previousMonthReports, error: prevReportsError } =
        await supabase
          .from("monthly_reports")
          .select(`*, center:center_id(id, is_treatment_area)`)
          .gte("report_month", previousMonthStart)
          .lte("report_month", previousMonthEnd);

      if (prevReportsError) {
        console.error(
          "Error fetching previous month reports:",
          prevReportsError
        );
      }

      // Calculate previous month vaccinations
      let prevTreatmentVaccinations = 0;
      let prevControlVaccinations = 0;

      if (previousMonthReports && previousMonthReports.length > 0) {
        previousMonthReports.forEach((report) => {
          let reportVaccinations = 0;

          // Calculate total vaccinations for this report
          if (typeof report.total_vaccinations === "number") {
            reportVaccinations = report.total_vaccinations;
          } else if (typeof report.total_doses === "number") {
            reportVaccinations = report.total_doses;
          } else {
            const dose1 =
              typeof report.dose1_count === "number" ? report.dose1_count : 0;
            const dose2 =
              typeof report.dose2_count === "number" ? report.dose2_count : 0;
            reportVaccinations = dose1 + dose2;
          }

          // Add to treatment or control count based on the center type
          if (report.center && report.center.is_treatment_area === true) {
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

      // Get recent reports (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentReports, error: recentReportsError } = await supabase
        .from("monthly_reports")
        .select("*")
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (recentReportsError) {
        console.error("Error fetching recent reports:", recentReportsError);
        throw recentReportsError;
      }

      const recentReportsCount = recentReports?.length || 0;

      // Get recent center reports with healthcare center info
      const { data: recentCenterData, error: recentCenterError } =
        await supabase
          .from("monthly_reports")
          .select(`*, healthcare_center:center_id (*)`)
          .order("created_at", { ascending: false })
          .limit(5);

      if (recentCenterError) {
        console.error("Error fetching recent center data:", recentCenterError);
        throw recentCenterError;
      }

      console.log("Recent center data:", recentCenterData);

      // Transform the data to match your component's expectations
      const transformedReports =
        recentCenterData?.map((report) => {
          // Calculate total vaccinations for this report
          let reportVaccinations = 0;

          if (typeof report.total_vaccinations === "number") {
            reportVaccinations = report.total_vaccinations;
          } else if (typeof report.total_doses === "number") {
            reportVaccinations = report.total_doses;
          } else {
            const dose1 =
              typeof report.dose1_count === "number" ? report.dose1_count : 0;
            const dose2 =
              typeof report.dose2_count === "number" ? report.dose2_count : 0;
            reportVaccinations = dose1 + dose2;
          }

          return {
            id: report.id,
            reporting_month: report.report_month,
            healthcare_center: report.healthcare_center,
            total_vaccinations: reportVaccinations,
            created_at: report.created_at,
          };
        }) || [];

      // Update the state with the fetched data
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
        recentReports: recentReportsCount,
      });

      setRecentCenterReports(transformedReports);

      // Add month info to console log
      console.log(
        "Summary data updated for",
        format(selectedDate, "MMMM yyyy"),
        ":",
        {
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
          recentReports: recentReportsCount,
        }
      );
    } catch (error) {
      console.error("Error in fetchSummaryData:", error);
      // Don't throw here, just log it
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <DashboardCard
                title="Total Centers"
                value={summaryData.totalCenters}
                icon="🏥"
                trend={null}
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
                trend={null}
                color="blue"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Treatment Growth Box */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Treatment Area Growth
                </h2>
                <div className="flex items-center mb-4">
                  <div className="text-2xl font-bold">
                    {summaryData.treatmentGrowthPercent.toFixed(1)}%
                  </div>
                  <div className="ml-3">
                    {summaryData.treatmentGrowthPercent > 0 ? (
                      <svg
                        className="w-8 h-8 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                    ) : summaryData.treatmentGrowthPercent < 0 ? (
                      <svg
                        className="w-8 h-8 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 12h14"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="mb-1">
                    Current month:{" "}
                    {summaryData.treatmentVaccinations.toLocaleString()} doses
                  </p>
                  <p>
                    Previous month:{" "}
                    {summaryData.prevTreatmentVaccinations.toLocaleString()}{" "}
                    doses
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Month-over-month growth for Treatment Areas
                  </p>
                </div>
              </div>

              {/* Control Growth Box */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Control Area Growth
                </h2>
                <div className="flex items-center mb-4">
                  <div className="text-2xl font-bold">
                    {summaryData.controlGrowthPercent.toFixed(1)}%
                  </div>
                  <div className="ml-3">
                    {summaryData.controlGrowthPercent > 0 ? (
                      <svg
                        className="w-8 h-8 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                    ) : summaryData.controlGrowthPercent < 0 ? (
                      <svg
                        className="w-8 h-8 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 12h14"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="mb-1">
                    Current month:{" "}
                    {summaryData.controlVaccinations.toLocaleString()} doses
                  </p>
                  <p>
                    Previous month:{" "}
                    {summaryData.prevControlVaccinations.toLocaleString()} doses
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Month-over-month growth for Control Areas
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Activity</h2>
                <span className="text-sm text-gray-600">
                  Last updated: {format(new Date(), "PPpp")}
                </span>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Reports</h3>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold">
                        {summaryData.recentReports}
                      </span>
                      <span className="text-sm text-gray-600">
                        in the last 30 days
                      </span>
                    </div>
                  </div>
                </div>
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
                <h2 className="text-xl font-semibold mb-4">
                  Healthcare Centers Map
                </h2>
                <div style={{ height: "500px", width: "100%" }}>
                  <ErrorBoundary
                    fallback={<div>Map could not be displayed</div>}
                  >
                    <Map
                      centers={filteredCenters}
                      height="500px"
                      onCenterSelect={(center) => {
                        console.log("Center clicked:", center.name);
                      }}
                      onTreatmentToggle={handleTreatmentToggle}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Reports</h2>
                <Link
                  href="/reports"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View all reports →
                </Link>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Center
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Month
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Vaccinations
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Type
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Date Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentCenterReports && recentCenterReports.length > 0 ? (
                      recentCenterReports.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {report.healthcare_center?.name ||
                                "Unknown Center"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {report.healthcare_center ? (
                                <>
                                  {report.healthcare_center.state ||
                                    "Unknown State"}
                                  ,{" "}
                                  {report.healthcare_center.lga ||
                                    "Unknown LGA"}
                                </>
                              ) : (
                                "Location unavailable"
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {report.reporting_month
                              ? format(
                                  new Date(report.reporting_month),
                                  "MMMM yyyy"
                                )
                              : "Unknown Date"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {typeof report.total_vaccinations === "number"
                              ? report.total_vaccinations
                              : 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                report.healthcare_center?.is_treatment_area
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {report.healthcare_center?.is_treatment_area
                                ? "Treatment"
                                : "Control"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {report.created_at
                              ? format(new Date(report.created_at), "PP")
                              : "Unknown"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-4 text-center text-sm text-gray-500"
                        >
                          No recent reports found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
