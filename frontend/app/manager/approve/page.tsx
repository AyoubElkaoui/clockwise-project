"use client";
import ManagerLayout from "@/components/ManagerLayout";
import { useState, useEffect } from "react";
import { getTimeEntries, getVacationRequests } from "@/lib/api";
import { CheckCircle2, XCircle, Clock, Calendar, AlertCircle } from "lucide-react";
import dayjs from "dayjs";

export default function ManagerApprovePage() {
  const [pendingHours, setPendingHours] = useState<any[]>([]);
  const [pendingVacations, setPendingVacations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingItems();
  }, []);

  const loadPendingItems = async () => {
    try {
      const [entries, vacations] = await Promise.all([
        getTimeEntries(),
        getVacationRequests(),
      ]);

      setPendingHours(entries.filter((e: any) => e.status === "ingeleverd"));
      setPendingVacations(vacations.filter((v: any) => v.status === "Pending"));
    } catch (error) {
      console.error("Failed to load pending items:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ManagerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </ManagerLayout>
    );
  }

  const totalPending = pendingHours.length + pendingVacations.length;

  return (
    <ManagerLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Goedkeuringen
          </h1>
          <p className="text-gray-600">
            {totalPending} items wachten op goedkeuring
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-orange-100 rounded-xl">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Uren te Goedkeuren</p>
                <p className="text-3xl font-bold text-gray-900">{pendingHours.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-100 rounded-xl">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Vakantie Aanvragen</p>
                <p className="text-3xl font-bold text-gray-900">{pendingVacations.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Hours */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6 text-purple-600" />
            Uren Registraties
          </h2>
          
          <div className="space-y-4">
            {pendingHours.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Alle uren zijn goedgekeurd! 🎉</p>
              </div>
            ) : (
              pendingHours.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-orange-100 rounded-xl">
                        <Clock className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-lg font-bold text-gray-900">
                            {entry.hours} uur
                          </p>
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                            {entry.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {dayjs(entry.date).format("DD MMMM YYYY")}
                        </p>
                        {entry.notes && (
                          <p className="text-sm text-gray-500 mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all shadow-lg hover:scale-110">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg hover:scale-110">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Vacations */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-600" />
            Vakantie Aanvragen
          </h2>
          
          <div className="space-y-4">
            {pendingVacations.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Alle vakantie aanvragen zijn afgehandeld! 🎉</p>
              </div>
            ) : (
              pendingVacations.map((vacation) => (
                <div
                  key={vacation.id}
                  className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-lg font-bold text-gray-900">
                            Vakantie Aanvraag
                          </p>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            {vacation.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {dayjs(vacation.startDate).format("DD MMM")} - {dayjs(vacation.endDate).format("DD MMM YYYY")}
                        </p>
                        {vacation.reason && (
                          <p className="text-sm text-gray-500 mt-1">{vacation.reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all shadow-lg hover:scale-110">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg hover:scale-110">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ManagerLayout>
  );
}
