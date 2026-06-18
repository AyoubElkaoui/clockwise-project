"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import { Calendar, Users, TrendingUp, Loader2, Download } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToastContainer } from "@/components/Toast";
import type { ToastType } from "@/components/Toast";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

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
      <ModernLayout>
        <div className="space-y-6 animate-fadeIn">
          <PageHeader
            title="Jaaroverzicht Vakantiedagen"
            description={`Overzicht voor ${selectedYear}`}
            actions={
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            }
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Totaal Vakantiedagen"
              value={totalDays.toFixed(1)}
              icon={Calendar}
              color="indigo"
            />
            <StatCard
              title="Gemiddeld per Medewerker"
              value={avgDaysPerUser.toFixed(1)}
              icon={Users}
              color="emerald"
            />
            <StatCard
              title="Totaal Aanvragen"
              value={totalRequests}
              icon={TrendingUp}
              color="amber"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  Overzicht per Medewerker
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Naam</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Vakantiedagen</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Uren</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Aanvragen</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {data?.overview.map((user) => (
                        <>
                          <tr
                            key={user.userId}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{user.userName}</td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                              {user.email}
                            </td>
                            <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                              {user.totalVacationDays.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                              {user.totalVacationHours}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                              {user.approvedRequests}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() =>
                                  setExpandedUser(
                                    expandedUser === user.userId ? null : user.userId
                                  )
                                }
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                              >
                                {expandedUser === user.userId ? "Verberg" : "Toon"}
                              </button>
                            </td>
                          </tr>
                          {expandedUser === user.userId && (
                            <tr>
                              <td colSpan={6} className="bg-slate-50 dark:bg-slate-900 px-4 py-4">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2">
                                    Vakantie Aanvragen:
                                  </h4>
                                  {user.requests.map((req) => (
                                    <div
                                      key={req.id}
                                      className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-md text-sm"
                                    >
                                      <div>
                                        <span className="font-medium text-slate-900 dark:text-slate-100">
                                          {new Date(req.startDate).toLocaleDateString("nl-NL")} -{" "}
                                          {new Date(req.endDate).toLocaleDateString("nl-NL")}
                                        </span>
                                        {req.reason && (
                                          <span className="text-slate-500 ml-2">
                                            ({req.reason})
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                          {req.days} dagen
                                        </span>
                                        <span className="text-slate-500 ml-2">
                                          ({req.hours}u)
                                        </span>
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
                      <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Geen data</p>
                      <p className="text-sm text-slate-500 mt-1">Geen gegevens gevonden voor {selectedYear}.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </ModernLayout>
    </ProtectedRoute>
  );
}
