"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderKanban,
  LayoutDashboard,
  List,
  LogOut,
  Plane,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react";

import { ThemeToggle } from "./ui/theme-toggle";
import { MiniCalendar } from "./MiniCalendar";
import { cn } from "@/lib/utils";
import { getActivities, getTimeEntries } from "@/lib/api";
import { HelpCircle } from "lucide-react";


/* ======================
   Types
====================== */
type BadgeKey = "unreadNotifications" | "pendingApprovals";

type MenuItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  badgeKey?: BadgeKey | null;
  rank: "all" | "manager" | "admin";
};

type BadgesState = Record<BadgeKey, number | null>;

/* ======================
   Menu items
====================== */
const werknemerMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/", rank: "all" },
  { icon: Clock, label: "Uren Registreren", href: "/tijd-registratie", rank: "all" },
  { icon: List, label: "Uren Overzicht", href: "/uren-overzicht", rank: "all" },
  { icon: Plane, label: "Vakantie", href: "/vakantie", rank: "all" },
  {
    icon: Bell,
    label: "Notificaties",
    href: "/notificaties",
    badgeKey: "unreadNotifications",
    rank: "all",
  },
  { icon: User, label: "Mijn Account", href: "/account", rank: "all" },
  { icon: Settings, label: "Instellingen", href: "/instellingen", rank: "all" },
  { icon: HelpCircle, label: "FAQ", href: "/faq", rank: "all" },
];

const managerMenuItems: MenuItem[] = [
  { icon: Shield, label: "Manager Dashboard", href: "/manager-dashboard", rank: "manager" },
  { icon: Users, label: "Team Beheren", href: "/admin/users", rank: "manager" },
  {
    icon: CheckCircle2,
    label: "Goedkeuringen",
    href: "/uren-overzicht",
    badgeKey: "pendingApprovals",
    rank: "manager",
  },
];

const adminMenuItems: MenuItem[] = [
  { icon: Shield, label: "Admin Dashboard", href: "/admin-dashboard", rank: "admin" },
  { icon: Users, label: "Gebruikers", href: "/admin/users", rank: "admin" },
  { icon: Building2, label: "Bedrijven", href: "/admin/companies", rank: "admin" },
  { icon: FolderKanban, label: "Projecten", href: "/admin/projects", rank: "admin" },
  {
    icon: CheckCircle2,
    label: "Goedkeuringen",
    href: "/uren-overzicht",
    badgeKey: "pendingApprovals",
    rank: "admin",
  },
];

/* ======================
   Component
====================== */
export function ModernSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userRank, setUserRank] = useState<"" | "manager" | "admin">("");

  const [badges, setBadges] = useState<BadgesState>({
    unreadNotifications: null,
    pendingApprovals: null,
  });

  const userId = 1; // TODO: via auth context

  const loadBadges = useCallback(async () => {
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
  }, [userId]);

  useEffect(() => {
    setMounted(true);

    setFirstName(localStorage.getItem("firstName") || "");
    setLastName(localStorage.getItem("lastName") || "");
    setUserRank((localStorage.getItem("userRank") as any) || "");

    loadBadges();

    const interval = setInterval(loadBadges, 15000);
    return () => clearInterval(interval);
  }, [loadBadges]);

  const menuItems = useMemo(() => {
    let items: MenuItem[] = [...werknemerMenuItems];

    if (userRank === "admin") {
      items = [...adminMenuItems, ...werknemerMenuItems];
    } else if (userRank === "manager") {
      items = [...managerMenuItems, ...werknemerMenuItems];
    }

    return items.map((item) => ({
      ...item,
      badge: item.badgeKey ? badges[item.badgeKey] : null,
    }));
  }, [userRank, badges]);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (!mounted) return null;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo & Company */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            {/* LOGO -> klikbaar naar dashboard */}
            <Link
              href="/"
              className="flex items-center gap-3 focus:outline-none"
              aria-label="Ga naar dashboard"
            >
              {!collapsed ? (
                <Image
                  src="/logo.png"
                  alt="Clockwise logo"
                  width={140}
                  height={40}
                  priority
                  className="h-10 w-auto object-contain transition dark:grayscale dark:invert dark:contrast-150"
                />
              ) : (
                <Image
                  src="/logo.png"
                  alt="Clockwise logo small"
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain dark:invert"
                />
              )}
            </Link>

            {/* Collapse button */}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
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
          {menuItems.map((item: any) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg group relative",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <Icon className={cn("w-5 h-5", collapsed && "mx-auto")} />

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

          {!collapsed && (
            <div className="pt-4">
              <MiniCalendar />
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-center">
            <ThemeToggle />
          </div>

          {!collapsed && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {firstName.charAt(0)}
                  {lastName.charAt(0)}
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

          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg",
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
