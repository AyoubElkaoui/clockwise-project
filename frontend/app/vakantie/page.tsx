"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Loader2 } from "lucide-react";
import { getVacationRequests, registerVacationRequest } from "@/lib/api";
import dayjs from "dayjs";

interface VacationRequest {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  hours: number;
  reason: string;
  status: string;
}

export default function VakantiePage() {
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    hours: 8,
    reason: "",
  });

  useEffect(() => {
    loadVacationRequests();
  }, []);

  const loadVacationRequests = async () => {
    try {
      setLoading(true);
      const data = await getVacationRequests();
      
      // Filter voor huidige gebruiker
      const userId = Number(localStorage.getItem("userId"));
      const userRequests = data.filter((req: VacationRequest) => req.userId === userId);
      
      setRequests(userRequests);
    } catch (error) {
      console.error("Error loading vacation requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const userId = Number(localStorage.getItem("userId"));
      
      await registerVacationRequest({
        userId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        hours: formData.hours,
        reason: formData.reason,
        status: "pending",
      });

      setShowModal(false);
      setFormData({ startDate: "", endDate: "", hours: 8, reason: "" });
      loadVacationRequests();
    } catch (error) {
      console.error("Error creating vacation request:", error);
      alert("Fout bij aanmaken vakantie aanvraag");
    }
  };

  const calculateStats = () => {
    const approved = requests.filter(r => r.status === "approved");
    const pending = requests.filter(r => r.status === "pending");
    
    const totalDays = requests.reduce((sum, r) => sum + (r.hours / 8), 0);
    const approvedDays = approved.reduce((sum, r) => sum + (r.hours / 8), 0);
    const pendingDays = pending.reduce((sum, r) => sum + (r.hours / 8), 0);
    const availableDays = 25 - approvedDays; // Aangenomen 25 dagen per jaar
    
    return { totalDays, approvedDays, pendingDays, availableDays };
  };

  const stats = calculateStats();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "error";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Goedgekeurd";
      case "rejected":
        return "Afgewezen";
      case "pending":
        return "In Behandeling";
      default:
        return status;
    }
  };

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Vakantie
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Beheer je vakantiemeldingen en verlofdagen
              </p>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Aanvraag
            </Button>
          </div>

          {/* Balance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card variant="elevated" padding="md">
              <div className="text-center">
                <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {loading ? "..." : Math.round(stats.totalDays)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Totaal Dagen</p>
              </div>
            </Card>
            <Card variant="elevated" padding="md">
              <div className="text-center">
                <Calendar className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {loading ? "..." : Math.round(stats.approvedDays)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Goedgekeurd</p>
              </div>
            </Card>
            <Card variant="elevated" padding="md">
              <div className="text-center">
                <Calendar className="w-8 h-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {loading ? "..." : Math.round(stats.pendingDays)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">In Behandeling</p>
              </div>
            </Card>
            <Card variant="elevated" padding="md">
              <div className="text-center">
                <Calendar className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {loading ? "..." : Math.round(stats.availableDays)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Beschikbaar</p>
              </div>
            </Card>
          </div>

          {/* Vacation Requests */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle>Mijn Vakantie Aanvragen</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-slate-600">Laden...</span>
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Nog geen vakantie aanvragen
                  </p>
                  <Button className="mt-4" onClick={() => setShowModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nieuwe Aanvraag
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => {
                    const days = request.hours / 8;
                    const period = request.startDate === request.endDate
                      ? dayjs(request.startDate).format("D MMM")
                      : `${dayjs(request.startDate).format("D MMM")} - ${dayjs(request.endDate).format("D MMM")}`;
                    
                    return (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {period}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {request.reason} • {days} dag{days > 1 ? "en" : ""}
                          </p>
                        </div>
                        <Badge
                          variant={getStatusBadge(request.status) as any}
                          size="md"
                        >
                          {getStatusText(request.status)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal voor nieuwe aanvraag */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card variant="elevated" padding="lg" className="w-full max-w-md m-4">
                <CardHeader>
                  <CardTitle>Nieuwe Vakantie Aanvraag</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Startdatum</label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="input input-bordered w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Einddatum</label>
                      <input
                        type="date"
                        required
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="input input-bordered w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Uren per dag</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="8"
                        value={formData.hours}
                        onChange={(e) => setFormData({ ...formData, hours: Number(e.target.value) })}
                        className="input input-bordered w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Reden</label>
                      <textarea
                        required
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        className="textarea textarea-bordered w-full"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Aanvragen
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowModal(false)}
                      >
                        Annuleren
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
