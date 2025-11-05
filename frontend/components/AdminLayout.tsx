"use client";

import { AdminSidebar } from "./AdminSidebar";
import AdminRoute from "./AdminRoute";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <AdminSidebar />
        <main className="flex-1 ml-72 transition-all duration-300">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </AdminRoute>
  );
}
