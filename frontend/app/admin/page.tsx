"use client";
import { useState, useEffect } from "react";
import { getAdminStats } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import { AdminStats } from "@/lib/types";

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [adminName, setAdminName] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getAdminStats();
                setStats(data || {
                    totalUsers: 0,
                    hoursThisMonth: 0,
                    activeProjects: 0,
                    pendingVacations: 0,
                    totalHours: 0
                });

                try {
                    const firstName = localStorage.getItem("firstName") || "";
                    const lastName = localStorage.getItem("lastName") || "";
                    setAdminName(`${firstName} ${lastName}`.trim() || "Administrator");
                } catch (storageError) {
                    setAdminName("Administrator");
                }
            } catch (error) {
                console.error("Error fetching admin stats:", error);
                setStats({
                    totalUsers: 0,
                    hoursThisMonth: 0,
                    activeProjects: 0,
                    pendingVacations: 0,
                    totalHours: 0
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const safeToFixed = (value: any, decimals: number = 1): string => {
        if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
            return value.toFixed(decimals);
        }
        return '0.' + '0'.repeat(decimals);
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">
            <div className="loading loading-spinner loading-lg"></div>
        </div>;
    }

    return (
        <AdminRoute>
            <div className="p-6">
                <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                <p className="text-lg mb-6">Welkom, {adminName}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Gebruikers</h2>
                            <p className="text-4xl font-bold">{stats?.totalUsers || 0}</p>
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Uren deze maand</h2>
                            <p className="text-4xl font-bold">{safeToFixed(stats?.hoursThisMonth)}</p>
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Actieve projecten</h2>
                            <p className="text-4xl font-bold">{stats?.activeProjects || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Te verwerken vakantie-aanvragen</h2>
                            <p className="text-4xl font-bold">{stats?.pendingVacations || 0}</p>
                            <div className="card-actions justify-end mt-4">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        try {
                                            window.location.href = "/admin/vacation-requests";
                                        } catch (e) {
                                            console.error('Navigation error:', e);
                                        }
                                    }}
                                >
                                    Bekijken
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Totale uren</h2>
                            <p className="text-4xl font-bold">{safeToFixed(stats?.totalHours)}</p>
                            <div className="card-actions justify-end mt-4">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        try {
                                            window.location.href = "/admin/time-entries";
                                        } catch (e) {
                                            console.error('Navigation error:', e);
                                        }
                                    }}
                                >
                                    Bekijken
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminRoute>
    );
}
