// Fix voor frontend/app/admin/layout.tsx

"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminRoute from "@/components/AdminRoute";
import NotificationBell from "@/components/NotificationBell";
import NotificationFeed from "@/components/NotificationFeed";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [userName] = useState(() => {
        if (typeof window !== "undefined") {
            const firstName = localStorage.getItem("firstName") || "";
            const lastName = localStorage.getItem("lastName") || "";
            return `${firstName} ${lastName}`;
        }
        return "";
    });

    const handleLogout = () => {
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

    return (
        <AdminRoute>
            <div className="flex min-h-screen">
                {/* Sidebar */}
                <aside className="bg-base-300 text-base-content p-6 w-64 flex flex-col gap-6">
                    <div>
                        <Link href="/admin" className="text-2xl font-bold tracking-wide">
                            Admin Panel
                        </Link>
                        <p className="text-sm mt-1 text-gray-600">
                            Clockwise-project
                        </p>
                    </div>

                    <nav className="flex flex-col gap-2">
                        <Link
                            href="/admin"
                            className={`btn ${pathname === '/admin' ? 'btn-primary' : 'btn-ghost'} justify-start`}
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/admin/users"
                            className={`btn ${pathname === '/admin/users' ? 'btn-primary' : 'btn-ghost'} justify-start`}
                        >
                            Gebruikers
                        </Link>
                        <Link
                            href="/admin/time-entries"
                            className={`btn ${pathname === '/admin/time-entries' ? 'btn-primary' : 'btn-ghost'} justify-start`}
                        >
                            Urenregistraties
                        </Link>
                        <Link
                            href="/admin/vacation-requests"
                            className={`btn ${pathname === '/admin/vacation-requests' ? 'btn-primary' : 'btn-ghost'} justify-start`}
                        >
                            Vakantie-aanvragen
                        </Link>
                        <Link
                            href="/admin/projects"
                            className={`btn ${pathname === '/admin/projects' ? 'btn-primary' : 'btn-ghost'} justify-start`}
                        >
                            Projecten
                        </Link>
                        <Link
                            href="/admin/user-projects"
                            className={`btn ${pathname === '/admin/user-projects' ? 'btn-primary' : 'btn-ghost'} justify-start`}
                        >
                            Project Toewijzingen
                        </Link>
                    </nav>

                    {/* NotificationFeed in sidebar */}
                    <div className="mt-4">
                        <NotificationFeed />
                    </div>

                    <div className="mt-auto pt-6 border-t border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="avatar placeholder">
                                <div className="bg-neutral-focus text-neutral-content rounded-full w-12">
                                    <span>{userName.split(' ').map(n => n[0]).join('')}</span>
                                </div>
                            </div>
                            <div>
                                <p className="font-semibold">{userName}</p>
                                <p className="text-sm text-gray-500">Administrator</p>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-col gap-2">
                            <Link href="/admin" className="btn btn-sm btn-ghost w-full">
                                Terug naar app
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="btn btn-sm btn-error w-full"
                            >
                                Uitloggen
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 bg-base-200">
                    <div className="navbar bg-base-100 px-6 shadow-md">
                        <div className="flex-1">
                            <h1 className="text-xl font-bold">
                                {pathname === '/admin' && 'Dashboard'}
                                {pathname === '/admin/users' && 'Gebruikers'}
                                {pathname === '/admin/time-entries' && 'Urenregistraties'}
                                {pathname === '/admin/vacation-requests' && 'Vakantie-aanvragen'}
                                {pathname === '/admin/projects' && 'Projecten'}
                                {pathname === '/admin/user-projects' && 'Project Toewijzingen'}
                            </h1>
                        </div>
                        <div className="flex-none">
                            <NotificationBell />
                        </div>
                    </div>
                    {children}
                </main>
            </div>
        </AdminRoute>
    );
}