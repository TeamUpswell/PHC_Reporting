import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { format, parseISO } from "date-fns";

interface ReportWithCenter {
  id: string;
  center_id: string;
  report_month: string;
  in_stock: boolean;
  stock_beginning: number;
  stock_end: number;
  shortage: boolean;
  fixed_doses: number;
  outreach_doses: number;
  total_doses: number;
  dhis_check: boolean;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  // Available months for filtering
  const [months, setMonths] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("monthly_reports")
        .select(
          `
          id,
          center_id,
          report_month,
          in_stock,
          stock_beginning,
          stock_end,
          shortage,
          fixed_doses,
          outreach_doses,
          total_doses,
          dhis_check,
          healthcare_centers (
            name,
            area,
            lga
          )
        `
        )
        .order("report_month", { ascending: false });

      if (error) throw error;

      // Transform data to have center properties at the top level
      const formattedData = data.map((item) => ({
        ...item,
        center: item.healthcare_centers,
        healthcare_centers: undefined,
      }));

      setReports(formattedData);

      // Extract unique months for filtering
      const uniqueMonths = [
        ...new Set(data.map((report) => report.report_month.substring(0, 7))),
      ];
      const monthOptions = uniqueMonths
        .map((month) => ({
          value: month,
          label: format(parseISO(`${month}-01`), "MMMM yyyy"),
        }))
        .sort((a, b) => {
          return new Date(b.value) > new Date(a.value) ? 1 : -1;
        });

      setMonths(monthOptions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter reports based on search and month filter
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.center.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.center.lga.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMonth =
      !filterMonth || report.report_month.startsWith(filterMonth);

    return matchesSearch && matchesMonth;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>All Reports - PHC Data Collection</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-blue-800">
            All Vaccination Reports
          </h1>
          <Link href="/" className="text-blue-600 hover:underline">
            Back to Centers
          </Link>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search by center name, area or LGA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
            />
          </div>

          <div className="sm:w-48">
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
            >
              <option value="">All Months</option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reports Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-500">Loading reports...</div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-lg shadow">
            <p className="text-gray-500">
              No reports found matching your criteria.
            </p>
            {searchTerm || filterMonth ? (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterMonth("");
                }}
                className="mt-2 text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Center
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Area / LGA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DHIS2
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {report.center.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {report.center.area}
                      </div>
                      <div className="text-sm text-gray-500">
                        {report.center.lga}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(parseISO(report.report_month), "MMMM yyyy")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.total_doses}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.shortage ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Stockout
                        </span>
                      ) : report.in_stock ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          In Stock
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          No Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.dhis_check ? (
                        <span className="text-green-500">
                          <i className="fas fa-check"></i>
                        </span>
                      ) : (
                        <span className="text-red-500">
                          <i className="fas fa-times"></i>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/center/${report.center_id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Center
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <footer className="bg-blue-900 text-white text-center p-4 mt-12">
        <p>PHC Data Collection - HPV Vaccination Tracking System</p>
      </footer>
    </div>
  );
}
