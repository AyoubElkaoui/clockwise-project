"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  iconBgColor?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  iconBgColor = "bg-gradient-to-br from-blue-500 to-blue-600",
  onClick,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200 dark:border-slate-700",
        onClick && "cursor-pointer hover:-translate-y-1"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className={cn("p-3 rounded-xl text-white", iconBgColor)}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {value}
          </p>
          {(subtitle || trend) && (
            <div className="flex items-center gap-2 mt-1">
              {trend && (
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend.isPositive
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {trend.isPositive ? "↑" : "↓"} {trend.value}
                </span>
              )}
              {subtitle && (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
