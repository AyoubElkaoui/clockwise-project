"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const userRank = localStorage.getItem("userRank");

    // Als we op de login pagina zijn, hoeven we niet te redirecten
    if (pathname === "/login") {
      setLoading(false);
      return;
    }

    if (!userId) {
      router.push("/login");
      return;
    }

    // Check if 2FA setup is required - redirect to the correct 2FA page for their role
    const require2FASetup = localStorage.getItem("require2FASetup");
    if (require2FASetup === "true") {
      // Each role has exactly one correct 2FA page
      if (userRank === "manager") {
        if (pathname !== "/manager/account/2fa") {
          router.push("/manager/account/2fa");
          return;
        }
      } else if (userRank === "admin") {
        if (pathname !== "/admin/account/2fa") {
          router.push("/admin/account/2fa");
          return;
        }
      } else {
        if (pathname !== "/account/2fa") {
          router.push("/account/2fa");
          return;
        }
      }
    }

    // Check if user is on correct routes based on role
    const isManagerRoute = pathname.startsWith("/manager");
    const isAdminRoute = pathname.startsWith("/admin");
    const isEmployeeRoute = !isManagerRoute && !isAdminRoute && pathname !== "/login";

    if (userRank === "admin") {
      // Admins can access admin routes, redirect from other routes
      if (!isAdminRoute) {
        router.push("/admin");
        return;
      }
    } else if (userRank === "manager") {
      // Managers can access manager routes AND employee routes (like /tijd-registratie)
      // Only redirect if they're on admin routes
      if (isAdminRoute) {
        router.push("/manager/dashboard");
        return;
      }
    } else {
      // Regular users: redirect away from manager/admin routes
      if (isManagerRoute || isAdminRoute) {
        router.push("/dashboard");
        return;
      }
    }

    // User has access to current route
    setLoading(false);
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return <>{children}</>;
}
