import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (newPassword.length < 6) {
      setMessage({
        text: "Password must be at least 6 characters",
        type: "error",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({
        text: "Passwords do not match",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Send a password reset email for security
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        user?.email || "",
        {
          redirectTo: `https://vstracker.upswell.app/auth/callback`,
        }
      );

      if (resetError) throw resetError;

      setMessage({
        text: "A password reset link has been sent to your email. Please check your inbox.",
        type: "success",
      });
    } catch (error: any) {
      console.error("Password change error:", error);
      setMessage({
        text: error.message || "Failed to send password reset email",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Change Password - PHC Data Collection</title>
      </Head>
      <div className="container mx-auto px-4 py-8 max-w-md">
        <h1 className="text-2xl font-bold mb-6">Change Password</h1>

        {message && (
          <div
            className={`${
              message.type === "error"
                ? "bg-red-100 border-red-400 text-red-700"
                : "bg-green-100 border-green-400 text-green-700"
            } px-4 py-3 rounded relative mb-4`}
            role="alert"
          >
            <span className="block sm:inline">{message.text}</span>
          </div>
        )}

        <form
          className="bg-white rounded-lg shadow-md p-6"
          onSubmit={handleSubmit}
        >
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              For security reasons, we'll send a password reset link to your
              email address. You don't need to know your current password to set
              a new one.
            </p>
          </div>

          <div className="mb-6">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 w-full"
            >
              {loading ? "Sending..." : "Send Password Reset Link"}
            </button>
          </div>

          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-blue-600 hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
