// Fix voor TimeEntryForm.tsx - Vervang de 'any' types door specifieke types

"use client";
import React, { useEffect, useState } from "react";
import { Dayjs } from "dayjs";
import { getCompanies, getProjectGroups, getProjects, registerTimeEntry, getUserProjects } from "@/lib/api";
import { XMarkIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { Company, ProjectGroup, Project, UserProject } from "@/lib/types";

interface TimeEntryFormProps {
    day: Dayjs;
    onClose: () => void;
    onEntrySaved: () => void;
}

export default function TimeEntryForm({ day, onClose, onEntrySaved }: TimeEntryFormProps) {
    // Data voor select-lijsten
    const [companies, setCompanies] = useState<Company[]>([]);
    const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [assignedProjects, setAssignedProjects] = useState<UserProject[]>([]);

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Haal de huidige gebruiker op uit localStorage
                const userId = Number(localStorage.getItem("userId"));
                if (!userId) {
                    setError("Gebruiker niet gevonden");
                    return;
                }

                // Haal alle bedrijven op voor de dropdown
                const companiesData = await getCompanies();
                setCompanies(companiesData);

                // Haal de projecten op waaraan de gebruiker is toegewezen
                const userProjectsData = await getUserProjects(userId);
                setAssignedProjects(userProjectsData);

                // Controleer of de gebruiker een admin/manager is
                const userRank = localStorage.getItem("userRank");
                const isAdminOrManager = userRank === "admin" || userRank === "manager";

                // Als de gebruiker admin/manager is, laat dan alle projecten zien
                if (isAdminOrManager) {
                    // Haal normale gegevens op
                } else if (userProjectsData.length === 0) {
                    setError("Je bent niet toegewezen aan projecten. Neem contact op met een beheerder.");
                }
            } catch (error) {
                console.error("Error fetching initial data:", error);
                setError("Fout bij het ophalen van gegevens");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedCompany) {
            const fetchProjectGroups = async () => {
                try {
                    const data = await getProjectGroups(selectedCompany);

                    // Filter projectgroepen op basis van toegewezen projecten
                    const userRank = localStorage.getItem("userRank");
                    const isAdminOrManager = userRank === "admin" || userRank === "manager";

                    if (isAdminOrManager) {
                        // Admins en managers zien alle projectgroepen
                        setProjectGroups(data);
                    } else {
                        // Reguliere gebruikers zien alleen projectgroepen waar ze toegang toe hebben
                        const assignedProjectGroupIds = assignedProjects
                            .filter(ap => ap.project?.projectGroup?.company?.id === selectedCompany)
                            .map(ap => ap.project?.projectGroup?.id);

                        const filteredGroups = data.filter(group =>
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

        setSelectedProjectGroup(null);
        setSelectedProject(null);
    }, [selectedCompany, assignedProjects]);

    useEffect(() => {
        if (selectedProjectGroup) {
            const fetchProjects = async () => {
                try {
                    const data = await getProjects(selectedProjectGroup);

                    // Filter projecten op basis van toegewezen projecten
                    const userRank = localStorage.getItem("userRank");
                    const isAdminOrManager = userRank === "admin" || userRank === "manager";

                    if (isAdminOrManager) {
                        // Admins en managers zien alle projecten
                        setProjects(data);
                    } else {
                        // Reguliere gebruikers zien alleen projecten waar ze toegang toe hebben
                        const assignedProjectIds = assignedProjects
                            .map(ap => ap.projectId);

                        const filteredProjects = data.filter(project =>
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
        }

        setSelectedProject(null);
    }, [selectedProjectGroup, assignedProjects]);

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

        // Controleer of gebruiker toegang heeft tot dit project
        const userRank = localStorage.getItem("userRank");
        const isAdminOrManager = userRank === "admin" || userRank === "manager";

        if (!isAdminOrManager) {
            const hasAccess = assignedProjects.some(ap => ap.projectId === selectedProject);
            if (!hasAccess) {
                alert("Je hebt geen toegang tot dit project");
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

        try {
            await registerTimeEntry(data);
            onEntrySaved();
        } catch (err) {
            console.error(err);
            alert("Fout bij opslaan");
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="loading loading-spinner loading-lg"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">{day.format("dddd D MMMM YYYY")}</h2>
                    <button className="btn btn-sm btn-outline" onClick={onClose}>
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-error mb-4">{error}</p>
                        <button className="btn btn-outline" onClick={onClose}>
                            Sluiten
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Maak lijsten van unieke bedrijven uit de toegewezen projecten
    const assignedCompanies = assignedProjects
        .filter(ap => ap.project?.projectGroup?.company)
        .map(ap => ({
            id: ap.project?.projectGroup?.company?.id || 0,
            name: ap.project?.projectGroup?.company?.name || ""
        }))
        .filter((company, index, self) =>
            index === self.findIndex(c => c.id === company.id)
        );

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
                        {/* Toon voor reguliere gebruikers alleen toegewezen bedrijven */}
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
            <button
                className="btn btn-accent w-full"
                onClick={handleSave}
                disabled={!selectedProject}
            >
                Opslaan
            </button>
        </div>
    );
}