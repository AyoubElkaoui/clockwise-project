"use client";
import React, { useEffect, useState } from "react";
import { Dayjs } from "dayjs";
import { getCompanies, getProjectGroups, getProjects, registerTimeEntry, updateTimeEntry, getUserProjects, getTimeEntries } from "@/lib/api";
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
    TrashIcon,
    PaperAirplaneIcon,
    BookmarkIcon
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
    const [existingDayHours, setExistingDayHours] = useState(0); // NEW: Voor 24-uur validatie

    // FIX: Initialize with existing entry values if editing
    const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
    const [selectedProjectGroup, setSelectedProjectGroup] = useState<number | null>(null);
    const [selectedProject, setSelectedProject] = useState<number | null>(null);

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

    // Generate time options in 15-minute intervals - EXTENDED HOURS
    const generateTimeOptions = () => {
        const options = [];
        // Start van 05:00 tot 23:45 voor overwerk mogelijkheden
        for (let hour = 5; hour <= 23; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                options.push(timeStr);
            }
        }
        // Voeg ook middernacht toe
        options.push("00:00");
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

        // Use decimal notation instead of fractions
        if (roundedHours % 1 === 0) {
            // Whole number
            return `${roundedHours}u`;
        } else {
            // Decimal with 2 decimal places, then remove trailing zeros
            return `${roundedHours.toFixed(2).replace(/\.?0+$/, '')}u`;
        }
    };

    // NEW: Fetch existing hours for 24-hour validation
    const fetchExistingDayHours = async () => {
        try {
            const userId = Number(localStorage.getItem("userId"));
            const entries = await getTimeEntries();
            const dayStr = day.format("YYYY-MM-DD");

            let totalHours = 0;
            entries.forEach((entry: TimeEntry) => {
                const entryDate = dayjs(entry.startTime).format("YYYY-MM-DD");
                // Skip the current entry if editing
                if (entryDate === dayStr && entry.userId === userId && entry.id !== existingEntry?.id) {
                    const start = dayjs(entry.startTime);
                    const end = dayjs(entry.endTime);
                    const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
                    if (diffMin > 0) {
                        totalHours += diffMin / 60;
                    }
                }
            });

            setExistingDayHours(totalHours);
        } catch (error) {
            console.error("Error fetching existing day hours:", error);
            setExistingDayHours(0);
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const userId = Number(localStorage.getItem("userId"));
                if (!userId) {
                    setError("Gebruiker niet gevonden");
                    return;
                }

                console.log("🔄 Fetching initial data...");

                // Fetch companies
                const companiesData = await getCompanies();
                console.log("📊 Companies loaded:", companiesData.length);
                setCompanies(companiesData);

                // Fetch user's assigned projects
                const userProjectsData = await getUserProjects(userId);
                console.log("🔗 User projects loaded:", userProjectsData.length);
                setAssignedProjects(userProjectsData);

                // NEW: Fetch existing hours for the day
                await fetchExistingDayHours();

                const userRank = localStorage.getItem("userRank");
                const isAdminOrManager = userRank === "admin" || userRank === "manager";

                if (!isAdminOrManager && userProjectsData.length === 0) {
                    setError("Je bent niet toegewezen aan projecten. Neem contact op met een beheerder.");
                    return;
                }

                // FIX: If editing existing entry, set the correct selections
                if (existingEntry && existingEntry.project) {
                    console.log("✏️ Setting values for existing entry:", existingEntry);

                    const companyId = existingEntry.project.projectGroup?.company?.id;
                    const projectGroupId = existingEntry.project.projectGroup?.id;
                    const projectId = existingEntry.projectId;

                    console.log("🎯 Setting IDs:", { companyId, projectGroupId, projectId });

                    if (companyId) {
                        setSelectedCompany(companyId);

                        // Load project groups for this company
                        const projectGroupsData = await getProjectGroups(companyId);
                        console.log("📂 Project groups loaded for company:", projectGroupsData.length);
                        setProjectGroups(projectGroupsData);

                        if (projectGroupId) {
                            setSelectedProjectGroup(projectGroupId);

                            // Load projects for this project group
                            const projectsData = await getProjects(projectGroupId);
                            console.log("📋 Projects loaded for group:", projectsData.length);
                            setProjects(projectsData);

                            if (projectId) {
                                console.log("✅ Setting selected project:", projectId);
                                setSelectedProject(projectId);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("❌ Error fetching initial data:", error);
                setError("Fout bij het ophalen van gegevens");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [day]); // Re-fetch when day changes

    // Handle company selection change
    useEffect(() => {
        if (selectedCompany && !existingEntry) { // Don't trigger for existing entries
            const fetchProjectGroups = async () => {
                try {
                    console.log("🏢 Loading project groups for company:", selectedCompany);
                    const data = await getProjectGroups(selectedCompany);

                    const userRank = localStorage.getItem("userRank");
                    const isAdminOrManager = userRank === "admin" || userRank === "manager";

                    if (isAdminOrManager) {
                        console.log("👑 Admin/Manager: showing all project groups");
                        setProjectGroups(data);
                    } else {
                        // Filter to only show project groups the user has access to
                        const assignedProjectGroupIds = assignedProjects
                            .filter(ap => ap.project?.projectGroup?.company?.id === selectedCompany)
                            .map(ap => ap.project?.projectGroup?.id);

                        const filteredGroups = data.filter((group: ProjectGroup) =>
                            assignedProjectGroupIds.includes(group.id)
                        );
                        console.log("👤 User: filtered project groups:", filteredGroups.length);
                        setProjectGroups(filteredGroups);
                    }

                    // Reset project group and project selections when company changes
                    setSelectedProjectGroup(null);
                    setSelectedProject(null);
                    setProjects([]);
                } catch (error) {
                    console.error("❌ Error fetching project groups:", error);
                }
            };
            fetchProjectGroups();
        } else if (!selectedCompany && !existingEntry) {
            // Clear dependent selections when no company is selected
            setProjectGroups([]);
            setSelectedProjectGroup(null);
            setSelectedProject(null);
            setProjects([]);
        }
    }, [selectedCompany, assignedProjects]);

    // Handle project group selection change
    useEffect(() => {
        if (selectedProjectGroup && !existingEntry) { // Don't trigger for existing entries
            const fetchProjects = async () => {
                try {
                    console.log("📂 Loading projects for project group:", selectedProjectGroup);
                    const data = await getProjects(selectedProjectGroup);

                    const userRank = localStorage.getItem("userRank");
                    const isAdminOrManager = userRank === "admin" || userRank === "manager";

                    if (isAdminOrManager) {
                        console.log("👑 Admin/Manager: showing all projects");
                        setProjects(data);
                    } else {
                        // Filter to only show projects the user has access to
                        const assignedProjectIds = assignedProjects.map(ap => ap.projectId);
                        const filteredProjects = data.filter((project: Project) =>
                            assignedProjectIds.includes(project.id)
                        );
                        console.log("👤 User: filtered projects:", filteredProjects.length);
                        setProjects(filteredProjects);
                    }

                    // Reset project selection when project group changes
                    setSelectedProject(null);
                } catch (error) {
                    console.error("❌ Error fetching projects:", error);
                }
            };
            fetchProjects();
        } else if (!selectedProjectGroup && !existingEntry) {
            // Clear projects when no project group is selected
            setProjects([]);
            setSelectedProject(null);
        }
    }, [selectedProjectGroup, assignedProjects]);

    useEffect(() => {
        const dayStr = day.format("YYYY-MM-DD");
        const startDT = dayjs(`${dayStr}T${startTime}`);
        let endDT = dayjs(`${dayStr}T${endTime}`);

        // Handle overnight shifts (eindtijd volgende dag)
        if (endDT.isBefore(startDT) || endDT.isSame(startDT)) {
            endDT = endDT.add(1, 'day');
        }

        if (endDT.isAfter(startDT)) {
            const diffMin = endDT.diff(startDT, "minute") - breakMinutes;
            const hours = diffMin > 0 ? diffMin / 60 : 0;
            // Round to nearest quarter hour
            setCalculatedHours(Math.round(hours * 4) / 4);
        } else {
            setCalculatedHours(0);
        }
    }, [startTime, endTime, breakMinutes, day]);

    // NEW: Check 24-hour limit
    const totalDayHours = existingDayHours + calculatedHours;
    const exceeds24Hours = totalDayHours > 24;

    // NEW: Save functions for draft and submit
    const handleSave = async (saveType: 'draft' | 'submit') => {
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
        if (exceeds24Hours) {
            setError(`Maximaal 24 uur per dag. Al geregistreerd: ${existingDayHours.toFixed(2)}u, nieuw: ${calculatedHours.toFixed(2)}u`);
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

        // Handle overnight shifts
        let endTimeFormatted = `${dayStr}T${endTime}`;
        const startTimeFormatted = `${dayStr}T${startTime}`;

        // If end time is before start time, it's next day
        if (endTime <= startTime) {
            const nextDay = dayjs(dayStr).add(1, 'day').format("YYYY-MM-DD");
            endTimeFormatted = `${nextDay}T${endTime}`;
        }

        const data = {
            userId,
            projectId: selectedProject,
            startTime: startTimeFormatted,
            endTime: endTimeFormatted,
            breakMinutes,
            distanceKm,
            travelCosts,
            expenses,
            notes,
            status: saveType === 'submit' ? 'ingediend' : 'concept' // NEW: Status based on save type
        };

        setIsSubmitting(true);
        setError("");

        try {
            if (existingEntry && existingEntry.id) {
                console.log("✏️ Updating existing entry:", existingEntry.id);
                await updateTimeEntry(existingEntry.id, data);
            } else {
                console.log("💾 Creating new entry");
                await registerTimeEntry(data);
            }
            onEntrySaved();
        } catch (err) {
            console.error("❌ Save error:", err);
            setError("Fout bij opslaan van de uren");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle company change
    const handleCompanyChange = (companyId: string) => {
        console.log("🏢 Company changed to:", companyId);
        const id = companyId ? Number(companyId) : null;
        setSelectedCompany(id);
        // Reset dependent selections
        setSelectedProjectGroup(null);
        setSelectedProject(null);
        setProjectGroups([]);
        setProjects([]);
    };

    // Handle project group change
    const handleProjectGroupChange = (projectGroupId: string) => {
        console.log("📂 Project group changed to:", projectGroupId);
        const id = projectGroupId ? Number(projectGroupId) : null;
        setSelectedProjectGroup(id);
        // Reset dependent selection
        setSelectedProject(null);
        setProjects([]);
    };

    // Handle project change
    const handleProjectChange = (projectId: string) => {
        console.log("📋 Project changed to:", projectId);
        const id = projectId ? Number(projectId) : null;
        setSelectedProject(id);
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

    const isFormValid = selectedProject && startTime && endTime && calculatedHours > 0 && !exceeds24Hours;

    return (
        <div className="space-y-6">
            {/* 24-hour warning */}
            {existingDayHours > 0 && (
                <div className={`alert ${exceeds24Hours ? 'alert-error' : 'alert-warning'} rounded-xl`}>
                    <ExclamationTriangleIcon className="w-6 h-6" />
                    <div>
                        <div className="font-semibold">Al geregistreerd op {day.format("DD-MM-YYYY")}: {existingDayHours.toFixed(2)} uur</div>
                        <div className="text-sm">
                            Nieuw: {calculatedHours.toFixed(2)}u | Totaal: {totalDayHours.toFixed(2)}u / 24u
                        </div>
                    </div>
                </div>
            )}

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
                            onChange={(e) => handleCompanyChange(e.target.value)}
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
                        {selectedCompany && (
                            <div className="text-sm text-success mt-1">
                                ✅ Bedrijf geselecteerd
                            </div>
                        )}
                    </div>

                    {selectedCompany && (
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold text-gray-700">Projectgroep</span>
                            </label>
                            <select
                                className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary rounded-xl"
                                value={selectedProjectGroup ?? ""}
                                onChange={(e) => handleProjectGroupChange(e.target.value)}
                                disabled={projectGroups.length === 0}
                            >
                                <option value="">-- Kies een projectgroep --</option>
                                {projectGroups.map((pg) => (
                                    <option key={pg.id} value={pg.id}>
                                        {pg.name}
                                    </option>
                                ))}
                            </select>
                            {projectGroups.length === 0 && selectedCompany && (
                                <div className="text-sm text-warning mt-1">
                                    ⚠️ Geen projectgroepen gevonden
                                </div>
                            )}
                            {selectedProjectGroup && (
                                <div className="text-sm text-success mt-1">
                                    ✅ Projectgroep geselecteerd
                                </div>
                            )}
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
                                onChange={(e) => handleProjectChange(e.target.value)}
                                disabled={projects.length === 0}
                            >
                                <option value="">-- Kies een project --</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            {projects.length === 0 && selectedProjectGroup && (
                                <div className="text-sm text-warning mt-1">
                                    ⚠️ Geen projecten gevonden voor deze groep
                                </div>
                            )}
                            {selectedProject && (
                                <div className="text-sm text-success mt-1">
                                    ✅ Project geselecteerd
                                </div>
                            )}
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
                            <option value={75}>1u 15min</option>
                            <option value={90}>1u 30min</option>
                            <option value={105}>1u 45min</option>
                            <option value={120}>2 uur</option>
                        </select>
                    </div>
                </div>

                {/* Hours Display with Save Button */}
                <div className="mt-4 p-4 bg-gradient-elmar text-white rounded-xl border border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="font-semibold text-blue-100">Totaal werkuren:</span>
                            <div className="text-3xl font-bold mt-1">
                                {formatHours(calculatedHours)}
                            </div>
                        </div>

                        {/* Quick Save Button */}
                        {isFormValid && calculatedHours >= 0.25 && (
                            <button
                                className="btn btn-success rounded-xl hover:scale-105 transition-all duration-200"
                                onClick={() => handleSave('submit')}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="loading loading-spinner loading-sm"></span>
                                ) : (
                                    <>
                                        <CheckCircleIcon className="w-5 h-5 mr-1" />
                                        Opslaan
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="mt-2 space-y-1 text-blue-100 text-sm">
                        {calculatedHours < 0.25 && startTime && endTime && (
                            <p>⚠️ Minder dan een kwartier</p>
                        )}
                        {calculatedHours > 16 && (
                            <p>⚠️ Meer dan 16 uur - controleer of dit correct is</p>
                        )}
                        {endTime <= startTime && calculatedHours > 0 && (
                            <p>🌙 Nachtdienst - eindigt volgende dag</p>
                        )}
                        {!exceeds24Hours && calculatedHours > 0 && (
                            <p>Tijd wordt afgerond op kwartiertjes (0.25u)</p>
                        )}
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
                    <p>• Tijden worden automatisch afgerond op kwartiertjes (0.25, 0.5, 0.75, 1.0)</p>
                    <p>• Minimaal een kwartier (0.25u) kan geregistreerd worden</p>
                    <p>• Voor nachtdiensten: eindtijd mag voor starttijd staan (dan is het volgende dag)</p>
                    <p>• Vergeet niet je pauzetijd in te vullen voor nauwkeurige berekening</p>
                    <p>• Bij overwerk (12+ uur): zorg voor voldoende pauzes</p>
                    <p>• <strong>Maximaal 24 uur per dag</strong> over alle projecten heen</p>
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
                    <span>Minimum registratie is een kwartier (0.25u)</span>
                </div>
            )}

            {calculatedHours >= 16 && (
                <div className="alert alert-warning rounded-xl">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                    <span>Let op: Je registreert meer dan 16 uur. Zorg voor voldoende pauzes en check of dit correct is.</span>
                </div>
            )}

            {endTime <= startTime && calculatedHours > 0 && (
                <div className="alert alert-info rounded-xl">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                    <span>🌙 Nachtdienst gedetecteerd - werk eindigt {dayjs(`2024-01-01T${endTime}`).format('HH:mm')} de volgende dag</span>
                </div>
            )}

            {exceeds24Hours && (
                <div className="alert alert-error rounded-xl">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                    <span>⚠️ Maximaal 24 uur per dag toegestaan!</span>
                </div>
            )}

            {/* Status explanation */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                    Opslaan vs Indienen
                </h4>
                <div className="text-sm text-gray-700 space-y-1">
                    <p>• <strong>Opslaan als Concept:</strong> Uren worden opgeslagen maar kunnen nog bewerkt worden. Niet zichtbaar voor managers.</p>
                    <p>• <strong>Uren Indienen:</strong> Uren worden naar de manager gestuurd voor goedkeuring. Kunnen niet meer bewerkt worden.</p>
                    <p>• <strong>Snelle opslaan:</strong> Gebruik de opslaan knop naast de uren voor directe indiening.</p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                    className="btn btn-outline rounded-xl"
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

                {/* Save as Draft Button */}
                <button
                    className="btn btn-outline btn-primary rounded-xl hover:scale-105 transition-all duration-200"
                    onClick={() => handleSave('draft')}
                    disabled={!isFormValid || isSubmitting || calculatedHours < 0.25}
                >
                    {isSubmitting ? (
                        <div className="flex items-center gap-2">
                            <span className="loading loading-spinner loading-sm"></span>
                            Opslaan...
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <BookmarkIcon className="w-5 h-5" />
                            Opslaan als Concept
                        </div>
                    )}
                </button>

                {/* Submit Button */}
                <button
                    className="btn bg-gradient-elmar border-0 text-white rounded-xl hover:scale-105 hover:shadow-elmar-hover transition-all duration-200 disabled:opacity-50 disabled:transform-none"
                    onClick={() => handleSave('submit')}
                    disabled={!isFormValid || isSubmitting || calculatedHours < 0.25}
                >
                    {isSubmitting ? (
                        <div className="flex items-center gap-2">
                            <span className="loading loading-spinner loading-sm"></span>
                            Indienen...
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <PaperAirplaneIcon className="w-5 h-5" />
                            Uren Indienen ({formatHours(calculatedHours)})
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
}