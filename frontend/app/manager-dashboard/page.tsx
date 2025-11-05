"use client";
import ManagerLayout from "@/components/ManagerLayout";
import ManagerDashboard from "@/components/ManagerDashboard";
import {JSX} from "react";

export default function ManagerDashboardPage(): JSX.Element {
    return (
        <ManagerLayout>
            <ManagerDashboard />
        </ManagerLayout>
    );
}
