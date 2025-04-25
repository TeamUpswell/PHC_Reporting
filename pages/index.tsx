import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { supabase } from "../lib/supabase";
import { HealthcareCenter } from "../types";
import dynamic from "next/dynamic";

// Dynamically import the map component
const MapComponent = dynamic(() => import("../components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      Loading map...
    </div>
  ),
});

export default function Centers() {
  const router = useRouter();
  const [centers, setCenters] = useState<HealthcareCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTreatment, setFilterTreatment] = useState<boolean | null>(null);
  const [filteredCenters, setFilteredCenters] = useState<HealthcareCenter[]>(
    []
  );

  // Fetch centers on component mount
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("healthcare_centers")
          .select("*")
          .order("name");

        if (error) {
          throw error;
        }

        setCenters(data || []);
      } catch (err: any) {
        console.error("Error fetching centers:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCenters();
  }, []);

  // Apply filters whenever centers, search term or treatment filter changes
  useEffect(() => {
    const filtered = centers.filter((center) => {
      // Apply text search filter
      const matchesSearch =
        searchTerm === "" ||
        center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        center.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        center.lga?.toLowerCase().includes(searchTerm.toLowerCase());

      // Apply treatment area filter
      const matchesTreatment =
        filterTreatment === null ||
        center.is_treatment_area === filterTreatment;

      return matchesSearch && matchesTreatment;
    });

    setFilteredCenters(filtered);
  }, [centers, searchTerm, filterTreatment]);

  const handleCenterSelect = (center: HealthcareCenter) => {
    router.push(`/center/${center.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Healthcare Centers - HPV Vaccination Reports</title>
        <meta
          name="description"
          content="View and manage healthcare centers participating in the HPV vaccination program"
        />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-4 md:mb-0">
            Healthcare Centers
          </h1>
          <Link
            href="/add-center"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block text-center"
          >
            Add New Center
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <label htmlFor="search" className="sr-only">
                Search
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by name, area, or LGA..."
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span>Treatment Area:</span>
              <select
                value={
                  filterTreatment === null ? "all" : filterTreatment.toString()
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "all") {
                    setFilterTreatment(null);
                  } else {
                    setFilterTreatment(value === "true");
                  }
                }}
                className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          <div className="text-gray-600 mt-2">
            {filteredCenters.length} centers found
          </div>
        </div>

        {/* Map View */}
        {filteredCenters.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <h2 className="text-xl font-semibold p-4 bg-gray-50 border-b">
              Center Locations
            </h2>
            <div className="h-96">
              <MapComponent
                centers={filteredCenters}
                height="100%"
                onCenterSelect={handleCenterSelect}
              />
            </div>
          </div>
        )}

        {/* Centers List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-8">
              Loading centers...
            </div>
          ) : error ? (
            <div className="col-span-3 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
              {error}
            </div>
          ) : filteredCenters.length === 0 ? (
            <div className="col-span-3 text-center py-8">
              No centers found matching your search criteria.
            </div>
          ) : (
            filteredCenters.map((center) => (
              <Link
                href={`/center/${center.id}`}
                key={center.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
              >
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-blue-800 mb-2">
                    {center.name}
                  </h2>
                  <p className="text-gray-600 mb-1">
                    <span className="font-medium">Area:</span> {center.area}
                  </p>
                  <p className="text-gray-600 mb-1">
                    <span className="font-medium">LGA:</span> {center.lga}
                  </p>
                  <p className="text-gray-600 mb-2">
                    <span className="font-medium">Treatment Area:</span>{" "}
                    <span
                      className={
                        center.is_treatment_area
                          ? "text-green-600"
                          : "text-gray-500"
                      }
                    >
                      {center.is_treatment_area ? "Yes" : "No"}
                    </span>
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>

      <footer className="bg-blue-900 text-white text-center p-4 mt-12">
        <p>PHC Data Collection - HPV Vaccination Tracking System</p>
      </footer>
    </div>
  );
}
