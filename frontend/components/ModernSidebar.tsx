"use client";
import React from "react";

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
import { getMyEntries } from "@/lib/api/workflowApi";
import HoursMonthCalendar, { type CalendarEntry } from "@/components/HoursMonthCalendar";
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
type NavSection = { heading: string; items: MenuItem[] };

// Nav exact volgens het Altum design: gecureerd + gegroepeerd per rol (geen dumping).
const werknemerItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", rank: "all" },
  { icon: Clock, label: "Uren registreren", href: "/tijd-registratie", rank: "all" },
  { icon: List, label: "Uren overzicht", href: "/uren-overzicht", rank: "all" },
  { icon: Plane, label: "Vakantie", href: "/vakantie", rank: "all" },
  { icon: User, label: "Mijn account", href: "/account", rank: "all" },
  { icon: HelpCircle, label: "FAQ", href: "/faq", rank: "all" },
];

const managerItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Manager dashboard", href: "/manager/dashboard", rank: "manager" },
  { icon: Users, label: "Mijn team", href: "/manager/team", rank: "manager" },
  { icon: CheckCircle2, label: "Uren beoordelen", href: "/manager/review-time", rank: "manager", badgeKey: "pendingApprovals" },
  { icon: Clock, label: "Team uren", href: "/manager/hours", rank: "manager" },
  { icon: CalendarRange, label: "Planning", href: "/manager/planning", rank: "manager" },
  { icon: FolderKanban, label: "Project-toewijzing", href: "/manager/project-toewijzing", rank: "manager" },
  { icon: Plane, label: "Vakantie beoordelen", href: "/manager/vacation-review", rank: "manager" },
  { icon: BarChart3, label: "Rapportages", href: "/manager/rapportages", rank: "manager" },
  { icon: ListChecks, label: "Uurcodes", href: "/manager/uurcodes", rank: "manager" },
  { icon: CalendarDays, label: "Jaarkalender", href: "/manager/jaarkalender", rank: "manager" },
];

const adminItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Beheer dashboard", href: "/admin", rank: "admin" },
  { icon: Users, label: "Gebruikers", href: "/admin/users", rank: "admin" },
  { icon: Calendar, label: "Feestdagen", href: "/admin/holidays", rank: "admin" },
  { icon: Settings, label: "Instellingen", href: "/admin/settings", rank: "admin" },
];

const persoonlijkItems: MenuItem[] = [
  { icon: Clock, label: "Uren registreren", href: "/tijd-registratie", rank: "all" },
  { icon: User, label: "Mijn account", href: "/account", rank: "all" },
];

const werknemerSections: NavSection[] = [{ heading: "MENU", items: werknemerItems }];
const managerSections: NavSection[] = [
  { heading: "MANAGER", items: managerItems },
  { heading: "PERSOONLIJK", items: persoonlijkItems },
];
const adminSections: NavSection[] = [
  { heading: "BEHEER", items: adminItems },
  { heading: "MANAGER", items: managerItems },
  { heading: "PERSOONLIJK", items: persoonlijkItems },
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
  const [calMonth, setCalMonth] = useState<Date>(() => new Date());
  const [calEntries, setCalEntries] = useState<CalendarEntry[]>([]);
  const loadCalendar = React.useCallback(async (m: Date) => {
    try {
      const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const from = new Date(m.getFullYear(), m.getMonth(), 1); from.setDate(from.getDate() - 7);
      const to = new Date(m.getFullYear(), m.getMonth() + 1, 0); to.setDate(to.getDate() + 7);
      const rows = await getMyEntries(iso(from), iso(to));
      setCalEntries(rows.map((e: any) => ({ datum: e.datum, aantal: Number(e.aantal) || 0, status: e.status })));
    } catch { setCalEntries([]); }
  }, []);
  useEffect(() => { loadCalendar(calMonth); }, [calMonth, loadCalendar]);
  useEffect(() => {
    const h = () => loadCalendar(calMonth);
    window.addEventListener("clockd:hours-changed", h);
    return () => window.removeEventListener("clockd:hours-changed", h);
  }, [calMonth, loadCalendar]);
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

  const navSections = useMemo(() => {
    const sections =
      userRank === "admin" ? adminSections : userRank === "manager" ? managerSections : werknemerSections;
    return sections.map((section) => ({
      heading: section.heading,
      items: section.items.map((item) => ({
        ...item,
        badge: item.badgeKey ? badges[item.badgeKey] : null,
      })),
    }));
  }, [userRank, badges]);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (!mounted) return null;

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

      {/* Navigation — gegroepeerd per rol, exact volgens design */}
      <nav style={{ display: "flex", flexDirection: "column" }}>
        {navSections.map((section, si) => (
          <div key={section.heading}>
            <div style={{ font: "600 10px 'Geist'", letterSpacing: ".11em", color: "var(--muted)", padding: si === 0 ? "8px 10px 6px" : "14px 10px 6px" }}>
              {section.heading}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {section.items.map((item: any) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={`${section.heading}-${item.href}`}
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
            </div>
          </div>
        ))}
      </nav>

      {/* Urenkalender: uren per dag/week met status, klik = naar die dag in Uren registreren */}
      <div style={{ marginTop: 14 }}>
        <HoursMonthCalendar
          compact
          month={calMonth}
          entries={calEntries}
          onPrevMonth={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
          onNextMonth={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
          onSelectDay={(d) => {
            const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            window.dispatchEvent(new CustomEvent("clockd:goto-date", { detail: date }));
            router.push(`/tijd-registratie?date=${date}`);
          }}
        />
      </div>

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
