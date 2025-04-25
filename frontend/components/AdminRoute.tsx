"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

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

// Voeg deze functies toe aan je lib/api.ts
export async function getAdminStats() {
    const res = await axios.get(`${API_URL}/admin/stats`);
    return res.data;
}

export async function getAdminTimeEntries() {
    const res = await axios.get(`${API_URL}/admin/time-entries`);
    return res.data;
}

export async function getAdminVacationRequests() {
    const res = await axios.get(`${API_URL}/admin/vacation-requests`);
    return res.data;
}

export async function processVacationRequest(id: number, status: "approved" | "rejected") {
    const res = await axios.put(`${API_URL}/admin/vacation-requests/${id}`, { status });
    return res.data;
}

export async function createProject(projectData: { name: string, projectGroupId: number }) {
    const res = await axios.post(`${API_URL}/admin/projects`, projectData);
    return res.data;
}