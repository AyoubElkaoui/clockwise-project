"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon | React.ReactNode;
  trend?: { value: string; isPositive: boolean };
  color?: "blue" | "emerald" | "amber" | "rose" | "violet" | "indigo";
  iconBgColor?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "blue",
  onClick,
  className,
}: StatCardProps) {
  // React 19: forwardRef components return an object with $$typeof + render, not a function
  const isLucideIcon =
    typeof icon === "function" ||
    (typeof icon === "object" && icon !== null && typeof (icon as any).render === "function");

  return (
    <div
      className={cn(
        "bg-[var(--panel)] rounded-lg p-5 border border-[var(--border)] shadow-[var(--shadow)] transition-all duration-200",
        onClick && "cursor-pointer hover:border-[var(--accent-border)] hover:-translate-y-0.5",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {title}
          </p>
          <p className="text-2xl font-bold text-[var(--text)] mt-1.5 tabular-nums">
            {value}
          </p>
          {(subtitle || trend) && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {trend && (
                <span
                  className={cn(
                    "text-xs font-semibold",
                    trend.isPositive
                      ? "text-[var(--green)]"
                      : "text-[var(--red)]",
                  )}
                >
                  {trend.isPositive ? "▲" : "▼"} {trend.value}
                </span>
              )}
              {subtitle && (
                <p className="text-xs text-[var(--text-2)]">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="p-2 rounded-lg ml-3 flex-shrink-0 bg-[var(--accent-weak)]">
          {isLucideIcon
            ? React.createElement(icon as LucideIcon, {
                className: "w-4 h-4 text-[var(--accent)]",
              })
            : icon}
        </div>
      </div>
    </div>
  );
}
