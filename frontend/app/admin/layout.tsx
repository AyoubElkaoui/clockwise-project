"use client";
import AdminRoute from "@/components/AdminRoute";
import { AdminSidebar } from "@/components/AdminSidebar";
import Navbar from "@/components/Navbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 overflow-x-hidden">
        <AdminSidebar />
        <main className="flex-1 md:ml-72 max-w-full overflow-x-hidden">
          <Navbar />
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </AdminRoute>
  );
}
