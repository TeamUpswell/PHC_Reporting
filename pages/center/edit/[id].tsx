import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { supabase, HealthcareCenter } from "../../../lib/supabase";
import CenterForm from "../../../components/CenterForm";

export default function EditCenter() {
  const router = useRouter();
  const { id } = router.query;

  const [center, setCenter] = useState<HealthcareCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        console.error("Error fetching center:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCenter();
  }, [id]);

  const handleSave = () => {
    setSuccess(true);
    // Navigate back to center page after a short delay
    setTimeout(() => {
      router.push(`/center/${id}`);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-500">Loading center details...</div>
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
        <title>Edit Center - PHC Data Collection</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href={`/center/${id}`}
            className="text-blue-600 hover:underline"
          >
            &larr; Back to Center
          </Link>
        </div>

        {success ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Healthcare center updated successfully! Redirecting...
          </div>
        ) : (
          center && (
            <CenterForm
              center={center}
              onSave={handleSave}
              onCancel={() => router.push(`/center/${id}`)}
            />
          )
        )}
      </main>

      <footer className="bg-blue-900 text-white text-center p-4 mt-12">
        <p>PHC Data Collection - HPV Vaccination Tracking System</p>
      </footer>
    </div>
  );
}
