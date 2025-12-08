"use client";
import { Building2, Plus } from "lucide-react";

export default function AdminCompaniesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Bedrijven
          </h1>
          <p className="text-gray-600 dark:text-slate-400">Beheer alle bedrijven</p>
        </div>
        <button className="btn btn-primary gap-2">
          <Plus className="w-4 h-4" />
          Nieuw Bedrijf
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bedrijven Overzicht</h3>
        <p className="text-gray-500 dark:text-slate-400">Bedrijven lijst wordt hier weergegeven...</p>
      </div>
    </div>
  );
}
