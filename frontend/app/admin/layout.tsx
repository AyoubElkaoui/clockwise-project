"use client";
import AdminRoute from "@/components/AdminRoute";
import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
        <AdminSidebar />
        <main className="flex-1 ml-72 transition-all duration-300">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </AdminRoute>
  );
}