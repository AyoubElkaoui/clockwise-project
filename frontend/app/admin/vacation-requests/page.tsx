"use client";
import {useState, useEffect, JSX} from "react";
import { getAdminVacationRequests, processVacationRequest } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import dayjs from "dayjs";
import ToastNotification from "@/components/ToastNotification";
import { VacationRequest } from "@/lib/types";
import {
    CalendarDaysIcon,
    UserIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    FunnelIcon,
    EyeIcon
} from "@heroicons/react/24/outline";

export default function AdminVacationRequestsPage(): JSX.Element {
    const [requests, setRequests] = useState<VacationRequest[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [toastMessage, setToastMessage] = useState<string>("");
    const [toastType, setToastType] = useState<"success" | "error">("success");
    const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("pending");

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async (): Promise<void> => {
        try {
            const data = await getAdminVacationRequests();
            setRequests(data);
        } catch (error) {
            console.error("Error fetching vacation requests:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: number): Promise<void> => {
        try {
            await processVacationRequest(id, "approved");
            setToastMessage("Vakantie-aanvraag goedgekeurd!");
            setToastType("success");
            fetchRequests();
        } catch (error) {
            console.error("Error approving vacation request:", error);
            setToastMessage("Fout bij goedkeuren van aanvraag");
            setToastType("error");
        }
        setTimeout(() => setToastMessage(""), 3000);
    };

    const handleReject = async (id: number): Promise<void> => {
        try {
            await processVacationRequest(id, "rejected");
            setToastMessage("Vakantie-aanvraag afgewezen!");
            setToastType("success");
            fetchRequests();
        } catch (error) {
            console.error("Error rejecting vacation request:", error);
            setToastMessage("Fout bij afwijzen van aanvraag");
            setToastType("error");
        }
        setTimeout(() => setToastMessage(""), 3000);
    };

    const handleViewDetails = (request: VacationRequest): void => {
        setSelectedRequest(request);
        setShowDetailsModal(true);
    };

    // Apply status filter
    const filteredRequests = statusFilter === "all"
        ? requests
        : requests.filter((request: VacationRequest) => request.status === statusFilter);

    // Calculate stats
    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="loading loading-spinner loading-lg text-elmar-primary mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Vakantie-aanvragen laden...</p>
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
                        <CalendarDaysIcon className="w-8 h-8" />
                        <h1 className="text-4xl font-bold">Vakantie-aanvragen Beheer</h1>
                    </div>
                    <p className="text-blue-100 text-lg">Beheer en verwerk alle vakantie-aanvragen</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-600 p-3 rounded-xl">
                                <CalendarDaysIcon className="w-8 h-8 text-white" />
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
                                <p className="text-gray-600 text-sm font-medium">Openstaand</p>
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
                                <p className="text-gray-600 text-sm font-medium">Afgewezen</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.rejected}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="card bg-white shadow-lg border-0 rounded-2xl">
                    <div className="card-body p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <FunnelIcon className="w-6 h-6 text-elmar-primary" />
                            <h2 className="text-2xl font-bold text-gray-800">Filters</h2>
                        </div>

                        <div className="form-control max-w-xs">
                            <label className="label">
                                <span className="label-text font-semibold text-gray-700">Status Filter</span>
                            </label>
                            <select
                                className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">Alle aanvragen ({stats.total})</option>
                                <option value="pending">Openstaand ({stats.pending})</option>
                                <option value="approved">Goedgekeurd ({stats.approved})</option>
                                <option value="rejected">Afgewezen ({stats.rejected})</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Requests Table */}
                <div className="card bg-white shadow-lg border-0 rounded-2xl">
                    <div className="card-body p-0">
                        <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <EyeIcon className="w-6 h-6 text-elmar-primary" />
                                <h2 className="text-2xl font-bold text-gray-800">Vakantie-aanvragen</h2>
                                <span className="badge badge-primary">{filteredRequests.length} items</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-gray-700 font-semibold">👤 Medewerker</th>
                                    <th className="text-gray-700 font-semibold">📅 Startdatum</th>
                                    <th className="text-gray-700 font-semibold">📅 Einddatum</th>
                                    <th className="text-gray-700 font-semibold">⏰ Uren</th>
                                    <th className="text-gray-700 font-semibold">Reden</th>
                                    <th className="text-gray-700 font-semibold">Status</th>
                                    <th className="text-gray-700 font-semibold">Acties</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="text-6xl">Vakantie</div>
                                                <div className="text-xl font-semibold text-gray-600">
                                                    Geen vakantie-aanvragen gevonden
                                                </div>
                                                <div className="text-gray-500">
                                                    {statusFilter === 'all' ? 'Er zijn nog geen aanvragen' : `Geen ${statusFilter} aanvragen`}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map((request: VacationRequest) => (
                                        <tr key={request.id} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="avatar placeholder">
                                                        <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center">
                                                            <UserIcon className="w-6 h-6" />
                                                        </div>
                                                    </div>
                                                    <span className="font-medium">{request.user?.fullName || 'Onbekend'}</span>
                                                </div>
                                            </td>
                                            <td className="font-medium">{dayjs(request.startDate).format('DD-MM-YYYY')}</td>
                                            <td className="font-medium">{dayjs(request.endDate).format('DD-MM-YYYY')}</td>
                                            <td>
                                                    <span className="badge badge-primary badge-lg">
                                                        {request.hours.toFixed(1)} uur
                                                    </span>
                                            </td>
                                            <td>
                                                <div className="max-w-xs truncate">
                                                    {request.reason || <span className="italic text-gray-400">Geen reden</span>}
                                                </div>
                                            </td>
                                            <td>
                                                    <span className={`badge ${
                                                        request.status === 'pending' ? 'badge-warning' :
                                                            request.status === 'approved' ? 'badge-success' :
                                                                'badge-error'
                                                    }`}>
                                                        {request.status === 'pending' ? '⏳ Openstaand' :
                                                            request.status === 'approved' ? 'Goedgekeurd' : 'Afgewezen'}
                                                    </span>
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button
                                                        className="btn btn-sm btn-outline btn-primary rounded-lg"
                                                        onClick={() => handleViewDetails(request)}
                                                        title="Details bekijken"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </button>
                                                    {request.status === 'pending' && (
                                                        <>
                                                            <button
                                                                className="btn btn-sm btn-success rounded-lg"
                                                                onClick={() => handleApprove(request.id)}
                                                                title="Goedkeuren"
                                                            >
                                                                <CheckCircleIcon className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-error rounded-lg"
                                                                onClick={() => handleReject(request.id)}
                                                                title="Afwijzen"
                                                            >
                                                                <XCircleIcon className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Details Modal */}
                {showDetailsModal && selectedRequest && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-8 rounded-2xl shadow-md-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-800">Vakantie-aanvraag Details</h3>
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
                                        <p className="text-lg font-medium">{selectedRequest.user?.fullName || 'Onbekend'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Periode</label>
                                        <p className="text-lg font-medium">
                                            {dayjs(selectedRequest.startDate).format('DD MMMM YYYY')} - {dayjs(selectedRequest.endDate).format('DD MMMM YYYY')}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Aantal dagen</label>
                                        <p className="text-lg font-medium">
                                            {Math.ceil(selectedRequest.hours / 8)} werkdagen
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Totaal uren</label>
                                        <p className="text-lg font-medium">{selectedRequest.hours.toFixed(1)} uur</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Status</label>
                                        <div>
                                            <span className={`badge badge-lg ${
                                                selectedRequest.status === 'pending' ? 'badge-warning' :
                                                    selectedRequest.status === 'approved' ? 'badge-success' :
                                                        'badge-error'
                                            }`}>
                                                {selectedRequest.status === 'pending' ? '⏳ Openstaand' :
                                                    selectedRequest.status === 'approved' ? 'Goedgekeurd' : 'Afgewezen'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedRequest.reason && (
                                <div className="mt-6">
                                    <label className="text-sm font-semibold text-gray-600">Reden voor vakantie</label>
                                    <div className="bg-gray-50 p-4 rounded-xl mt-2">
                                        <p className="text-gray-800">{selectedRequest.reason}</p>
                                    </div>
                                </div>
                            )}

                            {selectedRequest.status === 'pending' && (
                                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                                    <button
                                        className="btn btn-error rounded-xl"
                                        onClick={() => {
                                            handleReject(selectedRequest.id);
                                            setShowDetailsModal(false);
                                        }}
                                    >
                                        <XCircleIcon className="w-5 h-5 mr-2" />
                                        Afwijzen
                                    </button>
                                    <button
                                        className="btn btn-success rounded-xl"
                                        onClick={() => {
                                            handleApprove(selectedRequest.id);
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