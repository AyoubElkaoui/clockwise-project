"use client";

import { ReactNode } from "react";
import { ModernSidebar } from "@/components/ModernSidebar";

export default function ModernLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <ModernSidebar />
      <main className="flex-1 ml-64 transition-all duration-300">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
