"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; isPositive: boolean };
  color?: "blue" | "emerald" | "amber" | "rose" | "violet" | "indigo";
  onClick?: () => void;
  className?: string;
}

const colorMap = {
  blue:    { bg: "bg-blue-50 dark:bg-blue-900/20",    icon: "bg-blue-600",    text: "text-blue-600 dark:text-blue-400",    border: "border-l-blue-500"    },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: "bg-emerald-600", text: "text-emerald-600 dark:text-emerald-400", border: "border-l-emerald-500" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-900/20",  icon: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400",   border: "border-l-amber-500"   },
  rose:    { bg: "bg-rose-50 dark:bg-rose-900/20",    icon: "bg-rose-600",    text: "text-rose-600 dark:text-rose-400",    border: "border-l-rose-500"    },
  violet:  { bg: "bg-violet-50 dark:bg-violet-900/20", icon: "bg-violet-600", text: "text-violet-600 dark:text-violet-400", border: "border-l-violet-500"  },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-900/20", icon: "bg-indigo-600", text: "text-indigo-600 dark:text-indigo-400", border: "border-l-indigo-500"  },
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = "blue", onClick, className }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 border-l-4 shadow-sm transition-all duration-200",
        c.border,
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 tabular-nums">{value}</p>
          {(subtitle || trend) && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {trend && (
                <span className={cn("text-xs font-semibold", trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {trend.isPositive ? "▲" : "▼"} {trend.value}
                </span>
              )}
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
          )}
        </div>
        <div className={cn("p-2.5 rounded-xl ml-3 flex-shrink-0", c.bg)}>
          <Icon className={cn("w-5 h-5", c.text)} />
        </div>
      </div>
    </div>
  );
}
