import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import useSWR from "swr";
import { format, parseISO } from "date-fns";
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

interface RecentCenterReport {
  id: string;
  healthcare_center: {
    id: string;
    name: string;
    is_treatment_area: boolean;
  } | null;
  created_at: string;
  status: string;
  created_by: string;
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
  const [recentCenterReports, setRecentCenterReports] = useState<
    RecentCenterReport[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch recent reports without month filtering
        const { data: recentReports, error } = await supabase
          .from("center_report")
          .select(
            `
            id,
            healthcare_center:healthcare_center_id (
              id,
              name,
              is_treatment_area
            ),
            created_at,
            status,
            created_by
          `
          )
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        const typedReports: RecentCenterReport[] = recentReports
          ? recentReports.map((report: any) => ({
              id: report.id,
              healthcare_center: report.healthcare_center || null,
              created_at: report.created_at,
              status: report.status,
              created_by: report.created_by,
            }))
          : [];

        setRecentCenterReports(typedReports);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
                value={recentCenterReports.length}
                icon="building"
                color="blue"
              />
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Recent Reports</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Center
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentCenterReports && recentCenterReports.length > 0 ? (
                      recentCenterReports.map((report) => (
                        <tr
                          key={report.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/reports/${report.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {report.healthcare_center?.name ||
                                "Unknown Center"}
                            </div>
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
                              ? format(
                                  new Date(report.created_at),
                                  "MMM d, yyyy"
                                )
                              : "Unknown"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                report.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {report.status || "pending"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
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
};

import { GetServerSidePropsContext } from "next";

export async function getServerSideProps({ req }: GetServerSidePropsContext) {
  return { props: {} };
}

export default Dashboard;
