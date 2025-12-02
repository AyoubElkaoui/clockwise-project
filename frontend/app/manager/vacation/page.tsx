"use client";
import { useState, useEffect } from "react";
import { getTeamVacations } from "@/lib/api";
import { Plane, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import dayjs from "dayjs";

export default function ManagerVacationPage() {
  const [vacations, setVacations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    loadTeamVacations();
  }, []);

  const loadTeamVacations = async () => {
    try {
      // Get managerId from localStorage
      const managerId = Number(localStorage.getItem("userId"));
      if (!managerId) {
        console.error("No manager ID found");
        setLoading(false);
        return;
      }

      // Use secure backend endpoint - only returns team vacation requests
      const data = await getTeamVacations(managerId);
      setVacations(data);

      // Calculate statistics
      const now = dayjs();
      const startOfMonth = now.startOf('month');
      const endOfMonth = now.endOf('month');

      const pending = data.filter((v: any) => v.status === 'Pending').length;
      const approved = data.filter((v: any) => v.status === 'Approved').length;
      const thisMonth = data.filter((v: any) => {
        const start = dayjs(v.startDate);
        return start.isAfter(startOfMonth) && start.isBefore(endOfMonth);
      }).length;

      setStats({ pending, approved, thisMonth });
    } catch (error) {
      console.error("Failed to load team vacations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Vakantie Aanvragen
          </h1>
          <p className="text-gray-600 dark:text-slate-400">Beheer team vakantie</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <p className="text-sm text-gray-600 dark:text-slate-400">Pending</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-gray-600 dark:text-slate-400">Goedgekeurd</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.approved}</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <p className="text-sm text-gray-600 dark:text-slate-400">Deze Maand</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.thisMonth}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Vakantie Overzicht ({vacations.length})
          </h3>
          
          {vacations.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400 text-center py-8">
              Geen vakantie aanvragen gevonden
            </p>
          ) : (
            <div className="space-y-3">
              {vacations.map((vacation) => (
                <div
                  key={vacation.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Plane className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {vacation.user?.firstName} {vacation.user?.lastName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        {dayjs(vacation.startDate).format("DD MMM")} - {dayjs(vacation.endDate).format("DD MMM YYYY")}
                      </p>
                      {vacation.reason && (
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">{vacation.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {vacation.hours} uur
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      vacation.status === 'Approved' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : vacation.status === 'Pending'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {vacation.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}
