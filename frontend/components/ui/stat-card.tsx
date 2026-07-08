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
        "bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 tabular-nums">
            {value}
          </p>
          {(subtitle || trend) && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {trend && (
                <span
                  className={cn(
                    "text-xs font-semibold",
                    trend.isPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {trend.isPositive ? "▲" : "▼"} {trend.value}
                </span>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="p-2 rounded-lg ml-3 flex-shrink-0 bg-slate-100 dark:bg-slate-700">
          {isLucideIcon
            ? React.createElement(icon as LucideIcon, {
                className: "w-4 h-4 text-blue-600 dark:text-blue-400",
              })
            : icon}
        </div>
      </div>
    </div>
  );
}
