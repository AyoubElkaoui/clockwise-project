"use client";
import React, { useState, useEffect, JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dayjs, { Dayjs } from "dayjs";
import { TimeEntry } from "@/lib/types";
import NotificationFeed from "./NotificationFeed";
import { useTranslation } from "react-i18next";
import {
  HomeIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  ChartBarIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface SidebarProps {
  currentMonth: string | Dayjs;
  timeEntries: TimeEntry[];
  className?: string;
}

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export default function Sidebar({
  currentMonth,
  timeEntries,
  className = "",
}: SidebarProps): JSX.Element {
  const { t } = useTranslation();
  const pathname = usePathname();
  const usedMonth =
    typeof currentMonth === "string"
      ? dayjs(currentMonth)
      : dayjs.isDayjs(currentMonth)
        ? currentMonth
        : dayjs().startOf("month");

  const [userName, setUserName] = useState<string>("");
  const [userInitials, setUserInitials] = useState<string>("");
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);

  useEffect(() => {
    const firstName = localStorage.getItem("firstName") || "";
    const lastName = localStorage.getItem("lastName") || "";
    const fullName = `${firstName} ${lastName}`.trim();
    setUserName(fullName || "Gebruiker");
    setUserInitials(
      fullName
        .split(" ")
        .map((n) => n[0] || "")
        .join("")
        .substring(0, 2),
    );
  }, []);

  const navigationItems: NavigationItem[] = [
    {
      href: "/dashboard",
      label: t("nav.dashboard"),
      icon: HomeIcon,
      description: t("nav.dashboardDescription"),
    },
    {
      href: "/overview",
      label: t("nav.overview"),
      icon: ChartBarIcon,
      description: t("nav.overviewDescription"),
    },
    {
      href: "/review-time",
      label: t("nav.reviewTime", "Uren Beoordelen"),
      icon: CheckCircleIcon,
      description: t("nav.reviewTimeDescription", "Beoordeel ingediende uren"),
    },
    {
      href: "/leave-booking",
      label: t("nav.vacation"),
      icon: CalendarDaysIcon,
      description: t("nav.vacationDescription"),
    },
    {
      href: "/profile",
      label: t("nav.account"),
      icon: UserCircleIcon,
      description: t("nav.accountDescription"),
    },
  ];

  const handleLogout = () => {
    localStorage.clear();
    document.cookie = "userId=; path=/; max-age=0";
    window.location.href = "/login";
  };

  const calculateHours = (entry: TimeEntry): number => {
    if (!entry.startTime || !entry.endTime) return 0;
    try {
      const start = dayjs(entry.startTime);
      const end = dayjs(entry.endTime);
      const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
      return diffMin > 0 ? Math.round((diffMin / 60) * 4) / 4 : 0;
    } catch {
      return 0;
    }
  };

  const formatHours = (hours: number): string => {
    if (hours === 0) return "0u";
    const whole = Math.floor(hours);
    const fraction = hours - whole;
    if (fraction === 0.25) return `${whole}¼u`;
    if (fraction === 0.5) return `${whole}½u`;
    if (fraction === 0.75) return `${whole}¾u`;
    return `${whole}u`;
  };

  const startOfMonth = usedMonth.startOf("month");
  const endOfMonth = usedMonth.endOf("month");
  const daysInMonth = endOfMonth.date();
  const firstDayOfWeek = startOfMonth.day();

  const calendarDays = [];
  const mondayFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  for (let i = 0; i < mondayFirstDay; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);

  const getHoursForDay = (day: number): number => {
    const date = usedMonth.date(day);
    const dayStr = date.format("YYYY-MM-DD");
    const dayEntries = timeEntries.filter(
      (entry) => entry.startTime && entry.startTime.startsWith(dayStr),
    );
    return dayEntries.reduce(
      (total, entry) => total + calculateHours(entry),
      0,
    );
  };

  return (
    <>
      {/* Hamburger menu mobiel */}
      <div className="sm:hidden flex justify-between items-center p-4 bg-black border-b border-gray-800">
        <div className="text-white font-bold">{t("nav.menu")}</div>
        <button
          className="text-white text-2xl"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          {showMobileMenu ? "✕" : "☰"}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
                bg-black border-r border-gray-800 flex flex-col h-screen text-gray-200
                ${showMobileMenu ? "fixed top-0 left-0 w-64 z-50 shadow-lg" : "hidden sm:flex sm:w-64"}

            `}
      >
        {/* User Header */}
        <div className="p-6 border-b border-gray-800 bg-black">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-blue-600/30 rounded-2xl flex items-center justify-center shadow-lg border border-blue-500/40">
                <span className="text-lg font-bold text-blue-400">
                  {userInitials}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-black"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg leading-tight truncate">
                {userName}
              </h3>
              <p className="text-blue-400 text-sm mt-1">Elmar Services</p>
            </div>
          </div>
        </div>

        {/* Navigatie */}
        <nav className="p-4 border-b border-gray-800 bg-black flex-1 overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <HomeIcon className="w-3 h-3 text-blue-400" />
            {t("nav.section")}
          </h3>
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl
                                        ${
                                          isActive
                                            ? "bg-blue-100 text-white shadow-md"
                                            : "text-gray-400 hover:bg-gray-800 hover:text-blue-400"
                                        }`}
                >
                  <Icon className="w-5 h-5 text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-semibold text-sm truncate ${isActive ? "text-white" : "text-blue-400"}`}
                    >
                      {item.label}
                    </div>
                    <div
                      className={`text-xs truncate ${isActive ? "text-blue-200" : "text-gray-500"}`}
                    >
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Notificaties */}
          <div className="mt-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <BellIcon className="w-3 h-3 text-blue-400" />
              {t("nav.notifications")}
            </h3>

            {/* Wrapper met zwarte achtergrond */}
            <div className="bg-black rounded-xl p-2 border border-gray-800 max-h-48 overflow-y-auto">
              <NotificationFeed
                limit={3}
                className="bg-black text-white whitespace-normal break-words text-sm leading-snug"
              />
            </div>
          </div>

          {/* Kalender */}
          <div className="mt-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CalendarDaysIcon className="w-3 h-3 text-blue-400" />
              {usedMonth.format("MMMM YYYY")}
            </h3>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
              <div className="grid grid-cols-7 gap-1 mb-3 text-xs text-gray-400 font-bold text-center">
                {["M", "D", "W", "D", "V", "Z", "Z"].map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  if (!day) return <div key={index} className="h-8"></div>;
                  const hours = getHoursForDay(day);
                  const isToday = usedMonth.date(day).isSame(dayjs(), "day");
                  let cellClass =
                    "h-8 w-8 flex items-center justify-center text-xs font-medium rounded-lg cursor-pointer ";
                  if (isToday)
                    cellClass +=
                      "bg-blue-600 text-white font-bold shadow-lg scale-110";
                  else if (hours >= 8) cellClass += "bg-green-600 text-white";
                  else if (hours >= 4) cellClass += "bg-yellow-500 text-black";
                  else if (hours > 0) cellClass += "bg-blue-500 text-white";
                  else cellClass += "text-gray-500 hover:bg-gray-800";
                  return (
                    <div
                      key={index}
                      className={cellClass}
                      title={`${day} ${usedMonth.format("MMMM")} - ${formatHours(hours)}`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 bg-black">
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition"
            onClick={handleLogout}
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      {/* Overlay mobiel */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setShowMobileMenu(false)}
        ></div>
      )}
    </>
  );
}
