"use client";
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import {
    TrashIcon,
    PencilIcon,
    CheckIcon,
    XMarkIcon,
    LockClosedIcon,
} from "@heroicons/react/24/outline";
import { TimeEntry } from "./WeekOverview";
import { getCompanies, getProjectGroups, getProjects } from "@/lib/api";

interface DaySubEntryProps {
    entry: TimeEntry;
    allEntries: TimeEntry[];
    onUpdateLocalEntries: (updated: TimeEntry[]) => void;
}

/**
 * DaySubEntry: a single "bubble" or "card" for one TimeEntry,
 * supporting inline edit of company/project/times/notes.
 */
export default function DaySubEntry({
                                        entry,
                                        allEntries,
                                        onUpdateLocalEntries,
                                    }: DaySubEntryProps) {
    const [isEditing, setIsEditing] = useState(false);

    // Local states for editing
    const [startTime, setStartTime] = useState(extractTime(entry.startTime));
    const [endTime, setEndTime] = useState(extractTime(entry.endTime));
    const [breakMinutes, setBreakMinutes] = useState(entry.breakMinutes);
    const [distanceKm, setDistanceKm] = useState(entry.distanceKm ?? 0);
    const [travelCosts, setTravelCosts] = useState(entry.travelCosts ?? 0);
    const [expenses, setExpenses] = useState(entry.expenses ?? 0);
    const [notes, setNotes] = useState(entry.notes || "");

    // For company → projectGroup → project
    const existingCompanyId = entry.project?.projectGroup?.company?.id;
    const existingProjectGroupId = entry.project?.projectGroup?.id;
    const existingProjectId = entry.projectId;

    const [companies, setCompanies] = useState<any[]>([]);
    const [projectGroups, setProjectGroups] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    const [selectedCompany, setSelectedCompany] = useState<number | null>(
        existingCompanyId || null
    );
    const [selectedProjectGroup, setSelectedProjectGroup] = useState<number | null>(
        existingProjectGroupId || null
    );
    const [selectedProject, setSelectedProject] = useState<number | null>(
        existingProjectId || null
    );

    // Load companies once
    useEffect(() => {
        getCompanies().then(setCompanies).catch(console.error);
    }, []);

    // When selectedCompany changes, fetch projectGroups
    useEffect(() => {
        if (selectedCompany) {
            getProjectGroups(selectedCompany).then(setProjectGroups).catch(console.error);
        } else {
            setProjectGroups([]);
        }
        // Reset PG and Project
        setSelectedProjectGroup(null);
        setSelectedProject(null);
    }, [selectedCompany]);

    // When selectedProjectGroup changes, fetch projects
    useEffect(() => {
        if (selectedProjectGroup) {
            getProjects(selectedProjectGroup).then(setProjects).catch(console.error);
        } else {
            setProjects([]);
        }
        setSelectedProject(null);
    }, [selectedProjectGroup]);

    // Bereken of deze entry bewerkbaar is op basis van de status
    const isEditable = entry.status === "opgeslagen" || entry.status === "afgekeurd";

    // Bepaal klasse op basis van status
    const getStatusClass = () => {
        switch (entry.status) {
            case "goedgekeurd":
                return "border-green-500 bg-green-50";
            case "afgekeurd":
                return "border-red-500 bg-red-50";
            case "ingeleverd":
                return "border-yellow-500 bg-yellow-50";
            default:
                return "border-gray-300 bg-white";
        }
    };

    // Bepaal statuslabel
    const getStatusLabel = () => {
        switch (entry.status) {
            case "goedgekeurd":
                return <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">Goedgekeurd</span>;
            case "afgekeurd":
                return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">Afgekeurd</span>;
            case "ingeleverd":
                return <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">Ingeleverd</span>;
            default:
                return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">Opgeslagen</span>;
        }
    };

    /** In read‐only mode, we show times etc. */
    const isReadOnly = !isEditing;

    // Computed hours
    const start = dayjs(entry.startTime);
    const end = dayjs(entry.endTime);
    const diffMin = end.diff(start, "minute") - entry.breakMinutes;
    const totalHours = diffMin > 0 ? (diffMin / 60).toFixed(2) : "0.00";
    const projectName = entry.project?.name || "Onbekend project";
    const companyName = entry.project?.projectGroup?.company?.name || "Onbekend bedrijf";

    function handleDelete() {
        // Mark localStatus = "deleted"
        const updated = allEntries.map((e) =>
            e.id === entry.id ? { ...e, localStatus: "deleted" } : e
        );
        onUpdateLocalEntries(updated);
    }

    function handleEdit() {
        if (!isEditable) return;
        setIsEditing(true);
    }

    function handleCancel() {
        setIsEditing(false);
        // revert local states
        setStartTime(extractTime(entry.startTime));
        setEndTime(extractTime(entry.endTime));
        setBreakMinutes(entry.breakMinutes);
        setDistanceKm(entry.distanceKm ?? 0);
        setTravelCosts(entry.travelCosts ?? 0);
        setExpenses(entry.expenses ?? 0);
        setNotes(entry.notes || "");
        setSelectedCompany(existingCompanyId || null);
        setSelectedProjectGroup(existingProjectGroupId || null);
        setSelectedProject(existingProjectId || null);
    }

    function handleSave() {
        if (!selectedProject) {
            alert("Selecteer een project aub");
            return;
        }
        const dayStr = entry.startTime.substring(0, 10);
        const newStart = dayStr + "T" + startTime;
        const newEnd = dayStr + "T" + endTime;
        const newLocalStatus = entry.localStatus === "draft" ? "draft" : "changed";

        const updated: TimeEntry = {
            ...entry,
            startTime: newStart,
            endTime: newEnd,
            breakMinutes,
            distanceKm,
            travelCosts,
            expenses,
            notes,
            localStatus: newLocalStatus,
            projectId: selectedProject,
            status: entry.status === "afgekeurd" ? "opgeslagen" : entry.status // Reset afgekeurde status naar opgeslagen
        };

        const newList = allEntries.map((e) => (e.id === entry.id ? updated : e));
        onUpdateLocalEntries(newList);
        setIsEditing(false);
    }

    return (
        <div className={`p-3 rounded shadow border ${getStatusClass()}`}>
            {/* READ-ONLY MODE */}
            {isReadOnly && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <div className="text-sm">
                        <span className="font-semibold">{projectName}</span>{" "}
                        <span className="text-xs text-gray-500 ml-1">({companyName})</span>
                        <span className="ml-2 text-xs text-gray-500">
                            {start.format("HH:mm")} - {end.format("HH:mm")}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                            (pauze: {entry.breakMinutes} min)
                        </span>
                        <span className="ml-2 font-semibold">{totalHours} uur</span>
                        {entry.notes && (
                            <span className="ml-2 italic text-gray-700">[{entry.notes}] </span>
                        )}
                        <span className="ml-2">{getStatusLabel()}</span>
                    </div>
                    <div className="flex gap-2 mt-2 sm:mt-0">
                        {isEditable ? (
                            <>
                                <button
                                    className="btn btn-xs btn-ghost text-error"
                                    title="Verwijderen"
                                    onClick={handleDelete}
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                                <button
                                    className="btn btn-xs btn-ghost"
                                    title="Bewerken"
                                    onClick={handleEdit}
                                >
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <span className="text-xs text-gray-500 flex items-center">
                                <LockClosedIcon className="w-4 h-4 mr-1" />
                                {entry.status === "ingeleverd" ? "Wacht op goedkeuring" : "Vergrendeld"}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* EDIT MODE */}
            {!isReadOnly && (
                <div className="flex flex-col gap-2">
                    {/* Row 1: Company, ProjectGroup, Project */}
                    <div className="flex flex-wrap gap-2">
                        <div>
                            <label className="label-text text-xs">Bedrijf </label>
                            <select
                                className="select select-bordered select-xs"
                                value={selectedCompany ?? ""}
                                onChange={(e) =>
                                    setSelectedCompany(e.target.value ? Number(e.target.value) : null)
                                }
                            >
                                <option value="">(kies)</option>
                                {companies.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-text text-xs">Projectgroep </label>
                            <select
                                className="select select-bordered select-xs"
                                value={selectedProjectGroup ?? ""}
                                onChange={(e) =>
                                    setSelectedProjectGroup(e.target.value ? Number(e.target.value) : null)
                                }
                            >
                                <option value="">(kies)</option>
                                {projectGroups.map((pg) => (
                                    <option key={pg.id} value={pg.id}>
                                        {pg.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-text text-xs">Project </label>
                            <select
                                className="select select-bordered select-xs"
                                value={selectedProject ?? ""}
                                onChange={(e) =>
                                    setSelectedProject(e.target.value ? Number(e.target.value) : null)
                                }
                            >
                                <option value="">(kies)</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Start/End/Break etc. */}
                    <div className="flex flex-wrap gap-2">
                        <div>
                            <label className="label-text text-xs">Start </label>
                            <input
                                type="time"
                                className="input input-bordered input-xs"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="label-text text-xs">Eind </label>
                            <input
                                type="time"
                                className="input input-bordered input-xs"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="label-text text-xs">Pauze (min) </label>
                            <input
                                type="number"
                                className="input input-bordered input-xs"
                                value={breakMinutes}
                                onChange={(e) => setBreakMinutes(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="label-text text-xs">KM </label>
                            <input
                                type="number"
                                className="input input-bordered input-xs"
                                value={distanceKm}
                                onChange={(e) => setDistanceKm(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="label-text text-xs">Reis (€) </label>
                            <input
                                type="number"
                                className="input input-bordered input-xs"
                                value={travelCosts}
                                onChange={(e) => setTravelCosts(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="label-text text-xs">Onkosten (€) </label>
                            <input
                                type="number"
                                className="input input-bordered input-xs"
                                value={expenses}
                                onChange={(e) => setExpenses(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* Row 3: notes */}
                    <div>
                        <label className="label-text text-xs">Notities </label>
                        <input
                            type="text"
                            className="input input-bordered input-sm w-full"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Row 4: Save/Cancel/Delete */}
                    <div className="flex gap-2 justify-end">
                        <button className="btn btn-xs btn-success" onClick={handleSave}>
                            <CheckIcon className="w-4 h-4" />
                        </button>
                        <button className="btn btn-xs btn-ghost" onClick={handleCancel}>
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                        <button className="btn btn-xs btn-ghost text-error" onClick={handleDelete}>
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/** Extract "HH:mm" from "YYYY-MM-DDTHH:mm:ss" */
function extractTime(isoString: string): string {
    return dayjs(isoString).format("HH:mm");
}