"use client";

import { ReactNode } from "react";
import { ModernSidebar } from "@/components/ModernSidebar";
import Navbar from "@/components/Navbar"; // <-- Navbar importeren

export default function ModernLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      
      {/* Sidebar */}
      <ModernSidebar />

      {/* Content */}
      <main className="flex-1 ml-64">
        
        {/* Navbar bovenaan */}
        <Navbar /> 
        
        {/* Pagina inhoud */}
        <div className="p-8">
          {children}
        </div>

      </main>
    </div>
  );
}
