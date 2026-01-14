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
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
        <ManagerSidebar collapsed={isCollapsed} onToggle={handleSidebarToggle} />
        <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          <Navbar />
          <div>{children}</div>
        </main>
      </div>
    </ManagerRoute>
  );
}
