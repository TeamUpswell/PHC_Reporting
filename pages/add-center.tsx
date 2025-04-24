import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "../lib/supabase";
import CenterForm from "../components/CenterForm";
import { HealthcareCenter } from "../types";

export default function AddCenter() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  const handleSave = () => {
    setSuccess(true);
    // Navigate back to homepage after a short delay
    setTimeout(() => {
      router.push("/");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Add New Center - PHC Data Collection</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline">
            &larr; Back to Centers
          </Link>
        </div>

        {success ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Healthcare center added successfully! Redirecting...
          </div>
        ) : (
          <CenterForm onSave={handleSave} onCancel={() => router.push("/")} />
        )}
      </main>

      <footer className="bg-blue-900 text-white text-center p-4 mt-12">
        <p>PHC Data Collection - HPV Vaccination Tracking System</p>
      </footer>
    </div>
  );
}
