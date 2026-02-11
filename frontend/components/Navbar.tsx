"use client";

import { useState, useEffect, useRef, useMemo, useCallback, JSX } from "react";
import NotificationBell from "./NotificationBell";
import Image from "next/image";
import { MobileNav } from "./MobileNav";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  Calendar,
  Clock,
  Globe,
  Search,
  LayoutDashboard,
  List,
  Plane,
  Bell,
  User,
  Users,
  CheckCircle2,
  Shield,
  Settings,
  HelpCircle,
  FolderPlus,
  ListChecks,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "./ui/theme-toggle";
import axios from "axios";
import { API_URL } from "@/lib/api";

interface SearchResult {
  type: "page" | "employee";
  label: string;
  description?: string;
  href: string;
  icon: React.ElementType;
}

// All navigable pages
const allPages: SearchResult[] = [
  { type: "page", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { type: "page", label: "Uren Registreren", href: "/tijd-registratie", icon: Clock },
  { type: "page", label: "Uren Overzicht", href: "/uren-overzicht", icon: List },
  { type: "page", label: "Vakantie", href: "/vakantie", icon: Plane },
  { type: "page", label: "Notificaties", href: "/notificaties", icon: Bell },
  { type: "page", label: "Account", href: "/account", icon: User },
  { type: "page", label: "FAQ", href: "/faq", icon: HelpCircle },
];

const managerPages: SearchResult[] = [
  { type: "page", label: "Manager Dashboard", href: "/manager/dashboard", icon: Shield },
  { type: "page", label: "Mijn Team", href: "/manager/team", icon: Users },
  { type: "page", label: "Goedkeuringen", href: "/manager/approve", icon: CheckCircle2 },
  { type: "page", label: "Team Uren", href: "/manager/hours", icon: Clock },
  { type: "page", label: "Vakantie Aanvragen", href: "/manager/vacation", icon: Plane },
  { type: "page", label: "Jaarkalender", href: "/manager/jaarkalender", icon: Calendar },
  { type: "page", label: "Project Toewijzing", href: "/manager/project-toewijzing", icon: FolderPlus },
  { type: "page", label: "Uurcodes", href: "/manager/uurcodes", icon: ListChecks },
  { type: "page", label: "Instellingen", href: "/manager/settings", icon: Settings },
];

export default function Navbar(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { t, i18n } = useTranslation();

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [employees, setEmployees] = useState<SearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstName = localStorage.getItem("firstName") || "";
    const lastName = localStorage.getItem("lastName") || "";
    const rank = localStorage.getItem("userRank") || "";
    setUserName(`${firstName} ${lastName}`.trim() || "Gebruiker");
    setUserRank(rank);
  }, []);

  // Load employees once for search
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await axios.get(`${API_URL}/users`, {
          headers: { "ngrok-skip-browser-warning": "1" },
        });
        const users = (res.data || [])
          .filter((u: any) => u.isActive !== false && u.rank !== "inactive")
          .map((u: any) => ({
            type: "employee" as const,
            label: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
            description: u.rank || u.role || "Medewerker",
            href: userRank === "manager" ? "/manager/team" : "/dashboard",
            icon: User,
          }));
        setEmployees(users);
      } catch {
        // Silently ignore
      }
    };
    loadEmployees();
  }, [userRank]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inDesktop = searchRef.current?.contains(target);
      const inMobile = mobileSearchRef.current?.contains(target);
      if (!inDesktop && !inMobile) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Available pages based on role
  const availablePages = useMemo(() => {
    if (userRank === "manager" || userRank === "admin") {
      return [...managerPages, ...allPages];
    }
    return allPages;
  }, [userRank]);

  // Filter results when query changes
  const performSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setSearchOpen(false);
        return;
      }
      const q = query.toLowerCase();
      const pageResults = availablePages.filter(
        (p) => p.label.toLowerCase().includes(q) || p.href.toLowerCase().includes(q)
      );
      const employeeResults = employees.filter(
        (e) => e.label.toLowerCase().includes(q)
      ).slice(0, 5);
      const combined = [...pageResults, ...employeeResults];
      setSearchResults(combined);
      setSelectedIndex(-1);
      setSearchOpen(combined.length > 0);
    },
    [availablePages, employees]
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    performSearch(value);
  };

  const navigateToResult = (result: SearchResult) => {
    setSearchQuery("");
    setSearchOpen(false);
    setMobileSearchOpen(false);
    router.push(result.href);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
      return;
    }
    if (!searchOpen || searchResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        navigateToResult(searchResults[selectedIndex]);
      }
    }
  };

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

  // Search dropdown component
  const SearchDropdown = ({ mobile = false }: { mobile?: boolean }) => {
    if (!searchOpen || searchResults.length === 0) return null;
    const pageResults = searchResults.filter((r) => r.type === "page");
    const employeeResults = searchResults.filter((r) => r.type === "employee");
    let globalIndex = -1;

    return (
      <div
        className={`absolute left-0 right-0 ${mobile ? "top-full" : "top-full mt-1"} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-[100] max-h-80 overflow-y-auto`}
      >
        {pageResults.length > 0 && (
          <div>
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50">
              Pagina&apos;s
            </p>
            {pageResults.map((result) => {
              globalIndex++;
              const idx = globalIndex;
              const Icon = result.icon;
              return (
                <button
                  key={result.href}
                  onClick={() => navigateToResult(result)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    idx === selectedIndex
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                  <span className="font-medium">{result.label}</span>
                </button>
              );
            })}
          </div>
        )}
        {employeeResults.length > 0 && (
          <div>
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
              Medewerkers
            </p>
            {employeeResults.map((result, i) => {
              globalIndex++;
              const idx = globalIndex;
              return (
                <button
                  key={`emp-${i}`}
                  onClick={() => navigateToResult(result)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    idx === selectedIndex
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">
                    {result.label.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium">{result.label}</span>
                    {result.description && (
                      <span className="ml-2 text-xs text-slate-400 dark:text-slate-500 capitalize">{result.description}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
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
          <div className="hidden md:block flex-shrink-0">
            <Image
              src="/altum-logo-new.png"
              alt="Altum Technical Solutions"
              width={150}
              height={40}
              className="dark:hidden"
              priority
            />
            <Image
              src="/altum-logo-white.png"
              alt="Altum Technical Solutions"
              width={150}
              height={40}
              className="hidden dark:block"
              priority
            />
          </div>

          {/* Search bar - desktop only */}
          <div className="relative hidden md:block flex-1 max-w-lg" ref={searchRef}>
            <MagnifyingGlassIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500"
            />
            <input
              type="text"
              placeholder={t("common.search") + "..."}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => { if (searchQuery.trim()) performSearch(searchQuery); }}
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
            <SearchDropdown />
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
        <div className="md:hidden pt-2 pb-1" ref={mobileSearchRef}>
          <div className="relative">
            <MagnifyingGlassIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            />
            <input
              type="text"
              placeholder={t("common.search") + "..."}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
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
            <SearchDropdown mobile />
          </div>
        </div>
      )}
    </nav>

    {/* Mobile Navigation Drawer - outside nav to avoid z-index stacking context */}
    <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
