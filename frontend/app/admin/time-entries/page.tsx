"use client";
import { useState, useEffect } from "react";
import { getAdminTimeEntries, getTimeEntryDetails, approveTimeEntry, rejectTimeEntry } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import dayjs from "dayjs";
import ToastNotification from "@/components/ToastNotification";

export default function AdminTimeEntriesPage() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [entriesPerPage] = useState(20);

    // Selected entry for detail view
    const [selectedEntry, setSelectedEntry] = useState<any>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [selectedUser, setSelectedUser] = useState("");
    const [selectedProject, setSelectedProject] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // Toast
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const data = await getAdminTimeEntries();
                setEntries(data);
            } catch (error) {
                console.error("Error fetching time entries:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEntries();
    }, []);

    // Create unique lists of users and projects for filters
    const users = Array.from(new Set(entries.map((entry: any) => JSON.stringify({
        id: entry.user.id,
        name: entry.user.fullName
    })))).map(str => JSON.parse(str));

    const projects = Array.from(new Set(entries.map((entry: any) => JSON.stringify({
        id: entry.project?.id,
        name: entry.project?.name
    })))).map(str => JSON.parse(str));

    // Apply filters
    const filteredEntries = entries.filter((entry: any) => {
        const entryDate = dayjs(entry.startTime);
        const start = dayjs(startDate);
        const end = dayjs(endDate).endOf('day');

        const dateInRange = entryDate.isAfter(start) && entryDate.isBefore(end);
        const userMatch = selectedUser ? entry.user.id === parseInt(selectedUser) : true;
        const projectMatch = selectedProject ? entry.project?.id === parseInt(selectedProject) : true;

        const searchLower = searchTerm.toLowerCase();
        const searchMatch = !searchTerm ||
            entry.user.fullName.toLowerCase().includes(searchLower) ||
            (entry.project?.name && entry.project.name.toLowerCase().includes(searchLower)) ||
            (entry.notes && entry.notes.toLowerCase().includes(searchLower));

        return dateInRange && userMatch && projectMatch && searchMatch;
    });

    // Pagination
    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);

    const handleViewDetails = async (entryId: number) => {
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

    const handleApprove = async (entryId: number) => {
        try {
            await approveTimeEntry(entryId);
            // Refresh data
            const updatedEntries = entries.map((entry: any) =>
                entry.id === entryId ? { ...entry, status: "goedgekeurd" } : entry
            );
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

    const handleReject = async (entryId: number) => {
        try {
            await rejectTimeEntry(entryId);
            // Refresh data
            const updatedEntries = entries.map((entry: any) =>
                entry.id === entryId ? { ...entry, status: "afgekeurd" } : entry
            );
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
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Startdatum</span>
                                </label>
                                <input
                                    type="date"
                                    className="input input-bordered"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Einddatum</span>
                                </label>
                                <input
                                    type="date"
                                    className="input input-bordered"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Medewerker</span>
                                </label>
                                <select
                                    className="select select-bordered"
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                >
                                    <option value="">Alle medewerkers</option>
                                    {users.map((user: any) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Project</span>
                                </label>
                                <select
                                    className="select select-bordered"
                                    value={selectedProject}
                                    onChange={(e) => setSelectedProject(e.target.value)}
                                >
                                    <option value="">Alle projecten</option>
                                    {projects.map((project: any) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-control mt-4">
                            <label className="label">
                                <span className="label-text">Zoeken</span>
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
                                    <th>Project</th>
                                    <th>Start</th>
                                    <th>Eind</th>
                                    <th>Uren</th>
                                    <th>Status</th>
                                    <th>Acties</th>
                                </tr>
                                </thead>
                                <tbody>
                                {currentEntries.map((entry: any) => {
                                    const start = dayjs(entry.startTime);
                                    const end = dayjs(entry.endTime);
                                    const diffMin = end.diff(start, 'minute') - entry.breakMinutes;
                                    const hours = diffMin > 0 ? (diffMin / 60).toFixed(2) : "0.00";

                                    return (
                                        <tr key={entry.id}>
                                            <td>{start.format('YYYY-MM-DD')}</td>
                                            <td>{entry.user.fullName}</td>
                                            <td>{entry.project?.name || 'Onbekend'}</td>
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
                                                        {entry.status}
                                                    </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-outline mr-2"
                                                    onClick={() => handleViewDetails(entry.id)}
                                                >
                                                    Bekijken
                                                </button>
                                                {entry.status !== 'goedgekeurd' && entry.status !== 'afgekeurd' && (
                                                    <button
                                                        className="btn btn-sm btn-success mr-2"
                                                        onClick={() => handleApprove(entry.id)}
                                                    >
                                                        Goedkeuren
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
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
                                    <p><span className="font-bold">Medewerker:</span> {selectedEntry.user.firstName} {selectedEntry.user.lastName}</p>
                                    <p><span className="font-bold">Project:</span> {selectedEntry.project?.name || 'Onbekend'}</p>
                                    <p><span className="font-bold">Datum:</span> {dayjs(selectedEntry.startTime).format('DD-MM-YYYY')}</p>
                                    <p><span className="font-bold">Tijd:</span> {dayjs(selectedEntry.startTime).format('HH:mm')} - {dayjs(selectedEntry.endTime).format('HH:mm')}</p>
                                </div>
                                <div>
                                    <p><span className="font-bold">Pauze:</span> {selectedEntry.breakMinutes} minuten</p>
                                    <p><span className="font-bold">Afstand:</span> {selectedEntry.distanceKm} km</p>
                                    <p><span className="font-bold">Reiskosten:</span> €{selectedEntry.travelCosts}</p>
                                    <p><span className="font-bold">Onkosten:</span> €{selectedEntry.expenses}</p>
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
                                                handleApprove(selectedEntry.id);
                                                setShowDetailsModal(false);
                                            }}
                                        >
                                            Goedkeuren
                                        </button>
                                        <button
                                            className="btn btn-error"
                                            onClick={() => {
                                                handleReject(selectedEntry.id);
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
                    <ToastNotification message={toastMessage} type={toastType} />
                )}
            </div>
        </AdminRoute>
    );
}