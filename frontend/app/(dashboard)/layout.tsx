"use client";
import { ReactNode, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getTimeEntries } from "@/lib/api";
import dayjs from "dayjs";
import { TimeEntry } from "@/lib/types";
import { safeArray } from "@/lib/type-safe-utils";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const data = await getTimeEntries();
                setTimeEntries(safeArray<TimeEntry>(data));
            } catch (error) {
                console.error("Error fetching time entries:", error);
                setTimeEntries([]);
            } finally {
                setLoading(false);
            }
        };

        fetchEntries();
    }, []);

    const currentMonth = dayjs().startOf("month").toISOString();

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">
            <div className="loading loading-spinner loading-lg"></div>
        </div>;
    }

    return (
        <ProtectedRoute>
            <div className="flex flex-col min-h-screen">
                <Navbar />
                <div className="flex flex-1">
                    <Sidebar
                        timeEntries={timeEntries}
                        currentMonth={currentMonth}
                        className="w-64 flex-shrink-0"
                    />
                    <main className="p-8 flex-1">{children}</main>
                </div>
            </div>
        </ProtectedRoute>
    );
}