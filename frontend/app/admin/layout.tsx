"use client";
import AdminRoute from "@/components/AdminRoute";
import AppLayout from "@/components/AppLayout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <AppLayout>{children}</AppLayout>
    </AdminRoute>
  );
}
