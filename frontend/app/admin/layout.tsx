"use client";
import {JSX, useState} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminRoute from "@/components/AdminRoute";
import NotificationBell from "@/components/NotificationBell";
import NotificationFeed from "@/components/NotificationFeed";
import {
    HomeIcon,
    UsersIcon,
    ClockIcon,
    CalendarDaysIcon,
    FolderIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
    DocumentTextIcon
} from "@heroicons/react/24/outline";

interface NavigationItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }): JSX.Element {
    const pathname = usePathname();
    const [userName] = useState(() => {
        if (typeof window !== "undefined") {
            const firstName = localStorage.getItem("firstName") || "";
            const lastName = localStorage.getItem("lastName") || "";
            return `${firstName} ${lastName}`.trim() || "Administrator";
        }
        return "Administrator";
    });

    const handleLogout = (): void => {
        // Verwijder alle localStorage items
        localStorage.removeItem("userId");
        localStorage.removeItem("firstName");
        localStorage.removeItem("lastName");
        localStorage.removeItem("userRank");

        // Verwijder cookies
        document.cookie = "userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "userRank=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        // Redirect naar login pagina
        window.location.href = "/login";
    };

    const navigationItems: NavigationItem[] = [
        {
            href: "/admin",
            label: "Dashboard",
            icon: HomeIcon,
            description: "Overzicht en statistieken"
        },
        {
            href: "/admin/users",
            label: "Gebruikers",
            icon: UsersIcon,
            description: "Beheer medewerkers"
        },
        {
            href: "/admin/time-entries",
            label: "Urenregistraties",
            icon: ClockIcon,
            description: "Goedkeuren van uren"
        },
        {
            href: "/admin/vacation-requests",
            label: "Vakantie-aanvragen",
            icon: CalendarDaysIcon,
            description: "Vakantie beheer"
        },
        {
            href: "/admin/projects",
            label: "Projecten",
            icon: FolderIcon,
            description: "Project beheer"
        },
        {
            href: "/admin/user-projects",
            label: "Project Toewijzingen",
            icon: DocumentTextIcon,
            description: "Koppel users aan projecten"
        }
    ];

    return (
        <AdminRoute>
            <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                {/* Enhanced Sidebar */}
                <aside className="bg-white border-r border-gray-200 w-80 flex flex-col shadow-elmar-card">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 bg-gradient-elmar text-white">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                                <Cog6ToothIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Admin Panel</h1>
                                <p className="text-blue-100 text-sm">Elmar Services</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="p-4 space-y-2 flex-1">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Beheer Functies
                        </h3>
                        {navigationItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                                        group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 
                                        ${isActive
                                        ? 'bg-gradient-elmar text-white shadow-lg'
                                        : 'text-gray-700 hover:bg-blue-50 hover:text-elmar-primary'
                                    }
                                    `}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-elmar-primary'}`} />
                                    <div className="flex-1">
                                        <div className={`font-medium text-sm ${isActive ? 'text-white' : ''}`}>
                                            {item.label}
                                        </div>
                                        <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                                            {item.description}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* NotificationFeed in sidebar */}
                    <div className="p-4 border-t border-gray-100">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Recente Activiteit
                        </h3>
                        <NotificationFeed limit={3} />
                    </div>

                    {/* User Section */}
                    <div className="p-4 border-t border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="avatar placeholder">
                                <div className="bg-gradient-elmar text-white rounded-xl w-12 h-12 flex items-center justify-center">
                                    <span className="text-sm font-bold">
                                        {userName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-800 text-sm">{userName}</p>
                                <span className="badge badge-error badge-xs">Administrator</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Link href="/dashboard" className="btn btn-outline btn-sm w-full rounded-xl">
                                Terug naar App
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="btn btn-error btn-sm w-full rounded-xl hover:scale-105 transition-all duration-200"
                            >
                                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-1" />
                                Uitloggen
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 overflow-y-auto">
                    {/* Top navbar */}
                    <div className="navbar bg-white px-6 shadow-sm border-b border-gray-200">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-800">
                                {pathname === '/admin' && '📊 Dashboard'}
                                {pathname === '/admin/users' && '👥 Gebruikers'}
                                {pathname === '/admin/time-entries' && '⏰ Urenregistraties'}
                                {pathname === '/admin/vacation-requests' && '🏖️ Vakantie-aanvragen'}
                                {pathname === '/admin/projects' && '📁 Projecten'}
                                {pathname === '/admin/user-projects' && '🔗 Project Toewijzingen'}
                            </h1>
                        </div>
                        <div className="flex-none">
                            <NotificationBell />
                        </div>
                    </div>

                    <div className="p-6 lg:p-8 animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>
        </AdminRoute>
    );
}