"use client";
import React, { useEffect, useState } from "react";
import { Dayjs } from "dayjs";
import { getCompanies, getProjectGroups, getProjects, registerTimeEntry, updateTimeEntry, getUserProjects } from "@/lib/api";
import dayjs from "dayjs";
import { Company, ProjectGroup, Project, UserProject, TimeEntry } from "@/lib/types";
import {
    BuildingOfficeIcon,
    FolderIcon,
    ClockIcon,
    CurrencyEuroIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    LightBulbIcon,
    TrashIcon
} from "@heroicons/react/24/outline";

interface TimeEntryFormProps {
    day: Dayjs;
    existingEntry?: TimeEntry | null;
    onClose: () => void;
    onEntrySaved: () => void;
}

export default function TimeEntryForm({ day, existingEntry, onClose, onEntrySaved }: TimeEntryFormProps) {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [assignedProjects, setAssignedProjects] = useState<UserProject[]>([]);

    const [selectedCompany, setSelectedCompany] = useState<number | null>(
        existingEntry?.project?.projectGroup?.company?.id || null
    );
    const [selectedProjectGroup, setSelectedProjectGroup] = useState<number | null>(
        existingEntry?.project?.projectGroup?.id || null
    );
    const [selectedProject, setSelectedProject] = useState<number | null>(
        existingEntry?.projectId || null
    );

    const extractTime = (isoString?: string): string => {
        if (!isoString) return "";
        return dayjs(isoString).format("HH:mm");
    };

    const [startTime, setStartTime] = useState(extractTime(existingEntry?.startTime) || "09:00");
    const [endTime, setEndTime] = useState(extractTime(existingEntry?.endTime) || "17:00");
    const [breakMinutes, setBreakMinutes] = useState(existingEntry?.breakMinutes || 30);
    const [distanceKm, setDistanceKm] = useState(existingEntry?.distanceKm || 0);
    const [travelCosts, setTravelCosts] = useState(existingEntry?.travelCosts || 0);
    const [expenses, setExpenses] = useState(existingEntry?.expenses || 0);
    const [notes, setNotes] = useState(existingEntry?.notes || "");

    const [calculatedHours, setCalculatedHours] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Generate time options in 15-minute intervals
    const generateTimeOptions = () => {
        const options = [];
        for (let hour = 6; hour <= 22; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                options.push(timeStr);
            }
        }
        return options;
    };

    const timeOptions = generateTimeOptions();

    const formatDisplayTime = (timeStr: string): string => {
        const [hour, minute] = timeStr.split(':');
        const h = parseInt(hour);
        const m = parseInt(minute);

        if (m === 0) return `${h}:00`;
        else if (m === 15) return `${h}:15`;
        else if (m === 30) return `${h}:30`;
        else if (m === 45) return `${h}:45`;
        return timeStr;
    };

    const formatHours = (hours: number): string => {
        if (hours === 0) return "0u";

        // Round to nearest quarter hour
        const roundedHours = Math.round(hours * 4) / 4;
        const wholeHours = Math.floor(roundedHours);
        const fraction = roundedHours - wholeHours;

        let display = wholeHours.toString();

        if (fraction === 0.25) display += "¼";
        else if (fraction === 0.5) display += "½";
        else if (fraction === 0.75) display += "¾";
        else if (fraction > 0) display = roundedHours.toFixed(2);

        return display + "u";
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const userId = Number(localStorage.getItem("userId"));
                if (!userId) {
                    setError("Gebruiker niet gevonden");
                    return;
                }

                const companiesData = await getCompanies();
                setCompanies(companiesData);

                const userProjectsData = await getUserProjects(userId);
                setAssignedProjects(userProjectsData);

                const userRank = localStorage.getItem("userRank");
                const isAdminOrManager = userRank === "admin" || userRank === "manager";

                if (!isAdminOrManager && userProjectsData.length === 0) {
                    setError("Je bent niet toegewezen aan projecten. Neem contact op met een beheerder.");
                }

                if (existingEntry && selectedCompany) {
                    const projectGroupsData = await getProjectGroups(selectedCompany);
                    setProjectGroups(projectGroupsData);

                    if (selectedProjectGroup) {
                        const projectsData = await getProjects(selectedProjectGroup);
                        setProjects(projectsData);
                    }
                }
            } catch (error) {
                console.error("Error fetching initial data:", error);
                setError("Fout bij het ophalen van gegevens");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [existingEntry, selectedCompany, selectedProjectGroup]);

    useEffect(() => {
        if (selectedCompany) {
            const fetchProjectGroups = async () => {
                try {
                    const data = await getProjectGroups(selectedCompany);
                    const userRank = localStorage.getItem("userRank");
                    const isAdminOrManager = userRank === "admin" || userRank === "manager";

                    if (isAdminOrManager) {
                        setProjectGroups(data);
                    } else {
                        const assignedProjectGroupIds = assignedProjects
                            .filter(ap => ap.project?.projectGroup?.company?.id === selectedCompany)
                            .map(ap => ap.project?.projectGroup?.id);

                        const filteredGroups = data.filter((group: ProjectGroup) =>
                            assignedProjectGroupIds.includes(group.id)
                        );
                        setProjectGroups(filteredGroups);
                    }
                } catch (error) {
                    console.error("Error fetching project groups:", error);
                }
            };
            fetchProjectGroups();
        } else {
            setProjectGroups([]);
        }

        if (!existingEntry) {
            setSelectedProjectGroup(null);
            setSelectedProject(null);
        }
    }, [selectedCompany, assignedProjects, existingEntry]);

    useEffect(() => {
        if (selectedProjectGroup) {
            const fetchProjects = async () => {
                try {
                    const data = await getProjects(selectedProjectGroup);
                    const userRank = localStorage.getItem("userRank");
                    const isAdminOrManager = userRank === "admin" || userRank === "manager";

                    if (isAdminOrManager) {
                        setProjects(data);
                    } else {
                        const assignedProjectIds = assignedProjects.map(ap => ap.projectId);
                        const filteredProjects = data.filter((project: Project) =>
                            assignedProjectIds.includes(project.id)
                        );
                        setProjects(filteredProjects);
                    }
                } catch (error) {
                    console.error("Error fetching projects:", error);
                }
            };
            fetchProjects();
        } else {
            setProjects([]);
            // DON'T reset selectedProject if we're editing an existing entry
            if (!existingEntry) {
                setSelectedProject(null);
            }
        }
    }, [selectedProjectGroup, assignedProjects]);

    useEffect(() => {
        const dayStr = day.format("YYYY-MM-DD");
        const startDT = dayjs(`${dayStr}T${startTime}`);
        const endDT = dayjs(`${dayStr}T${endTime}`);
        if (endDT.isAfter(startDT)) {
            const diffMin = endDT.diff(startDT, "minute") - breakMinutes;
            const hours = diffMin > 0 ? diffMin / 60 : 0;
            // Round to nearest quarter hour
            setCalculatedHours(Math.round(hours * 4) / 4);
        } else {
            setCalculatedHours(0);
        }
    }, [startTime, endTime, breakMinutes, day]);

    const handleSave = async () => {
        if (!selectedProject) {
            setError("Selecteer een project");
            return;
        }
        if (!startTime || !endTime) {
            setError("Vul start- en eindtijd in");
            return;
        }
        if (calculatedHours === 0) {
            setError("Eindtijd moet na starttijd zijn");
            return;
        }

        const userRank = localStorage.getItem("userRank");
        const isAdminOrManager = userRank === "admin" || userRank === "manager";

        if (!isAdminOrManager) {
            const hasAccess = assignedProjects.some(ap => ap.projectId === selectedProject);
            if (!hasAccess) {
                setError("Je hebt geen toegang tot dit project");
                return;
            }
        }

        const dayStr = day.format("YYYY-MM-DD");
        const userId = Number(localStorage.getItem("userId")) || 0;

        const data = {
            userId,
            projectId: selectedProject,
            startTime: `${dayStr}T${startTime}`,
            endTime: `${dayStr}T${endTime}`,
            breakMinutes,
            distanceKm,
            travelCosts,
            expenses,
            notes,
        };

        setIsSubmitting(true);
        setError("");

        try {
            if (existingEntry && existingEntry.id) {
                await updateTimeEntry(existingEntry.id, data);
            } else {
                await registerTimeEntry(data);
            }
            onEntrySaved();
        } catch (err) {
            console.error(err);
            setError("Fout bij opslaan van de uren");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="text-center">
                    <div className="loading loading-spinner loading-lg text-elmar-primary mb-4"></div>
                    <p className="text-gray-600">Gegevens laden...</p>
                </div>
            </div>
        );
    }

    if (error && !selectedProject) {
        return (
            <div className="text-center py-8">
                <div className="alert alert-error rounded-xl mb-4">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                    <span>{error}</span>
                </div>
                <button
                    className="btn btn-outline rounded-xl"
                    onClick={onClose}
                >
                    Sluiten
                </button>
            </div>
        );
    }

    const assignedCompanies = assignedProjects
        .filter(ap => ap.project?.projectGroup?.company)
        .map(ap => ({
            id: ap.project?.projectGroup?.company?.id || 0,
            name: ap.project?.projectGroup?.company?.name || ""
        }))
        .filter((company, index, self) =>
            index === self.findIndex(c => c.id === company.id)
        );

    const isFormValid = selectedProject && startTime && endTime && calculatedHours > 0;

    return (
        <div className="space-y-6">
            {/* Project Selection */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FolderIcon className="w-5 h-5 text-blue-600" />
                    Project Selectie
                </h3>

                <div className="grid grid-cols-1 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                                <BuildingOfficeIcon className="w-4 h-4" />
                                Bedrijf
                            </span>
                        </label>
                        <select
                            className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                            value={selectedCompany ?? ""}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedCompany(val ? Number(val) : null);
                                setSelectedProjectGroup(null);
                                setSelectedProject(null);
                            }}
                        >
                            <option value="">-- Kies een bedrijf --</option>
                            {localStorage.getItem("userRank") === "admin" || localStorage.getItem("userRank") === "manager"
                                ? companies.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))
                                : assignedCompanies.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))
                            }
                        </select>
                    </div>

                    {selectedCompany && (
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold text-gray-700">Projectgroep</span>
                            </label>
                            <select
                                className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                                value={selectedProjectGroup ?? ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedProjectGroup(val ? Number(val) : null);
                                    // Only reset project if not editing existing entry
                                    if (!existingEntry) {
                                        setSelectedProject(null);
                                    }
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

                    {selectedProjectGroup && (
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold text-gray-700">Project</span>
                            </label>
                            <select
                                className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                                value={selectedProject ?? ""}
                                onChange={(e) => setSelectedProject(e.target.value ? Number(e.target.value) : null)}
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
                </div>
            </div>

            {/* Time Registration */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-green-600" />
                    Tijd Registratie (kwartierprecisie)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold text-gray-700">⏰ Starttijd</span>
                        </label>
                        <select
                            className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        >
                            {timeOptions.map((time) => (
                                <option key={time} value={time}>
                                    {formatDisplayTime(time)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold text-gray-700">⏰ Eindtijd</span>
                        </label>
                        <select
                            className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        >
                            {timeOptions.map((time) => (
                                <option key={time} value={time}>
                                    {formatDisplayTime(time)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold text-gray-700">☕ Pauze</span>
                        </label>
                        <select
                            className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                            value={breakMinutes}
                            onChange={(e) => setBreakMinutes(Number(e.target.value))}
                        >
                            <option value={0}>Geen pauze</option>
                            <option value={15}>15 min</option>
                            <option value={30}>30 min</option>
                            <option value={45}>45 min</option>
                            <option value={60}>1 uur</option>
                        </select>
                    </div>
                </div>

                {/* Hours Display */}
                <div className="mt-4 p-4 bg-white/80 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">Totaal werkuren:</span>
                        <span className="text-2xl font-bold text-elmar-primary">
                            {formatHours(calculatedHours)}
                        </span>
                    </div>
                    {calculatedHours < 0.25 && startTime && endTime && (
                        <p className="text-xs text-orange-600 mt-1">⚠️ Minder dan een kwartier</p>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                        Tijd wordt automatisch afgerond op kwartiertjes
                    </div>
                </div>
            </div>

            {/* Additional Info */}
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <CurrencyEuroIcon className="w-5 h-5 text-purple-600" />
                    Aanvullende Gegevens
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold text-gray-700">🚗 Afstand (km)</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                            value={distanceKm}
                            onChange={(e) => setDistanceKm(Number(e.target.value))}
                            placeholder="0"
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold text-gray-700">💰 Reiskosten (€)</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                            value={travelCosts}
                            onChange={(e) => setTravelCosts(Number(e.target.value))}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold text-gray-700">🧾 Onkosten (€)</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                            value={expenses}
                            onChange={(e) => setExpenses(Number(e.target.value))}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                            <DocumentTextIcon className="w-4 h-4" />
                            Opmerkingen
                        </span>
                    </label>
                    <textarea
                        className="textarea textarea-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl h-20"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Eventuele opmerkingen over je werkdag..."
                        maxLength={500}
                    />
                    <label className="label">
                        <span className="label-text-alt text-gray-500">{notes.length}/500 karakters</span>
                    </label>
                </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <LightBulbIcon className="w-5 h-5 text-yellow-600" />
                    Uren Registratie Tips
                </h4>
                <div className="text-sm text-gray-700 space-y-1">
                    <p>• Tijden worden automatisch afgerond op kwartiertjes (0:15, 0:30, 0:45, 1:00)</p>
                    <p>• Minimaal een kwartier (0¼u) kan geregistreerd worden</p>
                    <p>• Vergeet niet je pauzetijd in te vullen voor nauwkeurige berekening</p>
                    <p>• Reiskosten en onkosten zijn optioneel en kunnen later worden toegevoegd</p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="alert alert-error rounded-xl animate-slide-up">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                    <span>{error}</span>
                </div>
            )}

            {/* Validation Messages */}
            {!selectedProject && (
                <div className="alert alert-warning rounded-xl">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                    <span>Selecteer eerst een project om door te gaan</span>
                </div>
            )}

            {calculatedHours > 0 && calculatedHours < 0.25 && (
                <div className="alert alert-warning rounded-xl">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                    <span>Minimum registratie is een kwartier (0¼u)</span>
                </div>
            )}

            {calculatedHours >= 12 && (
                <div className="alert alert-warning rounded-xl">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                    <span>Let op: Je registreert meer dan 12 uur. Controleer of dit correct is.</span>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                    className="btn btn-outline rounded-xl flex-1"
                    onClick={onClose}
                    disabled={isSubmitting}
                >
                    Annuleren
                </button>

                {existingEntry && (
                    <button
                        className="btn btn-error rounded-xl"
                        onClick={() => {
                            if (confirm("Weet je zeker dat je deze urenregistratie wilt verwijderen?")) {
                                // Handle delete - you'll need to implement this
                                onClose();
                            }
                        }}
                        disabled={isSubmitting}
                        title="Verwijderen"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                )}

                <button
                    className="btn bg-gradient-elmar border-0 text-white rounded-xl flex-1 hover:scale-105 hover:shadow-elmar-hover transition-all duration-200 disabled:opacity-50 disabled:transform-none"
                    onClick={handleSave}
                    disabled={!isFormValid || isSubmitting || calculatedHours < 0.25}
                >
                    {isSubmitting ? (
                        <div className="flex items-center gap-2">
                            <span className="loading loading-spinner loading-sm"></span>
                            {existingEntry ? "Bijwerken..." : "Opslaan..."}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5" />
                            {existingEntry ? `Bijwerken (${formatHours(calculatedHours)})` : `Uren Opslaan (${formatHours(calculatedHours)})`}
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
}