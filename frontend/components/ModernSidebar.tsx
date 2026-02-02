"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  Calendar,
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
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme-context";

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
const getWerknemerMenuItems = (t: (key: string) => string): MenuItem[] => [
  {
    icon: LayoutDashboard,
    label: t("nav.dashboard"),
    href: "/dashboard",
    rank: "all",
  },
  {
    icon: Clock,
    label: t("nav.hours"),
    href: "/tijd-registratie",
    rank: "all",
  },
  {
    icon: List,
    label: t("nav.overview"),
    href: "/uren-overzicht",
    rank: "all",
  },
  { icon: Plane, label: t("nav.vacation"), href: "/vakantie", rank: "all" },
  {
    icon: Calendar,
    label: "Aanwezigheid",
    href: "/aanwezigheidskalender",
    rank: "all",
  },
  {
    icon: Bell,
    label: t("nav.notifications"),
    href: "/notificaties",
    badgeKey: "unreadNotifications",
    rank: "all",
  },
  { icon: User, label: t("nav.account"), href: "/account", rank: "all" },
  { icon: HelpCircle, label: t("nav.faq"), href: "/faq", rank: "all" },
];

const managerMenuItems: MenuItem[] = [
  {
    icon: Shield,
    label: "Manager Dashboard",
    href: "/manager/dashboard",
    rank: "manager",
  },
  { icon: Users, label: "Team Beheren", href: "/admin/users", rank: "manager" },
  {
    icon: CheckCircle2,
    label: "Uren Beoordelen",
    href: "/manager/review-time",
    badgeKey: "pendingApprovals",
    rank: "manager",
  },
  {
    icon: Plane,
    label: "Vakantie Beoordelen",
    href: "/manager/vacation-review",
    rank: "manager",
  },
  {
    icon: CheckCircle2,
    label: "Team Goedkeuringen",
    href: "/manager/approve",
    rank: "manager",
  },
  {
    icon: Plane,
    label: "Vakantie Kalender",
    href: "/manager/vacation",
    rank: "manager",
  },
  { icon: Clock, label: "Team Uren", href: "/manager/hours", rank: "manager" },
];

const adminMenuItems: MenuItem[] = [
  { icon: Shield, label: "Admin Dashboard", href: "/admin", rank: "admin" },
  { icon: Users, label: "Gebruikers", href: "/admin/users", rank: "admin" },
  {
    icon: Building2,
    label: "Bedrijven",
    href: "/admin/companies",
    rank: "admin",
  },
  {
    icon: FolderKanban,
    label: "Projecten",
    href: "/admin/projects",
    rank: "admin",
  },
  {
    icon: CheckCircle2,
    label: "Alle Goedkeuringen",
    href: "/admin/approvals",
    badgeKey: "pendingApprovals",
    rank: "admin",
  },
  {
    icon: Plane,
    label: "Vakantie Aanvragen",
    href: "/admin/vacation",
    rank: "admin",
  },
];

/* ======================
   Component
====================== */
export function ModernSidebar({ 
  collapsed: externalCollapsed, 
  onToggle 
}: { 
  collapsed?: boolean; 
  onToggle?: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();

  const [collapsed, setCollapsed] = useState(externalCollapsed || false);
  const [mounted, setMounted] = useState(false);

  // Sync with external collapsed state
  useEffect(() => {
    if (externalCollapsed !== undefined) {
      setCollapsed(externalCollapsed);
    }
  }, [externalCollapsed]);

  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    onToggle?.(newState);
  };

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userRank, setUserRank] = useState<"" | "manager" | "admin">("");

  const [badges, setBadges] = useState<BadgesState>({
    unreadNotifications: null,
    pendingApprovals: null,
  });

  const loadBadges = useCallback(async () => {
    try {
      const userId = Number(localStorage.getItem("userId") || "1");
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
      // Silently ignore badge loading errors
    }
  }, []);

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
    let items: MenuItem[] = [...getWerknemerMenuItems(t)];

    if (userRank === "admin") {
      items = [...adminMenuItems, ...getWerknemerMenuItems(t)];
    } else if (userRank === "manager") {
      items = [...managerMenuItems, ...getWerknemerMenuItems(t)];
    }

    // Remove duplicates by href
    const uniqueItems = items.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.href === item.href),
    );

    return uniqueItems.map((item) => ({
      ...item,
      badge: item.badgeKey ? badges[item.badgeKey] : null,
    }));
  }, [userRank, badges, t]);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (!mounted) return null;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 transition-all duration-300",
        "hidden md:block", // Hide on mobile, show on tablet+
        collapsed ? "w-20" : "w-64",
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
                  src={theme === "dark" ? "/logo_white.png" : "/logo.png"}
                  alt="TIMR logo"
                  width={350}
                  height={200}
                  priority
                  className="h-20 w-auto object-contain transition"
                />
              ) : (
                <Image
                  src={theme === "dark" ? "/logo_white.png" : "/logo.png"}
                  alt="TIMR logo"
                  width={350}
                  height={200}
                  className="h-20 w-auto object-contain transition"
                />
              )}
            </Link>

            {/* Collapse button */}
            <button
              onClick={toggleCollapsed}
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
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
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
                <div className="w-10 h-10 bg-timr-orange rounded-full flex items-center justify-center text-white font-semibold">
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
              collapsed && "justify-center",
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && (
              <span className="font-medium">{t("nav.logout")}</span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
