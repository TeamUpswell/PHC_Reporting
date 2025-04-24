import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { supabase, HealthcareCenter } from "../lib/supabase";

export default function Home() {
  const [centers, setCenters] = useState<HealthcareCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState<string>(""); // Changed from filterArea
  const [states, setStates] = useState<string[]>([]); // Changed from areas

  // Function to fetch all centers
  const fetchCenters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("healthcare_centers")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data) {
        setCenters(data);

        // Extract unique states for filtering instead of areas
        const uniqueStates = Array.from(
          new Set(data.map((center) => center.state).filter(Boolean))
        );
        setStates(uniqueStates);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, []);

  // Filter centers based on search term and state filter (instead of area)
  const filteredCenters = centers.filter((center) => {
    const matchesSearch =
      center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (center.state?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (center.lga?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    const matchesState = !filterState || center.state === filterState; // Changed from area to state

    return matchesSearch && matchesState;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>PHC Data Collection - HPV Vaccination Tracking</title>
        <meta
          name="description"
          content="Track HPV vaccination data at healthcare centers in Nigeria"
        />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">
            PHC HPV Vaccination Tracking
          </h1>
          <p className="text-gray-600">
            Track and manage HPV vaccination data across healthcare centers
          </p>
        </header>

        {/* Search and Filter Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search centers by name, state or LGA..." // Updated placeholder
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
            />
          </div>

          <div className="sm:w-48">
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
            >
              <option value="">All States</option> {/* Changed from All Areas */}
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          <Link
            href="/add-center"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-center"
          >
            Add New Center
          </Link>
        </div>

        {/* Centers List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-500">Loading centers...</div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        ) : filteredCenters.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-lg shadow">
            <p className="text-gray-500">No healthcare centers found.</p>
            {searchTerm || filterState ? (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterState("");
                }}
                className="mt-2 text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            ) : (
              <Link
                href="/add-center"
                className="mt-2 text-blue-600 hover:underline"
              >
                Add your first center
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCenters.map((center) => (
              <div
                key={center.id}
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <h2 className="text-xl font-semibold mb-2">{center.name}</h2>
                  <p className="text-gray-600 text-sm mb-1">
                    State: {center.state || "N/A"} {/* Changed from Area to State */}
                  </p>
                  <p className="text-gray-600 text-sm mb-1">
                    LGA: {center.lga || "N/A"}
                  </p>
                  <p className="text-gray-600 text-sm mb-3">{center.address}</p>

                  {center.vaccination_days && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Vaccination days:</span>{" "}
                      {center.vaccination_days}
                    </p>
                  )}

                  <div className="mt-4 flex justify-between">
                    <Link
                      href={`/center/edit/${center.id}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit Center
                    </Link>
                    <Link
                      href={`/center/${center.id}`}
                      className="px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200"
                    >
                      View Reports
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-blue-900 text-white text-center p-4 mt-12">
        <p>PHC Data Collection - HPV Vaccination Tracking System</p>
      </footer>
    </div>
  );
}
