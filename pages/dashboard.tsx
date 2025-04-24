import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import { format, subMonths, parseISO, startOfMonth, endOfMonth, addMonths } from "date-fns";
import Map from "../components/Map";
import VaccinationChart from "../components/VaccinationChart";
import DashboardCard from "../components/DashboardCard";
import ErrorBoundary from "../components/ErrorBoundary";
import { HealthcareCenter, MonthlyReport } from "../types";

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
  const router = useRouter();
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: centersData, error: centersError } = await supabase
          .from("healthcare_centers")
          .select("*")
          .order("name");
        if (centersError) throw centersError;

        const startStr = format(dateRange.start, 'yyyy-MM-dd');
        const endStr = format(dateRange.end, 'yyyy-MM-dd');

        const { data: reportsData, error: reportsError } = await supabase
          .from("monthly_reports")
          .select("*")
          .gte('report_month', startStr)
          .lte('report_month', endStr);
        if (reportsError) throw reportsError;

        if (isMounted && centersData && reportsData) {
          setCenters(centersData as HealthcareCenter[]);

          const areaStats: Record<string, number> = {};
          const stateStats: Record<string, number> = {};

          centersData.forEach((center) => {
            if (center && center.area) {
              if (!areaStats[center.area]) {
                areaStats[center.area] = 0;
              }
            }
            if (center && center.state) {
              if (!stateStats[center.state]) {
                stateStats[center.state] = 0;
              }
            }
          });

          reportsData.forEach((report) => {
            const center = centersData.find((c) => c.id === report.center_id);
            if (center) {
              if (center.area && report.total_doses) {
                areaStats[center.area] += report.total_doses;
              }
              if (center.state && report.total_doses) {
                stateStats[center.state] += report.total_doses;
              }
            }
          });

          const now = new Date();
          const monthlyData = [];
          for (let i = 5; i >= 0; i--) {
            const monthStart = subMonths(now, i);
            const monthLabel = format(monthStart, "MMM");

            const monthDoses = reportsData
              .filter((report) => {
                if (!report.report_month) return false;
                const reportDate = parseISO(report.report_month);
                return (
                  format(reportDate, "MMM") === monthLabel &&
                  format(reportDate, "yyyy") === format(now, "yyyy")
                );
              })
              .reduce((sum, report) => sum + (report.total_doses || 0), 0);

            monthlyData.push({
              month: monthLabel,
              doses: monthDoses,
            });
          }

          console.log("Monthly data for chart:", monthlyData);

          const totalDoses = reportsData.reduce(
            (sum, report) => sum + (report.total_doses || 0),
            0
          );

          const recentReports = reportsData.length;

          const stockoutCenters = reportsData
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

          setStats({
            totalCenters: centersData.length,
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
  }, [dateRange]);

  useEffect(() => {
    console.log("Stats monthly data:", stats.monthlyData);
  }, [stats.monthlyData]);

  const filteredCenters =
    selectedState === "all"
      ? centers
      : centers.filter((center) => center.state === selectedState);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl font-medium text-gray-600">
          Loading dashboard data...
        </div>
      </div>
    );
  }

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
      <Head>
        <title>Dashboard - PHC Data Collection</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
                </svg>
              </button>
              
              <span className="text-lg font-medium px-2">
                {format(selectedDate, 'MMMM yyyy')}
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
                className={`p-2 bg-gray-200 rounded-lg ${
                  format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM') 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-gray-300'
                }`}
                disabled={format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')}
                aria-label="Next month"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
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
                  format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
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
            title="Healthcare Centers"
            value={stats.totalCenters}
            icon="building"
            color="blue"
          />
          <DashboardCard
            title={`Doses Administered (${format(selectedDate, 'MMMM yyyy')})`}
            value={stats.totalDoses}
            icon="syringe"
            color="green"
          />
          <DashboardCard
            title={`Centers with Stockouts (${format(selectedDate, 'MMMM yyyy')})`}
            value={stats.stockoutCenters}
            icon="exclamation-triangle"
            color="red"
          />
          <DashboardCard
            title={`Reports (${format(selectedDate, 'MMMM yyyy')})`}
            value={stats.recentReports}
            icon="clipboard-check"
            color="purple"
          />
        </div>

        <div className="mb-8">
          {/* Map - Full Width */}
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
                centers={filteredCenters}
                height="400px"
                onCenterSelect={(id) => router.push(`/center/${id}`)}
              />
            </ErrorBoundary>
          </div>

          {/* Two Column Layout - Chart on Left, Stats on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Vaccination Chart */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">
                  Vaccination Doses ({format(selectedDate, 'MMMM yyyy')})
                </h2>
                <ErrorBoundary fallback={<div>Chart could not be displayed</div>}>
                  <VaccinationChart data={stats.monthlyData} height="300px" />
                </ErrorBoundary>
              </div>
            </div>

            {/* Right Column - Stats and Links */}
            <div className="space-y-8">
              {/* Doses by State Card */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">Doses by State</h2>
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
        </div>
      </main>
    </div>
  );
}
