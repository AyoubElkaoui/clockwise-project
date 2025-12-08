"use client";
import { BarChart3, TrendingUp, Users, Clock, Building2 } from "lucide-react";

export default function AdminReportsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Rapporten
        </h1>
        <p className="text-gray-600 dark:text-slate-400">Overzichten en analyses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 hover:shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Gebruikers Rapport</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            Overzicht van alle gebruikers en hun activiteiten
          </p>
          <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Genereer Rapport
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 hover:shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Uren Rapport</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            Totaal overzicht van geregistreerde uren per project
          </p>
          <button className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Genereer Rapport
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 hover:shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bedrijven Rapport</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            Analyse per bedrijf en projecten
          </p>
          <button className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Genereer Rapport
          </button>
        </div>
      </div>
    </div>
  );
}
