"use client";
import {useState, useEffect, JSX} from "react";
import { getAdminStats } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import { AdminStats } from "@/lib/types";
import {
    UsersIcon,
    ClockIcon,
    FolderIcon,
    CalendarDaysIcon,
    ChartBarIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    BellIcon,
    ComputerDesktopIcon,
    ServerIcon,
    AtSymbolIcon
} from "@heroicons/react/24/outline";

interface StatCard {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    textColor: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
}

export default function AdminDashboard(): JSX.Element {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [adminName, setAdminName] = useState<string>("");

    useEffect(() => {
        const fetchData = async (): Promise<void> => {
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
        return (
            <div className="flex justify-center items-center min-h-screen bg-blue-100">
                <div className="text-center">
                    <div className="loading loading-spinner loading-lg text-elmar-primary mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Dashboard laden...</p>
                </div>
            </div>
        );
    }

    const statCards: StatCard[] = [
        {
            title: "Totaal Gebruikers",
            value: stats?.totalUsers || 0,
            subtitle: "Actieve medewerkers",
            icon: UsersIcon,
            gradient: "from-blue-500 to-blue-600",
            textColor: "text-blue-100",
            trend: { value: 12, isPositive: true }
        },
        {
            title: "Uren Deze Maand",
            value: safeToFixed(stats?.hoursThisMonth),
            subtitle: "Geregistreerde werkuren",
            icon: ClockIcon,
            gradient: "from-green-500 to-green-600",
            textColor: "text-green-100",
            trend: { value: 8, isPositive: true }
        },
        {
            title: "Actieve Projecten",
            value: stats?.activeProjects || 0,
            subtitle: "Lopende projecten",
            icon: FolderIcon,
            gradient: "from-purple-500 to-purple-600",
            textColor: "text-purple-100",
            trend: { value: 3, isPositive: false }
        },
        {
            title: "Vakantie Aanvragen",
            value: stats?.pendingVacations || 0,
            subtitle: "Wachten op goedkeuring",
            icon: CalendarDaysIcon,
            gradient: "from-orange-500 to-orange-600",
            textColor: "text-orange-100"
        }
    ];

    const quickActions = [
        {
            title: "Uren Goedkeuren",
            description: "Bekijk en keur urenregistraties goed",
            href: "/admin/time-entries",
            icon: CheckCircleIcon,
            color: "bg-green-500 hover:bg-green-600"
        },
        {
            title: "Vakantie Beheren",
            description: "Verwerk vakantie-aanvragen",
            href: "/admin/vacation-requests",
            icon: CalendarDaysIcon,
            color: "bg-blue-500 hover:bg-blue-600"
        },
        {
            title: "Gebruikers Beheren",
            description: "Voeg gebruikers toe of bewerk gegevens",
            href: "/admin/users",
            icon: UsersIcon,
            color: "bg-purple-500 hover:bg-purple-600"
        },
        {
            title: "Project Toewijzingen",
            description: "Wijs gebruikers toe aan projecten",
            href: "/admin/user-projects",
            icon: FolderIcon,
            color: "bg-indigo-500 hover:bg-indigo-600"
        }
    ];

    return (
        <AdminRoute>
            <div className="p-6 space-y-8 max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white rounded-3xl p-8 shadow-md-lg relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-xl"></div>

                    <div className="relative flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
                            <p className="text-blue-100 text-lg">Welkom terug, {adminName}!</p>
                            <p className="text-blue-200 text-sm mt-1">Hier is je overzicht van vandaag</p>
                        </div>
                        <div className="hidden md:block">
                            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                                <ChartBarIcon className="w-16 h-16 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {statCards.map((card, index) => {
                        const Icon = card.icon;
                        return (
                            <div
                                key={card.title}
                                className="bg-white rounded-2xl shadow-md hover:shadow-md-lg overflow-hidden"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className={`bg-gradient-to-br ${card.gradient} p-6 text-white relative overflow-hidden`}>
                                    {/* Background Pattern */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-lg"></div>

                                    <div className="relative flex items-center justify-between mb-4">
                                        <Icon className="w-8 h-8" />
                                        {card.trend && (
                                            <div className={`flex items-center text-sm ${card.textColor}`}>
                                                {card.trend.isPositive ? (
                                                    <ArrowUpIcon className="w-4 h-4 mr-1" />
                                                ) : (
                                                    <ArrowDownIcon className="w-4 h-4 mr-1" />
                                                )}
                                                {card.trend.value}%
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative text-3xl font-bold mb-1">{card.value}</div>
                                    <div className={`relative text-sm ${card.textColor}`}>{card.subtitle}</div>
                                </div>
                                <div className="p-4 bg-gradient-to-r from-gray-50 to-white">
                                    <div className="text-sm font-medium text-gray-700">{card.title}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-blue-600 p-3 rounded-xl shadow-lg">
                            <CheckCircleIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Snelle Acties</h2>
                            <p className="text-gray-600">Meest gebruikte beheerfuncties</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {quickActions.map((action) => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={action.title}
                                    onClick={() => window.location.href = action.href}
                                    className="group p-6 rounded-xl border-2 border-gray-200 hover:border-blue-300 text-left bg-gradient-to-br from-white to-gray-50 hover:shadow-md"
                                >
                                    <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200 shadow-lg`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors duration-200">
                                        {action.title}
                                    </h3>
                                    <p className="text-sm text-gray-600">{action.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Status Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* System Status */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <CheckCircleIcon className="w-6 h-6 text-green-500" />
                            Systeem Status
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-blue-100 rounded-xl border border-green-200">
                                <div className="flex items-center gap-3">
                                    <ServerIcon className="w-5 h-5 text-green-600" />
                                    <span className="text-sm font-medium text-gray-700">Database</span>
                                </div>
                                <span className="badge badge-success">Operationeel</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-blue-100 rounded-xl border border-green-200">
                                <div className="flex items-center gap-3">
                                    <ComputerDesktopIcon className="w-5 h-5 text-green-600" />
                                    <span className="text-sm font-medium text-gray-700">API Services</span>
                                </div>
                                <span className="badge badge-success">Operationeel</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-blue-100 rounded-xl border border-yellow-200">
                                <div className="flex items-center gap-3">
                                    <AtSymbolIcon className="w-5 h-5 text-yellow-600" />
                                    <span className="text-sm font-medium text-gray-700">Email Service</span>
                                </div>
                                <span className="badge badge-warning">Onderhoud</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <BellIcon className="w-6 h-6 text-blue-500" />
                            Recente Activiteit
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-4 bg-blue-100 rounded-xl border border-blue-200">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-700">5 nieuwe urenregistraties</p>
                                    <p className="text-xs text-gray-500">2 minuten geleden</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-blue-100 rounded-xl border border-green-200">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-700">Vakantie aanvraag goedgekeurd</p>
                                    <p className="text-xs text-gray-500">15 minuten geleden</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-blue-100 rounded-xl border border-purple-200">
                                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-700">Nieuwe gebruiker toegevoegd</p>
                                    <p className="text-xs text-gray-500">1 uur geleden</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerts Section */}
                {stats?.pendingVacations && stats.pendingVacations > 0 && (
                    <div className="bg-gradient-to-r from-orange-100 via-yellow-100 to-red-100 border-2 border-orange-200 rounded-2xl p-6 shadow-md">
                        <div className="flex items-center gap-4">
                            <div className="bg-orange-500 p-3 rounded-xl shadow-lg">
                                <ExclamationTriangleIcon className="w-8 h-8 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-orange-800">Actie Vereist</h3>
                                <p className="text-orange-700">
                                    Je hebt {stats.pendingVacations} vakantie-aanvra{stats.pendingVacations === 1 ? 'ag' : 'gen'} die wacht{stats.pendingVacations === 1 ? '' : 'en'} op goedkeuring.
                                </p>
                            </div>
                            <button
                                onClick={() => window.location.href = "/admin/vacation-requests"}
                                className="btn bg-gradient-warning border-0 text-white rounded-xl hover:shadow-lg"
                            >
                                Bekijken
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer Info */}
                <div className="bg-blue-100 rounded-2xl p-6 border border-gray-200">
                    <div className="text-center">
                        <h4 className="font-semibold text-gray-800 mb-2">Tip van de dag</h4>
                        <p className="text-gray-600 text-sm">
                            Controleer regelmatig de pending vakantie-aanvragen en urenregistraties om de workflow soepel te houden.
                        </p>
                    </div>
                </div>
            </div>
        </AdminRoute>
    );
}