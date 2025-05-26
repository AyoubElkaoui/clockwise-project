"use client";
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import {
    CalendarDaysIcon,
    PlusCircleIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

// Types
export interface VacationRequest {
    id: number;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    requestDate: string;
    userId: number;
    approvedBy?: string;
    approvedDate?: string;
    rejectionReason?: string;
}

export interface VacationBalance {
    totalDays: number;
    usedDays: number;
    pendingDays: number;
    remainingDays: number;
}

// API Functions - Fixed implementatie
const getVacationRequests = async (): Promise<VacationRequest[]> => {
    try {
        const response = await fetch('/api/vacation-requests', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.warn('Failed to fetch vacation requests:', response.status);
            return [];
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching vacation requests:', error);
        return [];
    }
};

const createVacationRequest = async (request: {
    startDate: string;
    endDate: string;
    reason: string;
}): Promise<VacationRequest | null> => {
    try {
        const response = await fetch('/api/vacation-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating vacation request:', error);
        throw error;
    }
};

const getVacationBalance = async (): Promise<VacationBalance> => {
    try {
        const response = await fetch('/api/vacation-balance', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.warn('Failed to fetch vacation balance:', response.status);
            return {
                totalDays: 25,
                usedDays: 0,
                pendingDays: 0,
                remainingDays: 25
            };
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching vacation balance:', error);
        return {
            totalDays: 25,
            usedDays: 0,
            pendingDays: 0,
            remainingDays: 25
        };
    }
};

export default function VacationOverview(): React.JSX.Element {
    const [requests, setRequests] = useState<VacationRequest[]>([]);
    const [balance, setBalance] = useState<VacationBalance>({
        totalDays: 25,
        usedDays: 0,
        pendingDays: 0,
        remainingDays: 25
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    // Form state
    const [showForm, setShowForm] = useState<boolean>(false);
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [reason, setReason] = useState<string>("");
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Calculate working days between two dates (excluding weekends)
    const calculateWorkingDays = (start: string, end: string): number => {
        if (!start || !end) return 0;

        const startDay = dayjs(start);
        const endDay = dayjs(end);

        if (endDay.isBefore(startDay)) return 0;

        let workingDays = 0;
        let currentDay = startDay;

        while (currentDay.isSameOrBefore(endDay)) {
            // Skip weekends (Saturday = 6, Sunday = 0)
            if (currentDay.day() !== 0 && currentDay.day() !== 6) {
                workingDays++;
            }
            currentDay = currentDay.add(1, 'day');
        }

        return workingDays;
    };

    const fetchData = async () => {
        setLoading(true);
        setError("");

        try {
            const [requestsData, balanceData] = await Promise.all([
                getVacationRequests(),
                getVacationBalance()
            ]);

            setRequests(requestsData);
            setBalance(balanceData);
        } catch (err) {
            console.error('Error fetching vacation data:', err);
            setError("Fout bij het ophalen van vakantiegegevens");
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

        const days = calculateWorkingDays(startDate, endDate);
        if (days <= 0) {
            setError("Selecteer geldige datums");
            return;
        }

        if (days > balance.remainingDays) {
            setError(`Onvoldoende vakantiedagen (${balance.remainingDays} beschikbaar)`);
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const newRequest = await createVacationRequest({
                startDate,
                endDate,
                reason: reason.trim()
            });

            if (newRequest) {
                setRequests(prev => [newRequest, ...prev]);
                setBalance(prev => ({
                    ...prev,
                    pendingDays: prev.pendingDays + days,
                    remainingDays: prev.remainingDays - days
                }));

                // Reset form
                setStartDate("");
                setEndDate("");
                setReason("");
                setShowForm(false);

                // Refresh data
                await fetchData();
            }
        } catch (err: any) {
            setError(err.message || "Fout bij het aanmaken van vakantieaanvraag");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusIcon = (status: string) => {
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
        switch (status) {
            case 'approved':
                return 'Goedgekeurd';
            case 'rejected':
                return 'Afgewezen';
            default:
                return 'In behandeling';
        }
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

    const currentDays = calculateWorkingDays(startDate, endDate);

    return (
        <div className="container mx-auto p-6 space-y-6 animate-fade-in">
            {/* Header Section */}
            <div className="bg-gradient-elmar text-white rounded-2xl p-8 shadow-elmar-card">
                <div className="flex items-center gap-3 mb-4">
                    <CalendarDaysIcon className="w-8 h-8" />
                    <h1 className="text-4xl font-bold">Vakantie Overzicht</h1>
                </div>
                <p className="text-blue-100 text-lg">Beheer je vakantieaanvragen en bekijk je vakantiesaldo</p>
            </div>

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
                            <p className="text-blue-100 text-sm font-medium">Totaal Vakantiedagen</p>
                            <p className="text-3xl font-bold">{balance.totalDays}</p>
                        </div>
                        <CalendarDaysIcon className="w-12 h-12 text-blue-200" />
                    </div>
                </div>

                <div className="bg-gradient-success text-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm font-medium">Opgenomen Dagen</p>
                            <p className="text-3xl font-bold">{balance.usedDays}</p>
                        </div>
                        <CheckCircleIcon className="w-12 h-12 text-green-200" />
                    </div>
                </div>

                <div className="bg-gradient-warning text-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-yellow-100 text-sm font-medium">In Behandeling</p>
                            <p className="text-3xl font-bold">{balance.pendingDays}</p>
                        </div>
                        <ClockIcon className="w-12 h-12 text-yellow-200" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm font-medium">Beschikbaar</p>
                            <p className="text-3xl font-bold">{balance.remainingDays}</p>
                        </div>
                        <CalendarDaysIcon className="w-12 h-12 text-purple-200" />
                    </div>
                </div>
            </div>

            {/* New Request Section */}
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
                                        <strong>{currentDays} werkdagen</strong> geselecteerd
                                        {currentDays > balance.remainingDays && (
                                            <span className="text-error ml-2">
                                                (⚠️ Onvoldoende dagen beschikbaar: {balance.remainingDays})
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
                                    disabled={submitting || currentDays > balance.remainingDays}
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
                                <th className="text-gray-700 font-semibold">📊 Dagen</th>
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
                                                    {request.days} dagen
                                                </span>
                                        </td>
                                        <td className="text-gray-600">{request.reason}</td>
                                        <td className="text-gray-500">
                                            {dayjs(request.requestDate).format("DD-MM-YYYY")}
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
        </div>
    );
}