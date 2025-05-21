// app/admin/vacation-requests/page.tsx
"use client";
import { useState, useEffect } from "react";
import { getAdminVacationRequests, processVacationRequest } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import dayjs from "dayjs";
import ToastNotification from "@/components/ToastNotification";
import { VacationRequest } from "@/lib/types";

export default function AdminVacationRequestsPage() {
    const [requests, setRequests] = useState<VacationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    // Filters
    const [statusFilter, setStatusFilter] = useState("pending");

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const data = await getAdminVacationRequests();
            setRequests(data);
        } catch (error) {
            console.error("Error fetching vacation requests:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        try {
            await processVacationRequest(id, "approved");
            setToastMessage("Vakantie-aanvraag goedgekeurd!");
            setToastType("success");
            // Refresh data
            fetchRequests();
        } catch (error) {
            console.error("Error approving vacation request:", error);
            setToastMessage("Fout bij goedkeuren van aanvraag");
            setToastType("error");
        }

        setTimeout(() => setToastMessage(""), 3000);
    };

    const handleReject = async (id: number) => {
        try {
            await processVacationRequest(id, "rejected");
            setToastMessage("Vakantie-aanvraag afgewezen!");
            setToastType("success");
            // Refresh data
            fetchRequests();
        } catch (error) {
            console.error("Error rejecting vacation request:", error);
            setToastMessage("Fout bij afwijzen van aanvraag");
            setToastType("error");
        }

        setTimeout(() => setToastMessage(""), 3000);
    };

    // Apply status filter
    const filteredRequests = statusFilter === "all"
        ? requests
        : requests.filter((request: VacationRequest) => request.status === statusFilter);

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">
            <div className="loading loading-spinner loading-lg"></div>
        </div>;
    }

    return (
        <AdminRoute>
            <div className="p-6">
                <h1 className="text-3xl font-bold mb-8">Vakantie-aanvragen Beheer</h1>

                <div className="card bg-base-100 shadow-xl mb-8">
                    <div className="card-body">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Status Filter</span>
                            </label>
                            <select
                                className="select select-bordered"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">Alle aanvragen</option>
                                <option value="pending">Openstaand</option>
                                <option value="approved">Goedgekeurd</option>
                                <option value="rejected">Afgewezen</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead>
                                <tr>
                                    <th>Medewerker</th>
                                    <th>Startdatum</th>
                                    <th>Einddatum</th>
                                    <th>Uren</th>
                                    <th>Reden</th>
                                    <th>Status</th>
                                    <th>Acties</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-4">
                                            Geen vakantie-aanvragen gevonden
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map((request: VacationRequest) => (
                                        <tr key={request.id}>
                                            <td>{request.user?.fullName}</td>
                                            <td>{dayjs(request.startDate).format('YYYY-MM-DD')}</td>
                                            <td>{dayjs(request.endDate).format('YYYY-MM-DD')}</td>
                                            <td>{request.hours.toFixed(1)}</td>
                                            <td>{request.reason || '-'}</td>
                                            <td>
                                                    <span className={`badge ${
                                                        request.status === 'pending' ? 'badge-warning' :
                                                            request.status === 'approved' ? 'badge-success' :
                                                                'badge-error'
                                                    }`}>
                                                        {request.status === 'pending' ? 'Openstaand' :
                                                            request.status === 'approved' ? 'Goedgekeurd' : 'Afgewezen'}
                                                    </span>
                                            </td>
                                            <td>
                                                {request.status === 'pending' && (
                                                    <>
                                                        <button
                                                            className="btn btn-sm btn-success mr-2"
                                                            onClick={() => handleApprove(request.id)}
                                                        >
                                                            Goedkeuren
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-error"
                                                            onClick={() => handleReject(request.id)}
                                                        >
                                                            Afwijzen
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {toastMessage && (
                    <ToastNotification message={toastMessage} type={toastType} />
                )}
            </div>
        </AdminRoute>
    );
}