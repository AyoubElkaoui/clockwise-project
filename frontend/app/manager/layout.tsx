"use client";
import ManagerRoute from "@/components/ManagerRoute";
import { ManagerSidebar } from "@/components/ManagerSidebar";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ManagerRoute>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
        <ManagerSidebar />
        <main className="flex-1 ml-72">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </ManagerRoute>
  );
}
