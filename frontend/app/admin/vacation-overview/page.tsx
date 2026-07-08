"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import { Calendar, Users, TrendingUp } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ToastContainer } from "@/components/Toast";
import type { ToastType } from "@/components/Toast";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface VacationRequest {
  id: number;
  startDate: string;
  endDate: string;
  hours: number;
  days: number;
  reason: string;
}

interface UserOverview {
  userId: number;
  userName: string;
  email: string;
  totalVacationDays: number;
  totalVacationHours: number;
  approvedRequests: number;
  requests: VacationRequest[];
}

interface AnnualOverview {
  year: number;
  overview: UserOverview[];
}

export default function VacationOverviewPage() {
  const [data, setData] = useState<AnnualOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now().toString() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadOverview();
  }, [selectedYear]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/vacation-requests/annual-overview?year=${selectedYear}`
      );
      if (!response.ok) throw new Error("Failed to load overview");
      const result = await response.json();
      setData(result);
    } catch (error) {
      addToast("Kon jaaroverzicht niet laden", "error");
    } finally {
      setLoading(false);
    }
  };

  const totalDays = data?.overview.reduce((sum, u) => sum + u.totalVacationDays, 0) || 0;
  const totalRequests = data?.overview.reduce((sum, u) => sum + u.approvedRequests, 0) || 0;
  const avgDaysPerUser = data?.overview.length ? totalDays / data.overview.length : 0;

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Jaaroverzicht Vakantiedagen</h1>
            <p className="text-xs text-slate-500 mt-0.5">Overzicht voor {selectedYear}</p>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Totaal Vakantiedagen</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalDays.toFixed(1)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Gemiddeld per Medewerker</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{avgDaysPerUser.toFixed(1)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Totaal Aanvragen</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalRequests}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Overzicht per Medewerker</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Naam</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vakantiedagen</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Uren</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Aanvragen</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody>
                {data?.overview.map((user) => (
                  <>
                    <tr
                      key={user.userId}
                      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{user.userName}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{user.email}</td>
                      <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">
                        {user.totalVacationDays.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{user.totalVacationHours}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{user.approvedRequests}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            setExpandedUser(expandedUser === user.userId ? null : user.userId)
                          }
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {expandedUser === user.userId ? "Verberg" : "Toon"}
                        </button>
                      </td>
                    </tr>
                    {expandedUser === user.userId && (
                      <tr key={`${user.userId}-details`}>
                        <td colSpan={6} className="bg-slate-50 dark:bg-slate-900 px-4 py-4">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-wider mb-3">
                              Vakantie Aanvragen
                            </h4>
                            {user.requests.map((req) => (
                              <div
                                key={req.id}
                                className="flex justify-between items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-md text-sm"
                              >
                                <div>
                                  <span className="font-medium text-slate-900 dark:text-slate-100">
                                    {new Date(req.startDate).toLocaleDateString("nl-NL")} &ndash;{" "}
                                    {new Date(req.endDate).toLocaleDateString("nl-NL")}
                                  </span>
                                  {req.reason && (
                                    <span className="text-slate-500 ml-2">({req.reason})</span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-blue-600 dark:text-blue-400">
                                    {req.days} dagen
                                  </span>
                                  <span className="text-slate-500 ml-2">({req.hours}u)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {data?.overview.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                  <Calendar className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Geen data</p>
                <p className="text-xs text-slate-500 mt-1">Geen gegevens gevonden voor {selectedYear}.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ProtectedRoute>
  );
}
