"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Load theme
  useEffect(() => {
    setMounted(true);

    const savedTheme = localStorage.getItem("theme") as Theme | null;

    const initialTheme =
      savedTheme ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");

    applyTheme(initialTheme);
  }, []);

  const applyTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);

    // ⛔ VERKEERD: toggle  
    // document.documentElement.classList.toggle('dark', t === 'dark');

    // ✅ GOED: Classes eerst verwijderen, dan juiste class toevoegen
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(t);
  };

  const setTheme = (t: Theme) => applyTheme(t);

  const toggleTheme = () => {
    applyTheme(theme === "light" ? "dark" : "light");
  };

  if (!mounted) {
    return <div className="opacity-0">{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
