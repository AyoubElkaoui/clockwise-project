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
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin", badgeKey: null },
  {
    icon: Users,
    label: "Medewerkers",
    href: "/admin/employees",
    badgeKey: null,
  },
  {
    icon: Clock,
    label: "Tijd Registraties",
    href: "/admin/time-entries",
    badgeKey: null,
  },
  {
    icon: FolderKanban,
    label: "Projecten",
    href: "/admin/projects",
    badgeKey: null,
  },
  {
    icon: CheckCircle2,
    label: "Validaties",
    href: "/admin/validations",
    badgeKey: null,
  },
  { icon: BarChart3, label: "Logs", href: "/admin/logs", badgeKey: null },
  { icon: Settings, label: "Systeem", href: "/admin/system", badgeKey: null },
  {
    icon: Settings,
    label: "Instellingen",
    href: "/admin/settings",
    badgeKey: null,
  },
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
      const pendingCount = entries.filter(
        (e: any) => e.status === "ingeleverd",
      ).length;

      setBadges({
        unreadNotifications: unreadCount > 0 ? unreadCount : null,
        pendingApprovals: pendingCount > 0 ? pendingCount : null,
      });
    } catch {
      // Silently ignore
    }
  };

  const menuItems = adminMenuItems.map((item) => ({
    ...item,
    badge: item.badgeKey ? badges[item.badgeKey] || null : null,
  }));

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (!mounted) return null;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-slate-900 dark:bg-slate-950 border-r border-slate-800 z-50 transition-all duration-300",
        "hidden md:block",
        collapsed ? "w-20" : "w-72",
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo & Admin Badge */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <h1 className="text-sm font-semibold text-white">
                    Admin Panel
                  </h1>
                </div>
                <p className="text-xs text-slate-500">
                  Altum - Beheer
                </p>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md group relative transition-colors",
                  isActive
                    ? "bg-slate-800 text-white border-l-2 border-blue-500"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100 border-l-2 border-transparent",
                )}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", collapsed ? "mx-auto" : "")} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-sm">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
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

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-center">
            <ThemeToggle />
          </div>

          {!collapsed && (
            <div className="p-3 bg-slate-800 rounded-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                  {firstName.charAt(0)}
                  {lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">
                    {firstName} {lastName}
                  </p>
                  <p className="text-xs text-slate-400">
                    Administrator
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:bg-slate-800 hover:text-red-400 rounded-md transition-colors",
              collapsed && "justify-center",
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="text-sm">Uitloggen</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
