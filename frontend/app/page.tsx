"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import ModernDashboard from "@/components/ModernDashboard";
import AdminDashboard from "@/components/AdminDashboard";
import ManagerDashboard from "@/components/ManagerDashboard";
import {JSX, useEffect, useState} from "react";

export default function DashboardPage(): JSX.Element {
    const [userRank, setUserRank] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const rank = localStorage.getItem("userRank") || "";
        setUserRank(rank);
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Show appropriate dashboard based on user rank
    const DashboardComponent = userRank === "admin" 
        ? AdminDashboard 
        : userRank === "manager" 
        ? ManagerDashboard 
        : ModernDashboard;

    return (
        <ProtectedRoute>
            <ModernLayout>
                <DashboardComponent />
            </ModernLayout>
        </ProtectedRoute>
    );
}