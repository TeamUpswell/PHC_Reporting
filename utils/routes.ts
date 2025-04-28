export const publicRoutes = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

// Helper function to check if a route is public
export function isPublicRoute(path: string): boolean {
  return publicRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
}

// Add a function to check if a route requires authentication
export function requiresAuth(path: string): boolean {
  return !isPublicRoute(path);
}

// Change-password should require authentication, so it's not in publicRoutes

{
  /* User dropdown menu */
}
{
  userMenuOpen && (
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
  );
}
