"use client"; // <-- Zorg dat dit bovenaan staat

import React, { useState } from "react";
import dayjs from "dayjs";
import {
  CalendarDaysIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export default function VacationOverview() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [vacationType, setVacationType] = useState("");
  const [reason, setReason] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const vacationBalance = {
    total: 25,
    used: 13,
    pending: 3,
    remaining: 9,
  };

  const vacationRequests = [
    { id: 1, startDate: "2024-10-01", endDate: "2024-10-05", days: 5, type: "Jaarlijks Verlof", status: "goedgekeurd", reason: "Familievakantie" },
    { id: 2, startDate: "2024-09-25", endDate: "2024-09-25", days: 1, type: "Ziekteverlof", status: "goedgekeurd", reason: "Doktersafspraak" },
    { id: 3, startDate: "2024-12-23", endDate: "2024-12-30", days: 6, type: "Jaarlijks Verlof", status: "in_behandeling", reason: "Kerstvakantie" },
    { id: 4, startDate: "2024-08-15", endDate: "2024-08-22", days: 6, type: "Jaarlijks Verlof", status: "goedgekeurd", reason: "Zomervakantie" },
  ];

  const handleSubmitRequest = () => {
    if (startDate && endDate && vacationType) {
      alert("Vakantieaanvraag succesvol ingediend!");
      setStartDate("");
      setEndDate("");
      setVacationType("");
      setReason("");
      setIsDialogOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const base = "px-3 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "goedgekeurd": return `${base} bg-blue-500/20 text-blue-500`;
      case "in_behandeling": return `${base} bg-yellow-500/20 text-yellow-500`;
      case "afgewezen": return `${base} bg-red-500/20 text-red-500`;
      default: return base;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "goedgekeurd": return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      case "in_behandeling": return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case "afgewezen": return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 text-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Vakantieoverzicht</h1>
          <p className="text-sm text-gray-400">Beheer je vakantiedagen en aanvragen</p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
        >
          <PlusCircleIcon className="h-5 w-5 text-white" />
          <span>Nieuwe Aanvraag</span>
        </button>
      </div>

      {/* Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-6 border border-gray-800">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Vakantie Aanvragen</h2>
              <button onClick={() => setIsDialogOpen(false)} className="text-gray-400 hover:text-gray-200 text-xl">✕</button>
            </div>
            <p className="text-sm text-gray-400">Vul de onderstaande gegevens in om een nieuwe vakantieaanvraag in te dienen.</p>

            {/* Vakantie saldo */}
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Beschikbare Vakantiedagen</p>
              <div className="flex justify-between text-sm">
                <span>Resterend: <span className="font-semibold">{vacationBalance.remaining}</span></span>
                <span className="text-gray-500">({vacationBalance.used} gebruikt, {vacationBalance.pending} in behandeling)</span>
              </div>
            </div>

            {/* Formulier */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300">Startdatum</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Einddatum</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 mt-1" />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-300">Type</label>
              <select value={vacationType} onChange={(e) => setVacationType(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 mt-1">
                <option value="">Selecteer vakantie type</option>
                <option value="annual">Jaarlijks Verlof</option>
                <option value="sick">Ziekteverlof</option>
                <option value="personal">Persoonlijk Verlof</option>
                <option value="emergency">Noodverlof</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-300">Reden (optioneel)</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Korte beschrijving..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 mt-1 h-20 resize-none" />
            </div>

            <button onClick={handleSubmitRequest} className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-white font-medium transition">Aanvraag Indienen</button>
          </div>
        </div>
      )}

      {/* Vakantie Balans */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Vakantie Balans</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <BalanceItem icon={<CalendarDaysIcon />} label="Totaal Dagen" value={vacationBalance.total} />
          <BalanceItem icon={<CheckCircleIcon />} label="Gebruikt" value={vacationBalance.used} />
          <BalanceItem icon={<ClockIcon />} label="In Behandeling" value={vacationBalance.pending} />
          <BalanceItem icon={<CalendarDaysIcon />} label="Resterend" value={vacationBalance.remaining} />
        </div>
      </div>

      {/* Vakantieaanvragen */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Mijn Vakantie Aanvragen</h2>
        <div className="space-y-4">
          {vacationRequests.map((req) => (
            <div key={req.id} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {getStatusIcon(req.status)}
                  <span className={getStatusBadge(req.status)}>
                    {req.status === "goedgekeurd" ? "Goedgekeurd" : req.status === "in_behandeling" ? "In Behandeling" : "Afgewezen"}
                  </span>
                </div>
                <span className="text-sm text-gray-400">{req.days} dag{req.days > 1 ? "en" : ""}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-gray-400">Periode</p>
                  <p className="font-medium">{dayjs(req.startDate).format("D MMM")} - {dayjs(req.endDate).format("D MMM")}</p>
                </div>
                <div>
                  <p className="text-gray-400">Type</p>
                  <p className="font-medium">{req.type}</p>
                </div>
                <div>
                  <p className="text-gray-400">Reden</p>
                  <p className="font-medium">{req.reason}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Belangrijk om te Weten */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Belangrijk om te Weten</h2>
        <div className="space-y-4 text-sm">
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h4 className="font-medium mb-2">Vakantie Beleid</h4>
            <ul className="space-y-1 text-gray-400">
              <li>• Vakantieaanvragen moeten minimaal 2 weken van tevoren worden ingediend</li>
              <li>• Maximum opeenvolgende vakantiedagen: 10 dagen</li>
              <li>• Ongebruikte vakantiedagen vervallen aan het einde van het jaar</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h4 className="font-medium mb-2">Ziekteverlof Beleid</h4>
            <ul className="space-y-1 text-gray-400">
              <li>• Meld ziekteverlof zo snel mogelijk</li>
              <li>• Medisch attest vereist voor afwezigheid langer dan 3 dagen</li>
              <li>• Ziekteverlof telt niet mee voor vakantie quotum</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// BalanceItem component
function BalanceItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center bg-gray-800/50 p-4 rounded-lg border border-gray-700">
      <div className="text-blue-500 mb-2 h-6 w-6">{icon}</div>
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
