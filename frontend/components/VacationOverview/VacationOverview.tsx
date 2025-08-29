// Updated VacationOverview.tsx - Fix the API calls

"use client";
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrBefore);

import {
    CalendarDaysIcon,
    PlusCircleIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

// Import your existing API functions
import {
    getVacationRequests,
    createVacationRequest,
    getVacationBalance,
    calculateWorkingDays,
    formatHoursToDays,
    getVacationStatusInfo
} from "@/lib/api";

// Types
export interface VacationRequest {
    id: number;
    startDate: string;
    endDate: string;
    hours: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    requestDate: string;
    userId: number;
    approvedBy?: string;
    approvedDate?: string;
    rejectionReason?: string;
    user?: {
        id: number;
        firstName: string;
        lastName: string;
        fullName: string;
    };
}

export interface VacationBalance {
    totalHours: number;
    usedHours: number;
    pendingHours: number;
    remainingHours: number;
    year: number;
}

export default function VacationOverview(): React.JSX.Element {
    const [requests, setRequests] = useState<VacationRequest[]>([]);
    const [balance, setBalance] = useState<VacationBalance>({
        totalHours: 200,
        usedHours: 0,
        pendingHours: 0,
        remainingHours: 200,
        year: new Date().getFullYear()
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    // Form state
    const [showForm, setShowForm] = useState<boolean>(false);
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [reason, setReason] = useState<string>("");
    const [submitting, setSubmitting] = useState<boolean>(false);

    const fetchData = async () => {
        setLoading(true);
        setError("");

        try {
            const userId = Number(localStorage.getItem("userId")) || 1;

            // Use your existing API functions
            const [requestsData, balanceData] = await Promise.all([
                getVacationRequests(),
                getVacationBalance(userId)
            ]);

            // Filter requests for current user if needed
            const userRequests = Array.isArray(requestsData)
                ? requestsData.filter(req => req.userId === userId)
                : [];

            setRequests(userRequests);
            setBalance(balanceData || {
                totalHours: 200,
                usedHours: 0,
                pendingHours: 0,
                remainingHours: 200,
                year: new Date().getFullYear()
            });
        } catch (err) {
            console.error('Error fetching vacation data:', err);
            setError("Fout bij het ophalen van vakantiegegevens");

            // Set fallback data
            setRequests([]);
            setBalance({
                totalHours: 200,
                usedHours: 0,
                pendingHours: 0,
                remainingHours: 200,
                year: new Date().getFullYear()
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!startDate || !endDate || !reason.trim()) {
            setError("Vul alle velden in");
            return;
        }

        // Calculate working days and hours
        const workingDays = calculateWorkingDays(startDate, endDate);
        const hours = workingDays * 8; // 8 hours per working day

        if (hours <= 0) {
            setError("Selecteer geldige datums met werkdagen");
            return;
        }

        if (hours > balance.remainingHours) {
            setError(`Onvoldoende vakantie-uren (${balance.remainingHours}u beschikbaar)`);
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const userId = Number(localStorage.getItem("userId")) || 1;

            // Use your existing API function
            const newRequest = await createVacationRequest({
                userId,
                startDate,
                endDate,
                hours,
                reason: reason.trim(),
                status: "pending"
            });

            if (newRequest) {
                // Add to local state immediately for better UX
                const requestWithUser = {
                    ...newRequest,
                    user: {
                        id: userId,
                        firstName: localStorage.getItem("firstName") || "",
                        lastName: localStorage.getItem("lastName") || "",
                        fullName: `${localStorage.getItem("firstName") || ""} ${localStorage.getItem("lastName") || ""}`.trim()
                    }
                };

                setRequests(prev => [requestWithUser, ...prev]);

                // Update balance optimistically
                setBalance(prev => ({
                    ...prev,
                    pendingHours: prev.pendingHours + hours,
                    remainingHours: prev.remainingHours - hours
                }));

                // Reset form
                setStartDate("");
                setEndDate("");
                setReason("");
                setShowForm(false);

                // Refresh data from server
                setTimeout(fetchData, 1000);
            }
        } catch (err: any) {
            console.error('Error creating vacation request:', err);

            // Handle different error formats
            if (err.response?.data) {
                setError(typeof err.response.data === 'string' ? err.response.data : "Fout bij het aanmaken van vakantieaanvraag");
            } else if (err.message) {
                setError(err.message);
            } else {
                setError("Fout bij het aanmaken van vakantieaanvraag");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusIcon = (status: string) => {
        const statusInfo = getVacationStatusInfo(status);
        switch (status) {
            case 'approved':
                return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
            case 'rejected':
                return <XCircleIcon className="w-5 h-5 text-red-500" />;
            default:
                return <ClockIcon className="w-5 h-5 text-yellow-500" />;
        }
    };

    const getStatusText = (status: string) => {
        const statusInfo = getVacationStatusInfo(status);
        return statusInfo.text;
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'approved':
                return 'badge-success';
            case 'rejected':
                return 'badge-error';
            default:
                return 'badge-warning';
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex justify-center items-center h-64">
                    <div className="loading loading-spinner loading-lg text-elmar-primary"></div>
                </div>
            </div>
        );
    }

    const currentHours = calculateWorkingDays(startDate, endDate) * 8;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Error Alert */}
            {error && (
                <div className="alert alert-error rounded-xl">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                    <span>{error}</span>
                    <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setError("")}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Vacation Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Totaal Vakantie-uren</p>
                            <p className="text-3xl font-bold">{balance.totalHours}u</p>
                            <p className="text-blue-200 text-xs">{balance.totalHours / 8} dagen</p>
                        </div>
                        <CalendarDaysIcon className="w-12 h-12 text-blue-200" />
                    </div>
                </div>

                <div className="bg-gradient-success text-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm font-medium">Opgenomen Uren</p>
                            <p className="text-3xl font-bold">{balance.usedHours}u</p>
                            <p className="text-green-200 text-xs">{balance.usedHours / 8} dagen</p>
                        </div>
                        <CheckCircleIcon className="w-12 h-12 text-green-200" />
                    </div>
                </div>

                <div className="bg-gradient-warning text-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-yellow-100 text-sm font-medium">In Behandeling</p>
                            <p className="text-3xl font-bold">{balance.pendingHours}u</p>
                            <p className="text-yellow-200 text-xs">{balance.pendingHours / 8} dagen</p>
                        </div>
                        <ClockIcon className="w-12 h-12 text-yellow-200" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm font-medium">Beschikbaar</p>
                            <p className="text-3xl font-bold">{balance.remainingHours}u</p>
                            <p className="text-purple-200 text-xs">{balance.remainingHours / 8} dagen</p>
                        </div>
                        <CalendarDaysIcon className="w-12 h-12 text-purple-200" />
                    </div>
                </div>
            </div>

            {/* New Request Section*/}
            <div className="card bg-white shadow-elmar-card border-0 rounded-2xl overflow-hidden">
                <div className="card-body p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <PlusCircleIcon className="w-6 h-6 text-elmar-primary" />
                            <h2 className="text-2xl font-bold text-gray-800">Nieuwe Vakantieaanvraag</h2>
                        </div>
                        <button
                            className="btn btn-primary rounded-xl hover:scale-105 transition-all duration-200"
                            onClick={() => setShowForm(!showForm)}
                        >
                            {showForm ? 'Annuleren' : 'Nieuwe Aanvraag'}
                        </button>
                    </div>

                    {showForm && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700">📅 Startdatum</span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        min={dayjs().format("YYYY-MM-DD")}
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700">📅 Einddatum</span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        min={startDate || dayjs().format("YYYY-MM-DD")}
                                        required
                                    />
                                </div>
                            </div>

                            {startDate && endDate && (
                                <div className="alert alert-info rounded-xl">
                                    <CalendarDaysIcon className="w-6 h-6" />
                                    <span>
                                        <strong>{currentHours} uren</strong> ({currentHours / 8} werkdagen) geselecteerd
                                        {currentHours > balance.remainingHours && (
                                            <span className="text-error ml-2">
                                                (⚠️ Onvoldoende uren beschikbaar: {balance.remainingHours}u)
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold text-gray-700">📝 Reden</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl h-24"
                                    placeholder="Beschrijf de reden voor je vakantieaanvraag..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-4">
                                <button
                                    type="button"
                                    className="btn btn-outline btn-gray rounded-xl"
                                    onClick={() => {
                                        setShowForm(false);
                                        setStartDate("");
                                        setEndDate("");
                                        setReason("");
                                        setError("");
                                    }}
                                >
                                    Annuleren
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary rounded-xl hover:scale-105 transition-all duration-200"
                                    disabled={submitting || currentHours > balance.remainingHours}
                                >
                                    {submitting ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Aanmaken...
                                        </>
                                    ) : (
                                        'Aanvraag Indienen'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Requests Table */}
            <div className="card bg-white shadow-elmar-card border-0 rounded-2xl overflow-hidden">
                <div className="card-body p-0">
                    <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <CalendarDaysIcon className="w-6 h-6 text-elmar-primary" />
                            <h2 className="text-2xl font-bold text-gray-800">Mijn Vakantieaanvragen</h2>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="text-gray-700 font-semibold">📅 Periode</th>
                                <th className="text-gray-700 font-semibold">⏰ Uren</th>
                                <th className="text-gray-700 font-semibold">📝 Reden</th>
                                <th className="text-gray-700 font-semibold">📅 Aangevraagd</th>
                                <th className="text-gray-700 font-semibold">✅ Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {requests.length > 0 ? (
                                requests.map((request) => (
                                    <tr key={request.id} className="hover:bg-gray-50 transition-colors duration-150">
                                        <td className="font-medium">
                                            {dayjs(request.startDate).format("DD-MM-YYYY")} - {dayjs(request.endDate).format("DD-MM-YYYY")}
                                        </td>
                                        <td>
                                                <span className="badge badge-primary badge-lg font-semibold">
                                                    {request.hours}u ({request.hours / 8} dagen)
                                                </span>
                                        </td>
                                        <td className="text-gray-600">{request.reason}</td>
                                        <td className="text-gray-500">
                                            {request.requestDate ? dayjs(request.requestDate).format("DD-MM-YYYY") : '-'}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(request.status)}
                                                <span className={`badge ${getStatusBadgeClass(request.status)}`}>
                                                        {getStatusText(request.status)}
                                                    </span>
                                            </div>
                                            {request.status === 'rejected' && request.rejectionReason && (
                                                <div className="text-xs text-error mt-1">
                                                    {request.rejectionReason}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="text-6xl">🏖️</div>
                                            <div className="text-xl font-semibold text-gray-600">Geen vakantieaanvragen gevonden</div>
                                            <div className="text-gray-500">Maak je eerste vakantieaanvraag om hier iets te zien</div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Rest of your existing JSX remains the same... */}
            {/* Info sections, balance cards, quick actions, etc. */}

        </div>
    );
}
