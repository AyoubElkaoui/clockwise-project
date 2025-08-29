"use client";
import React, {useState, useEffect, JSX} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dayjs, { Dayjs } from "dayjs";
import { TimeEntry } from "@/lib/types";
import NotificationFeed from "./NotificationFeed";
import {
    HomeIcon,
    ClockIcon,
    CalendarDaysIcon,
    UserCircleIcon,
    ChartBarIcon,
    BellIcon,
    ArrowRightOnRectangleIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XMarkIcon
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("dashboardLayoutFullscreen") === "true";
        }
        return false;
    });

    const usedMonth = typeof currentMonth === 'string'
        ? dayjs(currentMonth)
        : (dayjs.isDayjs(currentMonth) ? currentMonth : dayjs().startOf("month"));

    const [userName, setUserName] = useState<string>("");
    const [userInitials, setUserInitials] = useState<string>("");
    const [userRank, setUserRank] = useState<string>("");

    // Save fullscreen preference to localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("dashboardLayoutFullscreen", isFullscreen.toString());
        }
    }, [isFullscreen]);

    useEffect(() => {
        const firstName = localStorage.getItem('firstName') || '';
        const lastName = localStorage.getItem('lastName') || '';
        const rank = localStorage.getItem('userRank') || '';

        const fullName = `${firstName} ${lastName}`.trim();
        setUserName(fullName || "Gebruiker");
        setUserInitials(fullName.split(' ').map(n => n[0] || '').join('').substring(0, 2));
        setUserRank(rank);
    }, []);

    // Close mobile menu when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    // Close mobile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (isMobileMenuOpen && !target.closest('.mobile-menu') && !target.closest('.mobile-menu-button')) {
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isMobileMenuOpen]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        if (isMobileMenuOpen) {
            setIsMobileMenuOpen(false);
        }
    };

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
            description: "Bekijk je goedgekeurde uren"
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
    const firstDayOfWeek = startOfMonth.day();

    const calendarDays = [];
    const mondayFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = 0; i < mondayFirstDay; i++) {
        calendarDays.push(null);
    }
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

    // Expose functions for parent component to use
    const sidebarControls = {
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        isFullscreen,
        toggleFullscreen
    };

    // Attach to window for parent access
    useEffect(() => {
        if (typeof window !== "undefined") {
            (window as any).dashboardSidebarControls = sidebarControls;
        }
    }, [isMobileMenuOpen, isFullscreen]);

    const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
        <div className="flex flex-col h-full">
            {/* User Profile Header - Fixed */}
            <div className={`${mobile ? 'p-4' : 'p-6'} border-b border-gray-100 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white ${mobile ? 'rounded-t-xl' : ''} flex-shrink-0`}>
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative flex-shrink-0">
                        <div className={`${mobile ? 'w-12 h-12' : 'w-14 h-14'} bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/30`}>
                            <span className={`${mobile ? 'text-base' : 'text-lg'} font-bold text-white`}>{userInitials}</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-green-400 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className={`font-bold ${mobile ? 'text-base' : 'text-lg'} leading-tight truncate`}>{userName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            {userRank === "admin" && <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">Admin</span>}
                            {userRank === "manager" && <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs font-medium rounded-full">Manager</span>}
                            {userRank === "user" && <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">Medewerker</span>}
                        </div>
                        <p className={`text-blue-100 ${mobile ? 'text-xs' : 'text-sm'} mt-1`}>Elmar Services</p>
                    </div>
                    {mobile && (
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto">
                {/* Navigation Section */}
                <nav className={`${mobile ? 'p-3' : 'p-4'} border-b border-gray-100`}>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 sm:mb-4 flex items-center gap-2">
                        <HomeIcon className="w-3 h-3" />
                        Navigatie
                    </h3>
                    <div className="space-y-2">
                        {navigationItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                                        group flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 cursor-pointer relative overflow-hidden
                                        ${isActive
                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105'
                                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600'
                                    }
                                    `}
                                    onClick={() => mobile && setIsMobileMenuOpen(false)}
                                >
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50"></div>
                                    )}
                                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 relative z-10 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'}`} />
                                    <div className="flex-1 min-w-0 relative z-10">
                                        <div className={`font-semibold text-sm truncate ${isActive ? 'text-white' : ''}`}>
                                            {item.label}
                                        </div>
                                        <div className={`text-xs opacity-75 truncate ${isActive ? 'text-blue-100' : 'text-gray-500'} ${mobile ? 'hidden' : ''}`}>
                                            {item.description}
                                        </div>
                                    </div>
                                    {isActive && (
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse relative z-10"></div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* NotificationFeed Section - Hidden on mobile to save space */}
                {!mobile && (
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <BellIcon className="w-3 h-3" />
                            Notificaties
                        </h3>
                        <div className="max-h-48 overflow-hidden">
                            <NotificationFeed limit={3} />
                        </div>
                    </div>
                )}

                {/* Mini Calendar */}
                <div className={`${mobile ? 'p-3' : 'p-4'} border-b border-gray-100`}>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 sm:mb-4 flex items-center gap-2">
                        <CalendarDaysIcon className="w-3 h-3" />
                        {usedMonth.format('MMMM YYYY')}
                    </h3>

                    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-3 sm:p-4 border border-gray-200">
                        {/* Calendar header */}
                        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2 sm:mb-3">
                            {['M', 'D', 'W', 'D', 'V', 'Z', 'Z'].map((day, i) => (
                                <div key={i} className="text-xs font-bold text-gray-600 text-center py-1 sm:py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar days */}
                        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                            {calendarDays.map((day, index) => {
                                if (day === null) {
                                    return <div key={index} className={`${mobile ? 'h-6' : 'h-8'}`}></div>;
                                }

                                const hours = getHoursForDay(day);
                                const isToday = usedMonth.date(day).isSame(dayjs(), 'day');

                                let cellClass = `${mobile ? 'h-6 w-6' : 'h-8 w-8'} flex items-center justify-center text-xs font-medium rounded-lg cursor-pointer transition-all duration-200 relative `;

                                if (isToday) {
                                    cellClass += "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg transform scale-110 font-bold ";
                                } else if (hours >= 8) {
                                    cellClass += "bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md hover:scale-105 ";
                                } else if (hours >= 4) {
                                    cellClass += "bg-gradient-to-br from-yellow-400 to-orange-400 text-white shadow-md hover:scale-105 ";
                                } else if (hours > 0) {
                                    cellClass += "bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-md hover:scale-105 ";
                                } else {
                                    cellClass += "text-gray-600 hover:bg-gray-200 hover:scale-105 ";
                                }

                                return (
                                    <div key={index} className={cellClass} title={`${day} ${usedMonth.format('MMMM')} - ${formatHours(hours)}`}>
                                        {day}
                                        {hours > 0 && !isToday && (
                                            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full opacity-80"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Week Stats */}
                <div className={`${mobile ? 'p-3' : 'p-4'} border-b border-gray-100`}>
                    <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-xl p-4 sm:p-5 border border-indigo-200 shadow-sm">
                        <h4 className="font-bold text-gray-800 text-sm mb-3 sm:mb-4 flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-indigo-600" />
                            Deze Week
                        </h4>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                            <div className="text-center bg-white/60 rounded-lg p-2 sm:p-3 backdrop-blur-sm">
                                <div className={`${mobile ? 'text-xl' : 'text-2xl'} font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent`}>
                                    {formatHours(weekHours)}
                                </div>
                                <div className="text-xs text-gray-600 font-medium">Uren</div>
                            </div>
                            <div className="text-center bg-white/60 rounded-lg p-2 sm:p-3 backdrop-blur-sm">
                                <div className={`${mobile ? 'text-xl' : 'text-2xl'} font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent`}>
                                    {workDays}
                                </div>
                                <div className="text-xs text-gray-600 font-medium">Dagen</div>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-3 sm:mb-4">
                            <div className="flex justify-between text-xs font-medium text-gray-600 mb-2">
                                <span>Voortgang</span>
                                <span>{((weekHours / 40) * 100).toFixed(0)}%</span>
                            </div>
                            <div className={`w-full bg-gray-200 rounded-full ${mobile ? 'h-2' : 'h-3'} shadow-inner`}>
                                <div
                                    className={`${mobile ? 'h-2' : 'h-3'} rounded-full transition-all duration-700 shadow-sm ${
                                        weekHours >= 40 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                                            weekHours >= 32 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                                                'bg-gradient-to-r from-blue-400 to-indigo-500'
                                    }`}
                                    style={{ width: `${Math.min((weekHours / 40) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 text-center mt-2">
                                {formatHours(weekHours)} van 40u
                            </div>
                        </div>

                        <div className="flex justify-center">
                            {weekHours >= 32 ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full">
                                    <CheckCircleIcon className="w-3 h-3" />
                                    Op Schema
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                                    <ExclamationTriangleIcon className="w-3 h-3" />
                                    Te Laag
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Logout Button - Fixed at bottom */}
            <div className={`${mobile ? 'p-3' : 'p-4'} flex-shrink-0`}>
                <button
                    className={`w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold ${mobile ? 'py-2.5' : 'py-3'} px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 text-sm`}
                    onClick={handleLogout}
                >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    Uitloggen
                </button>
            </div>
        </div>
    );

    // Also expose a layout wrapper for parent components to use
    const createLayoutWrapper = (children: React.ReactNode) => (
        <div className="flex h-screen overflow-hidden">
            {/* Desktop Sidebar - Normal flow positioning */}
            {!isFullscreen && (
                <aside className={`hidden lg:flex bg-white border-r border-gray-200 flex-col shadow-lg w-80 ${className}`}>
                    <SidebarContent />
                </aside>
            )}

            {/* Main content area with independent scroll */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {children}
            </main>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
                    <div className="mobile-menu fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col animate-slide-in-left h-full">
                        <SidebarContent mobile={true} />
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slide-in-left {
                    from {
                        transform: translateX(-100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }

                .animate-slide-in-left {
                    animation: slide-in-left 0.3s ease-out;
                }
            `}</style>
        </div>
    );

    // Attach layout wrapper to window for easy access
    useEffect(() => {
        if (typeof window !== "undefined") {
            (window as any).dashboardSidebarControls = {
                ...sidebarControls,
                createLayoutWrapper
            };
        }
    }, [isMobileMenuOpen, isFullscreen]);

    return (
        <>
            {/* Desktop Sidebar - Hidden in fullscreen mode */}
            {!isFullscreen && (
                <aside className={`hidden lg:flex bg-white border-r border-gray-200 flex-col shadow-lg h-screen w-80 ${className}`}>
                    <SidebarContent />
                </aside>
            )}

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
                    <div className="mobile-menu fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col animate-slide-in-left h-full">
                        <SidebarContent mobile={true} />
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slide-in-left {
                    from {
                        transform: translateX(-100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }

                .animate-slide-in-left {
                    animation: slide-in-left 0.3s ease-out;
                }
            `}</style>
        </>
    );
}
