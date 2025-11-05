"use client";
import AdminLayout from "@/components/AdminLayout";
import AdminDashboard from "@/components/AdminDashboard";
import {JSX} from "react";

export default function AdminDashboardPage(): JSX.Element {
    return (
        <AdminLayout>
            <AdminDashboard />
        </AdminLayout>
    );
}
