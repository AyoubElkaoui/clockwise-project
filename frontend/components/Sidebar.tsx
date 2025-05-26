"use client";
import React, {useState, useEffect, JSX} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dayjs, { Dayjs } from "dayjs";
import { TimeEntry } from "@/lib/types";
import {
    HomeIcon,
    ClockIcon,
    CalendarDaysIcon,
    UserCircleIcon,
    ChartBarIcon,
    BellIcon,
    ArrowRightOnRectangleIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
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

    // Calculate current week hours
    const currentWeek = dayjs().startOf('isoWeek');
    const currentWeekEntries = timeEntries.filter(entry => {
        try {
            const entryDate = dayjs(entry.startTime);
            return entryDate.isBetween(currentWeek, currentWeek.add(6, 'day'), 'day', '[]');
        } catch {
            return false;
        }
    });

    const calculateHours = (entry: TimeEntry): number => {
        if (!entry.startTime || !entry.endTime) return 0;
        try {
            const start = dayjs(entry.startTime);
            const end = dayjs(entry.endTime);
            const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
            const hours = diffMin > 0 ? diffMin / 60 : 0;
            return Math.round(hours * 4) / 4;
        } catch {
            return 0;
        }
    };

    const weekHours = currentWeekEntries.reduce((total, entry) => total + calculateHours(entry), 0);
    const workDays = [...new Set(currentWeekEntries.map(entry => dayjs(entry.startTime).format('YYYY-MM-DD')))].length;

    const formatHours = (hours: number): string => {
        if (hours === 0) return "0u";
        const wholeHours = Math.floor(hours);
        const fraction = hours - wholeHours;

        if (fraction === 0.25) return `${wholeHours}¼u`;
        else if (fraction === 0.5) return `${wholeHours}½u`;
        else if (fraction === 0.75) return `${wholeHours}¾u`;
        else return `${wholeHours}u`;
    };

    // Mini calendar data
    const startOfMonth = usedMonth.startOf('month');
    const endOfMonth = usedMonth.endOf('month');
    const daysInMonth = endOfMonth.date();
    const firstDayOfWeek = startOfMonth.day(); // 0 = Sunday

    const calendarDays = [];
    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
        calendarDays.push(null);
    }
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    const getHoursForDay = (day: number): number => {
        const date = usedMonth.date(day);
        const dayStr = date.format('YYYY-MM-DD');
        const dayEntries = timeEntries.filter(entry =>
            entry.startTime && entry.startTime.startsWith(dayStr)
        );
        return dayEntries.reduce((total, entry) => total + calculateHours(entry), 0);
    };

    return (
        <aside className={`bg-white border-r border-gray-200 flex flex-col shadow-lg h-screen ${className}`}>
            {/* User Profile Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
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

            {/* Mini Calendar - Fixed Size */}
            <div className="p-4 border-t border-gray-100 flex-shrink-0">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CalendarDaysIcon className="w-4 h-4" />
                    {usedMonth.format('MMMM YYYY')}
                </h3>

                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    {/* Calendar header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Z', 'M', 'D', 'W', 'D', 'V', 'Z'].map((day, i) => (
                            <div key={i} className="text-xs font-semibold text-gray-500 text-center">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, index) => {
                            if (day === null) {
                                return <div key={index} className="h-6"></div>;
                            }

                            const hours = getHoursForDay(day);
                            const isToday = usedMonth.date(day).isSame(dayjs(), 'day');

                            let cellClass = "h-6 w-6 flex items-center justify-center text-xs rounded transition-colors ";

                            if (isToday) {
                                cellClass += "bg-elmar-primary text-white font-bold ";
                            } else if (hours >= 8) {
                                cellClass += "bg-green-100 text-green-800 ";
                            } else if (hours >= 4) {
                                cellClass += "bg-yellow-100 text-yellow-800 ";
                            } else if (hours > 0) {
                                cellClass += "bg-blue-100 text-blue-800 ";
                            } else {
                                cellClass += "text-gray-600 hover:bg-gray-100 ";
                            }

                            return (
                                <div key={index} className={cellClass} title={`${day} - ${formatHours(hours)}`}>
                                    {day}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Week Stats - Fixed */}
            <div className="p-4 border-t border-gray-100 flex-shrink-0">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" />
                        Deze Week
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div className="text-center">
                            <div className="text-lg font-bold text-elmar-primary">{formatHours(weekHours)}</div>
                            <div className="text-xs text-gray-600">Uren</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{workDays}</div>
                            <div className="text-xs text-gray-600">Dagen</div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                    weekHours >= 40 ? 'bg-green-500' :
                                        weekHours >= 32 ? 'bg-yellow-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min((weekHours / 40) * 100, 100)}%` }}
                            ></div>
                        </div>
                        <div className="text-xs text-gray-500 text-center mt-1">
                            {((weekHours / 40) * 100).toFixed(0)}% van 40u
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Status:</span>
                        {weekHours >= 32 ? (
                            <span className="badge badge-success badge-xs">
                                <CheckCircleIcon className="w-3 h-3 mr-1" />
                                Goed
                            </span>
                        ) : (
                            <span className="badge badge-warning badge-xs">
                                <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                                Te laag
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Spacer */}
            <div className="flex-1"></div>

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