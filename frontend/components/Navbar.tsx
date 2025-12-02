"use client";

import { useState, useEffect, JSX } from "react";
import NotificationBell from "./NotificationBell";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  CogIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Calendar, Clock } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Navbar(): JSX.Element {
  const pathname = usePathname();

// ✅ super-robust: case-insensitive + werkt ook voor /FAQ, /faq/iets, /dashboard/faq, etc.
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
    document.cookie =
      "userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "userRank=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/login";
  };

  const getRankBadge = (): JSX.Element => {
    switch (userRank) {
      case "admin":
        return (
          <span className="badge bg-red-600 text-white border-0">Admin</span>
        );
      case "manager":
        return (
          <span className="badge bg-yellow-400 text-black border-0">
            Manager
          </span>
        );
      default:
        return (
          <span className="badge bg-blue-600 text-white border-0">
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
        sticky top-0 z-40 px-6 py-3 shadow-md backdrop-blur-lg transition-colors
        bg-white/80 dark:bg-slate-900/80 
        border-b border-slate-200 dark:border-slate-700
        text-slate-900 dark:text-slate-100
      "
    >
      <div className="flex items-center justify-between">
        {/* === LEFT: Search === */}
        <div className="flex items-center gap-3 flex-1">
          <div className="relative w-64">
            <MagnifyingGlassIcon
              className="
                absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5
                text-slate-400 dark:text-slate-500
              "
            />
            <input
              type="text"
              placeholder="Zoeken..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full pl-10 pr-4 py-2 rounded-xl 
                bg-slate-100 dark:bg-slate-800
                text-slate-800 dark:text-slate-100
                border border-slate-300 dark:border-slate-700
                placeholder-slate-500 dark:placeholder-slate-400
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50
                transition-all
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
          {/* Notifications - verbergen op FAQ */}
          {!hideNotifications && (
  <div className="text-blue-500 dark:text-blue-400">
    <NotificationBell />
  </div>
)}


          {/* Admin panel */}
          {(userRank === "admin" || userRank === "manager") && (
            <button
              className="
                hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                border border-blue-500/40 text-blue-600 dark:text-blue-400
                hover:bg-blue-600/10 dark:hover:bg-blue-600/20
                transition
              "
            >
              <CogIcon className="w-4 h-4" />
              Admin Panel
            </button>
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
                bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                rounded-full w-10 h-10 flex items-center justify-center shadow-md
              "
            >
              <span className="text-sm font-bold">{getUserInitials()}</span>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm leading-tight">
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
              hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm
              border border-red-500/40 text-red-600 dark:text-red-400
              hover:bg-red-600/10 dark:hover:bg-red-600/20
              transition
            "
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Uitloggen
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
    </nav>
  );
}
