"use client";
import {JSX, ReactNode, useEffect, useState} from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getTimeEntries } from "@/lib/api";
import dayjs from "dayjs";
import { TimeEntry } from "@/lib/types";
import { safeArray } from "@/lib/type-safe-utils";

export default function DashboardLayout({ children }: { children: ReactNode }): JSX.Element {
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchEntries = async (): Promise<void> => {
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
        return (
            <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="loading loading-spinner loading-lg text-elmar-primary mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Laden...</p>
                </div>
            </div>
        );
    }

    return (
        <ProtectedRoute>
            <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                {/* Enhanced Navbar */}
                <div className="sticky top-0 z-50">
                    <Navbar />
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Enhanced Sidebar */}
                    <div className="hidden lg:block bg-black">
                        <Sidebar
                            timeEntries={timeEntries}
                            currentMonth={currentMonth}
                            className="w-80 flex-shrink-0 h-[calc(100vh-64px)] overflow-y-auto bg-black shadow-elmar-card border-r border-gray-200"
                        />
                    </div>

                    {/* Enhanced Main Content */}
                    <main className="flex-1 overflow-y-auto bg-black">
                        <div className="p-6 lg:p-8 animate-fade-in bg-black">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}