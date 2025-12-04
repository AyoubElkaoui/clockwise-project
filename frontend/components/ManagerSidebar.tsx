"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  Clock,
  Plane,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCheck,
  Calendar,
} from "lucide-react";
import { ThemeToggle } from "./ui/theme-toggle";
import { cn } from "@/lib/utils";
import { getActivities, getTimeEntries } from "@/lib/api";

const managerMenuItems = [
  { icon: Shield, label: "Manager Panel", href: "/manager/team", badgeKey: null },
  { icon: Users, label: "Mijn Team", href: "/manager/team", badgeKey: null },
  { icon: CheckCircle2, label: "Goedkeuringen", href: "/manager/approve", badgeKey: "pendingApprovals" },
  { icon: Clock, label: "Team Uren", href: "/manager/hours", badgeKey: null },
  { icon: Plane, label: "Vakantie Aanvragen", href: "/manager/vacation", badgeKey: null },
  { icon: Calendar, label: "Team Planning", href: "/manager/planning", badgeKey: null },
  { icon: Bell, label: "Notificaties", href: "/notificaties", badgeKey: "unreadNotifications" },
  { icon: Settings, label: "Instellingen", href: "/manager/settings", badgeKey: null },
];

export function ManagerSidebar() {
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

  const menuItems = managerMenuItems.map(item => ({
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
        "fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 z-50",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo & Manager Badge */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Manager Panel
                  </h1>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Elmar Services - Team Beheer
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
                  "flex items-center gap-3 px-3 py-3 rounded-lg group relative",
                  isActive
                    ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <Icon className={cn("w-5 h-5", collapsed ? "mx-auto" : "")} />
                {!collapsed && (
                  <>
                    <span className="flex-1 font-medium text-sm">{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Settings */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 space-y-3">
          {/* Theme Toggle */}
          <div className="flex items-center justify-center">
            <ThemeToggle />
          </div>

          {/* User Info */}
          {!collapsed && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {firstName.charAt(0)}{lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {firstName} {lastName}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Manager
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-medium",
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
