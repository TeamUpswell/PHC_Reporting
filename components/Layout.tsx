import { ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import Image from "next/image"; // Add this import
import { isPublicRoute } from "../utils/routes";

type LayoutProps = {
  children: ReactNode;
  showNavbar?: boolean;
};

export default function Layout({ children, showNavbar = true }: LayoutProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isPublicPage = isPublicRoute(router.pathname);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Only show Navbar if showNavbar prop is true AND it's not a public page AND user is authenticated */}
      {showNavbar && !isPublicPage && user && <Navbar />}

      {/* Logo container - appears on all pages */}
      <div className="flex justify-center py-4">
        <Image 
          src="/images/vital_logo.png" 
          alt="VITAL Logo" 
          width={150} 
          height={50} 
          priority
        />
      </div>

      <main className="flex-grow">{children}</main>
    </div>
  );
}
