"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  X,
  LayoutDashboard,
  Clock,
  List,
  Plane,
  Bell,
  User,
  Settings,
  HelpCircle,
  Shield,
  Users,
  CheckCircle2,
  LogOut,
  Building2,
  FolderKanban,
  BarChart3,
  Calendar,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import Image from "next/image";

type MenuItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number | null;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [userRank, setUserRank] = useState<"" | "manager" | "admin">("");
  const [userName, setUserName] = useState("");
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setUserRank((localStorage.getItem("userRank") as any) || "");
    const firstName = localStorage.getItem("firstName") || "";
    const lastName = localStorage.getItem("lastName") || "";
    setUserName(`${firstName} ${lastName}`.trim() || "Gebruiker");
  }, []);

  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimating(true);
        });
      });
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const getWerknemerMenuItems = useCallback((): MenuItem[] => [
    { icon: LayoutDashboard, label: t("nav.dashboard"), href: "/dashboard" },
    { icon: Clock, label: t("nav.hours"), href: "/tijd-registratie" },
    { icon: List, label: t("nav.overview"), href: "/uren-overzicht" },
    { icon: Plane, label: t("nav.vacation"), href: "/vakantie" },
    { icon: Bell, label: t("nav.notifications"), href: "/notificaties" },
    { icon: User, label: t("nav.account"), href: "/account" },
    { icon: Settings, label: t("nav.settings"), href: "/instellingen" },
    { icon: HelpCircle, label: t("nav.faq"), href: "/faq" },
  ], [t]);

  const managerMenuItems: MenuItem[] = useMemo(() => [
    { icon: Shield, label: "Manager Dashboard", href: "/manager/dashboard" },
    { icon: Users, label: "Mijn Team", href: "/manager/team" },
    { icon: CheckCircle2, label: "Goedkeuringen", href: "/manager/approve" },
    { icon: Clock, label: "Team Uren", href: "/manager/hours" },
    { icon: Calendar, label: "Jaarkalender", href: "/manager/jaarkalender" },
    { icon: FolderPlus, label: "Project Toewijzing", href: "/manager/project-toewijzing" },
    { icon: Plane, label: "Vakantie Aanvragen", href: "/manager/vacation" },
  ], []);

  const adminMenuItems: MenuItem[] = useMemo(() => [
    { icon: Shield, label: "Admin Dashboard", href: "/admin" },
    { icon: Users, label: "Medewerkers", href: "/admin/employees" },
    { icon: Clock, label: "Tijd Registraties", href: "/admin/time-entries" },
    { icon: FolderKanban, label: "Projecten", href: "/admin/projects" },
    { icon: Building2, label: "Bedrijven", href: "/admin/companies" },
    { icon: CheckCircle2, label: "Validaties", href: "/admin/validations" },
    { icon: BarChart3, label: "Logs", href: "/admin/logs" },
    { icon: Settings, label: "Systeem", href: "/admin/system" },
  ], []);

  const menuSections = useMemo((): MenuSection[] => {
    const sections: MenuSection[] = [];

    if (userRank === "admin") {
      sections.push({ title: "Admin", items: adminMenuItems });
      sections.push({ title: "Manager", items: managerMenuItems });
    } else if (userRank === "manager") {
      sections.push({ title: "Manager", items: managerMenuItems });
    }

    sections.push({
      title: userRank ? "Medewerker" : "",
      items: getWerknemerMenuItems(),
    });

    return sections;
  }, [userRank, t, adminMenuItems, managerMenuItems, getWerknemerMenuItems]);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
    onClose();
  };

  const handleNavClick = (href: string) => {
    router.push(href);
    onClose();
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden transition-opacity duration-300",
          animating ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl z-50 md:hidden transition-transform duration-300 ease-out",
          animating ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <Image
                src="/logo.png"
                alt="TIMR logo"
                width={120}
                height={40}
                className="h-7 w-auto dark:hidden"
              />
              <Image
                src="/logo_white.png"
                alt="TIMR logo"
                width={120}
                height={40}
                className="h-7 w-auto hidden dark:block"
              />
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">
                  {userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                  {userName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {userRank === "admin"
                    ? "Administrator"
                    : userRank === "manager"
                    ? "Manager"
                    : "Medewerker"}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-3 overflow-y-auto">
            {menuSections.map((section, sectionIndex) => (
              <div key={section.title || sectionIndex}>
                {/* Section divider (not before first section) */}
                {sectionIndex > 0 && (
                  <div className="mx-4 my-2 border-t border-slate-200 dark:border-slate-700" />
                )}

                {/* Section header */}
                {section.title && (
                  <p className="px-5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {section.title}
                  </p>
                )}

                {/* Section items */}
                <div className="px-2 space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <button
                        key={item.href}
                        onClick={() => handleNavClick(item.href)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm",
                          isActive
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-blue-500 dark:text-blue-400")} />
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm"
            >
              <LogOut className="w-[18px] h-[18px]" />
              <span className="font-medium">{t("nav.logout")}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
