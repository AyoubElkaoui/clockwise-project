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

    // 2FA setup required: one page for every role.
    const require2FASetup = localStorage.getItem("require2FASetup");
    if (require2FASetup === "true" && pathname !== "/account/2fa") {
      router.push("/account/2fa");
      return;
    }

    // Route access per role. Admin can use everything, manager everything except /admin,
    // employee only the employee routes.
    const isManagerRoute = pathname.startsWith("/manager");
    const isAdminRoute = pathname.startsWith("/admin");
    if (userRank === "admin") {
      // superset: no restrictions
    } else if (userRank === "manager") {
      if (isAdminRoute) {
        router.push("/manager/dashboard");
        return;
      }
    } else if (isManagerRoute || isAdminRoute) {
      router.push("/dashboard");
      return;
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
