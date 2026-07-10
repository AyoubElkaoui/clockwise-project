"use client";
import React from "react";
import AdminRoute from "@/components/AdminRoute";
import AdminTimeApproval from "@/components/AdminTimeApproval";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Clock } from "lucide-react";

export default function ApproveHoursPage() {
    return (
        <AdminRoute>
            <div className="space-y-6 p-6">
                <PageHeader
                    title="Uren Goedkeuren"
                    description="Bekijk, goedkeur of wijs urenregistraties af"
                />

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            Openstaande urenregistraties
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            Hier kunt u de ingeleverde urenregistraties bekijken, goedkeuren of afkeuren.
                            Goedgekeurde uren worden groen gemarkeerd.
                            Afgekeurde uren worden rood gemarkeerd en kunnen opnieuw worden bewerkt door de medewerker.
                        </p>

                        <AdminTimeApproval />
                    </CardContent>
                </Card>
            </div>
        </AdminRoute>
    );
}
