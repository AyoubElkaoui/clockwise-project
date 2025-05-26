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
    BellIcon,
    ArrowRightOnRectangleIcon
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

    const [userName, setUserName] = useState<string>("");
    const [userInitials, setUserInitials] = useState<string>("");
    const [userRank, setUserRank] = useState<string>("");

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
                return <span className="badge badge-error badge-xs">Admin</span>;
            case "manager":
                return <span className="badge badge-warning badge-xs">Manager</span>;
            default:
                return <span className="badge badge-accent badge-xs">Medewerker</span>;
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        document.cookie = "userId=; path=/; max-age=0";
        document.cookie = "userRank=; path=/; max-age=0";
        window.location.href = "/login";
    };

    return (
        <aside className={`bg-white border-r border-gray-200 flex flex-col shadow-lg ${className}`}>
            {/* User Profile Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                        <div className="bg-gradient-elmar text-white rounded-xl w-14 h-14 flex items-center justify-center shadow-lg">
                            <span className="text-lg font-bold">{userInitials}</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-base leading-tight truncate">{userName}</p>
                        <div className="flex items-center gap-1 mt-1">
                            {getRankBadge()}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Elmar Services</p>
                    </div>
                </div>
            </div>

            {/* Navigation Section */}
            <nav className="p-4 flex-shrink-0">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Navigatie
                </h3>
                <div className="space-y-1">
                    {navigationItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 
                                    ${isActive
                                    ? 'bg-gradient-elmar text-white shadow-md'
                                    : 'text-gray-700 hover:bg-blue-50 hover:text-elmar-primary'
                                }
                                `}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-elmar-primary'}`} />
                                <div className="flex-1 min-w-0">
                                    <div className={`font-medium text-sm truncate ${isActive ? 'text-white' : ''}`}>
                                        {item.label}
                                    </div>
                                    <div className={`text-xs truncate ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                                        {item.description}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Calendar Section - Scrollable */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="p-4 border-t border-gray-100 flex-shrink-0">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" />
                        Kalender Overzicht
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto px-4">
                    <div className="mb-4">
                        <MonthCalendar
                            currentMonth={usedMonth}
                            timeEntries={timeEntries}
                            title=""
                        />
                    </div>
                </div>
            </div>

            {/* Notifications Section */}
            <div className="p-4 border-t border-gray-100 flex-shrink-0">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BellIcon className="w-4 h-4" />
                    Recente Activiteit
                </h3>
                <div className="max-h-40 overflow-y-auto">
                    <NotificationFeed limit={3} />
                </div>
            </div>

            {/* Quick Stats Section */}
            <div className="p-4 border-t border-gray-100 flex-shrink-0">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-800 text-sm mb-3">Deze Week</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-center">
                            <div className="text-lg font-bold text-elmar-primary">32½u</div>
                            <div className="text-xs text-gray-600">Uren</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-green-600">4</div>
                            <div className="text-xs text-gray-600">Dagen</div>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Status:</span>
                            <span className="badge badge-success badge-xs">Ingeleverd</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-100 flex-shrink-0">
                <button
                    className="btn btn-outline btn-error btn-sm w-full rounded-xl hover:scale-105 transition-all duration-200 gap-2"
                    onClick={handleLogout}
                >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    Uitloggen
                </button>
            </div>
        </aside>
    );
}