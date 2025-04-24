import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { HealthcareCenter } from "../../../types";
import CenterForm from "../../../components/CenterForm";

export default function EditCenter() {
  const router = useRouter();
  const { id } = router.query;

  const [center, setCenter] = useState<HealthcareCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchCenter = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("healthcare_centers")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setCenter(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCenter();
  }, [id]);

  const handleSave = async (updatedCenter: HealthcareCenter) => {
    try {
      const { error } = await supabase
        .from("healthcare_centers")
        .update(updatedCenter)
        .eq("id", id);

      if (error) throw error;

      router.push(`/center/${id}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Function to delete center
  const deleteCenter = async () => {
    setDeleteLoading(true);
    try {
      if (!center) {
        throw new Error("Center not found");
      }

      // First delete any related reports
      const { error: reportsError } = await supabase
        .from("monthly_reports")
        .delete()
        .eq("center_id", center.id);

      if (reportsError) throw reportsError;

      // Then delete the center itself
      const { error: centerError } = await supabase
        .from("healthcare_centers")
        .delete()
        .eq("id", center.id);

      if (centerError) throw centerError;

      // Redirect to homepage after successful deletion
      router.push("/");
    } catch (err: any) {
      console.error("Error deleting center:", err);
      setError(`Failed to delete center: ${err.message}`);
      setShowDeleteModal(false);
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading center data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
        <Link href="/" className="text-blue-600 hover:underline">
          &larr; Back to Centers
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Edit {center?.name || "Center"} - PHC Data Collection</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href={`/center/${id}`} className="text-blue-600 hover:underline">
            &larr; Back to Center
          </Link>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Edit Healthcare Center</h1>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              disabled={!center}
            >
              Delete Center
            </button>
          </div>
          
          {center && (
            <CenterForm
              initialValues={center}
              onSave={handleSave}
              onCancel={() => router.push(`/center/${id}`)}
            />
          )}
        </div>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Delete Healthcare Center</h3>
            <p className="mb-6">
              Are you sure you want to delete {center?.name}? This action cannot
              be undone, and all associated reports will be removed.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={deleteCenter}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete Center"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <footer className="bg-blue-900 text-white text-center p-4 mt-12">
        <p>PHC Data Collection - HPV Vaccination Tracking System</p>
      </footer>
    </div>
  );
}
