// app/vacation/page.tsx
"use client";
import React from "react";
import { useRouter } from "next/navigation";
import VacationOverview from "@/components/VacationOverview/VacationOverview";

export default function VacationPage() {
    const router = useRouter();
    return (
        <div className="container mx-auto p-4">
            <VacationOverview />
            <div className="flex justify-end mt-4">
                <button
                    className="btn btn-primary"
                    onClick={() => router.push("/vacation-form")}
                >
                    Nieuwe Vakantie Aanvraag
                </button>
            </div>
        </div>
    );
}
