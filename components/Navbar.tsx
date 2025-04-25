import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext"; // Import the auth context
import { useEffect, useState } from "react";

const Navbar = () => {
  useEffect(() => {
    console.log("Navbar mounted");
    return () => console.log("Navbar unmounted");
  }, []);

  const router = useRouter();
  const { user, signOut } = useAuth(); // Use the auth context
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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

            {/* Add a user account dropdown */}
            {user && (
              <div className="relative ml-3">
                <div>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-800 focus:ring-white"
                    id="user-menu-button"
                    aria-expanded="false"
                    aria-haspopup="true"
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {user?.email?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Dropdown menu */}
                {userMenuOpen && (
                  <div
                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                  >
                    <div className="px-4 py-2 text-xs text-gray-500">
                      {user?.email}
                    </div>
                    <Link
                      href="/change-password"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      Change Password
                    </Link>
                    <button
                      onClick={async () => {
                        await signOut();
                        router.push("/login");
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
