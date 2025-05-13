"use client";
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { getTimeEntries } from "@/lib/api";

dayjs.extend(isBetween);

export interface TimeEntry {
    id: number;
    userId: number;
    projectId: number;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    distanceKm: number;
    travelCosts: number;
    expenses: number;
    notes: string;
    project?: {
        name: string;
        projectGroup?: {
            company?: {
                name: string;
            };
        };
    };
}

const PAGE_SIZE = 10;

export default function UrenOverzicht() {
    // State voor de ruwe entries en gefilterde entries
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([]);

    // Datumfilters: standaard huidige maand
    const [startDate, setStartDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
    const [endDate, setEndDate] = useState(dayjs().endOf("month").format("YYYY-MM-DD"));

    // Extra filters: project en bedrijf
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedCompany, setSelectedCompany] = useState("");

    // Dropdown opties (afgeleid uit de entries)
    const [projectOptions, setProjectOptions] = useState<string[]>([]);
    const [companyOptions, setCompanyOptions] = useState<string[]>([]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);

    // Haal de entries op wanneer de component mount
    useEffect(() => {
        async function fetchData() {
            try {
                const data = await getTimeEntries();
                setEntries(data ?? []);
            } catch (error) {
                console.error("Fout bij ophalen van time entries:", error);
            }
        }
        fetchData();
    }, []);

    // Stel de dropdown opties in op basis van de opgehaalde entries
    useEffect(() => {
        const projectsSet = new Set<string>();
        const companiesSet = new Set<string>();
        entries.forEach((entry) => {
            if (entry.project?.name) {
                projectsSet.add(entry.project.name);
            }
            const compName = entry.project?.projectGroup?.company?.name;
            if (compName) {
                companiesSet.add(compName);
            }
        });
        setProjectOptions(Array.from(projectsSet));
        setCompanyOptions(Array.from(companiesSet));
    }, [entries]);

    // Filter de data telkens wanneer de entries of de filters wijzigen
    useEffect(() => {
        filterData();
    }, [entries, startDate, endDate, selectedProject, selectedCompany]);

    function filterData() {
        const start = dayjs(startDate).startOf("day");
        const end = dayjs(endDate).endOf("day");

        let result = entries.filter((entry) => {
            const entryDate = dayjs(entry.startTime);
            return entryDate.isBetween(start, end, "day", "[]");
        });

        if (selectedProject) {
            result = result.filter((entry) => entry.project?.name === selectedProject);
        }
        if (selectedCompany) {
            result = result.filter(
                (entry) => entry.project?.projectGroup?.company?.name === selectedCompany
            );
        }
        setFilteredEntries(result);
        setCurrentPage(1);
    }

    // Bereken het totaal aantal uren voor de gefilterde periode
    const totalHours = filteredEntries.reduce((acc, entry) => {
        const start = dayjs(entry.startTime);
        const end = dayjs(entry.endTime);
        const diffMin = end.diff(start, "minute") - entry.breakMinutes;
        return acc + (diffMin > 0 ? diffMin / 60 : 0);
    }, 0);

    // Bereken de paginering
    const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
    const pageStartIndex = (currentPage - 1) * PAGE_SIZE;
    const pageEntries = filteredEntries.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);

    function goToPage(page: number) {
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        setCurrentPage(page);
    }

    return (
        <div className="container mx-auto p-4">
            {/* Filtercard */}
            <div className="card bg-base-100 shadow-lg mb-6">
                <div className="card-body">
                    <h1 className="card-title text-3xl font-bold">Uren Overzicht</h1>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                        {/* Startdatum */}
                        <div>
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
                        {/* Einddatum */}
                        <div>
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
                        {/* Project filter */}
                        <div>
                            <label className="label">
                                <span className="label-text font-semibold">Project</span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                            >
                                <option value="">(Alle)</option>
                                {projectOptions.map((proj) => (
                                    <option key={proj} value={proj}>
                                        {proj}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Bedrijf filter */}
                        <div>
                            <label className="label">
                                <span className="label-text font-semibold">Bedrijf</span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={selectedCompany}
                                onChange={(e) => setSelectedCompany(e.target.value)}
                            >
                                <option value="">(Alle)</option>
                                {companyOptions.map((comp) => (
                                    <option key={comp} value={comp}>
                                        {comp}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="font-semibold">
                            Totaal uren in periode: {totalHours.toFixed(2)} uur
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabelcard */}
            <div className="card bg-base-100 shadow-lg">
                <div className="card-body p-4">
                    <div className="overflow-x-auto">
                        <table className="table w-full table-zebra">
                            <thead>
                            <tr>
                                <th>Datum</th>
                                <th>Start</th>
                                <th>Eind</th>
                                <th>Uren</th>
                                <th>Project</th>
                                <th>Bedrijf</th>
                                <th>Notities</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pageEntries.map((entry) => {
                                const start = dayjs(entry.startTime);
                                const end = dayjs(entry.endTime);
                                const diffMin = end.diff(start, "minute") - entry.breakMinutes;
                                const hours = diffMin > 0 ? (diffMin / 60).toFixed(2) : "0.00";
                                return (
                                    <tr key={entry.id}>
                                        <td>{start.format("YYYY-MM-DD")}</td>
                                        <td>{start.format("HH:mm")}</td>
                                        <td>{end.format("HH:mm")}</td>
                                        <td>{hours}</td>
                                        <td>{entry.project?.name || "Onbekend project"}</td>
                                        <td>
                                            {entry.project?.projectGroup?.company?.name ||
                                                "Onbekend bedrijf"}
                                        </td>
                                        <td>{entry.notes}</td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                    {/* Paginering */}
                    <div className="flex gap-2 justify-center mt-4">
                        <button className="btn btn-sm" onClick={() => goToPage(currentPage - 1)}>
                            Vorige
                        </button>
                        <span className="font-semibold">
              Pagina {currentPage} / {totalPages || 1}
            </span>
                        <button className="btn btn-sm" onClick={() => goToPage(currentPage + 1)}>
                            Volgende
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
