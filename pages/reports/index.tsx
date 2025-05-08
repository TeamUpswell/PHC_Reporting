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
      // Remove the dateRange parameter if it's causing issues
      const result = await exportReportsToCSV();
      
      if (result.success) {
        toast.success(`Successfully exported reports to ${result.fileName}`);
      } else {
        toast.error("Failed to export monthly reports");
      }
    } catch (error) {
      console.error("Error exporting reports:", error);
      toast.error(`Export failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setExporting((prev) => ({ ...prev, reports: false }));
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMMM d, yyyy");
    } catch (error) {
      return dateString;
    }
  };

  const fetchSpecificReport = async (selectedDate: Date) => {
    const { id } = router.query;
    const reportDate = format(selectedDate, "yyyy-MM-01"); // Format exactly like your DB

    // Update your query to use exact date matching
    const { data: reportData, error } = await supabase
      .from("monthly_reports")
      .select("*")
      .eq("report_month", reportDate)
      .eq("center_id", id)
      .single();

    if (error) {
      console.error("Error fetching specific report:", error);
    }

    return reportData;
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-500">Loading reports...</div>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>All Reports - HPV Vaccination Reports</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-bold text-blue-800 mb-4 md:mb-0">
            All Vaccination Reports
          </h1>

          {/* Export Controls */}
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
            <button
              onClick={handleExportCenters}
              disabled={exporting.centers}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center justify-center"
            >
              {exporting.centers ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Export Healthcare Centers
                </>
              )}
            </button>

            <button
              onClick={handleExportReports}
              disabled={exporting.reports}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center"
            >
              {exporting.reports ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Export Monthly Reports
                </>
              )}
            </button>
          </div>
        </div>

        {/* Vaccination Statistics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">
            Vaccination Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Month Doses Card */}
            <div className="bg-white p-6 rounded-lg shadow-md relative">
              <h3 className="text-lg font-medium text-gray-700">
                Current Month Doses
              </h3>
              <p className="text-4xl font-bold mt-2">{currentMonthDoses}</p>
              <div className="absolute top-4 right-4 bg-blue-100 p-2 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-800"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
            </div>

            {/* Previous Month Doses Card */}
            <div className="bg-white p-6 rounded-lg shadow-md relative">
              <h3 className="text-lg font-medium text-gray-700">
                Previous Month Doses
              </h3>
              <p className="text-4xl font-bold mt-2">{previousMonthDoses}</p>
              <div className="absolute top-4 right-4 bg-blue-100 p-2 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-800"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
            </div>

            {/* Growth Percentage Card */}
            <div className="bg-white p-6 rounded-lg shadow-md relative">
              <h3 className="text-lg font-medium text-gray-700">
                Growth Percentage
              </h3>
              <p className="text-4xl font-bold mt-2">{growthPercentage}%</p>
              <div className="absolute top-4 right-4 bg-green-100 p-2 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-green-800"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-3">Filter Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Month filter */}
            <div>
              <label
                htmlFor="month-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Month
              </label>
              <select
                id="month-filter"
                value={filters.month}
                onChange={(e) => handleFilterChange("month", e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="all">All Months</option>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            {/* State filter */}
            <div>
              <label
                htmlFor="state-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                State
              </label>
              <select
                id="state-filter"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="all">All States</option>
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Treatment area filter */}
            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTreatmentAreasOnly}
                  onChange={(e) => setShowTreatmentAreasOnly(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium">
                  Treatment areas only
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Reports table */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          {filteredReports.length > 0 ? (
            <div className="overflow-x-auto">
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
                      Area/LGA
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      State
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Report Month
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Doses
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      In Stock
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => {
                    const center = centers.find(
                      (c) => c.id === report.center_id
                    );
                    return (
                      <tr key={report.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {report.center.name}
                          </div>
                          {center?.is_treatment_area && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Treatment Area
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {report.center.area} / {report.center.lga}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {center?.state || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {formatDate(report.report_month)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {report.total_doses}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              report.in_stock
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {report.in_stock ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link
                            href={`/center/${report.center_id}`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            View Center
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No reports found matching your filters.
            </div>
          )}
        </div>
      </main>

      <footer className="bg-blue-900 text-white text-center p-4 mt-12">
        <p>PHC Data Collection - HPV Vaccination Tracking System</p>
      </footer>
    </div>
  );
}
