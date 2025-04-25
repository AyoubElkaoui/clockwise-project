// app/admin/page.tsx
"use client";
import { useState, useEffect } from "react";
import { getAdminStats } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getAdminStats();
                setStats(data);
            } catch (error) {
                console.error("Error fetching admin stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">
            <div className="loading loading-spinner loading-lg"></div>
        </div>;
    }

    return (
        <AdminRoute>
            <div className="p-6">
                <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Gebruikers</h2>
                            <p className="text-4xl font-bold">{stats.totalUsers}</p>
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Uren deze maand</h2>
                            <p className="text-4xl font-bold">{stats.hoursThisMonth.toFixed(1)}</p>
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Actieve projecten</h2>
                            <p className="text-4xl font-bold">{stats.activeProjects}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Te verwerken vakantie-aanvragen</h2>
                            <p className="text-4xl font-bold">{stats.pendingVacations}</p>
                            <div className="card-actions justify-end mt-4">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => window.location.href = "/admin/vacation-requests"}
                                >
                                    Bekijken
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Totale uren</h2>
                            <p className="text-4xl font-bold">{stats.totalHours.toFixed(1)}</p>
                            <div className="card-actions justify-end mt-4">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => window.location.href = "/admin/time-entries"}
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