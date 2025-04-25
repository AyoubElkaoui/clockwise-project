"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminRoute from "@/components/AdminRoute";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [userName, setUserName] = useState(() => {
        if (typeof window !== "undefined") {
            const firstName = localStorage.getItem("firstName") || "";
            const lastName = localStorage.getItem("lastName") || "";
            return `${firstName} ${lastName}`;
        }
        return "";
    });

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
                    </nav>

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
                        <Link href="/" className="btn btn-sm btn-ghost mt-4 w-full">
                            Terug naar app
                        </Link>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 bg-base-200">
                    {children}
                </main>
            </div>
        </AdminRoute>
    );
}