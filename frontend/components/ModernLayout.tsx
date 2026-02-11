"use client";

import { ReactNode, useState, useEffect } from "react";
import { ModernSidebar } from "@/components/ModernSidebar";
import Navbar from "@/components/Navbar";

export default function ModernLayout({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const handleSidebarToggle = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      
      {/* Sidebar */}
      <ModernSidebar collapsed={isCollapsed} onToggle={handleSidebarToggle} />

      {/* Content */}
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        
        {/* Navbar bovenaan */}
        <Navbar /> 
        
        {/* Pagina inhoud */}
        <div className="p-4 md:p-6">
          {children}
        </div>

      </main>
    </div>
  );
}
