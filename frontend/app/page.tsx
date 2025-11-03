"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import ModernDashboard from "@/components/ModernDashboard";
import {JSX} from "react";

export default function DashboardPage(): JSX.Element {
    return (
        <ProtectedRoute>
            <ModernLayout>
                <ModernDashboard />
            </ModernLayout>
        </ProtectedRoute>
    );
}