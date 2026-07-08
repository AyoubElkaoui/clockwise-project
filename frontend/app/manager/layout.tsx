"use client";
import ManagerRoute from "@/components/ManagerRoute";
import AppLayout from "@/components/AppLayout";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ManagerRoute>
      <AppLayout>{children}</AppLayout>
    </ManagerRoute>
  );
}
