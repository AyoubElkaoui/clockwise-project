"use client";

import { ManagerSidebar } from "./ManagerSidebar";
import ManagerRoute from "./ManagerRoute";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ManagerRoute>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
        <ManagerSidebar />
        <main className="flex-1 ml-72 transition-all duration-300">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </ManagerRoute>
  );
}
