"use client";
import React from "react";
import AdminRoute from "@/components/AdminRoute";
import AdminTimeApproval from "@/components/AdminTimeApproval";
import ManagerTimeApproval from "@/components/ManagerTimeApproval";

export default function ApproveHoursPage() {
    return (
        <AdminRoute>
            <div className="p-6">
                <h1 className="text-3xl font-bold mb-8">Uren Goedkeuren</h1>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h2 className="card-title text-xl mb-4">Openstaande urenregistraties</h2>
                        <p className="mb-6">
                            Hier kunt u de ingeleverde urenregistraties bekijken, goedkeuren of afkeuren.
                            Goedgekeurde uren worden groen gemarkeerd.
                            Afgekeurde uren worden rood gemarkeerd en kunnen opnieuw worden bewerkt door de medewerker.
                        </p>

                        <ManagerTimeApproval />
                    </div>
                </div>
            </div>
        </AdminRoute>
    );
}
