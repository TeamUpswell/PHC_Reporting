import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("Auth callback page loaded");
        console.log("URL parameters:", router.query);

        // Check for token and recovery type
        const { token, type } = router.query;

        if (type === "recovery" && token) {
          console.log("Processing password reset token");

          // Redirect to reset password page
          router.push("/reset-password");
          return;
        }

        // If we have a session already, go to dashboard
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.push("/dashboard");
          return;
        }

        // Default fallback
        router.push("/login");
      } catch (err) {
        console.error("Auth callback error:", err);
        router.push("/login");
      }
    };

    if (router.isReady) {
      handleCallback();
    }
  }, [router.isReady, router.query]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>{message}</p>
      </div>
    </div>
  );
}
