"use client";
import { ReactNode } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ModernSidebar } from "@/components/ModernSidebar";
import Navbar from "@/components/Navbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 overflow-x-hidden">
          {/* Modern Sidebar */}
          <ModernSidebar />

          {/* Main Content */}
          <main className="flex-1 md:ml-64 max-w-full overflow-x-hidden">
            {/* Navbar at top */}
            <Navbar />

            {/* Page Content */}
            <div className="p-4 md:p-8 max-w-full overflow-x-hidden">
              {children}
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
}
