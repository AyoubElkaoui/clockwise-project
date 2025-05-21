"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { API_URL } from "@/lib/api"; // Import API_URL van lib/api

export default function AdminRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userId = localStorage.getItem("userId");
        const userRank = localStorage.getItem("userRank");

        if (!userId) {
            router.push("/login");
        } else if (userRank !== "admin" && userRank !== "manager") {
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

// Voeg deze functies toe aan je lib/api.ts, niet hier!
// Verwijder deze API functies uit AdminRoute.tsx, want ze zijn al in lib/api.ts