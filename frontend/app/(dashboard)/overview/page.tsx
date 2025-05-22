"use client";
import React, { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { getTimeEntries } from "@/lib/api";
import { TimeEntry } from "@/lib/types";

dayjs.extend(isBetween);

const PAGE_SIZE = 10;

export default function UrenOverzicht() {
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([]);
    const [startDate, setStartDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
    const [endDate, setEndDate] = useState(dayjs().endOf("month").format("YYYY-MM-DD"));
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedCompany, setSelectedCompany] = useState("");
    const [projectOptions, setProjectOptions] = useState<string[]>([]);
    const [companyOptions, setCompanyOptions] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    const safeToFixed = (value: any, decimals: number = 2): string => {
        if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
            return value.toFixed(decimals);
        }
        return '0.' + '0'.repeat(decimals);
    };

    const filterData = useCallback(() => {
        try {
            const start = dayjs(startDate).startOf("day");
            const end = dayjs(endDate).endOf("day");

            let result: TimeEntry[] = [];
            for (const entry of entries) {
                try {
                    const entryDate = dayjs(entry.startTime);
                    if (entryDate.isBetween(start, end, "day", "[]")) {
                        result.push(entry);
                    }
                } catch (error) {
                    console.warn('Date filtering error for entry:', entry, error);
                }
            }

            if (selectedProject) {
                const temp: TimeEntry[] = [];
                for (const entry of result) {
                    if (entry.project?.name === selectedProject) {
                        temp.push(entry);
                    }
                }
                result = temp;
            }

            if (selectedCompany) {
                const temp: TimeEntry[] = [];
                for (const entry of result) {
                    if (entry.project?.projectGroup?.company?.name === selectedCompany) {
                        temp.push(entry);
                    }
                }
                result = temp;
            }

            setFilteredEntries(result);
            setCurrentPage(1);
        } catch (error) {
            console.error('Filter data error:', error);
            setFilteredEntries([]);
        }
    }, [entries, startDate, endDate, selectedProject, selectedCompany]);

    useEffect(() => {
        async function fetchData() {
            try {
                const data = await getTimeEntries();
                let safeData: TimeEntry[] = [];
                if (Array.isArray(data)) {
                    safeData = data;
                }
                setEntries(safeData);
            } catch (error) {
                console.error("Fout bij ophalen van time entries:", error);
                setEntries([]);
            }
        }
        fetchData();
    }, []);

    useEffect(() => {
        try {
            const projectsSet = new Set<string>();
            const companiesSet = new Set<string>();

            for (const entry of entries) {
                try {
                    if (entry && entry.project && entry.project.name) {
                        projectsSet.add(entry.project.name);
                    }
                    const compName = entry?.project?.projectGroup?.company?.name;
                    if (compName) {
                        companiesSet.add(compName);
                    }
                } catch (error) {
                    console.warn('Error processing entry for options:', entry, error);
                }
            }

            setProjectOptions(Array.from(projectsSet));
            setCompanyOptions(Array.from(companiesSet));
        } catch (error) {
            console.error('Error setting options:', error);
            setProjectOptions([]);
            setCompanyOptions([]);
        }
    }, [entries]);

    useEffect(() => {
        filterData();
    }, [entries, startDate, endDate, selectedProject, selectedCompany, filterData]);

    // Safe hours calculation
    let totalHours = 0;
    for (const entry of filteredEntries) {
        try {
            if (!entry || !entry.startTime || !entry.endTime) continue;
            const start = dayjs(entry.startTime);
            const end = dayjs(entry.endTime);
            const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
            if (diffMin > 0) totalHours += diffMin / 60;
        } catch (error) {
            console.warn('Error calculating hours for entry:', entry, error);
        }
    }

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
            <div className="card bg-base-100 shadow-lg mb-6">
                <div className="card-body">
                    <h1 className="card-title text-3xl font-bold">Uren Overzicht</h1>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
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
                                {projectOptions.map((proj, index) => (
                                    <option key={proj || index} value={proj}>
                                        {proj}
                                    </option>
                                ))}
                            </select>
                        </div>
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
                                {companyOptions.map((comp, index) => (
                                    <option key={comp || index} value={comp}>
                                        {comp}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="font-semibold">
                            Totaal uren in periode: {safeToFixed(totalHours)} uur
                        </p>
                    </div>
                </div>
            </div>

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
                            {pageEntries.map((entry, index) => {
                                try {
                                    const start = dayjs(entry.startTime);
                                    const end = dayjs(entry.endTime);
                                    const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
                                    const hours = diffMin > 0 ? (diffMin / 60) : 0;

                                    return (
                                        <tr key={entry.id || index}>
                                            <td>{start.format("YYYY-MM-DD")}</td>
                                            <td>{start.format("HH:mm")}</td>
                                            <td>{end.format("HH:mm")}</td>
                                            <td>{safeToFixed(hours)}</td>
                                            <td>{entry.project?.projectGroup?.company?.name || "Onbekend bedrijf"}</td>
                                            <td>{entry.notes || ""}</td>
                                        </tr>
                                    );
                                } catch (error) {
                                    console.warn('Error rendering entry:', entry, error);
                                    return (
                                        <tr key={index}>
                                            <td colSpan={7}>Error loading entry</td>
                                        </tr>
                                    );
                                }
                            })}
                            </tbody>
                        </table>
                    </div>
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
