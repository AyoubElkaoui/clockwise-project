"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import Image from "next/image";

type MenuItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number | null;
  rank: "all" | "manager" | "admin";
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

  useEffect(() => {
    setUserRank((localStorage.getItem("userRank") as any) || "");
    const firstName = localStorage.getItem("firstName") || "";
    const lastName = localStorage.getItem("lastName") || "";
    setUserName(`${firstName} ${lastName}`.trim() || "Gebruiker");
  }, []);

  const getWerknemerMenuItems = (): MenuItem[] => [
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
      icon: Bell,
      label: t("nav.notifications"),
      href: "/notificaties",
      rank: "all",
    },
    { icon: User, label: t("nav.account"), href: "/account", rank: "all" },
    {
      icon: Settings,
      label: t("nav.settings"),
      href: "/instellingen",
      rank: "all",
    },
    { icon: HelpCircle, label: t("nav.faq"), href: "/faq", rank: "all" },
  ];

  const managerMenuItems: MenuItem[] = [
    {
      icon: Shield,
      label: "Manager Dashboard",
      href: "/manager/dashboard",
      rank: "manager",
    },
    { icon: Users, label: "Mijn Team", href: "/manager/team", rank: "manager" },
    {
      icon: CheckCircle2,
      label: "Goedkeuringen",
      href: "/manager/approve",
      rank: "manager",
    },
    { icon: Clock, label: "Team Uren", href: "/manager/hours", rank: "manager" },
    {
      icon: Plane,
      label: "Vakantie Aanvragen",
      href: "/manager/vacation",
      rank: "manager",
    },
  ];

  const menuItems = useMemo(() => {
    let items: MenuItem[] = [...getWerknemerMenuItems()];

    if (userRank === "admin") {
      items = [...managerMenuItems, ...getWerknemerMenuItems()];
    } else if (userRank === "manager") {
      items = [...managerMenuItems, ...getWerknemerMenuItems()];
    }

    // Remove duplicates
    const uniqueItems = items.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.href === item.href)
    );

    return uniqueItems;
  }, [userRank, t]);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
    onClose();
  };

  const handleNavClick = (href: string) => {
    router.push(href);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 md:hidden transform transition-transform duration-300">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <Image
                src="/logo.png"
                alt="TIMR logo"
                width={120}
                height={40}
                className="h-8 w-auto dark:hidden"
              />
              <Image
                src="/logo_white.png"
                alt="TIMR logo"
                width={120}
                height={40}
                className="h-8 w-auto hidden dark:block"
              />
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
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

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">{t("nav.logout")}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
