"use client";

import { useState, useEffect, ReactNode } from "react";
import { Moon, Sun, Search } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import AppSidebar from "@/components/AppSidebar";
import NotificationBell from "@/components/NotificationBell";

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    const fmt = (d: Date) =>
      d.toLocaleDateString("nl-NL", {
        weekday: "long",
        day:     "numeric",
        month:   "long",
      });
    setDateStr(fmt(new Date()));
    // Refresh once per minute so the day label stays current
    const id = setInterval(() => setDateStr(fmt(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      style={{
        height:       "60px",
        background:   "var(--c-panel)",
        borderBottom: "1px solid var(--c-border)",
        display:      "flex",
        alignItems:   "center",
        padding:      "0 24px",
        gap:          "12px",
        position:     "sticky",
        top:          0,
        zIndex:       30,
        flexShrink:   0,
      }}
    >
      {/* Search bar */}
      <div style={{ flex: 1, maxWidth: "400px", position: "relative" }}>
        <Search
          size={14}
          style={{
            position:       "absolute",
            left:           "11px",
            top:            "50%",
            transform:      "translateY(-50%)",
            color:          "var(--c-muted)",
            pointerEvents:  "none",
          }}
        />
        <input
          type="text"
          placeholder="Zoeken…"
          className="app-header-search"
          style={{
            width:          "100%",
            paddingLeft:    "32px",
            paddingRight:   "12px",
            paddingTop:     "7px",
            paddingBottom:  "7px",
          }}
        />
      </div>

      {/* Right side */}
      <div
        style={{
          marginLeft:  "auto",
          display:     "flex",
          alignItems:  "center",
          gap:         "8px",
          flexShrink:  0,
        }}
      >
        {/* Dutch date */}
        {dateStr && (
          <span
            style={{
              fontSize:  "12.5px",
              color:     "var(--c-text-2)",
              marginRight: "4px",
              whiteSpace:  "nowrap",
            }}
          >
            {dateStr}
          </span>
        )}

        {/* Theme toggle */}
        <button
          className="app-icon-btn"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Schakel naar licht" : "Schakel naar donker"}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notification bell — uses its own button + badge internally */}
        <NotificationBell />
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// AppLayout — wraps sidebar + header + scrollable content
// ---------------------------------------------------------------------------

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div
      style={{
        display:  "flex",
        height:   "100vh",
        overflow: "hidden",
      }}
    >
      {/* Fixed sidebar (250 px) */}
      <AppSidebar />

      {/* Main area — offset sidebar width */}
      <div
        style={{
          marginLeft:    "250px",
          flex:          1,
          display:       "flex",
          flexDirection: "column",
          minWidth:      0,
          overflow:      "hidden",
        }}
      >
        <AppHeader />

        {/* Scrollable page content */}
        <main
          style={{
            flex:      1,
            overflowY: "auto",
            overflowX: "hidden",
            padding:   "28px 32px",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
