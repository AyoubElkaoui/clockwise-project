// components/VacationOverview/VacationOverview.tsx
"use client";
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { getVacationRequests } from "@/lib/api";

export interface VacationRequest {
    id: number;
    userId: number;
    startDate: string;
    endDate: string;
    hours: number;
    reason?: string;
    status: string;
}

export default function VacationOverview() {
    const [vacations, setVacations] = useState<VacationRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Stel contract verlofuren in, bijvoorbeeld 160 uur per jaar
    const totalContractHours = 160;

    useEffect(() => {
        async function fetchVacations() {
            setLoading(true);
            try {
                const data = await getVacationRequests();
                setVacations(data);
            } catch (err) {
                console.error(err);
                setError("Fout bij ophalen van vakantie-gegevens");
            } finally {
                setLoading(false);
            }
        }
        fetchVacations();
    }, []);

    const usedHours = vacations.reduce((total, vac) => total + vac.hours, 0);
    const remainingHours = totalContractHours - usedHours;

    if (loading) return <p className="text-center">Laden...</p>;
    if (error) return <p className="text-center text-error">{error}</p>;

    return (
        <div className="card bg-base-100 shadow-xl p-6 mb-6">
            <div className="card-body">
                <h1 className="card-title text-3xl font-bold mb-4">Vakantie Overzicht</h1>
                <div className="mb-4">
                    <p>
                        <strong>Gebruikte vakantieuren:</strong> {usedHours} uur
                    </p>
                    <p>
                        <strong>Resterende vakantieuren:</strong> {remainingHours} uur
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="table w-full table-zebra">
                        <thead>
                        <tr>
                            <th>Startdatum</th>
                            <th>Einddatum</th>
                            <th>Uren</th>
                            <th>Reden</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {vacations.map((vac) => (
                            <tr key={vac.id}>
                                <td>{dayjs(vac.startDate).format("YYYY-MM-DD")}</td>
                                <td>{dayjs(vac.endDate).format("YYYY-MM-DD")}</td>
                                <td>{vac.hours}</td>
                                <td>{vac.reason || "-"}</td>
                                <td>{vac.status}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
