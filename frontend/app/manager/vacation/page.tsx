"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getAllUsers, getAllVacationRequests, updateVacationRequestStatus } from "@/lib/manager-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import authUtils from "@/lib/auth-utils";
import {
  CheckCircle,
  XCircle,
  Search,
  AlertCircle,
  Calendar,
  User,
} from "lucide-react";
import dayjs from "dayjs";

export default function ManagerVacationPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [filteredUser, setFilteredUser] = useState<any>(null);

  const filterRequests = () => {
    let filtered = requests;
    if (filterStatus !== "all") {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.userFirstName?.toLowerCase().includes(query) ||
          r.userLastName?.toLowerCase().includes(query),
      );
    }
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt || b.startDate).getTime() -
        new Date(a.createdAt || a.startDate).getTime(),
    );
    setFilteredRequests(filtered);
  };

  useEffect(() => {
    const userId = searchParams.get("userId");
    if (userId) {
      setFilterStatus("all"); // Show all statuses when filtering by user
    }
    loadRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchQuery, filterStatus]);

  const loadRequests = async () => {
    try {
      const managerId = authUtils.getUserId();
      if (!managerId) {
        showToast("Gebruiker niet ingelogd", "error");
        return;
      }

      const userId = searchParams.get("userId");
      const [users, allRequests] = await Promise.all([
        getAllUsers(),
        getAllVacationRequests()
      ]);

      const team = users.filter((u: any) => u.managerId === managerId);
      const teamIds = team.map((u: any) => u.id || u.medewGcId);

      let teamRequests;

      if (userId) {
        // Filter for specific user
        const user = team.find((u: any) => u.id === Number(userId) || u.medewGcId === Number(userId));
        if (user) {
          setFilteredUser(user);
          teamRequests = allRequests.filter((r: any) => r.userId === Number(userId));
        } else {
          showToast("Gebruiker niet gevonden in team", "error");
          teamRequests = [];
        }
      } else {
        // Filter for all team members
        teamRequests = allRequests.filter((r: any) => teamIds.includes(r.userId));
      }

      setRequests(teamRequests);
    } catch (error) {
      showToast("Fout bij laden vakantieaanvragen", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number, comment: string) => {
    try {
      await updateVacationRequestStatus(id, "approved", comment);
      showToast("✅ Vakantie succesvol goedgekeurd! Werknemer ontvangt een notificatie.", "success");
      setSelectedRequest(null);
      setComment("");
      loadRequests();
    } catch (error) {
      console.error("Failed to approve:", error);
      showToast("Fout bij goedkeuren", "error");
    }
  };

  const handleReject = async (id: number, comment: string) => {
    try {
      await updateVacationRequestStatus(id, "rejected", comment);
      showToast("❌ Vakantie afgekeurd. Werknemer ontvangt een notificatie.", "success");
      setSelectedRequest(null);
      setComment("");
      loadRequests();
    } catch (error) {
      console.error("Failed to reject:", error);
      showToast("Fout bij afkeuren", "error");
    }
  };

  const calculateDays = (startDate: string, endDate: string) => {
    return dayjs(endDate).diff(dayjs(startDate), "day") + 1;
  };

  const getStatusBadge = (status: string) => {
    const lowerStatus = status?.toLowerCase();
    switch (lowerStatus) {
      case "approved":
        return <Badge className="bg-green-500">Goedgekeurd</Badge>;
      case "submitted":
      case "pending":
        return <Badge className="bg-yellow-500">In afwachting</Badge>;
      case "rejected":
        return <Badge className="bg-red-500">Afgekeurd</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = requests.filter((r) => 
    r.status?.toLowerCase() === "pending" || r.status?.toLowerCase() === "submitted"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {filteredUser
              ? `Vakantie Verzoeken - ${filteredUser.firstName} ${filteredUser.lastName}`
              : "Vakantie Verzoeken"}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {filteredUser
              ? `${pendingCount} verzoeken wachten op goedkeuring`
              : `${pendingCount} verzoeken wachten op goedkeuring`}
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-green-800 dark:text-green-200">
            {successMessage}
          </span>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoek op naam..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "pending" ? "default" : "outline"}
                onClick={() => setFilterStatus("pending")}
              >
                In afwachting
              </Button>
              <Button
                variant={filterStatus === "approved" ? "default" : "outline"}
                onClick={() => setFilterStatus("approved")}
              >
                Goedgekeurd
              </Button>
              <Button
                variant={filterStatus === "rejected" ? "default" : "outline"}
                onClick={() => setFilterStatus("rejected")}
              >
                Afgekeurd
              </Button>
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
              >
                Alles
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              Geen vakantie verzoeken gevonden
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-timr-orange-light dark:bg-timr-orange-light/20 flex items-center justify-center">
                        <User className="w-6 h-6 text-timr-orange dark:text-timr-orange" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {request.userFirstName} {request.userLastName}
                          </h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {request.user?.function || "Medewerker"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Start Datum
                      </p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {dayjs(request.startDate).format("DD MMM YYYY")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Eind Datum
                      </p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {dayjs(request.endDate).format("DD MMM YYYY")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Aantal Dagen
                      </p>
                      <p className="font-medium text-timr-orange dark:text-timr-orange">
                        {calculateDays(request.startDate, request.endDate)}{" "}
                        dagen
                      </p>
                    </div>
                  </div>

                  {request.reason && (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Reden:
                      </p>
                      <p className="text-sm text-slate-900 dark:text-slate-100">
                        {request.reason}
                      </p>
                    </div>
                  )}

                  {request.managerComment && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                        Manager Opmerking:
                      </p>
                      <p className="text-sm text-slate-900 dark:text-slate-100">
                        {request.managerComment}
                      </p>
                    </div>
                  )}

                  {request.status === "pending" &&
                    (selectedRequest?.id === request.id ? (
                      <div className="space-y-3 bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                        <Textarea
                          placeholder="Voeg een opmerking toe (optioneel)..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(request.id, comment)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Goedkeuren
                          </Button>
                          <Button
                            variant="outline"
                            className="text-red-600 border-red-600"
                            onClick={() => handleReject(request.id, comment)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Afkeuren
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedRequest(null);
                              setComment("");
                            }}
                          >
                            Annuleren
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          Behandelen
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
