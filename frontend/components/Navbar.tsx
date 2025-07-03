"use client";
import Image from "next/image";
import Link from "next/link";
import {useState, useEffect, JSX} from "react";
import NotificationBell from "./NotificationBell";
import {
    ArrowRightOnRectangleIcon,
    UserCircleIcon,
    Bars3Icon,
    XMarkIcon,
    CogIcon
} from "@heroicons/react/24/outline";

export default function Navbar(): JSX.Element {
    const [userName, setUserName] = useState<string>("");
    const [userRank, setUserRank] = useState<string>("");
    const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

    useEffect(() => {
        const firstName = localStorage.getItem("firstName") || "";
        const lastName = localStorage.getItem("lastName") || "";
        const rank = localStorage.getItem("userRank") || "";

        setUserName(`${firstName} ${lastName}`.trim() || "Gebruiker");
        setUserRank(rank);
    }, []);

    const handleLogout = (): void => {
        localStorage.removeItem("userId");
        localStorage.removeItem("firstName");
        localStorage.removeItem("lastName");
        localStorage.removeItem("userRank");

        document.cookie = "userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "userRank=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        window.location.href = "/login";
    };

    const getRankBadge = (): JSX.Element => {
        switch (userRank) {
            case "admin":
                return <span className="badge badge-error badge-sm">Admin</span>;
            case "manager":
                return <span className="badge badge-warning badge-sm">Manager</span>;
            default:
                return <span className="badge badge-accent badge-sm">Medewerker</span>;
        }
    };

    const getUserInitials = (): string => {
        return userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const navigationItems = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/overview", label: "Uren Overzicht" },
        { href: "/vacation", label: "Vakantie" },
        { href: "/profile", label: "Profiel" },
        { href: "/faq", label: "FAQ" },
    ];

    return (
        <>
            <nav className="navbar bg-white shadow-lg border-b border-gray-200 px-6 py-3 backdrop-blur-sm bg-white/95 sticky top-0 z-40">
                {/* Logo & Brand Section */}
                <div className="flex-1 flex items-center gap-4">
                    <Link href="/dashboard" className="flex items-center gap-3 hover:scale-105 transition-transform duration-200">
                        <div className="relative">
                            <Image
                                src="/logo.png"
                                alt="Elmar Services Logo"
                                width={45}
                                height={45}
                                className="rounded-lg shadow-md"
                            />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-bold bg-gradient-elmar bg-clip-text text-transparent">
                                Elmar Services
                            </h1>
                            <p className="text-xs text-gray-600 font-medium">Uren Registratie</p>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex ml-8 space-x-1">
                        {navigationItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="px-4 py-2 rounded-xl text-gray-700 hover:text-elmar-primary hover:bg-blue-50 transition-all duration-200 font-medium text-sm"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex-none flex items-center gap-3">
                    {/* Notifications */}
                    <NotificationBell />

                    {/* Admin Panel Link */}
                    {(userRank === "admin" || userRank === "manager") && (
                        <Link
                            href="/admin"
                            className="btn btn-outline btn-primary btn-sm rounded-xl hover:scale-105 transition-all duration-200 hidden md:flex gap-2"
                        >
                            <CogIcon className="w-4 h-4" />
                            Admin Panel
                        </Link>
                    )}

                    {/* User Profile Section */}
                    <div className="hidden md:flex items-center gap-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl px-4 py-2 border border-gray-200">
                        <div className="avatar placeholder">
                            <div className="bg-gradient-elmar text-white rounded-full w-10 h-10 flex items-center justify-center shadow-md">
                                <span className="text-sm font-bold">
                                    {getUserInitials()}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-gray-800 text-sm leading-tight">{userName}</p>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                                {getRankBadge()}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="hidden md:flex btn btn-outline btn-error btn-sm rounded-xl hover:scale-105 transition-all duration-200 gap-2"
                    >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Uitloggen
                    </button>

                    {/* Mobile Menu Button */}
                    <button
                        className="lg:hidden btn btn-ghost btn-square btn-sm"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? (
                            <XMarkIcon className="w-6 h-6" />
                        ) : (
                            <Bars3Icon className="w-6 h-6" />
                        )}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
                    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out">
                        <div className="p-6">
                            {/* Mobile Header */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="avatar placeholder">
                                        <div className="bg-gradient-elmar text-white rounded-full w-12 h-12 flex items-center justify-center">
                                            <span className="text-sm font-bold">{getUserInitials()}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">{userName}</p>
                                        <div className="mt-1">{getRankBadge()}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="btn btn-ghost btn-circle btn-sm"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Mobile Navigation */}
                            <nav className="space-y-2 mb-8">
                                {navigationItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="block w-full text-left px-4 py-3 rounded-xl text-gray-700 hover:text-elmar-primary hover:bg-blue-50 transition-all duration-200 font-medium"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}

                                {/* Mobile Admin Panel Link */}
                                {(userRank === "admin" || userRank === "manager") && (
                                    <Link
                                        href="/admin"
                                        className="block w-full text-left px-4 py-3 rounded-xl text-gray-700 hover:text-elmar-primary hover:bg-blue-50 transition-all duration-200 font-medium"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <CogIcon className="w-5 h-5 inline mr-2" />
                                        Admin Panel
                                    </Link>
                                )}
                            </nav>

                            {/* Mobile Logout */}
                            <button
                                onClick={handleLogout}
                                className="w-full btn btn-error rounded-xl gap-2"
                            >
                                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                Uitloggen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
