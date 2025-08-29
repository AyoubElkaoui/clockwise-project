"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// Remove unused imports: axios and API_URL

export default function AdminRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userId = localStorage.getItem("userId");
        const userRank = localStorage.getItem("userRank");

        if (!userId) {
            router.push("/login");
        } else if (userRank !== "admin") {
            router.push("/dashboard");
        } else {
            setLoading(false);
        }
    }, [router]);

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">
            <div className="loading loading-spinner loading-lg"></div>
        </div>;
    }

    return <>{children}</>;
}
