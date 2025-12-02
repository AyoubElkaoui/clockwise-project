"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { Button } from "./button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-full"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        // 🌙 Maan met zwarte lijn
        <Moon className="h-5 w-5 text-black" strokeWidth={2} />
      ) : (
        // Zon Zon met witte lijn
        <Sun className="h-5 w-5 text-white" strokeWidth={2} />
      )}
    </Button>
  );
}
