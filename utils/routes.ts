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