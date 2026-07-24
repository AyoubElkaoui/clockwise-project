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

  const navHeading =
    userRank === "admin" ? "BEHEER" : userRank === "manager" ? "MANAGER" : "MENU";

  return (
    <aside
      className="hidden md:flex"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        width: 250,
        zIndex: 50,
        flexDirection: "column",
        padding: "18px 14px",
        borderRight: "1px solid var(--border)",
        background: "var(--panel)",
        overflowY: "auto",
      }}
    >
      {/* ALTUM wordmark */}
      <Link href="/" aria-label="Ga naar dashboard" style={{ padding: "6px 8px 14px", textDecoration: "none" }}>
        <div style={{ display: "flex", gap: ".16em", fontWeight: 800, fontSize: 19, letterSpacing: ".2em", color: "var(--text)", lineHeight: 1 }}>
          <span>A</span><span>L</span><span style={{ color: "var(--brand)" }}>T</span><span>U</span><span>M</span>
        </div>
        <div style={{ height: 3, width: 104, background: "var(--brand)", borderRadius: 2, margin: "5px 0 6px" }} />
        <div style={{ font: "600 8.5px 'Geist Mono', monospace", letterSpacing: ".24em", color: "var(--muted)" }}>TECHNICAL SOLUTIONS</div>
      </Link>

      <div style={{ font: "600 10px 'Geist'", letterSpacing: ".11em", color: "var(--muted)", padding: "8px 10px 6px" }}>{navHeading}</div>

      {/* Navigation */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {menuItems.map((item: any) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "9px 11px",
                borderRadius: 8,
                font: "600 13px 'Geist'",
                textDecoration: "none",
                cursor: "pointer",
                color: isActive ? "var(--accent)" : "var(--text-2)",
                background: isActive ? "var(--accent-weak)" : "transparent",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <Icon style={{ width: 18, height: 18, flex: "none" }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge ? (
                <span style={{ minWidth: 19, height: 19, padding: "0 5px", borderRadius: 99, background: "var(--accent)", color: "#fff", font: "700 10.5px 'Geist Mono', monospace", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 6px 10px" }}>
          <div style={{ width: 34, height: 34, flex: "none", borderRadius: 9, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: "700 12.5px 'Geist'" }}>
            {(firstName.charAt(0) + lastName.charAt(0)).toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ font: "600 13px 'Geist'", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{firstName} {lastName}</div>
            <div style={{ font: "500 11.5px 'Geist'", color: "var(--muted)", textTransform: "capitalize" }}>{userRank || "Medewerker"}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Uitloggen"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 8, border: "1px solid var(--border)", background: "var(--panel-2)", borderRadius: 9, color: "var(--text-2)", font: "600 12px 'Geist'", cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hover)"; e.currentTarget.style.color = "var(--red)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--panel-2)"; e.currentTarget.style.color = "var(--text-2)"; }}
        >
          <LogOut style={{ width: 14, height: 14 }} /> {t("nav.logout")}
        </button>
      </div>
    </aside>
  );
}
