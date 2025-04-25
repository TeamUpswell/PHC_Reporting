export const publicRoutes = ["/login", "/forgot-password", "/reset-password"];

// Helper function to check if a route is public
export function isPublicRoute(path: string): boolean {
  return publicRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
}
