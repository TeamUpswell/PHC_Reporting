import React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import useSWR, { mutate } from "swr";
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
import { HealthcareCenter } from "../types";
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
  doseDistribution?: {
    treatment: {
      fixed: number;
      outreach: number;
      total: number;
      fixedPercent: number;
      outreachPercent: number;
    };
    control: {
      fixed: number;
      outreach: number;
      total: number;
      fixedPercent: number;
      outreachPercent: number;
    };
  };
  performanceBreakdown?: {
    highPerforming: {
      count: number;
      totalDoses: number;
      percentOfAllDoses: number;
    };
    lowPerforming: {
      count: number;
      totalDoses: number;
      percentOfAllDoses: number;
    };
    totalCenters: number;
    totalDoses: number;
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
}

// New interface for available months selector props
interface AvailableMonthsSelectorProps {
  availableMonths: string[];
  selectedDate: Date;
  onMonthSelect: (date: Date) => void;
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

// Replace your MonthDropdownSelector with this improved version
const MonthDropdownSelector = ({
  availableMonths,
  selectedDate,
  onMonthSelect,
}: AvailableMonthsSelectorProps) => {
  if (!availableMonths || availableMonths.length === 0) return null;

  console.log("Available months in dropdown:", availableMonths);
  console.log("Currently selected date:", selectedDate);
  console.log("Selected date formatted:", format(selectedDate, "yyyy-MM-01"));

  return (
    <div className="inline-block relative w-64">
      <select
        className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline"
        value={format(selectedDate, "yyyy-MM-01")}
        onChange={(e) => {
          try {
            console.log("Selected month value:", e.target.value);
            // Parse the selected month (which should be in YYYY-MM-01 format)
            const selectedMonth = e.target.value;
            // Create a date object for the first day of that month
            const date = new Date(selectedMonth + "T00:00:00");
            console.log("Parsed date:", date);
            onMonthSelect(date);
          } catch (err) {
            console.error("Error selecting month:", err);
          }
        }}
      >
        {availableMonths.map((month) => {
          try {
            // month should already be in YYYY-MM-01 format
            const monthDate = new Date(month + "T00:00:00");
            return (
              <option key={month} value={month}>
                {format(monthDate, "MMMM yyyy")}
              </option>
            );
          } catch (err) {
            console.error(`Error parsing month: ${month}`, err);
            return null;
          }
        })}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg
          className="fill-current h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
        >
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Default to the most recent month with data (May 2025)
    return new Date("2025-05-01T00:00:00");
  });
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
    "monthly_reports",
    async () => {
      console.log("Fetching ALL monthly reports without filters");
      const { data, error } = await supabase
        .from("monthly_reports")
        .select("*")
        .order("report_month", { ascending: false })
        .limit(1000); // Remove the .not("center_name", "is", null) filter

      if (error) {
        console.error("Error fetching reports:", error);
        throw new Error(`Error fetching reports: ${error.message}`);
      }

      // Debug what months are actually returned from the database
      const monthCounts: Record<string, number> = {};
      data.forEach((report) => {
        if (report.report_month) {
          monthCounts[report.report_month] =
            (monthCounts[report.report_month] || 0) + 1;
        }
      });
      console.log("ALL months found in database:", monthCounts);

      return data;
    }
  );

  const [centers, setCenters] = useState<HealthcareCenter[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCenters: 0,
    totalDoses: 0,
    stockoutCenters: 0,
    areaStats: {},
    monthlyData: [],
    zeroDoses: {
      treatmentCenters: { count: 0, total: 0, percent: 0, change: 0 },
      controlCenters: { count: 0, total: 0, percent: 0, change: 0 },
    },
    doseDistribution: {
      treatment: {
        fixed: 0,
        outreach: 0,
        total: 0,
        fixedPercent: 0,
        outreachPercent: 0,
      },
      control: {
        fixed: 0,
        outreach: 0,
        total: 0,
        fixedPercent: 0,
        outreachPercent: 0,
      },
    },
    performanceBreakdown: {
      highPerforming: {
        count: 0,
        totalDoses: 0,
        percentOfAllDoses: 0,
      },
      lowPerforming: {
        count: 0,
        totalDoses: 0,
        percentOfAllDoses: 0,
      },
      totalCenters: 0,
      totalDoses: 0,
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
  });

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

  // Replace the fetchSummaryData function with this corrected version:

  const fetchSummaryData = useCallback(async () => {
    try {
      console.log(
        "Fetching summary data for:",
        format(selectedDate, "MMMM yyyy")
      );

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

      // Filter reports for the selected month ONLY
      const selectedMonthStart = format(selectedDate, "yyyy-MM-01");
      console.log("Looking for reports in month:", selectedMonthStart);

      // Get ALL monthly reports first, then filter client-side for better debugging
      const { data: allReports, error } = await supabase
        .from("monthly_reports")
        .select("*")
        .order("report_month", { ascending: false })
        .limit(1000); // Remove the .not("center_name", "is", null) filter

      if (error) {
        console.error("Error fetching reports:", error);
        throw error;
      }

      console.log("Total reports available:", allReports?.length || 0);

      // Filter for selected month
      const monthlyReports =
        allReports?.filter((report) => {
          if (!report.report_month) return false;

          // Direct string comparison - more reliable
          const selectedMonthFormatted = format(selectedDate, "yyyy-MM-01");
          return report.report_month === selectedMonthFormatted;
        }) || [];

      console.log("Reports for selected month:", monthlyReports.length);
      console.log("Sample report:", monthlyReports[0]);

      // Calculate vaccinations by center type for the selected month
      let totalVaccinations = 0;
      let treatmentVaccinations = 0;
      let controlVaccinations = 0;

      // DECLARE THESE VARIABLES HERE - THIS WAS THE MISSING PIECE
      let prevTreatmentVaccinations = 0;
      let prevControlVaccinations = 0;
      let treatmentGrowthPercent = 0;
      let controlGrowthPercent = 0;

      // Create a map of center IDs to their treatment status
      const centerTreatmentMap = new Map();
      centers?.forEach((center) => {
        centerTreatmentMap.set(center.id, center.is_treatment_area);
      });

      // Debug the calculation
      console.log("Calculating doses for", monthlyReports.length, "reports");
      console.log("Center treatment map size:", centerTreatmentMap.size);

      monthlyReports.forEach((report, index) => {
        const reportVaccinations = report.total_doses || 0;
        totalVaccinations += reportVaccinations;

        const isTreatmentCenter = centerTreatmentMap.get(report.center_id);

        // Add debugging for first few reports
        if (index < 5) {
          console.log(`Report ${index}:`, {
            center_id: report.center_id,
            total_doses: report.total_doses,
            is_treatment: isTreatmentCenter,
            report_month: report.report_month,
          });
        }

        if (isTreatmentCenter === true) {
          treatmentVaccinations += reportVaccinations;
        } else {
          controlVaccinations += reportVaccinations;
        }
      });

      console.log("Final vaccination totals:", {
        total: totalVaccinations,
        treatment: treatmentVaccinations,
        control: controlVaccinations,
        reportsProcessed: monthlyReports.length,
      });

      // Calculate previous month for growth
      const prevMonth = subMonths(selectedDate, 1);
      const prevMonthStart = format(prevMonth, "yyyy-MM-01");

      const prevMonthReports =
        allReports?.filter(
          (report) => report.report_month === prevMonthStart
        ) || [];

      prevMonthReports.forEach((report) => {
        const reportVaccinations = report.total_doses || 0;
        const isTreatmentCenter = centerTreatmentMap.get(report.center_id);

        if (isTreatmentCenter === true) {
          prevTreatmentVaccinations += reportVaccinations;
        } else {
          prevControlVaccinations += reportVaccinations;
        }
      });

      // Calculate growth percentages
      treatmentGrowthPercent =
        prevTreatmentVaccinations > 0
          ? ((treatmentVaccinations - prevTreatmentVaccinations) /
              prevTreatmentVaccinations) *
            100
          : 0;

      controlGrowthPercent =
        prevControlVaccinations > 0
          ? ((controlVaccinations - prevControlVaccinations) /
              prevControlVaccinations) *
            100
          : 0;

      // Update the summary data state
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
          // Move the debugging code HERE, inside the conditional check
          console.log("=== DEBUGGING DATA ISSUES ===");

          // Check data structure and formats
          const sampleReports = reportsData.slice(0, 5);
          console.log("Sample reports structure:", sampleReports);

          // Check report_month formats
          const reportMonthFormats = Array.from(
            new Set(reportsData.map((r) => r.report_month).filter(Boolean))
          ).slice(0, 10);
          console.log("Unique report_month formats found:", reportMonthFormats);

          // Check if there are different date field names
          const reportKeys =
            reportsData.length > 0 ? Object.keys(reportsData[0]) : [];
          console.log("Report object keys:", reportKeys);

          // Check for any date-related fields
          const dateFields = reportKeys.filter(
            (key) =>
              key.includes("date") ||
              key.includes("month") ||
              key.includes("time")
          );
          console.log("Date-related fields found:", dateFields);

          // Count reports by month to see what data we actually have
          const reportsByMonth: Record<string, number> = {};
          reportsData.forEach((report) => {
            if (report.report_month) {
              reportsByMonth[report.report_month] =
                (reportsByMonth[report.report_month] || 0) + 1;
            }
          });
          console.log("Reports count by month:", reportsByMonth);

          // Check if there are any null or undefined report_month values
          const reportsWithoutMonth = reportsData.filter(
            (r) => !r.report_month
          );
          console.log(
            "Reports without report_month:",
            reportsWithoutMonth.length
          );

          // Check the specific month you're looking for
          const targetMonth = format(selectedDate, "yyyy-MM-01");
          const targetMonthReports = reportsData.filter(
            (r) => r.report_month === targetMonth
          );
          console.log(`Reports for ${targetMonth}:`, targetMonthReports.length);

          if (targetMonthReports.length > 0) {
            console.log(
              "Sample report for target month:",
              targetMonthReports[0]
            );
          }

          // Check if there are variations in the month format
          const possibleFormats = [
            format(selectedDate, "yyyy-MM-01"),
            format(selectedDate, "yyyy-MM"),
            format(selectedDate, "MM/yyyy"),
            format(selectedDate, "yyyy/MM"),
            selectedDate.toISOString().substring(0, 10),
            selectedDate.toISOString().substring(0, 7),
          ];

          console.log("Checking these possible date formats:");
          possibleFormats.forEach((formatStr) => {
            const matchingReports = reportsData.filter(
              (r) =>
                r.report_month === formatStr ||
                (r.report_month && r.report_month.startsWith(formatStr))
            );
            console.log(
              `Format "${formatStr}": ${matchingReports.length} reports`
            );
          });

          console.log("=== END DEBUGGING ===");

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

            // Extract YYYY-MM from both the report and selected date
            const reportMonth = report.report_month.substring(0, 7); // Get YYYY-MM
            const selectedMonth = format(selectedDate, "yyyy-MM");

            const matches = reportMonth === selectedMonth;

            if (matches) {
              console.log(
                `✅ Report matches: ${report.report_month} -> ${reportMonth} === ${selectedMonth}`
              );
            }

            return matches;
          });

          console.log(
            `Found ${selectedMonthReports.length} reports for ${format(
              selectedDate,
              "yyyy-MM"
            )}`
          );

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

          // Fix: Generate monthly data based on selectedDate, not current date
          const monthlyData: Array<{
            month: string;
            fullLabel: string;
            doses: number;
          }> = [];

          // Generate data for 6 months centered around the selected month
          // Show 2 months before selected, the selected month, and 3 months after (if they exist)
          for (let i = -2; i <= 3; i++) {
            const targetDate = addMonths(selectedDate, i);
            const targetMonthDate = format(targetDate, "yyyy-MM-01");

            console.log(
              `Processing month for chart: ${format(
                targetDate,
                "MMM yyyy"
              )}, looking for: ${targetMonthDate}`
            );

            // Filter reports for this specific month
            const monthDoses = reports
              .filter((report) => {
                if (!report.report_month) return false;
                return isSameMonth(report.report_month, targetDate);
              })
              .reduce((sum, report) => sum + (report.total_doses || 0), 0);

            console.log(
              `Total doses for ${format(targetDate, "MMM yyyy")}: ${monthDoses}`
            );

            monthlyData.push({
              month: format(targetDate, "MMM"),
              fullLabel: format(targetDate, "MMMM yyyy"),
              doses: monthDoses,
            });
          }

          console.log("Monthly data for chart:", monthlyData);

          // Filter reports for the selected month only
          const selectedMonthReportsForStats = reports.filter((report) => {
            if (!report.report_month) return false;
            // Don't use parseISO - report_month is already in "yyyy-MM-01" format
            // Just compare the year-month portion directly
            const reportYearMonth = report.report_month.substring(0, 7); // Gets "yyyy-MM"
            const selectedYearMonth = format(selectedDate, "yyyy-MM");
            return reportYearMonth === selectedYearMonth;
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

          // Get the currently selected month format for filtering (not the current calendar month)
          const selectedYearMonth = format(selectedDate, "yyyy-MM");
          const selectedMonthFormatted = `${selectedYearMonth}-01`;

          console.log(
            "Calculating zero doses for month:",
            selectedMonthFormatted
          );

          // Create a map to track which centers have reports for the SELECTED month
          const centerReportsMap = new Map();

          // Process reports to find centers with doses in the selected month
          reports.forEach((report) => {
            // Only consider selected month reports - exact match
            if (report.report_month === selectedMonthFormatted) {
              const existingDoses = centerReportsMap.get(report.center_id) || 0;
              const reportDoses = report.total_doses || 0;
              centerReportsMap.set(
                report.center_id,
                existingDoses + reportDoses
              );
            }
          });

          console.log(
            `Found ${centerReportsMap.size} center reports for ${selectedMonthFormatted}`
          );

          // Count centers with zero doses by type
          let treatmentCentersWithZeroDoses = 0;
          let controlCentersWithZeroDoses = 0;
          let totalTreatmentCenters = 0;
          let totalControlCenters = 0;

          // Count all centers and those with zero doses
          centers.forEach((center) => {
            if (center.is_treatment_area) {
              totalTreatmentCenters++;
              const doses = centerReportsMap.get(center.id) || 0;
              if (doses === 0) {
                treatmentCentersWithZeroDoses++;
              }
            } else {
              totalControlCenters++;
              const doses = centerReportsMap.get(center.id) || 0;
              if (doses === 0) {
                controlCentersWithZeroDoses++;
              }
            }
          });

          console.log("Zero doses calculation:", {
            treatmentTotal: totalTreatmentCenters,
            treatmentZero: treatmentCentersWithZeroDoses,
            controlTotal: totalControlCenters,
            controlZero: controlCentersWithZeroDoses,
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

          // Calculate dose distribution for the selected month
          let treatmentFixedDoses = 0;
          let treatmentOutreachDoses = 0;
          let controlFixedDoses = 0;
          let controlOutreachDoses = 0;

          selectedMonthReportsForStats.forEach((report) => {
            const center = centers.find((c) => c.id === report.center_id);
            if (center) {
              const fixedDoses = report.fixed_doses || 0;
              const outreachDoses = report.outreach_doses || 0;

              if (center.is_treatment_area) {
                treatmentFixedDoses += fixedDoses;
                treatmentOutreachDoses += outreachDoses;
              } else {
                controlFixedDoses += fixedDoses;
                controlOutreachDoses += outreachDoses;
              }
            }
          });

          const treatmentTotalDoses =
            treatmentFixedDoses + treatmentOutreachDoses;
          const controlTotalDoses = controlFixedDoses + controlOutreachDoses;

          // Calculate performance breakdown
          const performanceCenters = new Map();
          selectedMonthReportsForStats.forEach((report) => {
            const existing = performanceCenters.get(report.center_id) || 0;
            performanceCenters.set(
              report.center_id,
              existing + (report.total_doses || 0)
            );
          });

          const totalDosesForPerformance = Array.from(
            performanceCenters.values()
          ).reduce((sum, doses) => sum + doses, 0);
          const onePercentThreshold = totalDosesForPerformance * 0.01;

          let highPerformingCount = 0;
          let highPerformingDoses = 0;
          let lowPerformingCount = 0;
          let lowPerformingDoses = 0;

          performanceCenters.forEach((doses, centerId) => {
            if (doses >= onePercentThreshold) {
              highPerformingCount++;
              highPerformingDoses += doses;
            } else {
              lowPerformingCount++;
              lowPerformingDoses += doses;
            }
          });

          // Update stats with all calculations at once
          setStats({
            totalCenters: centers.length,
            totalDoses,
            stockoutCenters,
            areaStats,
            monthlyData, // This now uses the corrected data
            zeroDoses: {
              treatmentCenters: {
                count: treatmentCentersWithZeroDoses,
                total: totalTreatmentCenters,
                percent: treatmentZeroPercent,
                change: 0,
              },
              controlCenters: {
                count: controlCentersWithZeroDoses,
                total: totalControlCenters,
                percent: controlZeroPercent,
                change: 0,
              },
            },
            doseDistribution: {
              treatment: {
                fixed: treatmentFixedDoses,
                outreach: treatmentOutreachDoses,
                total: treatmentTotalDoses,
                fixedPercent:
                  treatmentTotalDoses > 0
                    ? (treatmentFixedDoses / treatmentTotalDoses) * 100
                    : 0,
                outreachPercent:
                  treatmentTotalDoses > 0
                    ? (treatmentOutreachDoses / treatmentTotalDoses) * 100
                    : 0,
              },
              control: {
                fixed: controlFixedDoses,
                outreach: controlOutreachDoses,
                total: controlTotalDoses,
                fixedPercent:
                  controlTotalDoses > 0
                    ? (controlFixedDoses / controlTotalDoses) * 100
                    : 0,
                outreachPercent:
                  controlTotalDoses > 0
                    ? (controlOutreachDoses / controlTotalDoses) * 100
                    : 0,
              },
            },
            performanceBreakdown: {
              highPerforming: {
                count: highPerformingCount,
                totalDoses: highPerformingDoses,
                percentOfAllDoses:
                  totalDosesForPerformance > 0
                    ? (highPerformingDoses / totalDosesForPerformance) * 100
                    : 0,
              },
              lowPerforming: {
                count: lowPerformingCount,
                totalDoses: lowPerformingDoses,
                percentOfAllDoses:
                  totalDosesForPerformance > 0
                    ? (lowPerformingDoses / totalDosesForPerformance) * 100
                    : 0,
              },
              totalCenters: performanceCenters.size,
              totalDoses: totalDosesForPerformance,
            },
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
  }, [selectedDate, reportsData, centersData, reportsError, centersError]);

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

  const generateMonthlyData = () => {
    // Just return the monthly data from stats, which is already calculated correctly
    return stats.monthlyData.map((data, index) => ({
      ...data,
      isSelected: index === 2, // The selected month is always at index 2 (middle of the 6 months)
    }));
  };

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

  // Calculate available months for the selector
  const availableMonths = Array.from(
    new Set(reportsData?.map((r) => r.report_month).filter(Boolean) || [])
  ).sort((a, b) => {
    try {
      // Parse dates for proper sorting
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime(); // Sort newer months first
    } catch (err) {
      console.error("Date sorting error:", err);
      return 0;
    }
  });

  useEffect(() => {
    if (reportsData && reportsData.length > 0) {
      console.log("=== MONTH SELECTION DEBUGGING ===");
      console.log("Selected date:", selectedDate);
      console.log(
        "Selected date formatted as YYYY-MM:",
        format(selectedDate, "yyyy-MM")
      );
      console.log(
        "Selected date formatted as YYYY-MM-01:",
        format(selectedDate, "yyyy-MM-01")
      );

      // Show a sample of what we're comparing
      if (reportsData.length > 0) {
        console.log("Sample report dates:");
        reportsData.slice(0, 5).forEach((report) => {
          const reportMonth = report.report_month?.substring(0, 7);
          const selectedMonth = format(selectedDate, "yyyy-MM");
          console.log(
            `  Report: ${
              report.report_month
            } -> ${reportMonth} | Selected: ${selectedMonth} | Match: ${
              reportMonth === selectedMonth
            }`
          );
        });
      }

      // Check if the selected month exists in the available months
      const selectedMonthFormatted = format(selectedDate, "yyyy-MM-01");
      const isSelectedMonthAvailable = availableMonths.includes(
        selectedMonthFormatted
      );
      console.log(
        "Is selected month available in dropdown?",
        isSelectedMonthAvailable
      );
      console.log("Available months:", availableMonths);
      console.log("=== END MONTH DEBUGGING ===");
    }
  }, [reportsData, selectedDate, availableMonths]);

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
                {/* Replace the previous month navigation with the dropdown */}
                <MonthDropdownSelector
                  availableMonths={availableMonths}
                  selectedDate={selectedDate}
                  onMonthSelect={setSelectedDate}
                />

                <button
                  onClick={() => {
                    console.log("Manual refresh triggered");
                    fetchSummaryData();
                    mutate(`monthly_reports`); // Refresh SWR cache
                  }}
                  className="ml-2 px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 rounded"
                >
                  🔄 Refresh Data
                </button>

                <Link
                  href="/add-center"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center"
                >
                  Add New Center
                </Link>

                <button
                  onClick={() => {
                    console.log("Testing with January 2025");
                    setSelectedDate(new Date("2025-01-01T00:00:00"));
                  }}
                  className="ml-2 px-3 py-1 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded"
                >
                  Test Jan 2025
                </button>

                <button
                  onClick={() => {
                    console.log("Testing with October 2024");
                    setSelectedDate(new Date("2024-10-01T00:00:00"));
                  }}
                  className="ml-2 px-3 py-1 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded"
                >
                  Test Oct 2024
                </button>
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
                value={`${
                  stats.zeroDoses?.treatmentCenters.percent?.toFixed(1) || 0
                }%`}
                subValue={`${stats.zeroDoses?.treatmentCenters.count || 0} of ${
                  stats.zeroDoses?.treatmentCenters.total || 0
                } centers`}
                icon="exclamation-triangle"
                color="red"
                trend={
                  stats.zeroDoses?.treatmentCenters.change !== undefined &&
                  stats.zeroDoses?.treatmentCenters.change !== 0
                    ? {
                        direction:
                          (stats.zeroDoses?.treatmentCenters.change ?? 0) < 0
                            ? "down"
                            : "up",
                        percentage: `${Math.abs(
                          stats.zeroDoses?.treatmentCenters.change ?? 0
                        ).toFixed(1)}%`,
                      }
                    : null
                }
              />
              {/* Control Areas Zero Doses Card */}
              <DashboardCard
                title="Control Centers with Zero Doses"
                value={`${
                  stats.zeroDoses?.controlCenters.percent?.toFixed(1) || 0
                }%`}
                subValue={`${stats.zeroDoses?.controlCenters.count || 0} of ${
                  stats.zeroDoses?.controlCenters.total || 0
                } centers`}
                icon="exclamation-triangle"
                color="yellow"
                trend={
                  stats.zeroDoses?.controlCenters.change !== undefined &&
                  stats.zeroDoses?.controlCenters.change !== 0
                    ? {
                        direction:
                          (stats.zeroDoses?.controlCenters.change ?? 0) < 0
                            ? "down"
                            : "up",
                        percentage: `${Math.abs(
                          stats.zeroDoses?.controlCenters.change ?? 0
                        ).toFixed(1)}%`,
                      }
                    : null
                }
              />
            </div>

            {/* Fixed vs Outreach Cards */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">
                Dose Distribution by Location
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Treatment Fixed Doses */}
                <DashboardCard
                  title="Treatment Fixed Doses"
                  value={`${
                    stats.doseDistribution?.treatment.fixedPercent.toFixed(1) ||
                    0
                  }%`}
                  subValue={`${
                    stats.doseDistribution?.treatment.fixed.toLocaleString() ||
                    0
                  } of ${
                    stats.doseDistribution?.treatment.total.toLocaleString() ||
                    0
                  } doses`}
                  icon="hospital"
                  color="green"
                />

                {/* Treatment Outreach Doses */}
                <DashboardCard
                  title="Treatment Outreach Doses"
                  value={`${
                    stats.doseDistribution?.treatment.outreachPercent.toFixed(
                      1
                    ) || 0
                  }%`}
                  subValue={`${
                    stats.doseDistribution?.treatment.outreach.toLocaleString() ||
                    0
                  } of ${
                    stats.doseDistribution?.treatment.total.toLocaleString() ||
                    0
                  } doses`}
                  icon="ambulance"
                  color="teal"
                />

                {/* Control Fixed Doses */}
                <DashboardCard
                  title="Control Fixed Doses"
                  value={`${
                    stats.doseDistribution?.control.fixedPercent.toFixed(1) || 0
                  }%`}
                  subValue={`${
                    stats.doseDistribution?.control.fixed.toLocaleString() || 0
                  } of ${
                    stats.doseDistribution?.control.total.toLocaleString() || 0
                  } doses`}
                  icon="hospital"
                  color="red"
                />

                {/* Control Outreach Doses */}
                <DashboardCard
                  title="Control Outreach Doses"
                  value={`${
                    stats.doseDistribution?.control.outreachPercent.toFixed(
                      1
                    ) || 0
                  }%`}
                  subValue={`${
                    stats.doseDistribution?.control.outreach.toLocaleString() ||
                    0
                  } of ${
                    stats.doseDistribution?.control.total.toLocaleString() || 0
                  } doses`}
                  icon="ambulance"
                  color="yellow"
                />
              </div>
            </div>

            {/* Performance Breakdown Cards */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">
                Center Performance Analysis
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* High Performing Centers Card */}
                <DashboardCard
                  title="High-Performing Centers"
                  value={`${
                    stats.performanceBreakdown?.highPerforming.count || 0
                  }`}
                  subValue={`${Math.round(
                    stats.performanceBreakdown?.highPerforming
                      .percentOfAllDoses || 0
                  )}% of doses from ${(
                    ((stats.performanceBreakdown?.highPerforming.count || 0) /
                      (stats.performanceBreakdown?.totalCenters || 1)) *
                    100
                  ).toFixed(1)}% of centers`}
                  icon="star"
                  color="green"
                />

                {/* Low Performing Centers Card */}
                <DashboardCard
                  title="Low-Performing Centers"
                  value={`${
                    stats.performanceBreakdown?.lowPerforming.count || 0
                  }`}
                  subValue={`Each center below 1% of total doses (${
                    stats.performanceBreakdown?.lowPerforming.percentOfAllDoses.toFixed(
                      1
                    ) || 0
                  }% total)`}
                  icon="warning"
                  color="red"
                />
              </div>
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
                          d="M13 7h8m0 0v8m0-8l-8 8-4 4-6 6"
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
                        {reportsData?.length || 0}
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
                      Vaccination Doses
                      <span className="ml-2 text-blue-600">
                        ({format(selectedDate, "MMMM yyyy")})
                      </span>
                    </h2>
                    <ErrorBoundary
                      fallback={<div>Chart could not be displayed</div>}
                    >
                      <VaccinationChart
                        data={generateMonthlyData()}
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
                    <MapComponent
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
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

// Replace your existing isSameMonth function with this more robust version
function isSameMonth(date1: string | Date, date2: string | Date): boolean {
  try {
    let date1Str: string;
    let date2Str: string;

    // Convert to YYYY-MM format for comparison
    if (typeof date1 === "string") {
      // Handle different string formats
      if (date1.includes("T")) {
        date1Str = date1.substring(0, 7); // YYYY-MM
      } else if (date1.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date1Str = date1.substring(0, 7); // YYYY-MM from YYYY-MM-DD
      } else if (date1.match(/^\d{4}-\d{2}$/)) {
        date1Str = date1; // Already YYYY-MM
      } else {
        // Try to parse as date
        const parsed1 = new Date(date1);
        date1Str = format(parsed1, "yyyy-MM");
      }
    } else {
      date1Str = format(date1, "yyyy-MM");
    }

    if (typeof date2 === "string") {
      if (date2.includes("T")) {
        date2Str = date2.substring(0, 7);
      } else if (date2.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date2Str = date2.substring(0, 7);
      } else if (date2.match(/^\d{4}-\d{2}$/)) {
        date2Str = date2;
      } else {
        const parsed2 = new Date(date2);
        date2Str = format(parsed2, "yyyy-MM");
      }
    } else {
      date2Str = format(date2, "yyyy-MM");
    }

    return date1Str === date2Str;
  } catch (error) {
    console.error("Error in isSameMonth:", error, { date1, date2 });
    return false;
  }
}

// END OF FILE - Nothing should come after this
