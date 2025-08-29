"use client";
import {useState, useEffect, JSX} from "react";
import { getAdminVacationRequests, processVacationRequestAsAdmin, getCurrentUser } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import dayjs from "dayjs";
import ToastNotification from "@/components/ToastNotification";
import { VacationRequest, getStatusBadgeClass, getStatusText, getApprovalStage } from "@/lib/types";
import {
    CalendarDaysIcon,
    UserIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    FunnelIcon,
    EyeIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    ArrowRightIcon,
    ShieldCheckIcon
} from "@heroicons/react/24/outline";

interface UserOption {
    id: number;
    name: string;
}

interface ProcessingRequest {
    id: number;
    action: 'approve' | 'reject';
    reason?: string;
}

export default function AdminVacationRequestsPageTwoStep(): JSX.Element {
    const [requests, setRequests] = useState<VacationRequest[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [toastMessage, setToastMessage] = useState<string>("");
    const [toastType, setToastType] = useState<"success" | "error">("success");
    const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
    const [showProcessModal, setShowProcessModal] = useState<boolean>(false);
    const [processingRequest, setProcessingRequest] = useState<ProcessingRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("manager_approved");
    const [selectedUser, setSelectedUser] = useState<string>("");

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async (): Promise<void> => {
        try {
            const data = await getAdminVacationRequests();
            setRequests(data);
            console.log(`Loaded ${data.length} requests (manager-approved and processed)`);
        } catch (error) {
            console.error("Error fetching vacation requests:", error);
            setToastMessage("Fout bij ophalen vakantie-aanvragen");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessRequest = (request: VacationRequest, action: 'approve' | 'reject') => {
        // Ensure request is in the right state for admin processing
        if (request.status !== 'manager_approved') {
            setToastMessage(`Deze aanvraag kan niet worden verwerkt (status: ${getStatusText(request.status)})`);
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        // Ensure it has manager approval
        if (!request.managerApprovedBy || !request.managerApprovedDate) {
            setToastMessage("Deze aanvraag mist manager goedkeuring informatie");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        setSelectedRequest(request);
        setProcessingRequest({ id: request.id, action });
        setRejectionReason("");
        setShowProcessModal(true);
    };

    const confirmProcessRequest = async () => {
        if (!processingRequest || !selectedRequest) return;

        // Validate rejection reason if needed
        if (processingRequest.action === 'reject' && !rejectionReason.trim()) {
            setToastMessage("Voer een reden in voor afwijzing");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        setIsProcessing(true);

        try {
            // Get current user for tracking
            const currentUser = getCurrentUser();
            if (!currentUser || !currentUser.isAdmin) {
                throw new Error("Alleen admins kunnen finale goedkeuring geven");
            }

            const status = processingRequest.action === 'approve' ? 'approved' : 'rejected';
            const result = await processVacationRequestAsAdmin(
                processingRequest.id,
                status,
                currentUser.id,
                processingRequest.action === 'reject' ? rejectionReason : undefined
            );

            const actionText = processingRequest.action === 'approve' ? 'volledig goedgekeurd' : 'afgekeurd';
            setToastMessage(`Vakantie-aanvraag ${actionText}! Manager goedkeuring blijft bewaard voor tracking.`);
            setToastType("success");

            // Update the local state - PRESERVE MANAGER TRACKING INFO
            setRequests(prev => prev.map(req =>
                req.id === processingRequest.id
                    ? {
                        ...req,
                        status: status as any,
                        processedBy: currentUser.id,
                        processedByUser: {
                            id: currentUser.id,
                            firstName: currentUser.firstName,
                            lastName: currentUser.lastName,
                            fullName: currentUser.fullName,
                            rank: currentUser.rank
                        },
                        processedDate: new Date().toISOString(),
                        processingNotes: processingRequest.action === 'reject' ? rejectionReason : undefined,
                        // IMPORTANT: Preserve manager approval tracking
                        managerApprovedBy: req.managerApprovedBy,
                        managerApprovedByUser: req.managerApprovedByUser,
                        managerApprovedDate: req.managerApprovedDate,
                        managerApprovalNotes: req.managerApprovalNotes
                    } as VacationRequest
                    : req
            ));

            // Close modal
            setShowProcessModal(false);
            setProcessingRequest(null);
            setSelectedRequest(null);
            setRejectionReason("");

            // Refresh data
            await fetchRequests();
        } catch (error) {
            console.error("Error processing vacation request:", error);

            // Handle specific error messages
            if (error && typeof error === 'object' && 'message' in error) {
                setToastMessage((error as Error).message);
            } else {
                setToastMessage("Fout bij verwerken van aanvraag");
            }
            setToastType("error");
        } finally {
            setIsProcessing(false);
            setTimeout(() => setToastMessage(""), 5000);
        }
    };

    const handleViewDetails = (request: VacationRequest): void => {
        setSelectedRequest(request);
        setShowDetailsModal(true);
    };

    const calculateUserVacationImpact = (request: VacationRequest) => {
        // Calculate current user's vacation usage
        const userRequests = requests.filter(r => r.userId === request.userId);
        const currentYear = new Date().getFullYear();

        const usedHours = userRequests
            .filter(r => r.status === 'approved' && new Date(r.startDate).getFullYear() === currentYear)
            .reduce((sum, r) => sum + (r.hours || 0), 0);

        const pendingHours = userRequests
            .filter(r => r.status === 'manager_approved' && new Date(r.startDate).getFullYear() === currentYear)
            .reduce((sum, r) => sum + (r.hours || 0), 0);

        const totalHours = 200; // Default vacation hours
        const remainingAfterApproval = totalHours - usedHours - (request.hours || 0);
        const currentRemaining = totalHours - usedHours - pendingHours;

        return {
            totalHours,
            usedHours,
            pendingHours,
            currentRemaining,
            remainingAfterApproval,
            hasInsufficientBalance: remainingAfterApproval < 0
        };
    };

    // Create unique list of users for filter
    const users = (() => {
        if (!Array.isArray(requests)) return [];

        try {
            const userMap = new Map<number, UserOption>();
            for (const request of requests) {
                if (request?.user?.id) {
                    const fullName = request.user.fullName || `${request.user.firstName || ''} ${request.user.lastName || ''}`.trim();
                    userMap.set(request.user.id, {
                        id: request.user.id,
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

    // Apply filters
    const filteredRequests = (() => {
        if (!Array.isArray(requests)) return [];

        try {
            return requests.filter((request: VacationRequest) => {
                try {
                    if (!request) return false;

                    // Status filter
                    const statusMatch = statusFilter === "all" || request.status === statusFilter;

                    // User filter
                    const userMatch = selectedUser ? request.user?.id === parseInt(selectedUser) : true;

                    return statusMatch && userMatch;
                } catch (error) {
                    console.warn("Error filtering request:", request, error);
                    return false;
                }
            });
        } catch (error) {
            console.error("Error filtering requests:", error);
            return [];
        }
    })();

    // Calculate stats
    const stats = {
        total: requests.length,
        pendingAdminApproval: requests.filter(r => r.status === 'manager_approved').length,
        fullyApproved: requests.filter(r => r.status === 'approved').length,
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
            <div className="space-y-8 animate-fade-in">
                {/* Header Section - Updated for two-step approval with tracking emphasis */}
                <div className="bg-gradient-elmar text-white rounded-2xl p-8 shadow-elmar-card">
                    <div className="flex items-center gap-3 mb-4">
                        <ShieldCheckIcon className="w-8 h-8" />
                        <h1 className="text-4xl font-bold">Finale Vakantie Goedkeuringen</h1>
                        <div className="badge badge-info badge-lg">Stap 2: Admin Finale Goedkeuring</div>
                    </div>
                    <p className="text-blue-100 text-lg">
                        Geef finale goedkeuring voor vakantie-aanvragen die al zijn goedgekeurd door managers.
                        Alleen aanvragen met manager goedkeuring verschijnen hier.
                    </p>
                    <div className="mt-4 bg-blue-800 bg-opacity-30 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-blue-100">
                            <InformationCircleIcon className="w-5 h-5" />
                            <span className="font-medium">Twee-staps goedkeuringsproces met volledige tracking:</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm text-blue-100">
                            <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">✅ Manager</span>
                            <ArrowRightIcon className="w-4 h-4" />
                            <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">2. Admin (UW STAP)</span>
                            <ArrowRightIcon className="w-4 h-4" />
                            <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">✅ Volledig Goedgekeurd</span>
                        </div>
                        <div className="mt-2 text-xs text-blue-100">
                            🔍 <strong>Tracking:</strong> Manager goedkeuringen blijven altijd bewaard voor audit doeleinden
                        </div>
                    </div>
                </div>

                {/* Stats Cards - Updated for admin role */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl">
                                <CalendarDaysIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Totaal Manager-Goedgekeurd</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                                <p className="text-xs text-gray-500">Alle aanvragen met manager goedkeuring</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300 border-2 border-orange-200">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-xl">
                                <ClockIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Wacht op Finale Goedkeuring</p>
                                <p className="text-2xl font-bold text-orange-600">{stats.pendingAdminApproval}</p>
                                <p className="text-xs text-orange-500">Uw actie vereist</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl">
                                <CheckCircleIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Volledig Goedgekeurd</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.fullyApproved}</p>
                                <p className="text-xs text-gray-500">Door beide stappen</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-xl">
                                <XCircleIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Afgekeurd</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.rejected}</p>
                                <p className="text-xs text-gray-500">Door manager of admin</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="card bg-white shadow-elmar-card border-0 rounded-2xl">
                    <div className="card-body p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <FunnelIcon className="w-6 h-6 text-elmar-primary" />
                            <h2 className="text-2xl font-bold text-gray-800">Filters</h2>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <div className="w-full md:w-1/2">
                                <label className="label">
                                    <span className="label-text font-semibold text-gray-700">👤 Medewerker</span>
                                </label>
                                <select
                                    className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl w-full"
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

                            <div className="w-full md:w-1/2">
                                <label className="label">
                                    <span className="label-text font-semibold text-gray-700">📊 Status Filter</span>
                                </label>
                                <select
                                    className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl w-full"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">Alle aanvragen</option>
                                    <option value="manager_approved">Wacht op Admin Goedkeuring</option>
                                    <option value="approved">Volledig Goedgekeurd</option>
                                    <option value="rejected">Afgekeurd</option>
                                </select>
                            </div>
                        </div>

                        <div className="card-actions justify-end mt-4">
                            <button
                                className="btn btn-primary rounded-xl hover:scale-105 transition-all duration-200"
                                onClick={() => {
                                    setSelectedUser("");
                                    setStatusFilter("all");
                                }}
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Requests Table */}
                <div className="card bg-white shadow-elmar-card border-0 rounded-2xl">
                    <div className="card-body p-0">
                        <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <EyeIcon className="w-6 h-6 text-elmar-primary" />
                                <h2 className="text-2xl font-bold text-gray-800">Manager-Goedgekeurde Vakantie-aanvragen</h2>
                                <span className="badge badge-primary">{filteredRequests.length} items</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-gray-700 font-semibold">👤 Medewerker</th>
                                    <th className="text-gray-700 font-semibold">📅 Periode</th>
                                    <th className="text-gray-700 font-semibold">⏰ Uren</th>
                                    <th className="text-gray-700 font-semibold">📝 Reden</th>
                                    <th className="text-gray-700 font-semibold">📊 Goedkeuringsstatus</th>
                                    <th className="text-gray-700 font-semibold">👨‍💼 Manager Goedkeuring</th>
                                    <th className="text-gray-700 font-semibold">💰 Balans Impact</th>
                                    <th className="text-gray-700 font-semibold">⚙️ Admin Acties</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="text-6xl">🏖️</div>
                                                <div className="text-xl font-semibold text-gray-600">
                                                    Geen vakantie-aanvragen gevonden
                                                </div>
                                                <div className="text-gray-500">
                                                    {statusFilter === 'manager_approved' ?
                                                        'Geen aanvragen wachtend op finale admin goedkeuring' :
                                                        selectedUser ? 'Geen aanvragen voor deze medewerker' :
                                                            statusFilter === 'all' ? 'Geen manager-goedgekeurde aanvragen' : `Geen ${statusFilter} aanvragen`
                                                    }
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map((request: VacationRequest) => {
                                        const vacationImpact = calculateUserVacationImpact(request);

                                        return (
                                            <tr key={request.id} className="hover:bg-gray-50 transition-colors duration-150">
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <div className="avatar placeholder">
                                                            <div className="bg-gradient-elmar text-white rounded-full w-10 h-10 flex items-center justify-center">
                                                                <span className="text-xs font-bold">
                                                                    {(request.user?.fullName || `${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim())
                                                                        .split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">{request.user?.fullName || 'Onbekend'}</span>
                                                            {request.user?.manager && (
                                                                <div className="text-xs text-gray-500">
                                                                    Manager: {request.user.manager.fullName}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="font-medium">
                                                    <div>
                                                        <div>{dayjs(request.startDate).format('DD-MM-YYYY')}</div>
                                                        <div className="text-sm text-gray-500">tot {dayjs(request.endDate).format('DD-MM-YYYY')}</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge badge-primary badge-lg">
                                                        {request.hours.toFixed(0)} uur
                                                    </span>
                                                    <div className="text-xs text-gray-500">{(request.hours / 8).toFixed(1)} dagen</div>
                                                </td>
                                                <td>
                                                    <div className="max-w-xs truncate">
                                                        {request.reason || <span className="italic text-gray-400">Geen reden</span>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`badge ${getStatusBadgeClass(request.status)}`}>
                                                            {getStatusText(request.status)}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {request.status === 'manager_approved' ? 'Stap 2 van 2' :
                                                                request.status === 'approved' ? 'Volledig afgerond' :
                                                                    request.status === 'rejected' ? 'Proces beëindigd' : 'Status onbekend'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {request.managerApprovedByUser ? (
                                                        <div className="text-xs">
                                                            <div className="font-medium text-green-700 flex items-center gap-1">
                                                                <CheckCircleIcon className="w-3 h-3" />
                                                                <span title={`Manager ID: ${request.managerApprovedByUser.id}`}>
                                                                    {request.managerApprovedByUser.fullName}
                                                                </span>
                                                            </div>
                                                            <div className="text-gray-500">
                                                                {request.managerApprovedDate ?
                                                                    dayjs(request.managerApprovedDate).format('DD-MM-YYYY HH:mm') :
                                                                    'Geen datum'
                                                                }
                                                            </div>
                                                            {request.managerApprovalNotes && (
                                                                <div className="text-blue-600 text-xs mt-1 max-w-xs truncate" title={request.managerApprovalNotes}>
                                                                    💬 {request.managerApprovalNotes}
                                                                </div>
                                                            )}
                                                            {/* TRACKING INDICATOR */}
                                                            <div className="mt-1">
                                                                <span className="inline-flex items-center px-1 py-0.5 rounded text-xs bg-green-100 text-green-700">
                                                                    📋 Stap 1 Tracked
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            {request.user?.manager && (
                                                                <div className="text-xs text-gray-500">
                                                                     {request.user.manager.fullName}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="text-xs">
                                                        <div className={`font-medium ${vacationImpact.hasInsufficientBalance ? 'text-red-600' : 'text-green-600'}`}>
                                                            Na goedkeuring: {vacationImpact.remainingAfterApproval}u
                                                        </div>
                                                        <div className="text-gray-500">
                                                            Huidig: {vacationImpact.currentRemaining}u beschikbaar
                                                        </div>
                                                        {vacationImpact.hasInsufficientBalance && (
                                                            <div className="text-red-600 font-bold">⚠️ Onvoldoende saldo!</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="btn btn-sm btn-outline btn-primary rounded-lg hover:scale-105 transition-all duration-200"
                                                            onClick={() => handleViewDetails(request)}
                                                            title="Details bekijken"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                        {request.status === 'manager_approved' && (
                                                            <>
                                                                <button
                                                                    className={`btn btn-sm rounded-lg hover:scale-105 transition-all duration-200 ${
                                                                        vacationImpact.hasInsufficientBalance
                                                                            ? 'btn-warning'
                                                                            : 'btn-success'
                                                                    }`}
                                                                    onClick={() => handleProcessRequest(request, 'approve')}
                                                                    title={vacationImpact.hasInsufficientBalance ? "Finale Goedkeuring (LET OP: Onvoldoende balans!)" : "Finale Goedkeuring"}
                                                                >
                                                                    <CheckCircleIcon className="w-4 h-4" />
                                                                    {vacationImpact.hasInsufficientBalance && (
                                                                        <ExclamationTriangleIcon className="w-3 h-3 ml-1" />
                                                                    )}
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm btn-error rounded-lg hover:scale-105 transition-all duration-200"
                                                                    onClick={() => handleProcessRequest(request, 'reject')}
                                                                    title="Finale Afwijzing"
                                                                >
                                                                    <XCircleIcon className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                        {(request.status === 'approved' || request.status === 'rejected') && (
                                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                {request.status === 'approved' ? (
                                                                    <span className="text-green-600">✅ Verwerkt</span>
                                                                ) : (
                                                                    <span className="text-red-600">❌ Verwerkt</span>
                                                                )}
                                                                {/* Admin Processing Display - Enhanced to show tracking */}
                                                                {request.processedByUser && (
                                                                    <div className="text-xs mt-1">
                                                                        <div className="font-medium text-blue-700">
                                                                            Admin: {request.processedByUser.fullName}
                                                                        </div>
                                                                        <div className="text-gray-500">
                                                                            {request.processedDate ?
                                                                                dayjs(request.processedDate).format('DD-MM-YYYY HH:mm') :
                                                                                'Geen datum'
                                                                            }
                                                                        </div>
                                                                        {/* TRACKING STATUS */}
                                                                        <div className="mt-1">
                                                                            <span className="inline-flex items-center px-1 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                                                                                📋 Stap 2 Tracked
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Details Modal */}
                {showDetailsModal && selectedRequest && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-8 rounded-2xl shadow-elmar-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-800">Vakantie-aanvraag Details</h3>
                                <button
                                    className="btn btn-ghost btn-circle"
                                    onClick={() => setShowDetailsModal(false)}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Two-step approval progress indicator */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                                <div className="flex items-center gap-2 text-blue-800 mb-3">
                                    <InformationCircleIcon className="w-5 h-5" />
                                    <span className="font-medium">Twee-staps Goedkeuringsproces Status</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                            <CheckCircleIcon className="w-3 h-3" />
                                            1. Manager Goedkeuring
                                        </span>
                                        <ArrowRightIcon className="w-4 h-4 text-green-600" />
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                                            selectedRequest.status === 'manager_approved' ? 'bg-orange-500 text-white' :
                                                selectedRequest.status === 'approved' ? 'bg-green-500 text-white' :
                                                    selectedRequest.status === 'rejected' ? 'bg-red-500 text-white' :
                                                        'bg-gray-300 text-gray-600'
                                        }`}>
                                            {selectedRequest.status === 'manager_approved' ? <ClockIcon className="w-3 h-3" /> :
                                                selectedRequest.status === 'approved' ? <CheckCircleIcon className="w-3 h-3" /> :
                                                    selectedRequest.status === 'rejected' ? <XCircleIcon className="w-3 h-3" /> :
                                                        <ClockIcon className="w-3 h-3" />}
                                            2. Admin Finale Goedkeuring
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-2 text-sm text-blue-700">
                                    <strong>Huidige status:</strong> {selectedRequest.approvalStage || getApprovalStage(selectedRequest.status)}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Medewerker</label>
                                        <p className="text-lg font-medium">{selectedRequest.user?.fullName || 'Onbekend'}</p>
                                        {selectedRequest.user?.manager && (
                                            <p className="text-sm text-gray-500">Manager: {selectedRequest.user.manager.fullName}</p>
                                        )}
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
                                        <label className="text-sm font-semibold text-gray-600">Huidige Status</label>
                                        <div>
                                            <span className={`badge badge-lg ${getStatusBadgeClass(selectedRequest.status)}`}>
                                                {getStatusText(selectedRequest.status)}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Ingediend op</label>
                                        <p className="text-lg font-medium">
                                            {dayjs(selectedRequest.requestDate).format('DD-MM-YYYY HH:mm')}
                                        </p>
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

                            {/* Manager Approval Information - ENHANCED to show tracking */}
                            {selectedRequest.managerApprovedByUser && (
                                <div className="mt-6">
                                    <label className="text-sm font-semibold text-gray-600">Manager Goedkeuring (Stap 1)</label>
                                    <div className="bg-green-50 border border-green-200 p-4 rounded-xl mt-2">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">Manager:</span>
                                                <div className="font-bold text-green-800">{selectedRequest.managerApprovedByUser.fullName}</div>
                                                <div className="text-xs text-gray-500">ID: {selectedRequest.managerApprovedByUser.id}</div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Goedkeuringsdatum:</span>
                                                <div className="font-bold text-green-800">
                                                    {selectedRequest.managerApprovedDate ?
                                                        dayjs(selectedRequest.managerApprovedDate).format('DD-MM-YYYY HH:mm') :
                                                        'Onbekend'
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                        {selectedRequest.managerApprovalNotes && (
                                            <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                                                <div className="text-gray-600 text-xs font-medium mb-1">Manager opmerkingen:</div>
                                                <div className="text-gray-800">{selectedRequest.managerApprovalNotes}</div>
                                            </div>
                                        )}
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                ✅ Stap 1: Manager Goedkeuring Compleet
                                            </span>
                                        </div>

                                        {/* TRACKING INFO - Show that this is preserved */}
                                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                            <div className="text-xs text-blue-700">
                                                <strong>Tracking:</strong> Deze manager goedkeuring blijft bewaard, ook na finale admin verwerking.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Admin Processing Information - ENHANCED to show it's separate from manager */}
                            {(selectedRequest.status === 'approved' || selectedRequest.status === 'rejected') && selectedRequest.processedByUser && (
                                <div className="mt-6">
                                    <label className="text-sm font-semibold text-gray-600">Admin Finale Verwerking (Stap 2)</label>
                                    <div className={`p-4 rounded-xl mt-2 ${
                                        selectedRequest.status === 'approved' ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'
                                    }`}>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">Admin:</span>
                                                <div className="font-bold">{selectedRequest.processedByUser.fullName}</div>
                                                <div className="text-xs text-gray-500">ID: {selectedRequest.processedByUser.id}</div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Verwerkingsdatum:</span>
                                                <div className="font-bold">
                                                    {selectedRequest.processedDate ?
                                                        dayjs(selectedRequest.processedDate).format('DD-MM-YYYY HH:mm') :
                                                        'Onbekend'
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                        {selectedRequest.processingNotes && (
                                            <div className="mt-3 p-3 bg-white rounded-lg border">
                                                <div className="text-gray-600 text-xs font-medium mb-1">Admin opmerkingen:</div>
                                                <div className="text-gray-800">{selectedRequest.processingNotes}</div>
                                            </div>
                                        )}
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                selectedRequest.status === 'approved'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {selectedRequest.status === 'approved' ? '✅ Stap 2: Finale Goedkeuring' : '❌ Stap 2: Definitieve Afwijzing'}
                                            </span>
                                        </div>

                                        {/* TRACKING INFO - Show this is separate from manager approval */}
                                        <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                                            <div className="text-xs text-green-700">
                                                <strong>Volledig Proces:</strong> Manager goedkeuring ({selectedRequest.managerApprovedByUser?.fullName}) + Admin verwerking bewaard.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Vacation Balance Impact */}
                            {selectedRequest.status === 'manager_approved' && (() => {
                                const impact = calculateUserVacationImpact(selectedRequest);
                                return (
                                    <div className="mt-6">
                                        <label className="text-sm font-semibold text-gray-600">Vakantie Balans Impact</label>
                                        <div className={`p-4 rounded-xl mt-2 ${impact.hasInsufficientBalance ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-600">Totaal per jaar:</span>
                                                    <div className="font-bold">{impact.totalHours}u</div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Al gebruikt:</span>
                                                    <div className="font-bold">{impact.usedHours}u</div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Huidig beschikbaar:</span>
                                                    <div className="font-bold">{impact.currentRemaining}u</div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Na finale goedkeuring:</span>
                                                    <div className={`font-bold ${impact.hasInsufficientBalance ? 'text-red-600' : 'text-green-600'}`}>
                                                        {impact.remainingAfterApproval}u
                                                    </div>
                                                </div>
                                            </div>
                                            {impact.hasInsufficientBalance && (
                                                <div className="mt-3 p-3 bg-red-100 rounded-lg">
                                                    <div className="flex items-center gap-2 text-red-800">
                                                        <ExclamationTriangleIcon className="w-5 h-5" />
                                                        <span className="font-medium">Waarschuwing: Onvoldoende vakantie-balans!</span>
                                                    </div>
                                                    <p className="text-sm text-red-700 mt-1">
                                                        Deze medewerker heeft onvoldoende vakantie-uren voor deze aanvraag.
                                                        Overweeg afwijzing of neem contact op met HR.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {selectedRequest.status === 'manager_approved' && (
                                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                                    <button
                                        className="btn btn-error rounded-xl hover:scale-105 transition-all duration-200"
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            handleProcessRequest(selectedRequest, 'reject');
                                        }}
                                    >
                                        <XCircleIcon className="w-5 h-5 mr-2" />
                                        Finale Afwijzing
                                    </button>
                                    <button
                                        className="btn btn-success rounded-xl hover:scale-105 transition-all duration-200"
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            handleProcessRequest(selectedRequest, 'approve');
                                        }}
                                    >
                                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                                        Finale Goedkeuring
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Process Modal */}
                {showProcessModal && processingRequest && selectedRequest && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-8 rounded-2xl shadow-elmar-lg max-w-md w-full mx-4">
                            <div className="text-center mb-6">
                                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                                    processingRequest.action === 'approve' ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                    {processingRequest.action === 'approve' ? (
                                        <CheckCircleIcon className="w-8 h-8 text-green-600" />
                                    ) : (
                                        <XCircleIcon className="w-8 h-8 text-red-600" />
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">
                                    Finale {processingRequest.action === 'approve' ? 'goedkeuring' : 'afwijzing'}?
                                </h3>
                                <p className="text-gray-600 mt-2">
                                    {selectedRequest.user?.fullName} - {dayjs(selectedRequest.startDate).format('DD-MM-YYYY')} tot {dayjs(selectedRequest.endDate).format('DD-MM-YYYY')}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {selectedRequest.hours} uur ({selectedRequest.hours / 8} dagen)
                                </p>
                            </div>

                            {/* Manager approval confirmation */}
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 text-green-800 mb-2">
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span className="font-medium">Manager heeft al goedgekeurd</span>
                                </div>
                                <div className="text-sm text-green-700">
                                    <p><strong>Manager:</strong> {selectedRequest.managerApprovedByUser?.fullName}</p>
                                    <p><strong>Datum:</strong> {selectedRequest.managerApprovedDate ? dayjs(selectedRequest.managerApprovedDate).format('DD-MM-YYYY HH:mm') : 'Onbekend'}</p>
                                    {selectedRequest.managerApprovalNotes && (
                                        <p><strong>Opmerkingen:</strong> {selectedRequest.managerApprovalNotes}</p>
                                    )}
                                </div>
                            </div>

                            {/* Process explanation - Enhanced to show tracking preservation */}
                            <div className={`mb-6 p-4 rounded-lg ${
                                processingRequest.action === 'approve' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                            }`}>
                                {processingRequest.action === 'approve' ? (
                                    <div className="text-green-800 text-sm">
                                        <p className="font-medium mb-1">Na uw finale goedkeuring:</p>
                                        <p>• De aanvraag wordt volledig goedgekeurd</p>
                                        <p>• De medewerker krijgt definitieve bevestiging</p>
                                        <p>• De uren worden afgetrokken van de balans</p>
                                        <p>• <strong>Manager goedkeuring blijft bewaard voor tracking</strong></p>
                                        <p>• Uw admin verwerking wordt ook geregistreerd</p>
                                    </div>
                                ) : (
                                    <div className="text-red-800 text-sm">
                                        <p className="font-medium mb-1">Na uw finale afwijzing:</p>
                                        <p>• De aanvraag wordt definitief afgekeurd</p>
                                        <p>• Medewerker en manager krijgen een melding</p>
                                        <p>• De uren blijven beschikbaar in de balans</p>
                                        <p>• <strong>Manager goedkeuring blijft bewaard voor tracking</strong></p>
                                        <p>• Uw admin afwijzing wordt geregistreerd</p>
                                    </div>
                                )}
                            </div>

                            {processingRequest.action === 'reject' && (
                                <div className="mb-6">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700">Reden voor finale afwijzing *</span>
                                    </label>
                                    <textarea
                                        className="textarea textarea-bordered w-full"
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Voer een reden in voor de finale afwijzing..."
                                        rows={3}
                                    />
                                    <div className="text-xs text-gray-500 mt-1">
                                        Deze reden wordt gedeeld met zowel de medewerker als de manager.
                                    </div>
                                </div>
                            )}

                            {processingRequest.action === 'approve' && (() => {
                                const impact = calculateUserVacationImpact(selectedRequest);
                                if (impact.hasInsufficientBalance) {
                                    return (
                                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <div className="flex items-center gap-2 text-yellow-800 mb-2">
                                                <ExclamationTriangleIcon className="w-5 h-5" />
                                                <span className="font-medium">Let op!</span>
                                            </div>
                                            <p className="text-sm text-yellow-700">
                                                Deze medewerker heeft onvoldoende vakantie-balans. Na goedkeuring heeft hij/zij {impact.remainingAfterApproval} uur (negatief saldo).
                                                Overweeg contact op te nemen met HR voordat u goedkeurt.
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            <div className="flex justify-end gap-3">
                                <button
                                    className="btn btn-outline rounded-xl"
                                    onClick={() => {
                                        setShowProcessModal(false);
                                        setProcessingRequest(null);
                                        setRejectionReason("");
                                    }}
                                    disabled={isProcessing}
                                >
                                    Annuleren
                                </button>
                                <button
                                    className={`btn rounded-xl ${
                                        processingRequest.action === 'approve' ? 'btn-success' : 'btn-error'
                                    }`}
                                    onClick={confirmProcessRequest}
                                    disabled={isProcessing || (processingRequest.action === 'reject' && !rejectionReason.trim())}
                                >
                                    {isProcessing ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm mr-2"></span>
                                            Verwerken...
                                        </>
                                    ) : (
                                        <>
                                            {processingRequest.action === 'approve' ? (
                                                <>
                                                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                                                    Finale Goedkeuring
                                                </>
                                            ) : (
                                                <>
                                                    <XCircleIcon className="w-5 h-5 mr-2" />
                                                    Finale Afwijzing
                                                </>
                                            )}
                                        </>
                                    )}
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
