// components/ProtectedRoute.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    useEffect(() => {
        const userId = localStorage.getItem("userId");
        if (!userId) {
            router.push("/login");
        }
    }, [router]);

    return <>{children}</>;
}
