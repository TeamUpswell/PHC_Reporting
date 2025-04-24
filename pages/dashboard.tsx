import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router"; // Add this import
import { supabase } from "../lib/supabase";
import { format, subMonths, parseISO } from "date-fns";
import Map from "../components/Map";
import VaccinationChart from "../components/VaccinationChart";
import DashboardCard from "../components/DashboardCard";
import ErrorBoundary from "../components/ErrorBoundary";

interface DashboardStats {
  totalCenters: number;
  totalDoses: number;
  stockoutCenters: number;
  recentReports: number;
  areaStats: Record<string, number>;
  monthlyData: Array<{
    month: string;
    doses: number;
  }>;
}

export default function Dashboard() {
  const router = useRouter(); // Add this line
  const [centers, setCenters] = useState([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCenters: 0,
    totalDoses: 0,
    stockoutCenters: 0,
    recentReports: 0,
    areaStats: {},
    monthlyData: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [stateStats, setStateStats] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get all centers
        const { data: centersData, error: centersError } = await supabase
          .from("healthcare_centers")
          .select("*")
          .order("name");

        if (centersError) throw centersError;

        // Get reports from the last 6 months
        const sixMonthsAgo = format(subMonths(new Date(), 6), "yyyy-MM-dd");

        const { data: reportsData, error: reportsError } = await supabase
          .from("monthly_reports")
          .select("*, healthcare_centers(area)")
          .gte("report_month", sixMonthsAgo);

        if (reportsError) throw reportsError;

        // Calculate dashboard statistics
        const areaStats = {};
        centersData.forEach((center) => {
          if (center && center.area) {
            if (!areaStats[center.area]) {
              areaStats[center.area] = 0;
            }
          }
        });

        // Process monthly data for chart
        const monthlyTotals = {};

        reportsData.forEach((report) => {
          // Add to area stats
          if (report.healthcare_centers) {
            const area = report.healthcare_centers.area;
            areaStats[area] = (areaStats[area] || 0) + report.total_doses;
          }

          // Add to monthly totals
          const month = report.report_month.substring(0, 7); // YYYY-MM
          if (!monthlyTotals[month]) {
            monthlyTotals[month] = 0;
          }
          monthlyTotals[month] += report.total_doses;
        });

        // Convert monthly totals to sorted array
        const monthlyData = Object.entries(monthlyTotals)
          .map(([month, doses]) => {
            // Store the original date string for proper sorting
            return {
              originalMonth: month, // YYYY-MM format
              month: format(parseISO(`${month}-01`), "MMM yyyy"),
              doses: Number(doses), // Ensure it's a number
            };
          })
          .sort((a, b) => {
            // Sort by the original month string which is in YYYY-MM format
            return a.originalMonth.localeCompare(b.originalMonth);
          });

        // Count centers with stockouts
        const stockoutCenters = reportsData.filter(
          (report) => report.shortage
        ).length;

        // Count number of reports in the last month
        const lastMonth = format(subMonths(new Date(), 1), "yyyy-MM");
        const recentReports = reportsData.filter((report) =>
          report.report_month.startsWith(lastMonth)
        ).length;

        // Group by state instead of area
        const stateStats = {};
        centersData.forEach((center) => {
          if (center && center.state) {
            if (!stateStats[center.state]) {
              stateStats[center.state] = 0;
            }

            // Sum up doses by state
            reportsData.forEach((report) => {
              if (report.center_id === center.id) {
                stateStats[center.state] += report.total_doses || 0;
              }
            });
          }
        });

        if (isMounted) {
          setCenters(centersData);
          setStats({
            totalCenters: centersData.length,
            totalDoses: reportsData.reduce(
              (sum, report) => sum + (report.total_doses || 0),
              0
            ),
            stockoutCenters,
            recentReports,
            areaStats,
            monthlyData,
          });
          setStateStats(stateStats);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching dashboard data:", err);
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
  }, []);

  // Filter centers by selected state
  const filteredCenters =
    selectedState === "all"
      ? centers
      : centers.filter((center) => center.state === selectedState);

  // Add this before your return statement
  console.log("Centers data:", centers);
  console.log("Filtered centers:", filteredCenters);
  console.log("State stats:", stateStats);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Dashboard - PHC Data Collection</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800">Dashboard</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            View All Centers
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-500">Loading data...</div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <DashboardCard
                title="Total Centers"
                value={stats.totalCenters}
                icon="building"
              />
              <DashboardCard
                title="Total Doses (6 Months)"
                value={stats.totalDoses}
                icon="syringe"
                trend={
                  stats.monthlyData.length > 1
                    ? {
                        direction:
                          stats.monthlyData[stats.monthlyData.length - 1]
                            .doses >
                          stats.monthlyData[stats.monthlyData.length - 2].doses
                            ? "up"
                            : "down",
                        percentage: "10%", // This would ideally be calculated
                      }
                    : undefined
                }
              />
              <DashboardCard
                title="Centers with Stockouts"
                value={stats.stockoutCenters}
                icon="exclamation-triangle"
                color="red"
              />
              <DashboardCard
                title="Reports Last Month"
                value={stats.recentReports}
                icon="clipboard-check"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
                <h2 className="text-xl font-bold mb-4">Vaccination Trends</h2>
                {stats.monthlyData && Array.isArray(stats.monthlyData) && stats.monthlyData.length > 0 ? (
                  <ErrorBoundary fallback={<div>Chart could not be displayed</div>}>
                    <VaccinationChart data={stats.monthlyData} />
                  </ErrorBoundary>
                ) : (
                  <div className="text-gray-500">No vaccination data available</div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">Doses by State</h2>
                <div className="space-y-2">
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
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Center Locations</h2>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
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
              <ErrorBoundary fallback={<div>Map could not be displayed</div>}>
                <Map 
                  centers={filteredCenters} // Use filteredCenters instead of centers
                  height="400px" 
                  onCenterSelect={(id) => router.push(`/center/${id}`)}
                />
              </ErrorBoundary>
              <div className="text-sm text-gray-500 mt-2">
                Displaying {filteredCenters.length} of {centers.length} centers
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="bg-blue-900 text-white text-center p-4 mt-12">
        <p>PHC Data Collection - HPV Vaccination Tracking System</p>
      </footer>
    </div>
  );
}
