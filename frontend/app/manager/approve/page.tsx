"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { formatDateNL } from "@/lib/dateUtils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function ManagerApprovePage() {
  const [pendingHours, setPendingHours] = useState<any[]>([]);
  const [pendingVacations, setPendingVacations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"uren" | "vakantie">("uren");

  useEffect(() => {
    loadPendingItems();
  }, []);

  const loadPendingItems = async () => {
    try {
      const managerId = Number(localStorage.getItem("userId"));
      if (!managerId) return;

      const [hoursRes, vacationsRes] = await Promise.all([
        axios.get(`${API_URL}/time-entries/team/pending?managerId=${managerId}`),
        axios.get(`${API_URL}/vacation-requests/team/pending?managerId=${managerId}`)
      ]);

      setPendingHours(hoursRes.data || []);
      setPendingVacations(vacationsRes.data || []);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveHours = async (id: number) => {
    try {
      await axios.put(`${API_URL}/time-entries/${id}`, { status: "goedgekeurd" });
      loadPendingItems();
    } catch (error) {
      console.error("Approve failed:", error);
    }
  };

  const handleRejectHours = async (id: number) => {
    try {
      await axios.put(`${API_URL}/time-entries/${id}`, { status: "afgekeurd" });
      loadPendingItems();
    } catch (error) {
      console.error("Reject failed:", error);
    }
  };

  const handleApproveVacation = async (id: number) => {
    try {
      await axios.put(`${API_URL}/vacation-requests/${id}`, { status: "Approved" });
      loadPendingItems();
    } catch (error) {
      console.error("Approve failed:", error);
    }
  };

  const handleRejectVacation = async (id: number) => {
    try {
      await axios.put(`${API_URL}/vacation-requests/${id}`, { status: "Rejected" });
      loadPendingItems();
    } catch (error) {
      console.error("Reject failed:", error);
    }
  };

  if (loading) {
    return <div className="p-8">Laden...</div>;
  }

  const totalCount = pendingHours.length + pendingVacations.length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Goedkeuringen ({totalCount})</h1>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setView("uren")}
          className={`px-6 py-3 font-medium border-b-2 ${
            view === "uren" ? "border-blue-600 text-blue-600" : "border-transparent"
          }`}
        >
          Uren ({pendingHours.length})
        </button>
        <button
          onClick={() => setView("vakantie")}
          className={`px-6 py-3 font-medium border-b-2 ${
            view === "vakantie" ? "border-blue-600 text-blue-600" : "border-transparent"
          }`}
        >
          Vakantie ({pendingVacations.length})
        </button>
      </div>

      {view === "uren" ? (
        pendingHours.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p>Geen uren om goed te keuren</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Medewerker</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Datum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Uren</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Notities</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingHours.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium">
                        {entry.user?.firstName} {entry.user?.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{entry.project?.name || "Geen project"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">{formatDateNL(entry.date, "DD-MM-YYYY")}</td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold">{entry.hours}u</span>
                    </td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate">{entry.notes || "-"}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => handleApproveHours(entry.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mr-2"
                      >
                        Goedkeuren
                      </button>
                      <button
                        onClick={() => handleRejectHours(entry.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                      >
                        Afkeuren
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        pendingVacations.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p>Geen vakantie om goed te keuren</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Medewerker</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Van</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tot</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Uren</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Reden</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingVacations.map((vacation) => (
                  <tr key={vacation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium">
                        {vacation.user?.firstName} {vacation.user?.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{formatDateNL(vacation.startDate, "DD-MM-YYYY")}</td>
                    <td className="px-6 py-4 text-sm">{formatDateNL(vacation.endDate, "DD-MM-YYYY")}</td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold">{vacation.hours || 0}u</span>
                    </td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate">{vacation.reason || "-"}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => handleApproveVacation(vacation.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mr-2"
                      >
                        Goedkeuren
                      </button>
                      <button
                        onClick={() => handleRejectVacation(vacation.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                      >
                        Afkeuren
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
