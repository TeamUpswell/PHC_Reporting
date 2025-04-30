import { ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import Image from "next/image";
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
    <>
      {/* Only render the navbar if showNavbar is true */}
      {showNavbar && <Navbar />}
      <main>{children}</main>
    </>
  );
}
