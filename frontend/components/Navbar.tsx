"use client";
import Image from "next/image";
import Link from "next/link";
import {useState, useEffect, JSX} from "react";
import NotificationBell from "./NotificationBell";
import {
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    XMarkIcon,
    CogIcon,
    MagnifyingGlassIcon
} from "@heroicons/react/24/outline";

export default function Navbar(): JSX.Element {
    const [userName, setUserName] = useState<string>("");
    const [userRank, setUserRank] = useState<string>("");
    const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");

    useEffect(() => {
        const firstName = localStorage.getItem("firstName") || "";
        const lastName = localStorage.getItem("lastName") || "";
        const rank = localStorage.getItem("userRank") || "";

        setUserName(`${firstName} ${lastName}`.trim() || "Gebruiker");
        setUserRank(rank);
    }, []);

    const handleLogout = (): void => {
        localStorage.clear();

        document.cookie = "userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "userRank=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        window.location.href = "/login";
    };

    const getRankBadge = (): JSX.Element => {
        switch (userRank) {
            case "admin":
                return <span className="badge bg-red-600 text-white border-0">Admin</span>;
            case "manager":
                return <span className="badge bg-yellow-500 text-black border-0">Manager</span>;
            default:
                return <span className="badge bg-blue-600 text-white border-0">Medewerker</span>;
        }
    };

    const getUserInitials = (): string => {
        return userName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
    };

    const navigationItems = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/overview", label: "Uren Overzicht" },
        { href: "/vacation", label: "Vakantie" },
        { href: "/profile", label: "Profiel" },
    ];

    return (
        <>
            <nav className="navbar bg-black backdrop-blur-md shadow-md border-b border-gray-800 px-6 py-3 sticky top-0 z-40">
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
                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                                Elmar Services
                            </h1>
                            <p className="text-xs text-gray-400 font-medium">Uren Registratie</p>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex ml-8 space-x-1">
                        {navigationItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="px-4 py-2 rounded-xl text-gray-300 hover:text-blue-400 hover:bg-gray-800 transition-all duration-200 font-medium text-sm"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Zoekbalk */}
                    <div className="hidden lg:flex ml-6 relative w-64">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Zoeken..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-800 text-gray-200 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex-none flex items-center gap-3">
                    {/* Notifications blauw accent */}
                    <div className="text-blue-400">
                        <NotificationBell />
                    </div>

                    {/* Admin Panel Link */}
                    {(userRank === "admin" || userRank === "manager") && (
                        <Link
                            href="/admin"
                            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-500/40 text-blue-400 hover:bg-blue-600/20 transition-all duration-200 text-sm"
                        >
                            <CogIcon className="w-4 h-4" />
                            Admin Panel
                        </Link>
                    )}

                    {/* User Profile Section */}
                    <div className="hidden md:flex items-center gap-3 bg-gray-800/60 rounded-xl px-4 py-2 border border-gray-700">
                        <div className="avatar placeholder">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-md">
                                <span className="text-sm font-bold">
                                    {getUserInitials()}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-gray-200 text-sm leading-tight">{userName}</p>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                                {getRankBadge()}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-600/20 transition-all duration-200 text-sm"
                    >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Uitloggen
                    </button>

                    {/* Mobile Menu Button */}
                    <button
                        className="lg:hidden btn btn-ghost btn-square btn-sm text-gray-300 hover:text-blue-400"
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
        </>
    );
}
