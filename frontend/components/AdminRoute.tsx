"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const userRank = localStorage.getItem("userRank");

    if (!userId) {
      router.push("/login");
      return;
    }

    // Alleen admins hebben toegang tot admin routes
    if (userRank === "admin") {
      setLoading(false);
    } else if (userRank === "manager") {
      // Managers naar hun eigen dashboard
      router.push("/manager/dashboard");
    } else {
      // Gewone users naar user dashboard
      router.push("/dashboard");
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return <>{children}</>;
}
