"use client";
import React, {useState, useEffect, JSX} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dayjs, { Dayjs } from "dayjs";
import MonthCalendar from "@/components/WeekOverview/MonthCalendar";
import NotificationFeed from "@/components/NotificationFeed";
import { TimeEntry } from "@/lib/types";
import {
    HomeIcon,
    ClockIcon,
    CalendarDaysIcon,
    UserCircleIcon,
    ChartBarIcon,
    BellIcon
} from "@heroicons/react/24/outline";

interface SidebarProps {
    currentMonth: string | Dayjs;
    timeEntries: TimeEntry[];
    className?: string;
}

interface NavigationItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
}

export default function Sidebar({
                                    currentMonth,
                                    timeEntries,
                                    className = ""
                                }: SidebarProps): JSX.Element {
    const pathname = usePathname();
    const usedMonth = typeof currentMonth === 'string'
        ? dayjs(currentMonth)
        : (dayjs.isDayjs(currentMonth) ? currentMonth : dayjs().startOf("month"));

    // State voor gebruikersgegevens
    const [userName, setUserName] = useState<string>("Gebruiker");
    const [userInitials, setUserInitials] = useState<string>("");
    const [userRank, setUserRank] = useState<string>("");

    // Haal gebruikersgegevens op na client-side rendering
    useEffect(() => {
        const firstName = localStorage.getItem('firstName') || '';
        const lastName = localStorage.getItem('lastName') || '';
        const rank = localStorage.getItem('userRank') || '';

        const fullName = `${firstName} ${lastName}`.trim();
        setUserName(fullName || "Gebruiker");
        setUserInitials(fullName.split(' ').map(n => n[0] || '').join('').substring(0, 2));
        setUserRank(rank);
    }, []);

    const navigationItems: NavigationItem[] = [
        {
            href: "/dashboard",
            label: "Dashboard",
            icon: HomeIcon,
            description: "Overzicht van je week"
        },
        {
            href: "/overview",
            label: "Uren Overzicht",
            icon: ChartBarIcon,
            description: "Bekijk je geregistreerde uren"
        },
        {
            href: "/vacation",
            label: "Vakantie",
            icon: CalendarDaysIcon,
            description: "Beheer je vakantieaanvragen"
        },
        {
            href: "/profile",
            label: "Mijn Account",
            icon: UserCircleIcon,
            description: "Persoonlijke instellingen"
        }
    ];

    const getRankBadge = (): JSX.Element => {
        switch (userRank) {
            case "admin":
                return <span className="badge badge-error badge-s">Admin</span>;
            case "manager":
                return <span className="badge badge-warning badge-xs">Manager</span>;
            default:
                return <span className="badge badge-accent badge-xs">Medewerker</span>;
        }
    };

    return (
        <aside className={`bg-white border-r border-gray-200 flex flex-col ${className}`}>
            {/* Header Section */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                        <div className="bg-gradient-elmar text-white rounded-xl w-12 h-12 flex items-center justify-center">
                            <span className="text-sm font-bold">{userInitials}</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-gray-800 text-sm leading-tight">{userName}</p>
                        <div className="flex items-center gap-1 mt-1">
                            {getRankBadge()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Section */}
            <nav className="p-4 space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Navigatie
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

            {/* Calendar Section */}
            <div className="p-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ClockIcon className="w-4 h-4" />
                    Kalender
                </h3>
                <MonthCalendar
                    currentMonth={usedMonth}
                    timeEntries={timeEntries}
                    title=""
                />
            </div>

            {/* Notifications Section */}
            <div className="p-4 border-t border-gray-100 flex-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BellIcon className="w-4 h-4" />
                    Activiteiten
                </h3>
                <NotificationFeed limit={5} />
            </div>

            {/* Quick Stats Section */}
            <div className="p-4 border-t border-gray-100">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-800 text-sm mb-3">Deze Week</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Uren:</span>
                            <span className="font-semibold text-elmar-primary">32.5</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Dagen:</span>
                            <span className="font-semibold text-elmar-primary">4</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className="badge badge-success badge-xs">Ingeleverd</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Section */}
            <div className="p-4 border-t border-gray-100">
                <button
                    className="btn btn-outline btn-error btn-sm w-full rounded-xl hover:scale-105 transition-all duration-200"
                    onClick={() => {
                        localStorage.clear();
                        document.cookie = "userId=; path=/; max-age=0";
                        document.cookie = "userRank=; path=/; max-age=0";
                        window.location.href = "/login";
                    }}
                >
                    Uitloggen
                </button>
            </div>
        </aside>
    );
}