"use client";

import { useState, useEffect, JSX } from "react";
import Image from "next/image";
import NotificationBell from "./NotificationBell";
import { MobileNav } from "./MobileNav";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Calendar, Clock, Globe } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "./ui/theme-toggle";

export default function Navbar(): JSX.Element {
  const pathname = usePathname();
  const { t, i18n } = useTranslation();

  // super-robust: case-insensitive + werkt ook voor /FAQ, /faq/iets, /dashboard/faq, etc.
  const cleanPath = (pathname || "").toLowerCase();
  const hideNotifications =
    cleanPath === "/faq" ||
    cleanPath.startsWith("/faq/") ||
    cleanPath.endsWith("/faq") ||
    cleanPath.includes("/faq/");

  const [userName, setUserName] = useState<string>("");
  const [userRank, setUserRank] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const firstName = localStorage.getItem("firstName") || "";
    const lastName = localStorage.getItem("lastName") || "";
    const rank = localStorage.getItem("userRank") || "";
    setUserName(`${firstName} ${lastName}`.trim() || "Gebruiker");
    setUserRank(rank);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = (): void => {
    localStorage.clear();
    document.cookie = "userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "userRank=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/login";
  };

  const getRankBadge = (): JSX.Element => {
    switch (userRank) {
      case "admin":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
            Admin
          </span>
        );
      case "manager":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
            Manager
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            Medewerker
          </span>
        );
    }
  };

  const getUserInitials = (): string =>
    userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  const getCurrentDate = (): string =>
    currentTime.toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const getCurrentTime = (): string =>
    currentTime.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <nav
      className="
        sticky top-0 z-40 px-3 md:px-6 py-2 md:py-3 shadow-md backdrop-blur-lg transition-colors
        bg-white/80 dark:bg-slate-900/80
        border-b border-slate-200 dark:border-slate-700
        text-slate-900 dark:text-slate-100
      "
    >
      <div className="flex items-center justify-between gap-2 md:gap-4">
        {/* === LEFT: Hamburger + Search === */}
        <div className="flex items-center gap-2 flex-1 max-w-xs lg:max-w-md">
          {/* Hamburger menu for mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Bars3Icon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          </button>

          <div className="relative flex-1">
            <MagnifyingGlassIcon
              className="
                absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5
                text-slate-400 dark:text-slate-500
              "
            />
            <input
              type="text"
              placeholder={t("common.search") + "..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  window.location.href = `/zoeken?q=${encodeURIComponent(searchQuery)}`;
                }
              }}
              className="
                w-full pl-8 md:pl-10 pr-3 md:pr-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-sm
                bg-slate-100 dark:bg-slate-800
                text-slate-800 dark:text-slate-100
                border border-slate-300 dark:border-slate-700
                placeholder-slate-500 dark:placeholder-slate-400
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50
                outline-none transition
              "
            />
          </div>
        </div>

        {/* === CENTER: Date & Time === */}
        {!isMobile && (
          <div className="hidden xl:flex items-center space-x-6 flex-1 justify-center text-sm">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="text-slate-700 dark:text-slate-300">
                {getCurrentDate()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-slate-700 dark:text-slate-300">
                {getCurrentTime()}
              </span>
            </div>
          </div>
        )}

        {/* === RIGHT SIDE === */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          {/* Altum Logo */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500">Powered by</span>
            <Image
              src="/altum-logo.png"
              alt="Altum"
              width={500}
              height={120}
              className="h-20 w-auto dark:hidden"
            />
            <Image
              src="/altum-logo-white.png"
              alt="Altum"
              width={500}
              height={120}
              className="h-20 w-auto hidden dark:block"
            />
          </div>

          {/* Dark Mode Toggle */}
          <ThemeToggle />

          {/* Language Switcher */}
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === "nl" ? "en" : "nl")
            }
            className="
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              bg-slate-100 dark:bg-slate-800
              text-slate-700 dark:text-slate-300
              hover:bg-slate-200 dark:hover:bg-slate-700
              border border-slate-300 dark:border-slate-600
              transition-all duration-200
            "
            title={
              i18n.language === "nl"
                ? "Switch to English"
                : "Schakel naar Nederlands"
            }
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">
              {i18n.language === "nl" ? "NL" : "EN"}
            </span>
          </button>

          {/* Notifications - verbergen op FAQ */}
          {!hideNotifications && (
            <div className="text-blue-500 dark:text-blue-400">
              <NotificationBell />
            </div>
          )}

          {/* User Profile */}
          <div
            className="
              hidden md:flex items-center gap-3 rounded-xl px-4 py-2
              bg-slate-100 dark:bg-slate-800
              border border-slate-300 dark:border-slate-700
            "
          >
            <div
              className="
                bg-timr-orange dark:bg-timr-orange
                text-white
                rounded-full w-10 h-10 flex items-center justify-center
              "
            >
              <span className="text-sm font-bold">{getUserInitials()}</span>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight">
                {userName}
              </p>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                {getRankBadge()}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="
              hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
              bg-red-50 dark:bg-red-950/30
              border border-red-200 dark:border-red-800
              text-red-600 dark:text-red-400
              hover:bg-red-100 dark:hover:bg-red-900/50
              transition-all duration-200
            "
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            {t("nav.logout")}
          </button>

          {/* Mobile toggle */}
          <button
            className="
              md:hidden text-slate-700 dark:text-slate-300
              hover:text-blue-500 transition
            "
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </nav>
  );
}
