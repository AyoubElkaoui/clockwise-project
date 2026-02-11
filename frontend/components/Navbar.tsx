"use client";

import { useState, useEffect, JSX } from "react";
import NotificationBell from "./NotificationBell";
import Image from "next/image";
import { MobileNav } from "./MobileNav";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Calendar, Clock, Globe, Search } from "lucide-react";
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

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

  const getCurrentTimeStr = (): string =>
    currentTime.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/zoeken?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
    <nav
      className="
        sticky top-0 z-40 px-3 md:px-6 py-2 md:py-3 shadow-md transition-colors w-full
        bg-white dark:bg-slate-900
        md:bg-white/80 md:dark:bg-slate-900/80 md:backdrop-blur-lg
        border-b border-slate-200 dark:border-slate-700
        text-slate-900 dark:text-slate-100
      "
    >
      <div className="flex items-center justify-between gap-2 md:gap-4">
        {/* === LEFT: Hamburger (mobile) + Logo (desktop) + Search (desktop) === */}
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          {/* Hamburger menu for mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            ) : (
              <Bars3Icon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            )}
          </button>

          {/* Company Logo - desktop only */}
          <Image
            src="/image.png"
            alt="CLOCKD"
            width={130}
            height={26}
            className="hidden md:block flex-shrink-0"
            priority
          />

          {/* Search bar - desktop only */}
          <div className="relative hidden md:block flex-1 max-w-lg">
            <MagnifyingGlassIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500"
            />
            <input
              type="text"
              placeholder={t("common.search") + "..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="
                w-full pl-10 pr-4 py-2 rounded-xl text-sm
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

        {/* === CENTER: Date & Time (xl only) === */}
        <div className="hidden xl:flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <span className="text-slate-700 dark:text-slate-300">
              {getCurrentDate()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span className="text-slate-700 dark:text-slate-300">
              {getCurrentTimeStr()}
            </span>
          </div>
        </div>

        {/* === RIGHT SIDE === */}
        <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
          {/* Mobile search toggle */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Search className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>

          {/* Dark Mode Toggle */}
          <ThemeToggle />

          {/* Language Switcher */}
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === "nl" ? "en" : "nl")
            }
            className="
              hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
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
            <span>{i18n.language === "nl" ? "NL" : "EN"}</span>
          </button>

          {/* Mobile language - icon only */}
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === "nl" ? "en" : "nl")
            }
            className="sm:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={i18n.language === "nl" ? "Switch to English" : "Schakel naar Nederlands"}
          >
            <Globe className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>

          {/* Notifications */}
          {!hideNotifications && (
            <div className="text-blue-500 dark:text-blue-400">
              <NotificationBell />
            </div>
          )}

          {/* User Profile - desktop only */}
          <div
            className="
              hidden md:flex items-center gap-3 rounded-xl px-4 py-2
              bg-slate-100 dark:bg-slate-800
              border border-slate-300 dark:border-slate-700
            "
          >
            <div
              className="
                bg-[#3563E9] dark:bg-[#3563E9]
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

          {/* Logout - desktop only */}
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
        </div>
      </div>

      {/* Mobile search bar - expandable */}
      {mobileSearchOpen && (
        <div className="md:hidden pt-2 pb-1">
          <div className="relative">
            <MagnifyingGlassIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            />
            <input
              type="text"
              placeholder={t("common.search") + "..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              autoFocus
              className="
                w-full pl-9 pr-3 py-2 rounded-lg text-sm
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
      )}
    </nav>

    {/* Mobile Navigation Drawer - outside nav to avoid z-index stacking context */}
    <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
