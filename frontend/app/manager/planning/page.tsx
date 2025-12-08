"use client";
import { Calendar, Users, Clock } from "lucide-react";

export default function ManagerPlanningPage() {
  return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Team Planning
          </h1>
          <p className="text-gray-600 dark:text-slate-400">Week en maand planning</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deze Week</h3>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-gray-900 dark:text-white">Team Leden Beschikbaar</span>
                </div>
                <span className="text-2xl font-bold text-purple-600">8/10</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400">2 met vakantie</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900 dark:text-white">Totaal Geplande Uren</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">320u</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400">40u per persoon gemiddeld</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kalender Overzicht</h3>
          <p className="text-gray-500 dark:text-slate-400">Planning kalender wordt hier weergegeven...</p>
        </div>
      </div>
  );
}
