"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import ManagerDashboard from "@/components/ManagerDashboard";
import {JSX} from "react";

export default function ManagerDashboardPage(): JSX.Element {
    return (
        <ProtectedRoute>
            <ModernLayout>
                <ManagerDashboard />
            </ModernLayout>
        </ProtectedRoute>
    );
}
