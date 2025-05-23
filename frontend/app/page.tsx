"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardContent from "@/components/DashboardContent";
import {JSX} from "react";

export default function DashboardPage(): JSX.Element {
    return (
        <ProtectedRoute>
            <DashboardContent />
        </ProtectedRoute>
    );
}