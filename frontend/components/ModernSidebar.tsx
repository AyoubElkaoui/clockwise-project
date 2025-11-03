"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Clock,
  List,
  Plane,
  Bell,
  User,
  Settings,
  Calendar,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "./ui/theme-toggle";
import { cn } from "@/lib/utils";
import { getActivities, getTimeEntries } from "@/lib/api";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

const baseMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/", badgeKey: null },
    { icon: Clock, label: "Uren Registreren", href: "/tijd-registratie", badgeKey: null },
    { icon: List, label: "Uren Overzicht", href: "/uren-overzicht", badgeKey: "pendingEntries" },
  { icon: Plane, label: "Vakantie", href: "/vakantie", badgeKey: null },
  { icon: Bell, label: "Notificaties", href: "/notificaties", badgeKey: "unreadNotifications" },
  { icon: User, label: "Mijn Account", href: "/account", badgeKey: null },
  { icon: Settings, label: "Instellingen", href: "/instellingen", badgeKey: null },
  { icon: Calendar, label: "Kalender", href: "/kalender", badgeKey: null },
];

export function ModernSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userRank, setUserRank] = useState("");
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [userId] = useState(1); // TODO: Get from auth context

  useEffect(() => {
    setMounted(true);
    setFirstName(localStorage.getItem("firstName") || "");
    setLastName(localStorage.getItem("lastName") || "");
    setUserRank(localStorage.getItem("userRank") || "");
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      // Load unread notifications
      const activities = await getActivities(50, userId);
      const unreadCount = activities.filter((a: any) => !a.isRead).length;

      // Load pending time entries (ingeleverd status)
      const entries = await getTimeEntries();
      const userEntries = entries.filter((e: any) => e.userId === userId);
      const pendingCount = userEntries.filter((e: any) => e.status === "ingeleverd").length;

      setBadges({
        unreadNotifications: unreadCount,
        pendingEntries: pendingCount,
      });
    } catch (error) {
      console.error("Failed to load badges:", error);
    }
  };

  const menuItems = baseMenuItems.map(item => ({
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
        "fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-50",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo & Company */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div>
                <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  Clockwise
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Elmar Services
                </p>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <Icon className={cn("w-5 h-5", collapsed ? "mx-auto" : "")} />
                {!collapsed && (
                  <>
                    <span className="flex-1 font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Settings */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {/* Theme Toggle */}
          <div className="flex items-center justify-center">
            <ThemeToggle />
          </div>

          {/* User Info */}
          {!collapsed && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {firstName.charAt(0)}{lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {firstName} {lastName}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">
                    {userRank || "Medewerker"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="font-medium">Uitloggen</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
