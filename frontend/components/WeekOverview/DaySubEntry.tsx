"use client";
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import {
    TrashIcon,
    PencilIcon,
    CheckIcon,
    XMarkIcon,
    LockClosedIcon,
    BuildingOfficeIcon,
    ClockIcon,
    DocumentTextIcon,
    CurrencyEuroIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon
} from "@heroicons/react/24/outline";
import { TimeEntry } from "@/lib/types";
import { getCompanies, getProjectGroups, getProjects } from "@/lib/api";
import { Company, ProjectGroup, Project } from "@/lib/types";

interface DaySubEntryProps {
    entry: TimeEntry;
    allEntries: TimeEntry[];
    onUpdateLocalEntries: (updated: TimeEntry[]) => void;
}

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
    const project = entry.project as Project | undefined;
    const existingCompanyId = project?.projectGroup?.company?.id;
    const existingProjectGroupId = project?.projectGroup?.id;
    const existingProjectId = entry.projectId;

    const [companies, setCompanies] = useState<Company[]>([]);
    const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

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

    // Bepaal styling op basis van status
    const getStatusStyling = () => {
        switch (entry.status) {
            case "goedgekeurd":
                return {
                    containerClass: "border-green-300 bg-gradient-to-br from-green-50 to-emerald-50",
                    badgeClass: "badge-success",
                    badgeText: "✅ Goedgekeurd",
                    statusIcon: <CheckCircleIcon className="w-4 h-4 text-green-600" />
                };
            case "afgekeurd":
                return {
                    containerClass: "border-red-300 bg-gradient-to-br from-red-50 to-pink-50",
                    badgeClass: "badge-error",
                    badgeText: "❌ Afgekeurd",
                    statusIcon: <XCircleIcon className="w-4 h-4 text-red-600" />
                };
            case "ingeleverd":
                return {
                    containerClass: "border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50",
                    badgeClass: "badge-warning",
                    badgeText: "⏳ Ingeleverd",
                    statusIcon: <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />
                };
            default:
                return {
                    containerClass: "border-gray-200 bg-gradient-to-br from-white to-gray-50",
                    badgeClass: "badge-ghost",
                    badgeText: "📝 Opgeslagen",
                    statusIcon: <DocumentTextIcon className="w-4 h-4 text-gray-600" />
                };
        }
    };

    const isReadOnly = !isEditing;

    // Computed hours
    const start = dayjs(entry.startTime);
    const end = dayjs(entry.endTime);
    const diffMin = end.diff(start, "minute") - entry.breakMinutes;
    const totalHours = diffMin > 0 ? (diffMin / 60).toFixed(2) : "0.00";
    const projectName = entry.project?.name || "Onbekend project";
    const companyName = (entry.project as Project | undefined)?.projectGroup?.company?.name || "Onbekend bedrijf";

    const statusStyling = getStatusStyling();

    function handleDelete() {
        const updated = allEntries.map((e) =>
            e.id === entry.id ? { ...e, localStatus: "deleted" } : e
        );
        onUpdateLocalEntries(updated as TimeEntry[]);
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
            localStatus: newLocalStatus as "draft" | "changed" | "deleted" | "synced",
            projectId: selectedProject,
            status: entry.status === "afgekeurd" ? "opgeslagen" : entry.status
        };

        const newList = allEntries.map((e) => (e.id === entry.id ? updated : e));
        onUpdateLocalEntries(newList as TimeEntry[]);
        setIsEditing(false);
    }

    return (
        <div className={`
            relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-102
            ${statusStyling.containerClass}
        `}>
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent"></div>

            <div className="relative p-4">
                {/* READ-ONLY MODE */}
                {isReadOnly && (
                    <div className="space-y-4">
                        {/* Header with project info */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
                                    {statusStyling.statusIcon}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-lg">{projectName}</h4>
                                    <p className="text-sm text-gray-600 flex items-center gap-2">
                                        <BuildingOfficeIcon className="w-4 h-4" />
                                        {companyName}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={`badge ${statusStyling.badgeClass} badge-lg font-semibold`}>
                                    {statusStyling.badgeText}
                                </span>
                                {!isEditable && (
                                    <div className="tooltip" data-tip={entry.status === "ingeleverd" ? "Wacht op goedkeuring" : "Vergrendeld"}>
                                        <LockClosedIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Time and Hours Info */}
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/50">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <ClockIcon className="w-5 h-5 text-gray-600" />
                                    <span className="font-bold text-lg text-gray-800">
                                        {start.format("HH:mm")} - {end.format("HH:mm")}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-elmar-primary">{totalHours}h</span>
                                    {entry.breakMinutes > 0 && (
                                        <p className="text-xs text-gray-500">pauze: {entry.breakMinutes}min</p>
                                    )}
                                </div>
                            </div>

                            {/* Additional Info */}
                            {(entry.distanceKm || entry.travelCosts || entry.expenses) && (
                                <div className="flex items-center gap-4 text-sm text-gray-600 pt-3 border-t border-gray-200">
                                    {entry.distanceKm > 0 && (
                                        <span className="flex items-center gap-1">
                                            🚗 {entry.distanceKm} km
                                        </span>
                                    )}
                                    {(entry.travelCosts > 0 || entry.expenses > 0) && (
                                        <span className="flex items-center gap-1">
                                            <CurrencyEuroIcon className="w-4 h-4 text-green-600" />
                                            <span className="font-semibold text-green-600">
                                                €{((entry.travelCosts || 0) + (entry.expenses || 0)).toFixed(2)}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Notes */}
                            {entry.notes && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex items-start gap-2">
                                        <DocumentTextIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-gray-700 italic">"{entry.notes}"</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 justify-end">
                            {isEditable ? (
                                <>
                                    <button
                                        className="btn btn-sm btn-error rounded-xl hover:scale-105 transition-all duration-200"
                                        title="Verwijderen"
                                        onClick={handleDelete}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        Verwijderen
                                    </button>
                                    <button
                                        className="btn btn-sm btn-primary rounded-xl hover:scale-105 transition-all duration-200"
                                        title="Bewerken"
                                        onClick={handleEdit}
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                        Bewerken
                                    </button>
                                </>
                            ) : (
                                <div className="text-xs text-gray-500 flex items-center bg-gray-100 px-3 py-2 rounded-xl">
                                    <LockClosedIcon className="w-4 h-4 mr-2" />
                                    {entry.status === "ingeleverd" ? "Wacht op goedkeuring" : "Vergrendeld"}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* EDIT MODE */}
                {!isReadOnly && (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <PencilIcon className="w-5 h-5 text-blue-600" />
                                Entry Bewerken
                            </h4>

                            {/* Project Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700">Bedrijf</span>
                                    </label>
                                    <select
                                        className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                                        value={selectedCompany ?? ""}
                                        onChange={(e) =>
                                            setSelectedCompany(e.target.value ? Number(e.target.value) : null)
                                        }
                                    >
                                        <option value="">Selecteer bedrijf</option>
                                        {companies.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700">Projectgroep</span>
                                    </label>
                                    <select
                                        className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                                        value={selectedProjectGroup ?? ""}
                                        onChange={(e) =>
                                            setSelectedProjectGroup(e.target.value ? Number(e.target.value) : null)
                                        }
                                        disabled={!selectedCompany}
                                    >
                                        <option value="">Selecteer groep</option>
                                        {projectGroups.map((pg) => (
                                            <option key={pg.id} value={pg.id}>
                                                {pg.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700">Project</span>
                                    </label>
                                    <select
                                        className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                                        value={selectedProject ?? ""}
                                        onChange={(e) =>
                                            setSelectedProject(e.target.value ? Number(e.target.value) : null)
                                        }
                                        disabled={!selectedProjectGroup}
                                    >
                                        <option value="">Selecteer project</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Time Inputs */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700">Start</span>
                                    </label>
                                    <input
                                        type="time"
                                        className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700">Eind</span>
                                    </label>
                                    <input
                                        type="time"
                                        className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700">Pauze (min)</span>
                                    </label>
                                    <input
                                        type="number"
                                        className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                                        value={breakMinutes}
                                        onChange={(e) => setBreakMinutes(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* Additional Inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700">KM</span>
                                    </label>
                                    <input
                                        type="number"
                                        className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                                        value={distanceKm}
                                        onChange={(e) => setDistanceKm(Number(e.target.value))}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700">Reis (€)</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                                        value={travelCosts}
                                        onChange={(e) => setTravelCosts(Number(e.target.value))}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700">Onkosten (€)</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                                        value={expenses}
                                        onChange={(e) => setExpenses(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="form-control mb-6">
                                <label className="label">
                                    <span className="label-text font-semibold text-gray-700">Notities</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl h-20"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Eventuele opmerkingen..."
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 justify-end">
                                <button
                                    className="btn btn-success rounded-xl hover:scale-105 transition-all duration-200"
                                    onClick={handleSave}
                                >
                                    <CheckIcon className="w-4 h-4 mr-2" />
                                    Opslaan
                                </button>
                                <button
                                    className="btn btn-ghost rounded-xl hover:scale-105 transition-all duration-200"
                                    onClick={handleCancel}
                                >
                                    <XMarkIcon className="w-4 h-4 mr-2" />
                                    Annuleren
                                </button>
                                <button
                                    className="btn btn-error rounded-xl hover:scale-105 transition-all duration-200"
                                    onClick={handleDelete}
                                >
                                    <TrashIcon className="w-4 h-4 mr-2" />
                                    Verwijderen
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function extractTime(isoString: string): string {
    return dayjs(isoString).format("HH:mm");
}