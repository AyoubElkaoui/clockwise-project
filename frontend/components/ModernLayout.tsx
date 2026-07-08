"use client";

import { ReactNode } from "react";
import AppLayout from "@/components/AppLayout";

// All pages that use ModernLayout get the new AppLayout design automatically
export default function ModernLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
