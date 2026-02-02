"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Redirect to /account page
export default function InstellingenPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/account");
  }, [router]);

  useEffect(() => {
    router.replace("/account");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-timr-orange" />
    </div>
  );
}
