"use client";
import {useState, useEffect, JSX} from "react";
import { getAdminTimeEntries, getTimeEntryDetails, approveTimeEntry, rejectTimeEntry } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import dayjs from "dayjs";
import ToastNotification from "@/components/ToastNotification";
import { TimeEntry, User, Project, ProjectGroup, Company } from "@/lib/types";
import {
    ClockIcon,
    UserIcon,
    BuildingOfficeIcon,
    FolderIcon,
    CheckCircleIcon,
    XCircleIcon,
    EyeIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    CalendarDaysIcon
} from "@heroicons/react/24/outline";

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

export default function AdminTimeEntriesPage(): JSX.Element {
    const [entries, setEntries] = useState<ExtendedTimeEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [entriesPerPage] = useState<number>(20);

    const [selectedEntry, setSelectedEntry] = useState<ExtendedTimeEntry | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);

    const [startDate, setStartDate] = useState<string>(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
    const [selectedUser, setSelectedUser] = useState<string>("");
    const [selectedProject, setSelectedProject] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState<string>("");

    const [toastMessage, setToastMessage] = useState<string>("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    useEffect(() => {
        const fetchEntries = async (): Promise<void> => {
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

    // Calculate stats
    const stats = {
        total: entries.length,
        pending: entries.filter(e => e.status === 'ingeleverd').length,
        approved: entries.filter(e => e.status === 'goedgekeurd').length,
        rejected: entries.filter(e => e.status === 'afgekeurd').length,
        draft: entries.filter(e => e.status === 'opgeslagen').length
    };

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

    function goToPage(page: number): void {
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        setCurrentPage(page);
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="loading loading-spinner loading-lg text-elmar-primary mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Urenregistraties laden...</p>
                </div>
            </div>
        );
    }

    return (
        <AdminRoute>
            <div className="space-y-8">
                {/* Header Section */}
                <div className="bg-blue-600 text-white rounded-2xl p-8 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <ClockIcon className="w-8 h-8" />
                        <h1 className="text-4xl font-bold">Uren Beheer</h1>
                    </div>
                    <p className="text-blue-100 text-lg">Beheer en keur urenregistraties goed</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-600 p-3 rounded-xl">
                                <ClockIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Totaal</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-xl">
                                <ClockIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Te beoordelen</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-green-600 p-3 rounded-xl">
                                <CheckCircleIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Goedgekeurd</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.approved}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-xl">
                                <XCircleIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Afgekeurd</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.rejected}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-xl">
                                <ClockIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Concept</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.draft}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="card bg-white shadow-lg border-0 rounded-2xl">
                    <div className="card-body p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <FunnelIcon className="w-6 h-6 text-elmar-primary" />
                            <h2 className="text-2xl font-bold text-gray-800">Filters</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold text-gray-700">📅 Startdatum</span>
                                </label>
                                <input
                                    type="date"
                                    className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold text-gray-700">📅 Einddatum</span>
                                </label>
                                <input
                                    type="date"
                                    className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold text-gray-700">👤 Medewerker</span>
                                </label>
                                <select
                                    className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
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
                                    <span className="label-text font-semibold text-gray-700">📁 Project</span>
                                </label>
                                <select
                                    className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
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
                                <span className="label-text font-semibold text-gray-700">Zoeken</span>
                            </label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Zoek op naam, project of notities..."
                                    className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl pl-10 w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="card-actions justify-end mt-4">
                            <button
                                className="btn btn-primary rounded-xl"
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

                {/* Time Entries Table */}
                <div className="card bg-white shadow-lg border-0 rounded-2xl">
                    <div className="card-body p-0">
                        <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <EyeIcon className="w-6 h-6 text-elmar-primary" />
                                    <h2 className="text-2xl font-bold text-gray-800">Urenregistraties</h2>
                                    <span className="badge badge-primary">{filteredEntries.length} items</span>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-gray-700 font-semibold">📅 Datum</th>
                                    <th className="text-gray-700 font-semibold">👤 Medewerker</th>
                                    <th className="text-gray-700 font-semibold">🏢 Bedrijf</th>
                                    <th className="text-gray-700 font-semibold">📁 Project</th>
                                    <th className="text-gray-700 font-semibold">⏰ Start</th>
                                    <th className="text-gray-700 font-semibold">⏰ Eind</th>
                                    <th className="text-gray-700 font-semibold">Uren Uren</th>
                                    <th className="text-gray-700 font-semibold">Status</th>
                                    <th className="text-gray-700 font-semibold">Acties</th>
                                </tr>
                                </thead>
                                <tbody>
                                {Array.isArray(currentEntries) && currentEntries.map((entry: ExtendedTimeEntry, index) => {
                                    try {
                                        if (!entry || !entry.startTime || !entry.endTime) {
                                            return (
                                                <tr key={index}>
                                                    <td colSpan={9} className="text-center text-error">Ongeldige entry</td>
                                                </tr>
                                            );
                                        }

                                        const start = dayjs(entry.startTime);
                                        const end = dayjs(entry.endTime);

                                        if (!start.isValid() || !end.isValid()) {
                                            return (
                                                <tr key={index}>
                                                    <td colSpan={9} className="text-center text-error">Ongeldige datum</td>
                                                </tr>
                                            );
                                        }

                                        const diffMin = end.diff(start, 'minute') - (entry.breakMinutes || 0);
                                        const hours = diffMin > 0 ? (diffMin / 60).toFixed(2) : "0.00";

                                        const companyName = entry.project?.projectGroup?.company?.name || 'Onbekend bedrijf';
                                        const projectName = entry.project?.name || 'Onbekend project';
                                        const userName = entry.user?.fullName || `${entry.user?.firstName || ''} ${entry.user?.lastName || ''}`.trim() || 'Onbekend';

                                        return (
                                            <tr key={entry.id || index} className="hover:bg-gray-50 transition-colors duration-150">
                                                <td className="font-medium">{start.format('DD-MM-YYYY')}</td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <div className="avatar placeholder">
                                                            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center">
                                                                    <span className="text-xs font-bold">
                                                                        {userName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                                    </span>
                                                            </div>
                                                        </div>
                                                        <span className="font-medium">{userName}</span>
                                                    </div>
                                                </td>
                                                <td className="font-medium">{companyName}</td>
                                                <td className="font-medium text-elmar-primary">{projectName}</td>
                                                <td>{start.format('HH:mm')}</td>
                                                <td>{end.format('HH:mm')}</td>
                                                <td>
                                                        <span className="badge badge-primary badge-lg">
                                                            {hours} uur
                                                        </span>
                                                </td>
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
                                                            className="btn btn-sm btn-outline btn-primary rounded-lg"
                                                            onClick={() => handleViewDetails(entry.id as number)}
                                                            title="Details bekijken"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                        {entry.status !== 'goedgekeurd' && entry.status !== 'afgekeurd' && (
                                                            <>
                                                                <button
                                                                    className="btn btn-sm btn-success rounded-lg"
                                                                    onClick={() => handleApprove(entry.id as number)}
                                                                    title="Goedkeuren"
                                                                >
                                                                    <CheckCircleIcon className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm btn-error rounded-lg"
                                                                    onClick={() => handleReject(entry.id as number)}
                                                                    title="Afkeuren"
                                                                >
                                                                    <XCircleIcon className="w-4 h-4" />
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
                                                <td colSpan={9} className="text-center text-error">Error loading entry</td>
                                            </tr>
                                        );
                                    }
                                })}

                                {(!Array.isArray(currentEntries) || currentEntries.length === 0) && (
                                    <tr>
                                        <td colSpan={9} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="text-6xl">⏰</div>
                                                <div className="text-xl font-semibold text-gray-600">Geen entries gevonden</div>
                                                <div className="text-gray-500">Probeer je filters aan te passen</div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                                <div className="flex justify-center items-center gap-4">
                                    <button
                                        className="btn btn-outline btn-primary rounded-xl disabled:opacity-50"
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        Vorige
                                    </button>

                                    <div className="flex items-center gap-2">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum: number;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }

                                            return (
                                                <button
                                                    key={pageNum}
                                                    className={`btn btn-sm rounded-lg ${
                                                        pageNum === currentPage
                                                            ? 'btn-primary'
                                                            : 'btn-ghost hover:btn-outline'
                                                    }`}
                                                    onClick={() => goToPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        className="btn btn-outline btn-primary rounded-xl disabled:opacity-50"
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        Volgende
                                    </button>
                                </div>

                                <div className="text-center mt-3 text-sm text-gray-600">
                                    Pagina <span className="font-semibold">{currentPage}</span> van <span className="font-semibold">{totalPages}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Details modal */}
                {showDetailsModal && selectedEntry && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-8 rounded-2xl shadow-md-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-800">Urenregistratie Details</h3>
                                <button
                                    className="btn btn-ghost btn-circle"
                                    onClick={() => setShowDetailsModal(false)}
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Medewerker</label>
                                        <p className="text-lg font-medium">{selectedEntry.user?.fullName || 'Onbekend'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Datum</label>
                                        <p className="text-lg font-medium">
                                            {dayjs(selectedEntry.startTime).format('DD MMMM YYYY')}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Tijd</label>
                                        <p className="text-lg font-medium">
                                            {dayjs(selectedEntry.startTime).format('HH:mm')} - {dayjs(selectedEntry.endTime).format('HH:mm')}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Pauze</label>
                                        <p className="text-lg font-medium">{selectedEntry.breakMinutes || 0} minuten</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Bedrijf</label>
                                        <p className="text-lg font-medium">{selectedEntry.project?.projectGroup?.company?.name || 'Onbekend'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Project</label>
                                        <p className="text-lg font-medium">{selectedEntry.project?.name || 'Onbekend'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Totaal uren</label>
                                        <p className="text-lg font-medium">
                                            {(() => {
                                                const start = dayjs(selectedEntry.startTime);
                                                const end = dayjs(selectedEntry.endTime);
                                                const diffMin = end.diff(start, 'minute') - (selectedEntry.breakMinutes || 0);
                                                return diffMin > 0 ? (diffMin / 60).toFixed(2) : "0.00";
                                            })()} uur
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Status</label>
                                        <div>
                                            <span className={`badge badge-lg ${
                                                selectedEntry.status === 'ingeleverd' ? 'badge-warning' :
                                                    selectedEntry.status === 'goedgekeurd' ? 'badge-success' :
                                                        selectedEntry.status === 'afgekeurd' ? 'badge-error' :
                                                            'badge-ghost'
                                            }`}>
                                                {selectedEntry.status || 'onbekend'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedEntry.notes && (
                                <div className="mt-6">
                                    <label className="text-sm font-semibold text-gray-600">Notities</label>
                                    <div className="bg-gray-50 p-4 rounded-xl mt-2">
                                        <p className="text-gray-800">{selectedEntry.notes}</p>
                                    </div>
                                </div>
                            )}

                            {/* Additional Info */}
                            {(selectedEntry.distanceKm || selectedEntry.travelCosts || selectedEntry.expenses) && (
                                <div className="mt-6">
                                    <label className="text-sm font-semibold text-gray-600">Aanvullende Kosten</label>
                                    <div className="bg-gray-50 p-4 rounded-xl mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {selectedEntry.distanceKm && (
                                            <div>
                                                <span className="text-xs text-gray-500">Afstand</span>
                                                <p className="font-medium">{selectedEntry.distanceKm} km</p>
                                            </div>
                                        )}
                                        {selectedEntry.travelCosts && (
                                            <div>
                                                <span className="text-xs text-gray-500">Reiskosten</span>
                                                <p className="font-medium">€{selectedEntry.travelCosts.toFixed(2)}</p>
                                            </div>
                                        )}
                                        {selectedEntry.expenses && (
                                            <div>
                                                <span className="text-xs text-gray-500">Onkosten</span>
                                                <p className="font-medium">€{selectedEntry.expenses.toFixed(2)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedEntry.status !== 'goedgekeurd' && selectedEntry.status !== 'afgekeurd' && (
                                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                                    <button
                                        className="btn btn-error rounded-xl"
                                        onClick={() => {
                                            handleReject(selectedEntry.id as number);
                                            setShowDetailsModal(false);
                                        }}
                                    >
                                        <XCircleIcon className="w-5 h-5 mr-2" />
                                        Afkeuren
                                    </button>
                                    <button
                                        className="btn btn-success rounded-xl"
                                        onClick={() => {
                                            handleApprove(selectedEntry.id as number);
                                            setShowDetailsModal(false);
                                        }}
                                    >
                                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                                        Goedkeuren
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {toastMessage && (
                    <ToastNotification message={toastMessage} type={toastType} />
                )}
            </div>
        </AdminRoute>
    );
}