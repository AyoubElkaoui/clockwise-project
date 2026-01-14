"use client";
import { useState, useEffect } from "react";
import ManagerRoute from "@/components/ManagerRoute";
import { ManagerSidebar } from "@/components/ManagerSidebar";
import Navbar from "@/components/Navbar";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("managerSidebarCollapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const handleSidebarToggle = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem("managerSidebarCollapsed", String(collapsed));
  };

  return (
    <ManagerRoute>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 overflow-x-hidden">
        <ManagerSidebar collapsed={isCollapsed} onToggle={handleSidebarToggle} />
        <main className={`flex-1 transition-all duration-300 ease-in-out max-w-full overflow-x-hidden ${
          isCollapsed ? 'ml-20' : 'ml-64'
        }`}>
          <Navbar />
          <div className="p-6 max-w-full overflow-x-hidden">{children}</div>
        </main>
      </div>
    </ManagerRoute>
  );
}
