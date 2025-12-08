// app/(dashboard)/vacation/page.tsx
"use client";
import React from "react";
import { useRouter } from "next/navigation";
import VacationOverview from "@/components/VacationOverview/VacationOverview";
import { PlusCircleIcon } from "@heroicons/react/24/outline";

export default function VacationPage() {
    const router = useRouter();

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header Section */}
            <div className="bg-blue-600 text-white rounded-2xl p-8 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">Vakantie</span>
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold">Vakantie Overzicht</h1>
                            <p className="text-blue-100 text-lg">Beheer je vakantieaanvragen en bekijk je saldo</p>
                        </div>
                    </div>
                    <button
                        className="btn btn-success btn-lg rounded-xl text-white border-0"
                        onClick={() => router.push("/vacation-form")}
                    >
                        <PlusCircleIcon className="w-6 h-6 mr-2" />
                        Nieuwe Vakantie Aanvraag
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <VacationOverview />
        </div>
    );
}
