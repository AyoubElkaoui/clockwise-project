"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, badge, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start justify-between gap-3", className)}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 style={{ font: "700 22px 'Geist'", letterSpacing: "-.015em", color: "var(--text)" }} className="truncate">{title}</h1>
          {badge}
        </div>
        {description && (
          <p style={{ font: "400 13.5px 'Geist'", color: "var(--muted)", marginTop: 5 }}>{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
