"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  FolderKanban,
  LayoutDashboard,
  List,
  ListChecks,
  LogOut,
  Plane,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  User,
  UserCheck,
  Users,
} from "lucide-react";

import { ThemeToggle } from "./ui/theme-toggle";
import { MiniCalendar } from "./MiniCalendar";
import { cn } from "@/lib/utils";
import { getActivities, getTimeEntries } from "@/lib/api";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import Image from "next/image";

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
  { icon: Shield,       label: "Manager Dashboard",   href: "/manager/dashboard",          rank: "manager" },
  { icon: Users,        label: "Mijn Team",           href: "/manager/team",               rank: "manager" },
  { icon: CheckCircle2, label: "Uren Beoordelen",     href: "/manager/review-time",        rank: "manager", badgeKey: "pendingApprovals" },
  { icon: CheckCircle2, label: "Goedkeuringen",       href: "/manager/approve",            rank: "manager" },
  { icon: Plane,        label: "Vakantie Beoordelen", href: "/manager/vacation-review",    rank: "manager" },
  { icon: Plane,        label: "Vakantie Kalender",   href: "/manager/vacation",           rank: "manager" },
  { icon: Clock,        label: "Team Uren",           href: "/manager/hours",              rank: "manager" },
  { icon: Clock,        label: "Tijdregistratie",     href: "/manager/tijd-registratie",   rank: "manager" },
  { icon: CalendarRange,label: "Planning",            href: "/manager/planning",           rank: "manager" },
  { icon: CalendarDays, label: "Jaarkalender",        href: "/manager/jaarkalender",       rank: "manager" },
  { icon: FolderKanban, label: "Project Toewijzing",  href: "/manager/project-toewijzing", rank: "manager" },
  { icon: ListChecks,   label: "Uurcodes",            href: "/manager/uurcodes",           rank: "manager" },
  { icon: Bell,         label: "Notificaties",        href: "/manager/notificaties",       rank: "manager" },
  { icon: Settings,     label: "Instellingen",        href: "/manager/settings",           rank: "manager" },
];

const adminMenuItems: MenuItem[] = [
  { icon: Shield,       label: "Admin Dashboard",    href: "/admin",               rank: "admin" },
  { icon: Users,        label: "Gebruikers",         href: "/admin/users",         rank: "admin" },
  { icon: UserCheck,    label: "Medewerkers",        href: "/admin/employees",     rank: "admin" },
  { icon: Building2,    label: "Bedrijven",          href: "/admin/companies",     rank: "admin" },
  { icon: FolderKanban, label: "Projecten",          href: "/admin/projects",      rank: "admin" },
  { icon: CheckCircle2, label: "Alle Goedkeuringen", href: "/admin/approvals",     rank: "admin", badgeKey: "pendingApprovals" },
  { icon: Plane,        label: "Vakantie Aanvragen", href: "/admin/vacation",      rank: "admin" },
  { icon: FileText,     label: "Tijdregistraties",   href: "/admin/time-entries",  rank: "admin" },
  { icon: ShieldCheck,  label: "Validaties",         href: "/admin/validations",   rank: "admin" },
  { icon: Activity,     label: "Logs",               href: "/admin/logs",          rank: "admin" },
  { icon: BarChart3,    label: "Rapporten",          href: "/admin/reports",       rank: "admin" },
  { icon: Server,       label: "Systeem",            href: "/admin/system",        rank: "admin" },
  { icon: Settings,     label: "Instellingen",       href: "/admin/settings",      rank: "admin" },
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
        "fixed left-0 top-0 h-screen bg-[var(--panel)] border-r border-[var(--border)] z-50 transition-all duration-300",
        "hidden md:block",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center focus:outline-none"
              aria-label="Ga naar dashboard"
            >
              {/* Light theme: dark Altum wordmark; dark theme: white Altum wordmark */}
              <Image
                src="/Altum-kaal-Photoroom.png"
                alt="ALTUM"
                width={120}
                height={32}
                className={cn("block dark:hidden object-contain w-auto", collapsed ? "h-6" : "h-7")}
                priority
              />
              <Image
                src="/image-preview-Photoroom.png"
                alt="ALTUM"
                width={120}
                height={32}
                className={cn("hidden dark:block object-contain w-auto", collapsed ? "h-6" : "h-7")}
                priority
              />
            </Link>

            {!collapsed && (
              <button
                onClick={toggleCollapsed}
                className="p-1.5 rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"
                aria-label="Toggle sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              onClick={toggleCollapsed}
              className="mt-3 w-full flex justify-center p-1.5 rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"
              aria-label="Toggle sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {menuItems.map((item: any) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg group relative transition-colors text-sm font-medium",
                  isActive
                    ? "bg-[var(--accent-weak)] text-[var(--accent)]"
                    : "text-[var(--text-2)] hover:bg-[var(--hover)] hover:text-[var(--text)]",
                )}
              >
                <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", collapsed && "mx-auto")} />

                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[11px] font-semibold text-white bg-[var(--red)] rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}

                {collapsed && item.badge && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--red)] rounded-full" />
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
        <div className="px-3 py-3 border-t border-[var(--border)] space-y-2">
          <div className="flex items-center justify-center">
            <ThemeToggle />
          </div>

          {!collapsed && (
            <div className="p-3 rounded-lg bg-[var(--panel-2)] border border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
                  style={{ background: "var(--accent)" }}
                >
                  {firstName.charAt(0)}
                  {lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">
                    {firstName} {lastName}
                  </p>
                  <p className="text-xs text-[var(--muted)] capitalize">
                    {userRank || "Medewerker"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--red-weak)] hover:text-[var(--red)] transition-colors",
              collapsed && "justify-center",
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>{t("nav.logout")}</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
