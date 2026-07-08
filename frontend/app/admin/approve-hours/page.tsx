"use client";
import React from "react";
import AdminRoute from "@/components/AdminRoute";
import AdminTimeApproval from "@/components/AdminTimeApproval";
import { Clock } from "lucide-react";

export default function ApproveHoursPage() {
    return (
        <AdminRoute>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Uren Goedkeuren</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Bekijk, goedkeur of wijs urenregistraties af</p>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Openstaande urenregistraties</h2>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Hier kunt u de ingeleverde urenregistraties bekijken, goedkeuren of afkeuren.
                        Goedgekeurde uren worden groen gemarkeerd.
                        Afgekeurde uren worden rood gemarkeerd en kunnen opnieuw worden bewerkt door de medewerker.
                    </p>
                    <AdminTimeApproval />
                </div>
            </div>
        </AdminRoute>
    );
}
