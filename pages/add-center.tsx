import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link"; // Add this import
import { supabase } from "../lib/supabase";
import CenterForm from "../components/CenterForm";
import { HealthcareCenter } from "../types";

export default function AddCenter() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (center: HealthcareCenter) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.from("healthcare_centers").insert([center]).select();

      if (error) throw error;

      // Navigate to the newly created center's detail page
      if (data && data.length > 0) {
        router.push(`/center/${data[0].id}`);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while saving the center");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Add New Center - PHC Data Collection</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline">
            &larr; Back to Centers
          </Link>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Add New Healthcare Center</h1>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <CenterForm onSave={handleSave} onCancel={() => router.push("/")} />
        </div>
      </main>
    </div>
  );
}
