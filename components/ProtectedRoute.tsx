import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      if (!isLoading && !user) {
        // Save the intended destination
        const currentPath = router.asPath;
        router.push(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
      }
    }
  }, [user, isLoading, router]);

  // Show loading indicator while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Only render children if authenticated
  return user ? <>{children}</> : null;
}
