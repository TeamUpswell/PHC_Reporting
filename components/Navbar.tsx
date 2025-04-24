import Link from "next/link";
import { useRouter } from "next/router";

const Navbar = () => {
  const router = useRouter();

  const isActive = (path: string) => {
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="bg-blue-800 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold">PHC Data Collection</span>
            </Link>
          </div>

          <div className="flex">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive("/") &&
                !isActive("/dashboard") &&
                !isActive("/reports")
                  ? "bg-blue-900"
                  : "hover:bg-blue-700"
              }`}
            >
              Centers
            </Link>
            <Link
              href="/reports"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive("/reports") ? "bg-blue-900" : "hover:bg-blue-700"
              }`}
            >
              Reports
            </Link>
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive("/dashboard") ? "bg-blue-900" : "hover:bg-blue-700"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/add-center"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive("/add-center") ? "bg-blue-900" : "hover:bg-blue-700"
              }`}
            >
              Add Center
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
