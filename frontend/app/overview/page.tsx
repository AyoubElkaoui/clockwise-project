"use client";
import { useEffect, useState } from "react";
import { getTimeEntries, deleteTimeEntry } from "@/lib/api";

export default function Overview() {
    const [entries, setEntries] = useState([]);

    const fetchEntries = async () => {
        const data = await getTimeEntries();
        setEntries(data ?? []);
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    const handleDelete = async (id: number) => {
        if (confirm("Weet je zeker dat je deze registratie wilt verwijderen?")) {
            await deleteTimeEntry(id);
            fetchEntries();
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Uren Overzicht</h1>
            <div className="space-y-6">
                {entries.map((entry: any) => (
                    <div key={entry.id} className="card bg-base-100 shadow-md p-6 rounded-xl flex justify-between items-center">
                        <div>
                            <p className="font-semibold">
                                {entry.startTime} - {entry.endTime}
                                <span className="text-sm text-gray-600 ml-2">({entry.project?.name || "Geen project"})</span>
                            </p>
                            <p className="text-sm mt-1">
                                Pauze: {entry.breakMinutes} min | Km: {entry.distanceKm} | Reiskosten: €{entry.travelCosts} | Onkosten: €{entry.expenses}
                            </p>
                            <p className="italic text-sm mt-1">Opmerkingen: {entry.notes}</p>
                        </div>
                        <button
                            onClick={() => handleDelete(entry.id)}
                            className="btn btn-error"
                        >
                            Verwijder
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
