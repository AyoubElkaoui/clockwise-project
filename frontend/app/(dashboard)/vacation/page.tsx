// app/(dashboard)/vacation/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VacationPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to leave-booking
    router.replace("/leave-booking");
  }, [router]);

  return null;
}
