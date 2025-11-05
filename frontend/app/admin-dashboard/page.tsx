"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import AdminDashboard from "@/components/AdminDashboard";
import {JSX} from "react";

export default function AdminDashboardPage(): JSX.Element {
    return (
        <ProtectedRoute>
            <ModernLayout>
                <AdminDashboard />
            </ModernLayout>
        </ProtectedRoute>
    );
}
