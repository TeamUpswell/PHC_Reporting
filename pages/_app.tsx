import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import "../styles/globals.css";
import "leaflet/dist/leaflet.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "../context/AuthContext";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { isPublicRoute } from "../utils/routes";
import Layout from "../components/Layout";

// Component to handle protected routes
function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Check if the route is public or user is authenticated
    const authCheck = () => {
      const path = router.pathname;
      console.log(
        `Checking auth for path: ${path}, isPublic: ${isPublicRoute(path)}`
      );

      // Allow access to public routes regardless of authentication
      if (isPublicRoute(path)) {
        setAuthorized(true);
        return;
      }

      // For protected routes, check authentication
      if (!isLoading && !user) {
        setAuthorized(false);
        router.push(`/login?redirectTo=${encodeURIComponent(router.asPath)}`);
      } else if (!isLoading && user) {
        setAuthorized(true);
      }
    };

    authCheck();

    // Set up a router event listener to check on route change
    const hideContent = () => setAuthorized(false);
    router.events.on("routeChangeStart", hideContent);
    router.events.on("routeChangeComplete", authCheck);

    return () => {
      router.events.off("routeChangeStart", hideContent);
      router.events.off("routeChangeComplete", authCheck);
    };
  }, [isLoading, router, user]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Only render children if authorized
  return authorized ? <>{children}</> : null;
}

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isPublicPage = isPublicRoute(router.pathname);

  // Debug current page
  useEffect(() => {
    console.log(`Page changed to: ${router.pathname}`);
    console.log(`Is public page: ${isPublicPage}`);
  }, [router.pathname, isPublicPage]);

  return (
    <AuthProvider>
      <>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>

        <RouteGuard>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </RouteGuard>

        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </>
    </AuthProvider>
  );
}

export default MyApp;
