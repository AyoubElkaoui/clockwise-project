// components/VacationOverview/VacationEntryForm.tsx
"use client";
import React, { useState } from "react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { registerVacationRequest } from "@/lib/api";

export default function VacationEntryForm() {
    const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [endDate, setEndDate] = useState(dayjs().add(1, "day").format("YYYY-MM-DD"));
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const dailyHours = 8; // standaard werkuren per dag

    const calculateHours = () => {
        const start = dayjs(startDate);
        const end = dayjs(endDate);
        const days = end.diff(start, "day") + 1; // Inclusief beide dagen
        return days * dailyHours;
    };

    const handleSubmit = async () => {
        if (!startDate || !endDate || !reason.trim()) {
            setError("Vul start- en einddatum en een reden in.");
            return;
        }

        const vacationData = {
            userId: Number(localStorage.getItem("userId")) || 0,
            startDate,
            endDate,
            hours: calculateHours(),
            reason,
            status: "pending", // wacht op goedkeuring
        };

        try {
            await registerVacationRequest(vacationData);
            router.push("/vacation");
        } catch (err) {
            console.error(err);
            setError("Fout bij het indienen van de vakantie-aanvraag");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-base-200 p-4">
            <div className="card w-full max-w-md bg-base-100 shadow-xl p-8">
                <h1 className="card-title text-2xl font-bold mb-6">Vakantie Aanvragen</h1>
                <div className="form-control mb-4">
                    <label className="label">
                        <span className="label-text font-semibold">Startdatum</span>
                    </label>
                    <input
                        type="date"
                        className="input input-bordered w-full"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="form-control mb-4">
                    <label className="label">
                        <span className="label-text font-semibold">Einddatum</span>
                    </label>
                    <input
                        type="date"
                        className="input input-bordered w-full"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <div className="form-control mb-4">
                    <label className="label">
                        <span className="label-text font-semibold">Reden</span>
                    </label>
                    <textarea
                        className="textarea textarea-bordered w-full"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reden voor de vakantie"
                    />
                </div>
                <p className="mb-4">
                    <strong>Geschatte uren:</strong> {calculateHours()} uur
                </p>
                <button className="btn btn-primary w-full" onClick={handleSubmit}>
                    Indienen
                </button>
                {error && <p className="text-error mt-4 text-center">{error}</p>}
            </div>
        </div>
    );
}
