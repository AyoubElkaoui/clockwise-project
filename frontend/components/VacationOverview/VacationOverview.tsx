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
    hours: number; // Changed from days to hours
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    requestDate: string;
    userId: number;
    approvedBy?: string;
    approvedDate?: string;
    rejectionReason?: string;
}

export interface VacationBalance {
    totalHours: number; // Changed from days to hours
    usedHours: number;
    pendingHours: number;
    remainingHours: number;
}

// Mock API Functions - Vervangen door echte API als backend klaar is
const getVacationRequests = async (): Promise<VacationRequest[]> => {
    try {
        // Probeer echte API eerst
        const response = await fetch('/api/vacation-requests', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        }
    } catch (error) {
        console.warn('API niet beschikbaar, gebruik mock data:', error);
    }

    // Fallback naar mock data
    const mockRequests: VacationRequest[] = [
        {
            id: 1,
            startDate: '2025-06-15',
            endDate: '2025-06-19',
            hours: 40, // 5 days * 8 hours
            reason: 'Zomervakantie',
            status: 'approved',
            requestDate: '2025-05-01',
            userId: 1,
            approvedBy: 'Manager',
            approvedDate: '2025-05-02'
        },
        {
            id: 2,
            startDate: '2025-07-15',
            endDate: '2025-07-29',
            hours: 88, // 11 working days * 8 hours
            reason: 'Familiebezoek',
            status: 'pending',
            requestDate: '2025-05-20',
            userId: 1
        }
    ];

    return mockRequests;
};

const createVacationRequest = async (request: {
    startDate: string;
    endDate: string;
    reason: string;
}): Promise<VacationRequest | null> => {
    try {
        // Probeer echte API eerst
        const response = await fetch('/api/vacation-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.warn('API niet beschikbaar, simuleer aanmaak:', error);
    }

    // Fallback: simuleer succesvol aanmaken
    const hours = calculateWorkingHours(request.startDate, request.endDate);
    const newRequest: VacationRequest = {
        id: Date.now(), // Tijdelijke ID
        startDate: request.startDate,
        endDate: request.endDate,
        hours,
        reason: request.reason,
        status: 'pending',
        requestDate: dayjs().format('YYYY-MM-DD'),
        userId: Number(localStorage.getItem('userId')) || 1
    };

    return newRequest;
};

const getVacationBalance = async (): Promise<VacationBalance> => {
    try {
        // Probeer echte API eerst
        const response = await fetch('/api/vacation-balance', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            return data;
        }
    } catch (error) {
        console.warn('API niet beschikbaar, gebruik mock balance:', error);
    }

    // Fallback naar mock data
    return {
        totalHours: 200, // 25 days * 8 hours
        usedHours: 40,
        pendingHours: 88,
        remainingHours: 72
    };
};

// Helper function - Calculate working hours (8 hours per working day)
const calculateWorkingHours = (start: string, end: string): number => {
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

    return workingDays * 8; // 8 hours per working day
};

// Helper function to convert hours to days for display
const formatHoursToDays = (hours: number): string => {
    const days = hours / 8;
    if (days === Math.floor(days)) {
        return `${days} dag${days !== 1 ? 'en' : ''}`;
    }
    return `${hours}u (${days.toFixed(1)} dagen)`;
};

export default function VacationOverview(): React.JSX.Element {
    const [requests, setRequests] = useState<VacationRequest[]>([]);
    const [balance, setBalance] = useState<VacationBalance>({
        totalHours: 200,
        usedHours: 0,
        pendingHours: 0,
        remainingHours: 200
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

        const hours = calculateWorkingHours(startDate, endDate);
        if (hours <= 0) {
            setError("Selecteer geldige datums");
            return;
        }

        if (hours > balance.remainingHours) {
            setError(`Onvoldoende vakantie-uren (${balance.remainingHours}u beschikbaar)`);
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
                    pendingHours: prev.pendingHours + hours,
                    remainingHours: prev.remainingHours - hours
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

    const currentHours = calculateWorkingHours(startDate, endDate);

    return (
        <div className="space-y-6">
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
                <div className="bg-blue-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Totaal Vakantie-uren</p>
                            <p className="text-3xl font-bold">{balance.totalHours}u</p>
                            <p className="text-blue-200 text-xs">{balance.totalHours / 8} dagen</p>
                        </div>
                        <CalendarDaysIcon className="w-12 h-12 text-blue-200" />
                    </div>
                </div>

                <div className="bg-gradient-success text-white rounded-xl p-6 shadow-lg hover:shadow-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm font-medium">Opgenomen Uren</p>
                            <p className="text-3xl font-bold">{balance.usedHours}u</p>
                            <p className="text-green-200 text-xs">{balance.usedHours / 8} dagen</p>
                        </div>
                        <CheckCircleIcon className="w-12 h-12 text-green-200" />
                    </div>
                </div>

                <div className="bg-gradient-warning text-white rounded-xl p-6 shadow-lg hover:shadow-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-yellow-100 text-sm font-medium">In Behandeling</p>
                            <p className="text-3xl font-bold">{balance.pendingHours}u</p>
                            <p className="text-yellow-200 text-xs">{balance.pendingHours / 8} dagen</p>
                        </div>
                        <ClockIcon className="w-12 h-12 text-yellow-200" />
                    </div>
                </div>

                <div className="bg-purple-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl">
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

            {/* New Request Section */}
            <div className="card bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
                <div className="card-body p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <PlusCircleIcon className="w-6 h-6 text-elmar-primary" />
                            <h2 className="text-2xl font-bold text-gray-800">Nieuwe Vakantieaanvraag</h2>
                        </div>
                        <button
                            className="btn btn-primary rounded-xl"
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
                                        <span className="label-text font-semibold text-gray-700">Datum Startdatum</span>
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
                                        <span className="label-text font-semibold text-gray-700">Datum Einddatum</span>
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
                                                (Onvoldoende uren beschikbaar: {balance.remainingHours}u)
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold text-gray-700">Reden</span>
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
                                    className="btn btn-primary rounded-xl"
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
            <div className="card bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
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
                                <th className="text-gray-700 font-semibold">Datum Periode</th>
                                <th className="text-gray-700 font-semibold">Tijd Uren</th>
                                <th className="text-gray-700 font-semibold">Reden</th>
                                <th className="text-gray-700 font-semibold">Datum Aangevraagd</th>
                                <th className="text-gray-700 font-semibold">Status</th>
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
                                            <div className="text-6xl">Vakantie</div>
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

            {/* Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Balance Info */}
                <div className="card bg-blue-100 border-2 border-blue-200 rounded-2xl">
                    <div className="card-body p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <CalendarDaysIcon className="w-6 h-6 text-blue-600" />
                            Vakantie Balans {new Date().getFullYear()}
                        </h3>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-white/70 rounded-lg">
                                <span className="font-medium text-gray-700">Totaal toegekend:</span>
                                <span className="font-bold text-blue-600">{balance.totalHours}u ({balance.totalHours / 8} dagen)</span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-white/70 rounded-lg">
                                <span className="font-medium text-gray-700">Al opgenomen:</span>
                                <span className="font-bold text-green-600">{balance.usedHours}u ({balance.usedHours / 8} dagen)</span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-white/70 rounded-lg">
                                <span className="font-medium text-gray-700">In behandeling:</span>
                                <span className="font-bold text-yellow-600">{balance.pendingHours}u ({balance.pendingHours / 8} dagen)</span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-white/70 rounded-lg border-2 border-purple-200">
                                <span className="font-bold text-gray-700">Nog beschikbaar:</span>
                                <span className="font-bold text-purple-600 text-lg">{balance.remainingHours}u ({balance.remainingHours / 8} dagen)</span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-gray-700">Gebruikt van totaal</span>
                                <span className="font-semibold text-gray-700">
                                    {(((balance.usedHours + balance.pendingHours) / balance.totalHours) * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div className="flex h-4 rounded-full overflow-hidden">
                                    <div
                                        className="bg-green-500"
                                        style={{ width: `${(balance.usedHours / balance.totalHours) * 100}%` }}
                                        title={`Opgenomen: ${balance.usedHours}u`}
                                    ></div>
                                    <div
                                        className="bg-yellow-500"
                                        style={{ width: `${(balance.pendingHours / balance.totalHours) * 100}%` }}
                                        title={`In behandeling: ${balance.pendingHours}u`}
                                    ></div>
                                </div>
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                                <span className="text-green-600">Opgenomen</span>
                                <span className="text-yellow-600">In behandeling</span>
                                <span className="text-purple-600">Beschikbaar</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tips & Info */}
                <div className="card bg-blue-100 border-2 border-green-200 rounded-2xl">
                    <div className="card-body p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-6 h-6 text-green-600" />
                            Belangrijk om te weten
                        </h3>

                        <div className="space-y-3 text-sm text-gray-700">
                            <div className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">•</span>
                                <span>Vakantie wordt berekend in uren (8 uur = 1 werkdag)</span>
                            </div>

                            <div className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">•</span>
                                <span>Alleen werkdagen (maandag t/m vrijdag) tellen mee voor vakantie-uren</span>
                            </div>

                            <div className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">•</span>
                                <span>Weekenddagen kosten geen vakantie-uren</span>
                            </div>

                            <div className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">•</span>
                                <span>Je aanvraag moet goedgekeurd worden door je manager</span>
                            </div>

                            <div className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">•</span>
                                <span>Je krijgt een notificatie zodra je aanvraag is behandeld</span>
                            </div>

                            <div className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">•</span>
                                <span>Niet opgenomen vakantie-uren vervallen aan het einde van het jaar</span>
                            </div>

                            <div className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">•</span>
                                <span>Voor spoedeisende vakantie, neem contact op met je manager</span>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="mt-6 p-4 bg-white/70 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-2">Snelle statistieken</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-600">Gemiddeld per maand:</span>
                                    <div className="font-bold text-green-600">{(balance.totalHours / 12).toFixed(1)}u ({(balance.totalHours / 12 / 8).toFixed(1)} dagen)</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">Resterende weken:</span>
                                    <div className="font-bold text-purple-600">{(balance.remainingHours / 40).toFixed(1)} weken</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            {balance.remainingHours > 0 && (
                <div className="bg-blue-600 text-white rounded-2xl p-6 text-center">
                    <h3 className="text-2xl font-bold mb-2">Plan je vakantie!</h3>
                    <p className="mb-4">Je hebt nog <strong>{balance.remainingHours} uur</strong> ({balance.remainingHours / 8} dagen) vakantie over dit jaar.</p>
                    <button
                        className="btn btn-outline btn-lg text-white border-white hover:bg-white hover:text-blue-600 rounded-xl"
                        onClick={() => setShowForm(true)}
                    >
                        <PlusCircleIcon className="w-6 h-6 mr-2" />
                        Nieuwe Vakantie Plannen
                    </button>
                </div>
            )}

            {balance.remainingHours <= 0 && (
                <div className="bg-slate-600 text-white rounded-2xl p-6 text-center">
                    <h3 className="text-2xl font-bold mb-2">Geen vakantie meer beschikbaar</h3>
                    <p>Je hebt al je vakantie-uren voor dit jaar gebruikt of aangevraagd.</p>
                </div>
            )}
        </div>
    );
}