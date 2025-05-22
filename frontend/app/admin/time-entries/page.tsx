"use client";
import { useState, useEffect } from "react";
import { getAdminTimeEntries, getTimeEntryDetails, approveTimeEntry, rejectTimeEntry } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import dayjs from "dayjs";
import ToastNotification from "@/components/ToastNotification";
import { TimeEntry, User, Project, ProjectGroup, Company } from "@/lib/types";

interface ExtendedTimeEntry extends TimeEntry {
    user: User;
    project?: Project & {
        projectGroup?: ProjectGroup & {
            company?: Company;
        };
    };
}

interface UserOption {
    id: number;
    name: string;
}

interface ProjectOption {
    id: number | undefined;
    name: string | undefined;
}

export default function AdminTimeEntriesPage() {
    const [entries, setEntries] = useState<ExtendedTimeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [entriesPerPage] = useState(20);

    const [selectedEntry, setSelectedEntry] = useState<ExtendedTimeEntry | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const [startDate, setStartDate] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [selectedUser, setSelectedUser] = useState("");
    const [selectedProject, setSelectedProject] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const data = await getAdminTimeEntries();

                // SAFE ARRAY HANDLING
                let safeData: ExtendedTimeEntry[] = [];
                if (Array.isArray(data)) {
                    safeData = data;
                } else if (data && typeof data === 'object' && Array.isArray(data.timeEntries)) {
                    safeData = data.timeEntries;
                } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
                    safeData = data.data;
                } else {
                    console.warn("Received non-array data:", data);
                    safeData = [];
                }

                setEntries(safeData);
            } catch (error) {
                console.error("Error fetching time entries:", error);
                setEntries([]);
            } finally {
                setLoading(false);
            }
        };

        fetchEntries();
    }, []);

    // Create unique lists of users and projects for filters
    const users = (() => {
        if (!Array.isArray(entries)) return [];

        try {
            const userMap = new Map<number, UserOption>();
            for (const entry of entries) {
                if (entry?.user?.id) {
                    const fullName = entry.user.fullName || `${entry.user.firstName || ''} ${entry.user.lastName || ''}`.trim();
                    userMap.set(entry.user.id, {
                        id: entry.user.id,
                        name: fullName || 'Onbekende gebruiker'
                    });
                }
            }
            return Array.from(userMap.values());
        } catch (error) {
            console.error("Error creating user options:", error);
            return [];
        }
    })();

    const projects = (() => {
        if (!Array.isArray(entries)) return [];

        try {
            const projectMap = new Map<number, ProjectOption>();
            for (const entry of entries) {
                if (entry?.project?.id && entry?.project?.name) {
                    projectMap.set(entry.project.id, {
                        id: entry.project.id,
                        name: entry.project.name
                    });
                }
            }
            return Array.from(projectMap.values());
        } catch (error) {
            console.error("Error creating project options:", error);
            return [];
        }
    })();

    // Apply filters
    const filteredEntries = (() => {
        if (!Array.isArray(entries)) return [];

        try {
            const start = dayjs(startDate).startOf("day");
            const end = dayjs(endDate).endOf("day");

            return entries.filter((entry: ExtendedTimeEntry) => {
                try {
                    if (!entry || !entry.startTime) return false;

                    const entryDate = dayjs(entry.startTime);
                    if (!entryDate.isValid()) return false;

                    const dateInRange = entryDate.isBetween(start, end, "day", "[]");
                    const userMatch = selectedUser ? entry.user?.id === parseInt(selectedUser) : true;
                    const projectMatch = selectedProject ? entry.project?.id === parseInt(selectedProject) : true;

                    const searchLower = searchTerm.toLowerCase();
                    const userName = entry.user?.fullName || `${entry.user?.firstName || ''} ${entry.user?.lastName || ''}`.trim();
                    const searchMatch = !searchTerm ||
                        (userName.toLowerCase().includes(searchLower)) ||
                        (entry.project?.name && entry.project.name.toLowerCase().includes(searchLower)) ||
                        (entry.notes && entry.notes.toLowerCase().includes(searchLower));

                    return dateInRange && userMatch && projectMatch && searchMatch;
                } catch (error) {
                    console.warn("Error filtering entry:", entry, error);
                    return false;
                }
            });
        } catch (error) {
            console.error("Error filtering entries:", error);
            return [];
        }
    })();

    // Pagination
    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = Array.isArray(filteredEntries)
        ? filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry)
        : [];
    const totalPages = Math.ceil((filteredEntries?.length || 0) / entriesPerPage);

    const handleViewDetails = async (entryId: number): Promise<void> => {
        try {
            const details = await getTimeEntryDetails(entryId);
            setSelectedEntry(details);
            setShowDetailsModal(true);
        } catch (error) {
            console.error("Error fetching time entry details:", error);
            setToastMessage("Fout bij ophalen details");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    const handleApprove = async (entryId: number): Promise<void> => {
        try {
            await approveTimeEntry(entryId);
            // Refresh data
            const updatedEntries = Array.isArray(entries)
                ? entries.map((entry: ExtendedTimeEntry) =>
                    entry.id === entryId ? {...entry, status: "goedgekeurd"} : entry
                ) : [];
            setEntries(updatedEntries);
            setToastMessage("Urenregistratie goedgekeurd");
            setToastType("success");
            setTimeout(() => setToastMessage(""), 3000);
        } catch (error) {
            console.error("Error approving time entry:", error);
            setToastMessage("Fout bij goedkeuren");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    const handleReject = async (entryId: number): Promise<void> => {
        try {
            await rejectTimeEntry(entryId);
            // Refresh data
            const updatedEntries = Array.isArray(entries)
                ? entries.map((entry: ExtendedTimeEntry) =>
                    entry.id === entryId ? {...entry, status: "afgekeurd"} : entry
                ) : [];
            setEntries(updatedEntries);
            setToastMessage("Urenregistratie afgekeurd");
            setToastType("success");
            setTimeout(() => setToastMessage(""), 3000);
        } catch (error) {
            console.error("Error rejecting time entry:", error);
            setToastMessage("Fout bij afkeuren");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">
            <div className="loading loading-spinner loading-lg"></div>
        </div>;
    }

    return (
        <AdminRoute>
            <div className="p-6">
                <h1 className="text-3xl font-bold mb-8">Uren Beheer</h1>

                <div className="card bg-base-100 shadow-xl mb-8">
                    <div className="card-body">
                        <h2 className="card-title mb-4">Filters</h2>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Startdatum</span>
                                </label>
                                <input
                                    type="date"
                                    className="input input-bordered"
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
                                    className="input input-bordered"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Medewerker</span>
                                </label>
                                <select
                                    className="select select-bordered"
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                >
                                    <option value="">Alle medewerkers</option>
                                    {Array.isArray(users) && users.map((user: UserOption) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Project</span>
                                </label>
                                <select
                                    className="select select-bordered"
                                    value={selectedProject}
                                    onChange={(e) => setSelectedProject(e.target.value)}
                                >
                                    <option value="">Alle projecten</option>
                                    {Array.isArray(projects) && projects.map((project: ProjectOption) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-control mt-4">
                            <label className="label">
                                <span className="label-text font-semibold">Zoeken</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Zoek op naam, project of notities..."
                                className="input input-bordered"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="card-actions justify-end mt-4">
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setStartDate(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
                                    setEndDate(dayjs().format('YYYY-MM-DD'));
                                    setSelectedUser("");
                                    setSelectedProject("");
                                    setSearchTerm("");
                                }}
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead>
                                <tr>
                                    <th>Datum</th>
                                    <th>Medewerker</th>
                                    <th>Bedrijf</th>
                                    <th>Project</th>
                                    <th>Start</th>
                                    <th>Eind</th>
                                    <th>Uren</th>
                                    <th>Status</th>
                                    <th>Acties</th>
                                </tr>
                                </thead>
                                <tbody>
                                {Array.isArray(currentEntries) && currentEntries.map((entry: ExtendedTimeEntry, index) => {
                                    try {
                                        if (!entry || !entry.startTime || !entry.endTime) {
                                            return (
                                                <tr key={index}>
                                                    <td colSpan={9}>Ongeldige entry</td>
                                                </tr>
                                            );
                                        }

                                        const start = dayjs(entry.startTime);
                                        const end = dayjs(entry.endTime);

                                        if (!start.isValid() || !end.isValid()) {
                                            return (
                                                <tr key={index}>
                                                    <td colSpan={9}>Ongeldige datum</td>
                                                </tr>
                                            );
                                        }

                                        const diffMin = end.diff(start, 'minute') - (entry.breakMinutes || 0);
                                        const hours = diffMin > 0 ? (diffMin / 60).toFixed(2) : "0.00";

                                        // GEFIXEERD: Juiste volgorde van bedrijf en project
                                        const companyName = entry.project?.projectGroup?.company?.name || 'Onbekend bedrijf';
                                        const projectName = entry.project?.name || 'Onbekend project';
                                        const userName = entry.user?.fullName || `${entry.user?.firstName || ''} ${entry.user?.lastName || ''}`.trim() || 'Onbekend';

                                        return (
                                            <tr key={entry.id || index}>
                                                <td>{start.format('DD-MM-YYYY')}</td>
                                                <td>{userName}</td>
                                                <td>{companyName}</td>
                                                <td>{projectName}</td>
                                                <td>{start.format('HH:mm')}</td>
                                                <td>{end.format('HH:mm')}</td>
                                                <td>{hours}</td>
                                                <td>
                                                    <span className={`badge ${
                                                        entry.status === 'ingeleverd' ? 'badge-warning' :
                                                            entry.status === 'goedgekeurd' ? 'badge-success' :
                                                                entry.status === 'afgekeurd' ? 'badge-error' :
                                                                    'badge-ghost'
                                                    }`}>
                                                        {entry.status || 'onbekend'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="btn btn-sm btn-outline"
                                                            onClick={() => handleViewDetails(entry.id as number)}
                                                        >
                                                            Bekijken
                                                        </button>
                                                        {entry.status !== 'goedgekeurd' && entry.status !== 'afgekeurd' && (
                                                            <>
                                                                <button
                                                                    className="btn btn-sm btn-success"
                                                                    onClick={() => handleApprove(entry.id as number)}
                                                                >
                                                                    Goedkeuren
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm btn-error"
                                                                    onClick={() => handleReject(entry.id as number)}
                                                                >
                                                                    Afkeuren
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    } catch (error) {
                                        console.warn('Error rendering entry:', entry, error);
                                        return (
                                            <tr key={index}>
                                                <td colSpan={9}>Error loading entry</td>
                                            </tr>
                                        );
                                    }
                                })}
                                {(!Array.isArray(currentEntries) || currentEntries.length === 0) && (
                                    <tr>
                                        <td colSpan={9} className="text-center">Geen entries gevonden</td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-4">
                                <div className="btn-group">
                                    <button
                                        className="btn btn-sm"
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        «
                                    </button>
                                    <button className="btn btn-sm">
                                        Pagina {currentPage} van {totalPages}
                                    </button>
                                    <button
                                        className="btn btn-sm"
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        »
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Details modal */}
                {showDetailsModal && selectedEntry && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
                            <h3 className="text-lg font-bold mb-4">Urenregistratie details</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p><span className="font-bold">Medewerker:</span> {selectedEntry.user?.fullName || `${selectedEntry.user?.firstName || ''} ${selectedEntry.user?.lastName || ''}`.trim() || 'Onbekend'}</p>
                                    <p><span className="font-bold">Bedrijf:</span> {selectedEntry.project?.projectGroup?.company?.name || 'Onbekend bedrijf'}</p>
                                    <p><span className="font-bold">Project:</span> {selectedEntry.project?.name || 'Onbekend project'}</p>
                                    <p><span className="font-bold">Datum:</span> {dayjs(selectedEntry.startTime).format('DD-MM-YYYY')}</p>
                                    <p><span className="font-bold">Tijd:</span> {dayjs(selectedEntry.startTime).format('HH:mm')} - {dayjs(selectedEntry.endTime).format('HH:mm')}</p>
                                </div>
                                <div>
                                    <p><span className="font-bold">Pauze:</span> {selectedEntry.breakMinutes} minuten</p>
                                    <p><span className="font-bold">Afstand:</span> {selectedEntry.distanceKm} km</p>
                                    <p><span className="font-bold">Reiskosten:</span> €{selectedEntry.travelCosts}</p>
                                    <p><span className="font-bold">Onkosten:</span> €{selectedEntry.expenses}</p>
                                    <p><span className="font-bold">Status:</span> {selectedEntry.status}</p>
                                </div>
                            </div>

                            <div className="mt-4">
                                <p><span className="font-bold">Notities:</span></p>
                                <p className="bg-gray-100 p-2 rounded">{selectedEntry.notes || 'Geen notities'}</p>
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                {selectedEntry.status !== 'goedgekeurd' && selectedEntry.status !== 'afgekeurd' && (
                                    <>
                                        <button
                                            className="btn btn-success"
                                            onClick={() => {
                                                handleApprove(selectedEntry.id as number);
                                                setShowDetailsModal(false);
                                            }}
                                        >
                                            Goedkeuren
                                        </button>
                                        <button
                                            className="btn btn-error"
                                            onClick={() => {
                                                handleReject(selectedEntry.id as number);
                                                setShowDetailsModal(false);
                                            }}
                                        >
                                            Afkeuren
                                        </button>
                                    </>
                                )}
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => setShowDetailsModal(false)}
                                >
                                    Sluiten
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {toastMessage && (
                    <ToastNotification message={toastMessage} type={toastType}/>
                )}
            </div>
        </AdminRoute>
    );
}