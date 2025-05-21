// Fix voor AdminTimeApproval.tsx

"use client";
import React, { useState, useEffect, useCallback } from "react";
import { getAdminTimeEntries, approveTimeEntry, rejectTimeEntry } from "@/lib/api";
import dayjs from "dayjs";
import ToastNotification from "@/components/ToastNotification";
import { CheckIcon, XMarkIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { TimeEntry, User } from "@/lib/types";

interface TimeEntryDetails extends TimeEntry {
    user: User;
}

export default function AdminTimeApproval() {
    const [entries, setEntries] = useState<TimeEntryDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState<TimeEntryDetails | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [entryToReject, setEntryToReject] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [entriesPerPage] = useState(10);
    // Toast
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    // Filter state
    const [statusFilter, setStatusFilter] = useState("ingeleverd");

    const fetchEntries = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getAdminTimeEntries();
            setEntries(data);
        } catch (error) {
            console.error("Error fetching time entries:", error);
            showToast("Fout bij het ophalen van uren", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const showToast = (message: string, type: "success" | "error") => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastMessage(""), 3000);
    };

    const handleViewDetails = (entry: TimeEntryDetails) => {
        setSelectedEntry(entry);
        setShowDetailsModal(true);
    };

    const handleApprove = async (id: number) => {
        try {
            await approveTimeEntry(id);
            // Update lokale data
            const updatedEntries = entries.map(entry =>
                entry.id === id ? {...entry, status: "goedgekeurd"} : entry
            );
            setEntries(updatedEntries);
            showToast("Uren goedgekeurd", "success");
        } catch (error) {
            console.error("Error approving entry:", error);
            showToast("Fout bij goedkeuren", "error");
        }
    };

    const openRejectModal = (id: number) => {
        setEntryToReject(id);
        setRejectReason("");
        setIsRejectModalOpen(true);
    };

    const handleReject = async () => {
        if (!entryToReject) return;
        try {
            await rejectTimeEntry(entryToReject);
            // Update lokale data
            const updatedEntries = entries.map(entry =>
                entry.id === entryToReject ? {...entry, status: "afgekeurd"} : entry
            );
            setEntries(updatedEntries);
            showToast("Uren afgekeurd", "success");
            setIsRejectModalOpen(false);
        } catch (error) {
            console.error("Error rejecting entry:", error);
            showToast("Fout bij afkeuren", "error");
        }
    };

    const filteredEntries = entries.filter(entry => {
        if (statusFilter === "all") return true;
        return entry.status === statusFilter;
    });

    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);

    if (loading) {
        return <div className="flex justify-center items-center min-h-64">
            <div className="loading loading-spinner loading-lg"></div>
        </div>;
    }

    return (
        <div className="w-full">
            {/* Filters */}
            <div className="mb-4">
                <div className="flex items-center gap-4">
                    <label className="font-semibold">Status:</label>
                    <select
                        className="select select-bordered select-sm"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Alle statussen</option>
                        <option value="ingeleverd">Ingeleverd</option>
                        <option value="goedgekeurd">Goedgekeurd</option>
                        <option value="afgekeurd">Afgekeurd</option>
                        <option value="opgeslagen">Opgeslagen</option>
                    </select>
                    <button className="btn btn-sm" onClick={fetchEntries}>
                        Vernieuwen
                    </button>
                </div>
            </div>

            {/* Entries tabel */}
            <div className="overflow-x-auto border rounded-lg">
                <table className="table w-full table-zebra">
                    <thead>
                    <tr>
                        <th>Medewerker</th>
                        <th>Datum</th>
                        <th>Project</th>
                        <th>Tijd</th>
                        <th>Uren</th>
                        <th>Status</th>
                        <th>Acties</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredEntries.length === 0 && (
                        <tr>
                            <td colSpan={7} className="text-center py-4">
                                Geen urenregistraties gevonden
                            </td>
                        </tr>
                    )}
                    {currentEntries.map((entry) => {
                        const start = dayjs(entry.startTime);
                        const end = dayjs(entry.endTime);
                        const diffMin = end.diff(start, "minute") - entry.breakMinutes;
                        const hours = diffMin > 0 ? (diffMin / 60).toFixed(2) : "0.00";

                        return (
                            <tr key={entry.id} className={`hover cursor-pointer ${
                                entry.status === 'goedgekeurd' ? 'bg-green-50' :
                                    entry.status === 'afgekeurd' ? 'bg-red-50' : ''
                            }`}>
                                <td onClick={() => handleViewDetails(entry)}>
                                    {entry.user.fullName}
                                </td>
                                <td onClick={() => handleViewDetails(entry)}>
                                    {start.format("DD-MM-YYYY")}
                                </td>
                                <td onClick={() => handleViewDetails(entry)}>
                                    {entry.project?.name || "Onbekend"}
                                </td>
                                <td onClick={() => handleViewDetails(entry)}>
                                    {start.format("HH:mm")} - {end.format("HH:mm")}
                                </td>
                                <td onClick={() => handleViewDetails(entry)}>
                                    {hours}
                                </td>
                                <td onClick={() => handleViewDetails(entry)}>
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
                                    <div className="flex gap-1">
                                        <button
                                            className="btn btn-sm btn-ghost"
                                            onClick={() => handleViewDetails(entry)}
                                        >
                                            <InformationCircleIcon className="w-5 h-5"/>
                                        </button>
                                        {entry.status === 'ingeleverd' && (
                                            <>
                                                <button
                                                    className="btn btn-sm btn-success"
                                                    onClick={() => handleApprove(entry.id as number)}
                                                >
                                                    <CheckIcon className="w-5 h-5"/>
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-error"
                                                    onClick={() => openRejectModal(entry.id as number)}
                                                >
                                                    <XMarkIcon className="w-5 h-5"/>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {/* Details modal */}
            {showDetailsModal && selectedEntry && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
                        <h3 className="text-lg font-bold mb-4">Urenregistratie details</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p><span className="font-bold">Medewerker:</span> {selectedEntry.user.fullName}</p>
                                <p><span
                                    className="font-bold">Project:</span> {selectedEntry.project?.name || 'Onbekend'}
                                </p>
                                <p><span
                                    className="font-bold">Bedrijf:</span> {selectedEntry.project?.projectGroup?.company?.name || 'Onbekend'}
                                </p>
                                <p><span
                                    className="font-bold">Datum:</span> {dayjs(selectedEntry.startTime).format('DD-MM-YYYY')}
                                </p>
                                <p><span
                                    className="font-bold">Tijd:</span> {dayjs(selectedEntry.startTime).format('HH:mm')} - {dayjs(selectedEntry.endTime).format('HH:mm')}
                                </p>
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
                            {selectedEntry.status === 'ingeleverd' && (
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
                                            openRejectModal(selectedEntry.id as number);
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

            {/* Reject modal */}
            {isRejectModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-lg font-bold mb-4">Uren afkeuren</h3>
                        <p className="mb-4">Geef een reden op waarom deze uren worden afgekeurd:</p>

                        <textarea
                            className="textarea textarea-bordered w-full mb-4"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reden voor afkeuring..."
                            rows={3}
                        />

                        <div className="flex justify-end gap-2">
                            <button
                                className="btn btn-ghost"
                                onClick={() => setIsRejectModalOpen(false)}
                            >
                                Annuleren
                            </button>
                            <button
                                className="btn btn-error"
                                onClick={handleReject}
                            >
                                Afkeuren
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast notificatie */}
            {toastMessage && (
                <ToastNotification message={toastMessage} type={toastType}/>
            )}
        </div>
    );
}