// Fix voor ProtectedRoute.tsx

"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userId = localStorage.getItem("userId");

        // Als we op de login pagina zijn, hoeven we niet te redirecten
        if (pathname === "/login") {
            setLoading(false);
            return;
        }

        if (!userId) {
            router.push("/login");
        } else {
            setLoading(false);
        }
    }, [router, pathname]);

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">
            <div className="loading loading-spinner loading-lg"></div>
        </div>;
    }

    return <>{children}</>;
}