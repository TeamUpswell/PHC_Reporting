import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Function to close dropdown when clicking outside
  const closeDropdownOnClickOutside = () => {
    if (userMenuOpen) {
      setUserMenuOpen(false);
    }
  };

  // Handle click outside
  useEffect(() => {
    document.addEventListener("click", closeDropdownOnClickOutside);
    return () => {
      document.removeEventListener("click", closeDropdownOnClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <nav className="bg-blue-800 text-white shadow-md z-50 sticky top-0">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex-shrink-0">
            <Link href="/dashboard" className="flex items-center">
              <span className="font-bold text-xl">VITAL Tracker</span>
            </Link>
          </div>

          {/* Main Navigation - Desktop */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  router.pathname === "/dashboard"
                    ? "bg-blue-900 text-white"
                    : "text-gray-300 hover:bg-blue-700"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/reports"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  router.pathname === "/reports" ||
                  router.pathname.startsWith("/reports/")
                    ? "bg-blue-900 text-white"
                    : "text-gray-300 hover:bg-blue-700"
                }`}
              >
                Reports
              </Link>
              <Link
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  router.pathname === "/" ||
                  router.pathname.startsWith("/center/")
                    ? "bg-blue-900 text-white"
                    : "text-gray-300 hover:bg-blue-700"
                }`}
              >
                Centers
              </Link>
              <Link
                href="/bulk-entry"
                className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Bulk Data Entry
              </Link>
            </div>
          </div>

          {/* User Menu - Desktop */}
          <div className="hidden md:ml-6 md:flex md:items-center">
            <div className="ml-3 relative">
              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserMenuOpen(!userMenuOpen);
                  }}
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

              {/* User dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
                  <Link
                    href="/change-password"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Change Password
                  </Link>
                  <button
                    onClick={signOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className={`${mobileMenuOpen ? "hidden" : "block"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <svg
                className={`${mobileMenuOpen ? "block" : "hidden"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${mobileMenuOpen ? "block" : "hidden"} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            href="/dashboard"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              router.pathname === "/dashboard"
                ? "bg-blue-900 text-white"
                : "text-gray-300 hover:bg-blue-700 hover:text-white"
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/reports"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              router.pathname === "/reports" ||
              router.pathname.startsWith("/reports/")
                ? "bg-blue-900 text-white"
                : "text-gray-300 hover:bg-blue-700 hover:text-white"
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Reports
          </Link>
          <Link
            href="/"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              router.pathname === "/" || router.pathname.startsWith("/center/")
                ? "bg-blue-900 text-white"
                : "text-gray-300 hover:bg-blue-700 hover:text-white"
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Centers
          </Link>
          <Link
            href="/bulk-entry"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-blue-700 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            Bulk Data Entry
          </Link>
        </div>

        {/* Mobile user menu */}
        <div className="pt-4 pb-3 border-t border-blue-700">
          <div className="px-4 flex items-center">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-lg font-medium text-white">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-white">
                {user?.email}
              </div>
            </div>
          </div>
          <div className="mt-3 px-2 space-y-1">
            <Link
              href="/change-password"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-blue-700 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Change Password
            </Link>
            <button
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-blue-700 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
