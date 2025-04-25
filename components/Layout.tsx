import { ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import { isPublicRoute } from "../utils/routes";

type LayoutProps = {
  children: ReactNode;
  showNavbar?: boolean; // Make this optional with default true
};

export default function Layout({ children, showNavbar = true }: LayoutProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isPublicPage = isPublicRoute(router.pathname);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Only show Navbar if showNavbar prop is true AND either:
          1. It's not a public page, or
          2. User is authenticated */}
      {showNavbar && !isPublicPage && user && <Navbar />}
      <main className="flex-grow">{children}</main>
    </div>
  );
}
