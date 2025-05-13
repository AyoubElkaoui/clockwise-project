// app/vacation/new/page.tsx
"use client";
import React from "react";
import VacationEntryForm from "@/components/VacationOverview/VacationEntryForm";

export default function NewVacationPage() {
    return (
        <div className="container mx-auto p-4">
            <VacationEntryForm />
        </div>
    );
}
