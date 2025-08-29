"use client";
import {JSX, useState, useEffect} from "react";
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
    DocumentTextIcon,
    Bars3Icon,
    XMarkIcon,
    EyeSlashIcon,
    EyeIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon
} from "@heroicons/react/24/outline";

interface NavigationItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }): JSX.Element {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(() => {
        // Load fullscreen preference from localStorage
        if (typeof window !== "undefined") {
            return localStorage.getItem("adminLayoutFullscreen") === "true";
        }
        return false;
    });

    const [userName] = useState(() => {
        if (typeof window !== "undefined") {
            const firstName = localStorage.getItem("firstName") || "";
            const lastName = localStorage.getItem("lastName") || "";
            return `${firstName} ${lastName}`.trim() || "Administrator";
        }
        return "Administrator";
    });

    // Save fullscreen preference to localStorage
    useEffect(() => {
        localStorage.setItem("adminLayoutFullscreen", isFullscreen.toString());
    }, [isFullscreen]);

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

    const handleLogout = (): void => {
        // Verwijder alle localStorage items
        localStorage.removeItem("userId");
        localStorage.removeItem("firstName");
        localStorage.removeItem("lastName");
        localStorage.removeItem("userRank");
        localStorage.removeItem("adminLayoutFullscreen");

        // Verwijder cookies
        document.cookie = "userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "userRank=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        // Redirect naar login pagina
        window.location.href = "/login";
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        // Close mobile menu if open when toggling fullscreen
        if (isMobileMenuOpen) {
            setIsMobileMenuOpen(false);
        }
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

    const getPageTitle = (path: string): string => {
        switch (path) {
            case '/admin': return '📊 Dashboard';
            case '/admin/users': return '👥 Gebruikers';
            case '/admin/time-entries': return '⏰ Urenregistraties';
            case '/admin/vacation-requests': return '🏖️ Vakantie-aanvragen';
            case '/admin/projects': return '📁 Projecten';
            case '/admin/user-projects': return '🔗 Project Toewijzingen';
            default: return '📊 Admin Panel';
        }
    };

    const NavigationContent = ({ mobile = false }: { mobile?: boolean }) => (
        <>
            {/* Header */}
            <div className={`${mobile ? 'p-4' : 'p-6'} border-b border-gray-100 bg-gradient-elmar text-white ${mobile ? 'rounded-t-xl' : ''}`}>
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 sm:p-3">
                        <Cog6ToothIcon className={`${mobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className={`${mobile ? 'text-lg' : 'text-xl'} font-bold`}>Admin Panel</h1>
                        <p className={`text-blue-100 ${mobile ? 'text-xs' : 'text-sm'}`}>Elmar Services</p>
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

            {/* Navigation */}
            <nav className={`${mobile ? 'p-4' : 'p-4'} space-y-2 flex-1 overflow-y-auto`}>
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
                            onClick={() => mobile && setIsMobileMenuOpen(false)}
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-elmar-primary'}`} />
                            <div className="flex-1 min-w-0">
                                <div className={`font-medium text-sm ${isActive ? 'text-white' : ''} truncate`}>
                                    {item.label}
                                </div>
                                <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'} ${mobile ? 'hidden' : ''}`}>
                                    {item.description}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* User Section */}
            <div className={`${mobile ? 'p-4' : 'p-4'} border-t border-gray-100 mt-auto`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="avatar placeholder">
                        <div className={`bg-gradient-elmar text-white rounded-xl ${mobile ? 'w-10 h-10' : 'w-12 h-12'} flex items-center justify-center flex-shrink-0`}>
                            <span className={`${mobile ? 'text-xs' : 'text-sm'} font-bold`}>
                                {userName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`font-bold text-gray-800 ${mobile ? 'text-sm' : 'text-sm'} truncate`}>{userName}</p>
                        <span className="badge badge-error badge-xs">Administrator</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <Link
                        href="/dashboard"
                        className={`btn btn-outline ${mobile ? 'btn-sm' : 'btn-sm'} w-full rounded-xl text-xs`}
                        onClick={() => mobile && setIsMobileMenuOpen(false)}
                    >
                        Terug naar App
                    </Link>
                    <button
                        onClick={handleLogout}
                        className={`btn btn-error ${mobile ? 'btn-sm' : 'btn-sm'} w-full rounded-xl hover:scale-105 transition-all duration-200 text-xs`}
                    >
                        <ArrowRightOnRectangleIcon className="w-4 h-4 mr-1" />
                        Uitloggen
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <AdminRoute>
            <div className={`flex h-screen transition-all duration-300 ${isFullscreen ? 'bg-white' : 'bg-gradient-to-br from-gray-50 to-blue-50'}`}>
                {/* Desktop Sidebar - Hidden in fullscreen mode */}
                {!isFullscreen && (
                    <aside className="hidden lg:flex bg-white border-r border-gray-200 w-80 flex-col shadow-elmar-card h-full">
                        <NavigationContent />
                    </aside>
                )}

                {/* Mobile Menu Overlay - Available even in fullscreen for quick access */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
                        <div className="mobile-menu fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col animate-slide-in-left h-full">
                            <NavigationContent mobile={true} />
                        </div>
                    </div>
                )}

                {/* Main content */}
                <main className="flex-1 overflow-hidden min-w-0 flex flex-col h-full">
                    {/* Enhanced Top navbar with fullscreen toggle */}
                    <div className={`navbar bg-white px-4 sm:px-6 shadow-sm border-b border-gray-200 z-40 flex-shrink-0 ${isFullscreen ? 'shadow-lg' : ''}`}>
                        <div className="flex-1 flex items-center gap-3">
                            {/* Single Menu Button - Hamburger on mobile, layout toggle on desktop */}
                            <button
                                className="btn btn-ghost btn-sm p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                                onClick={() => {
                                    // On mobile: open navigation menu
                                    // On desktop: toggle fullscreen layout
                                    if (window.innerWidth < 1024) {
                                        setIsMobileMenuOpen(true);
                                    } else {
                                        toggleFullscreen();
                                    }
                                }}
                                title={window.innerWidth < 1024 ? "Open navigatie menu" : (isFullscreen ? "Toon navigatie paneel" : "Verberg navigatie paneel")}
                            >
                                <svg className="w-6 h-6 text-gray-600 group-hover:text-elmar-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>

                            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 truncate">
                                {getPageTitle(pathname)}
                            </h1>
                        </div>

                        <div className="flex-none flex items-center gap-2">

                            <NotificationBell />
                        </div>
                    </div>

                    {/* Page Content with conditional padding */}
                    <div className={`animate-fade-in flex-1 overflow-y-auto ${isFullscreen ? 'p-2 sm:p-4 lg:p-6' : 'p-4 sm:p-6 lg:p-8'}`}>
                        {children}
                    </div>
                </main>
            </div>

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
        </AdminRoute>
    );
}
