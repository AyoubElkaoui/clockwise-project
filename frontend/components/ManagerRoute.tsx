"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function ManagerRoute({
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

    // Check if user is logged in
    if (!userId) {
      router.push("/login");
      return;
    }

    // Check if 2FA setup is required
    const require2FASetup = localStorage.getItem("require2FASetup");
    if (require2FASetup === "true" && pathname !== "/manager/account/2fa") {
      router.push("/manager/account/2fa");
      return;
    }

    // Check if user is manager or admin
    if (userRank !== "manager" && userRank !== "admin") {
      router.push("/"); // Redirect to normal dashboard
      return;
    }

    setLoading(false);
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Manager toegang controleren...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
