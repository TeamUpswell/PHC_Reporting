import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";
import { MonthlyReport, HealthcareCenter } from "../../types";
import { exportCentersToCSV, exportReportsToCSV } from "../../utils/exportData";
import { toast } from "react-toastify";

// Define the combined report type
interface ReportWithCenter extends MonthlyReport {
  center: {
    name: string;
    area: string;
    lga: string;
  };
}

export default function Reports() {
  const [reports, setReports] = useState<ReportWithCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredReports, setFilteredReports] = useState<ReportWithCenter[]>(
    []
  );
  const [filters, setFilters] = useState({
    month: "all",
  });
  const [months, setMonths] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>("all");
  const [showTreatmentAreasOnly, setShowTreatmentAreasOnly] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [centers, setCenters] = useState<HealthcareCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add these state variables to store the statistics
  const [currentMonthDoses, setCurrentMonthDoses] = useState(0);
  const [previousMonthDoses, setPreviousMonthDoses] = useState(0);
  const [growthPercentage, setGrowthPercentage] = useState(0);

  // Add this state for tracking export operations
  const [exporting, setExporting] = useState({
    centers: false,
    reports: false,
  });

  const router = useRouter();

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        // Fetch all monthly reports
        const { data: reportsData, error: reportsError } = await supabase
          .from("monthly_reports")
          .select("*");

        if (reportsError) throw reportsError;

        // Fetch all centers
        const { data: centersData, error: centersError } = await supabase
          .from("healthcare_centers")
          .select("*");

        if (centersError) throw centersError;

        setCenters(centersData || []);

        // Create a centers lookup map for easier access
        const centersMap = centersData.reduce(
          (acc: Record<string, HealthcareCenter>, center) => {
            acc[center.id] = center;
            return acc;
          },
          {}
        );

        // Combine reports with center data
        const formattedData = reportsData.map((report) => {
          const center = centersMap[report.center_id] || {
            name: "Unknown Center",
            area: "Unknown Area",
            lga: "Unknown LGA",
          };

          return {
            ...report,
            center: {
              name: center.name,
              area: center.area || "Unknown",
              lga: center.lga || "Unknown",
            },
          };
        }) as ReportWithCenter[];

        setReports(formattedData);

        // Extract unique months for filtering
        const monthSet = new Set<string>();
        formattedData.forEach((report) => {
          monthSet.add(format(parseISO(report.report_month), "MMMM yyyy"));
        });
        const uniqueMonths = Array.from(monthSet).sort((a, b) => {
          const dateA = new Date(a);
          const dateB = new Date(b);
          return dateB.getTime() - dateA.getTime(); // Sort newest first
        });

        setMonths(uniqueMonths);

        // Extract unique states from centers
        const uniqueStates = Array.from(
          new Set(centersData?.map((center) => center.state).filter(Boolean))
        ).sort();

        setStates(uniqueStates as string[]);
      } catch (err: any) {
        console.error("Error fetching reports:", err);
        setError(err.message);
      } finally {
        setLoading(false);
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Add this useEffect to calculate statistics when reports data changes
  useEffect(() => {
    if (!reports.length) return;

    // Get the current month and previous month
    const now = new Date();
    const currentMonthStr = format(now, "yyyy-MM-01");
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthStr = format(previousMonth, "yyyy-MM-01");

    // Calculate current month doses
    const currMonthDoses = reports
      .filter((report) => report.report_month === currentMonthStr)
      .reduce((sum, report) => sum + Number(report.total_doses || 0), 0);
    setCurrentMonthDoses(currMonthDoses);

    // Calculate previous month doses
    const prevMonthDoses = reports
      .filter((report) => report.report_month === previousMonthStr)
      .reduce((sum, report) => sum + Number(report.total_doses || 0), 0);
    setPreviousMonthDoses(prevMonthDoses);

    // Calculate growth percentage
    if (prevMonthDoses > 0) {
      const growth = ((currMonthDoses - prevMonthDoses) / prevMonthDoses) * 100;
      setGrowthPercentage(Number(growth.toFixed(2)));
    } else if (currMonthDoses > 0) {
      setGrowthPercentage(100); // If previous month was 0, growth is 100%
    } else {
      setGrowthPercentage(0);
    }

    // Debug output
    console.log("Statistics calculation:", {
      currentMonth: currentMonthStr,
      currentDoses: currMonthDoses,
      previousMonth: previousMonthStr,
      previousDoses: prevMonthDoses,
      growth: `${growthPercentage}%`,
    });
  }, [reports]);

  // Apply filters when they change
  useEffect(() => {
    let filtered = [...reports];

    // Filter by month
    if (filters.month !== "all") {
      filtered = filtered.filter(
        (report) =>
          format(parseISO(report.report_month), "MMMM yyyy") === filters.month
      );
    }

    // Filter by state and treatment area
    filtered = filtered.filter((report) => {
      const center = centers.find((c) => c.id === report.center_id);
      if (!center) return false;

      const stateMatches =
        selectedState === "all" || center.state === selectedState;
      const treatmentMatches =
        !showTreatmentAreasOnly || center.is_treatment_area;

      return stateMatches && treatmentMatches;
    });

    setFilteredReports(filtered);
  }, [filters, reports, centers, selectedState, showTreatmentAreasOnly]);

  const handleFilterChange = (type: "month", value: string) => {
    setFilters((prev) => ({ ...prev, [type]: value }));
  };

  const handleExportCenters = async () => {
    setExporting((prev) => ({ ...prev, centers: true }));
    try {
      const result = await exportCentersToCSV();
      if (result.success) {
        toast.success(`Successfully exported centers to ${result.fileName}`);
      } else {
        toast.error("Failed to export healthcare centers");
      }
    } catch (error) {
      console.error("Error exporting centers:", error);
      toast.error("An error occurred while exporting centers");
    } finally {
      setExporting((prev) => ({ ...prev, centers: false }));
    }
  };

  const handleExportReports = async () => {
    setExporting((prev) => ({ ...prev, reports: true }));
    try {
      console.log("Starting reports export");
      
      // Create a simpler date range - just use ISO strings for clarity
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const dateRange = {
        start: sixMonthsAgo,
        end: new Date()
      };
      
      console.log("Date range for export:", {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      });
      
      // Use try-catch inside the export function for better error handling
      const result = await exportReportsToCSV(dateRange);
      
      if (result.success) {
        toast.success(`Successfully exported ${result.count || 0} reports to ${result.fileName}`);
      } else {
        console.error("Export error:", result.error);
