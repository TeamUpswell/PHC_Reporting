import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [resetReady, setResetReady] = useState(false);
  const router = useRouter();

  // Enhanced check for valid reset session
  useEffect(() => {
    const checkResetSession = async () => {
      try {
        console.log("Checking reset session...");
        console.log("Full URL:", window.location.href);

        // Force logout any existing sessions
        await supabase.auth.signOut();

        // Look for token in both hash and query parameters
        // Check URL hash first (fragment identifier)
        let accessToken = null;
        let type = null;

        // Try to get token from URL hash
        const hash = window.location.hash.substring(1);
        if (hash) {
          const hashParams = new URLSearchParams(hash);
          type = hashParams.get("type");
          accessToken = hashParams.get("access_token");
          console.log("Found in hash:", { type, hasToken: !!accessToken });
        }

        // If not in hash, try URL query parameters
        if (!accessToken) {
          const queryParams = new URLSearchParams(window.location.search);
          const token = queryParams.get("token");
          type = queryParams.get("type");

          if (token && type === "recovery") {
            console.log("Found token in query params");
            // This is the direct Supabase link format - we need to handle this case

            // Try to exchange the token for a session
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: "recovery",
            });

            if (error) {
              console.error("Error verifying OTP:", error);
              throw error;
            }

            if (data?.session) {
              console.log("Successfully created session from token");
              setResetReady(true);
              setMessage({
                text: "Please enter your new password",
                type: "success",
              });
              return;
            }
          }
        }

        // If we have an access_token from the hash
        if (type === "recovery" && accessToken) {
          // Set session with recovery token
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: "",
          });

          if (error) {
            console.error("Error setting session:", error);
            setMessage({
              text: "Your password reset link is invalid or has expired. Please request a new one.",
              type: "error",
            });
            return;
          }

          console.log("Recovery session established successfully");
          setResetReady(true);
          setMessage({
            text: "Please enter your new password",
            type: "success",
          });
          return;
        }

        // If we got here, no valid token was found
        setMessage({
          text: "Invalid password reset link. Please request a new one.",
          type: "error",
        });
      } catch (error) {
        console.error("Reset session error:", error);
        setMessage({
          text: "An error occurred while processing your password reset. Please try again.",
          type: "error",
        });
      }
    };

    checkResetSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (password.length < 6) {
      setMessage({
        text: "Password must be at least 6 characters long",
        type: "error",
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({
        text: "Passwords do not match",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      console.log("Attempting to update password...");

      const { error, data } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error("Password update error:", error);
        throw error;
      }

      console.log("Password updated successfully");

      setMessage({
        text: "Password updated successfully! Redirecting to dashboard...",
        type: "success",
      });

      // Don't sign out - stay logged in after password reset
      // Redirect to dashboard immediately
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (error: any) {
      console.error("Password reset error:", error);
      setMessage({
        text: error.message || "Failed to reset password",
        type: "error",
      });

      // If there's an error, redirect to login
      setTimeout(() => router.push("/login"), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password - PHC Data Collection</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Reset your password
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your new password
            </p>
          </div>

          {message && (
            <div
              className={`${
                message.type === "error"
                  ? "bg-red-100 border-red-400 text-red-700"
                  : "bg-green-100 border-green-400 text-green-700"
              } px-4 py-3 rounded relative`}
              role="alert"
            >
              <span className="block sm:inline">{message.text}</span>
            </div>
          )}

          {resetReady && (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="password" className="sr-only">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="New password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Reset Password"}
                </button>
              </div>
            </form>
          )}

          <div className="text-center mt-4">
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:underline"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
