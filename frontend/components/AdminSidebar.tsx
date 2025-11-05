"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  CheckCircle2,
  Clock,
  Plane,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  BarChart3,
} from "lucide-react";
import { ThemeToggle } from "./ui/theme-toggle";
import { cn } from "@/lib/utils";
import { getActivities, getTimeEntries } from "@/lib/api";

const adminMenuItems = [
  { icon: Shield, label: "Admin Dashboard", href: "/admin-dashboard", badgeKey: null },
  { icon: Users, label: "Gebruikers Beheer", href: "/admin/users", badgeKey: null },
  { icon: Building2, label: "Bedrijven", href: "/admin/companies", badgeKey: null },
  { icon: FolderKanban, label: "Projecten", href: "/admin/projects", badgeKey: null },
  { icon: CheckCircle2, label: "Goedkeuringen", href: "/admin/approve-hours", badgeKey: "pendingApprovals" },
  { icon: Clock, label: "Alle Uren", href: "/admin/time-entries", badgeKey: null },
  { icon: Plane, label: "Vakantie Beheer", href: "/admin/vacation-requests", badgeKey: null },
  { icon: BarChart3, label: "Rapporten", href: "/admin/reports", badgeKey: null },
  { icon: Bell, label: "Notificaties", href: "/notificaties", badgeKey: "unreadNotifications" },
  { icon: Settings, label: "Systeem Instellingen", href: "/admin/settings", badgeKey: null },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [userId] = useState(1);

  useEffect(() => {
    setMounted(true);
    setFirstName(localStorage.getItem("firstName") || "");
    setLastName(localStorage.getItem("lastName") || "");
    
    loadBadges();
    
    const interval = setInterval(() => {
      loadBadges();
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const loadBadges = async () => {
    try {
      const activities = await getActivities(50, userId);
      const unreadCount = activities.filter((a: any) => !a.read).length;

      const entries = await getTimeEntries();
      const pendingCount = entries.filter((e: any) => e.status === "ingeleverd").length;

      setBadges({
        unreadNotifications: unreadCount > 0 ? unreadCount : null,
        pendingApprovals: pendingCount > 0 ? pendingCount : null,
      });
    } catch (error) {
      console.error("Failed to load badges:", error);
    }
  };

  const menuItems = adminMenuItems.map(item => ({
    ...item,
    badge: item.badgeKey ? badges[item.badgeKey] || null : null
  }));

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (!mounted) return null;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-gradient-to-b from-white to-blue-50 dark:from-slate-900 dark:to-slate-800 border-r border-blue-200 dark:border-slate-700 transition-all duration-300 z-50 shadow-xl",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo & Admin Badge */}
        <div className="p-6 border-b border-blue-200 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-6 h-6 text-white" />
                  <h1 className="text-xl font-bold text-white">
                    Admin Panel
                  </h1>
                </div>
                <p className="text-xs text-blue-100">
                  Elmar Services - Beheer
                </p>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="w-5 h-5 text-white" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
                    : "text-slate-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:scale-105"
                )}
              >
                <Icon className={cn("w-5 h-5", collapsed ? "mx-auto" : "")} />
                {!collapsed && (
                  <>
                    <span className="flex-1 font-medium text-sm">{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Settings */}
        <div className="p-4 border-t border-blue-200 dark:border-slate-700 space-y-3 bg-white/50 dark:bg-slate-800/50">
          {/* Theme Toggle */}
          <div className="flex items-center justify-center">
            <ThemeToggle />
          </div>

          {/* User Info */}
          {!collapsed && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-xl border border-blue-200 dark:border-slate-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  {firstName.charAt(0)}{lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {firstName} {lastName}
                  </p>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-red-600" />
                    <p className="text-xs font-semibold text-red-600">
                      Administrator
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 font-medium hover:scale-105",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Uitloggen</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
