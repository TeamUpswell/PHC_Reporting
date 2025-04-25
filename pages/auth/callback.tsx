import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState("Processing authentication...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("Auth callback page loaded");
        console.log("URL parameters:", router.query);

        // Fetch current session
        const { data } = await supabase.auth.getSession();
        console.log("Current session:", data.session ? "Active" : "None");

        // If we have a session, redirect to dashboard
        if (data.session) {
          console.log("Active session found, redirecting to dashboard");
          setMessage("Authentication successful. Redirecting...");
          router.push("/dashboard");
          return;
        }

        // If no session and we have a token, try to use it
        if (router.query.token) {
          setMessage("Processing authentication token...");

          const { error } = await supabase.auth.verifyOtp({
            token_hash: router.query.token as string,
            type: "recovery",
          });

          if (error) {
            console.error("Token verification failed:", error);
            setError("Authentication failed. Please try again.");
            setTimeout(() => router.push("/login"), 3000);
            return;
          }

          setMessage("Authentication successful. Redirecting...");
          router.push("/reset-password");
        } else {
          // No token and no session - something's wrong
          setError(
            "No authentication data found. Please try logging in again."
          );
          setTimeout(() => router.push("/login"), 3000);
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("An unexpected error occurred.");
        setTimeout(() => router.push("/login"), 3000);
      }
    };

    if (router.isReady) {
      handleCallback();
    }
  }, [router.isReady, router.query]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center p-8">
        {!error ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg">{message}</p>
          </>
        ) : (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <p className="mt-2 text-sm">Redirecting to login...</p>
          </div>
        )}
      </div>
    </div>
  );
}
