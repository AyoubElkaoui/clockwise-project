"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid,
  Clock,
  List,
  Send,
  UserCircle,
  CheckCircle2,
  LogOut,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Nav definitions
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const employeeNav: NavItem[] = [
  { label: "Dashboard",         href: "/dashboard",       icon: LayoutGrid },
  { label: "Uren registreren",  href: "/tijd-registratie", icon: Clock },
  { label: "Uren overzicht",    href: "/uren-overzicht",   icon: List },
  { label: "Vakantie",          href: "/vakantie",         icon: Send },
  { label: "Mijn account",      href: "/account",          icon: UserCircle },
];

const managerMainNav: NavItem[] = [
  { label: "Manager dashboard", href: "/manager/dashboard", icon: LayoutGrid },
  { label: "Uren beoordelen",   href: "/manager/approve",   icon: CheckCircle2 },
  { label: "Team uren",         href: "/manager/hours",     icon: List },
];

const managerPersonalNav: NavItem[] = [
  { label: "Uren registreren",  href: "/tijd-registratie",  icon: Clock },
  { label: "Mijn account",      href: "/account",            icon: UserCircle },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AppSidebar() {
  const pathname = usePathname();

  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const role      = localStorage.getItem("userRank") || "";
    const firstName = localStorage.getItem("firstName") || "";
    const lastName  = localStorage.getItem("lastName")  || "";
    setUserRole(role);
    setUserName(`${firstName} ${lastName}`.trim() || "Gebruiker");
  }, []);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const isActive = (href: string): boolean => {
    // Exact match for root-level dashboards to avoid false positives
    if (href === "/dashboard")         return pathname === "/dashboard";
    if (href === "/manager/dashboard") return pathname === "/manager/dashboard";
    return pathname.startsWith(href);
  };

  const getInitials = (): string =>
    userName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  const handleLogout = (): void => {
    localStorage.clear();
    document.cookie = "userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "userRank=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/login";
  };

  const roleLabel =
    userRole === "manager" ? "MANAGER"
    : userRole === "admin"   ? "ADMIN"
    : "MEDEWERKER";

  const isManager = userRole === "manager" || userRole === "admin";

  // -------------------------------------------------------------------------
  // Nav link renderer
  // -------------------------------------------------------------------------

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon   = item.icon;
    return (
      <Link
        href={item.href}
        className={`app-nav-link${active ? " active" : ""}`}
      >
        <Icon size={15} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.badge && item.badge > 0 ? (
          <span
            style={{
              background:   "var(--c-accent)",
              color:        "#fff",
              fontSize:     "10px",
              fontWeight:   700,
              padding:      "1px 6px",
              borderRadius: "999px",
              lineHeight:   "16px",
              minWidth:     "18px",
              textAlign:    "center",
            }}
          >
            {item.badge}
          </span>
        ) : null}
      </Link>
    );
  };

  // -------------------------------------------------------------------------
  // Section heading
  // -------------------------------------------------------------------------

  const SectionHeading = ({ label, first }: { label: string; first?: boolean }) => (
    <div
      style={{
        fontSize:      "10px",
        fontWeight:    600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color:         "var(--c-muted)",
        padding:       "0 11px",
        marginBottom:  "4px",
        marginTop:     first ? "2px" : "18px",
      }}
    >
      {label}
    </div>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <aside
      style={{
        width:         "250px",
        minWidth:      "250px",
        height:        "100vh",
        position:      "fixed",
        left:          0,
        top:           0,
        display:       "flex",
        flexDirection: "column",
        background:    "var(--c-panel)",
        borderRight:   "1px solid var(--c-border)",
        zIndex:        40,
        overflow:      "hidden",
      }}
    >
      {/* ---- Logo ---- */}
      <div style={{ padding: "24px 20px 18px" }}>
        {/* Wordmark */}
        <div
          style={{
            fontWeight:    800,
            fontSize:      "18px",
            letterSpacing: "0.13em",
            color:         "var(--c-text)",
            lineHeight:    1,
          }}
        >
          AL<span style={{ color: "var(--c-brand)" }}>T</span>UM
        </div>

        {/* Brand underline */}
        <div
          style={{
            height:        "3px",
            width:         "36px",
            background:    "var(--c-brand)",
            borderRadius:  "2px",
            margin:        "5px 0 6px",
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize:      "8.5px",
            fontFamily:    "var(--font-geist-mono, monospace)",
            textTransform: "uppercase",
            letterSpacing: "0.13em",
            color:         "var(--c-muted)",
          }}
        >
          TECHNICAL SOLUTIONS
        </div>
      </div>

      {/* ---- Navigation ---- */}
      <nav
        style={{
          flex:       1,
          padding:    "2px 10px 8px",
          overflowY:  "auto",
          overflowX:  "hidden",
        }}
      >
        {isManager ? (
          <>
            <SectionHeading label={roleLabel} first />
            {managerMainNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
            <SectionHeading label="PERSOONLIJK" />
            {managerPersonalNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </>
        ) : (
          <>
            <SectionHeading label={roleLabel} first />
            {employeeNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </>
        )}
      </nav>

      {/* ---- User profile ---- */}
      <div
        style={{
          borderTop:  "1px solid var(--c-border)",
          padding:    "12px 14px",
          display:    "flex",
          alignItems: "center",
          gap:        "10px",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width:           "34px",
            height:          "34px",
            borderRadius:    "8px",
            background:      "var(--c-accent)",
            color:           "#fff",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            fontSize:        "12px",
            fontWeight:      700,
            flexShrink:      0,
            letterSpacing:   "0.02em",
          }}
        >
          {getInitials()}
        </div>

        {/* Name + role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize:      "13px",
              fontWeight:    600,
              color:         "var(--c-text)",
              whiteSpace:    "nowrap",
              overflow:      "hidden",
              textOverflow:  "ellipsis",
            }}
          >
            {userName}
          </div>
          <div
            style={{
              fontSize:      "11px",
              color:         "var(--c-muted)",
              textTransform: "capitalize",
            }}
          >
            {userRole || "medewerker"}
          </div>
        </div>

        {/* Logout button */}
        <LogoutButton onClick={handleLogout} />
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Logout button — own component so hover state is self-contained
// ---------------------------------------------------------------------------

function LogoutButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title="Uitloggen"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        width:           "28px",
        height:          "28px",
        borderRadius:    "6px",
        border:          "none",
        background:      hovered ? "var(--c-red-weak)"  : "transparent",
        color:           hovered ? "var(--c-red)"       : "var(--c-muted)",
        cursor:          "pointer",
        transition:      "background 0.13s, color 0.13s",
        flexShrink:      0,
      }}
    >
      <LogOut size={14} />
    </button>
  );
}
