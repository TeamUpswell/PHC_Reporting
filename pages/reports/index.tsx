import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { supabase } from "../../lib/supabase";
import { MonthlyReport, HealthcareCenter } from "../../types";

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

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMMM d, yyyy");
    } catch (error) {
      return dateString;
    }
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
          <Link href="/" className="text-blue-600 hover:underline">
            &larr; Back to Centers
          </Link>
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
