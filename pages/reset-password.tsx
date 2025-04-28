import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

// Use environment variable if available, or window.location.origin
const siteURL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "https://vstracker.upswell.app");

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetReady, setResetReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if we're in a password reset flow
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Session error:", error);
        setError(
          "Authentication session error. Please try requesting another password reset."
        );
        return;
      }

      if (data.session) {
        console.log("Active session detected");
        setResetReady(true);
      } else {
        console.log("No active session found");
        setError(
          "No active authentication session. Please try requesting another password reset."
        );
      }
    };

    getSession();
  }, []);

  const handleCallback = async (type: string, token: string | null) => {
    if (type === "recovery" && token) {
      console.log("Processing password reset token");
      // Explicitly set this session as a recovery session
      await supabase.auth.refreshSession({
        refresh_token: token as string,
      });

      // Now redirect to reset password page
      router.push("/reset-password");
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      console.log("Attempting password update");

      // Check if user is authenticated with a recovery session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error(
          "No active session found. Please request a new password reset."
        );
      }

      const { error, data } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error("Password update failed:", error);
        setError(error.message);
        return;
      }

      console.log("Password update succeeded");
      setMessage("Password updated successfully!");

      // Redirect after short delay
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      console.error("Error in password update:", err);
      setError(err.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Head>
        <title>Reset Password - PHC Data Collection</title>
      </Head>
      <div className="max-w-md w-full p-8 bg-white shadow-md rounded">
        <h1 className="text-2xl font-bold mb-6">Reset Your Password</h1>

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Reset Password"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/login" className="text-blue-500 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
