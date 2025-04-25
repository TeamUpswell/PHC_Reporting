import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext"; // Import the auth context
import { useEffect } from "react";

const Navbar = () => {
  useEffect(() => {
    console.log("Navbar mounted");
    return () => console.log("Navbar unmounted");
  }, []);

  const router = useRouter();
  const { user, signOut } = useAuth(); // Use the auth context

  const isActive = (path: string) => {
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="bg-blue-800 text-white shadow-md z-50 sticky top-0">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold">PHC Data Collection</span>
            </Link>
          </div>

          <div className="flex items-center">
            <div className="flex space-x-4">
              {/* Dashboard first */}
              <Link
                href="/dashboard"
                className={`text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/dashboard") ? "bg-blue-900" : ""
                }`}
              >
                Dashboard
              </Link>

              {/* Centers second */}
              <Link
                href="/"
                className={`text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/") &&
                  !isActive("/dashboard") &&
                  !isActive("/reports")
                    ? "bg-blue-900"
                    : ""
                }`}
              >
                Centers
              </Link>

              {/* Reports third */}
              <Link
                href="/reports"
                className={`text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/reports") ? "bg-blue-900" : ""
                }`}
              >
                Reports
              </Link>
            </div>

            {/* Add logout button */}
            {user && (
              <div className="ml-4 flex items-center">
                <span className="text-sm mr-3">{user.email}</span>
                <button
                  onClick={signOut}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white text-sm"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
