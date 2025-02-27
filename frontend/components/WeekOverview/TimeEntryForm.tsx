// components/WeekOverview/TimeEntryForm.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Dayjs } from "dayjs";
import { getCompanies, getProjectGroups, getProjects, registerTimeEntry } from "@/lib/api";
import { XMarkIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";

interface Props {
    day: Dayjs;
    onClose: () => void;
    onEntrySaved: () => void;
}

export default function TimeEntryForm({ day, onClose, onEntrySaved }: Props) {
    // Data voor select-lijsten
    const [companies, setCompanies] = useState<any[]>([]);
    const [projectGroups, setProjectGroups] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    // Geselecteerde waarden
    const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
    const [selectedProjectGroup, setSelectedProjectGroup] = useState<number | null>(null);
    const [selectedProject, setSelectedProject] = useState<number | null>(null);

    // Tijd en overige velden
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [breakMinutes, setBreakMinutes] = useState(30);
    const [distanceKm, setDistanceKm] = useState(0);
    const [travelCosts, setTravelCosts] = useState(0);
    const [expenses, setExpenses] = useState(0);
    const [notes, setNotes] = useState("");

    const [calculatedHours, setCalculatedHours] = useState(0);

    useEffect(() => {
        getCompanies().then(setCompanies).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedCompany) {
            getProjectGroups(selectedCompany).then(setProjectGroups).catch(console.error);
        }
    }, [selectedCompany]);

    useEffect(() => {
        if (selectedProjectGroup) {
            getProjects(selectedProjectGroup).then(setProjects).catch(console.error);
        }
    }, [selectedProjectGroup]);

    useEffect(() => {
        const dayStr = day.format("YYYY-MM-DD");
        const startDT = dayjs(`${dayStr}T${startTime}`);
        const endDT = dayjs(`${dayStr}T${endTime}`);
        if (endDT.isAfter(startDT)) {
            const diffMin = endDT.diff(startDT, "minute") - breakMinutes;
            setCalculatedHours(diffMin > 0 ? diffMin / 60 : 0);
        } else {
            setCalculatedHours(0);
        }
    }, [startTime, endTime, breakMinutes, day]);

    const handleSave = async () => {
        if (!selectedProject) {
            alert("Selecteer een project");
            return;
        }
        if (!startTime || !endTime) {
            alert("Vul start- en eindtijd in");
            return;
        }
        const dayStr = day.format("YYYY-MM-DD");
        const data = {
            userId: 1,
            projectId: selectedProject,
            startTime: `${dayStr}T${startTime}`,
            endTime: `${dayStr}T${endTime}`,
            breakMinutes,
            distanceKm,
            travelCosts,
            expenses,
            notes,
        };
        try {
            await registerTimeEntry(data);
            onEntrySaved();
        } catch (err) {
            console.error(err);
            alert("Fout bij opslaan");
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{day.format("dddd D MMMM YYYY")}</h2>
                <button className="btn btn-sm btn-outline" onClick={onClose}>
                    <XMarkIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {/* Bedrijf */}
                <div className="form-control mb-2">
                    <label className="label">
                        <span className="label-text font-semibold">Bedrijf</span>
                    </label>
                    <select
                        className="select select-bordered"
                        value={selectedCompany ?? ""}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSelectedCompany(val ? Number(val) : null);
                            setSelectedProjectGroup(null);
                            setSelectedProject(null);
                        }}
                    >
                        <option value="">-- Kies een bedrijf --</option>
                        {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
                {/* Projectgroep */}
                {selectedCompany && (
                    <div className="form-control mb-2">
                        <label className="label">
                            <span className="label-text font-semibold">Projectgroep</span>
                        </label>
                        <select
                            className="select select-bordered"
                            value={selectedProjectGroup ?? ""}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedProjectGroup(val ? Number(val) : null);
                                setSelectedProject(null);
                            }}
                        >
                            <option value="">-- Kies een projectgroep --</option>
                            {projectGroups.map((pg) => (
                                <option key={pg.id} value={pg.id}>
                                    {pg.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {/* Project */}
                {selectedProjectGroup && (
                    <div className="form-control mb-2">
                        <label className="label">
                            <span className="label-text font-semibold">Project</span>
                        </label>
                        <select
                            className="select select-bordered"
                            value={selectedProject ?? ""}
                            onChange={(e) => setSelectedProject(Number(e.target.value))}
                        >
                            <option value="">-- Kies een project --</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {/* Start- en eindtijd */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold">Starttijd</span>
                        </label>
                        <input
                            type="time"
                            className="input input-bordered"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold">Eindtijd</span>
                        </label>
                        <input
                            type="time"
                            className="input input-bordered"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                    </div>
                </div>
                {/* Pauze, afstand, reiskosten, onkosten */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold">Pauze (min)</span>
                        </label>
                        <input
                            type="number"
                            className="input input-bordered"
                            value={breakMinutes}
                            onChange={(e) => setBreakMinutes(Number(e.target.value))}
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold">Afstand (km)</span>
                        </label>
                        <input
                            type="number"
                            className="input input-bordered"
                            value={distanceKm}
                            onChange={(e) => setDistanceKm(Number(e.target.value))}
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold">Reiskosten (€)</span>
                        </label>
                        <input
                            type="number"
                            className="input input-bordered"
                            value={travelCosts}
                            onChange={(e) => setTravelCosts(Number(e.target.value))}
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold">Onkosten (€)</span>
                        </label>
                        <input
                            type="number"
                            className="input input-bordered"
                            value={expenses}
                            onChange={(e) => setExpenses(Number(e.target.value))}
                        />
                    </div>
                </div>
                {/* Opmerkingen */}
                <div className="form-control mb-4">
                    <label className="label">
                        <span className="label-text font-semibold">Opmerkingen</span>
                    </label>
                    <textarea
                        className="textarea textarea-bordered"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
                {/* Totaal uren */}
                <div className="mb-4 font-semibold">
                    Totaal uren: <span className="text-primary">{calculatedHours.toFixed(2)}</span>
                </div>
            </div>
            <button className="btn btn-accent w-full" onClick={handleSave}>
                Opslaan
            </button>
        </div>
    );
}
