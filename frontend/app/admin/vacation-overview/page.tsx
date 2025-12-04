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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              Jaaroverzicht Vakantiedagen
            </h1>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="elevated" padding="lg">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Totaal Vakantiedagen
                    </p>
                    <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                      {totalDays.toFixed(1)}
                    </p>
                  </div>
                  <Calendar className="w-12 h-12 text-indigo-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Gemiddeld per Medewerker
                    </p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {avgDaysPerUser.toFixed(1)}
                    </p>
                  </div>
                  <Users className="w-12 h-12 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Totaal Aanvragen
                    </p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {totalRequests}
                    </p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Overzicht per Medewerker</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Naam
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Email
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Vakantiedagen
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Uren
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Aanvragen
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.overview.map((user) => (
                        <>
                          <tr
                            key={user.userId}
                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <td className="py-3 px-4 font-medium">{user.userName}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {user.email}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-indigo-600 dark:text-indigo-400">
                              {user.totalVacationDays.toFixed(1)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {user.totalVacationHours}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {user.approvedRequests}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() =>
                                  setExpandedUser(
                                    expandedUser === user.userId ? null : user.userId
                                  )
                                }
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                {expandedUser === user.userId ? "Verberg" : "Toon"}
                              </button>
                            </td>
                          </tr>
                          {expandedUser === user.userId && (
                            <tr>
                              <td colSpan={6} className="bg-slate-50 dark:bg-slate-900 p-4">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm mb-2">
                                    Vakantie Aanvragen:
                                  </h4>
                                  {user.requests.map((req) => (
                                    <div
                                      key={req.id}
                                      className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-md text-sm"
                                    >
                                      <div>
                                        <span className="font-medium">
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
                                        <span className="font-bold text-indigo-600">
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
                    <div className="text-center py-8 text-slate-500">
                      Geen gegevens gevonden voor {selectedYear}
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
