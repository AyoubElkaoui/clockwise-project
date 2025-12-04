"use client";
import { useState, useEffect, useMemo } from "react";
import { API_URL } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Search, CheckCircle, XCircle, AlertCircle, User } from "lucide-react";
import dayjs from "dayjs";

export default function AdminVacationPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await fetch("${API_URL}/vacation-requests");
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      console.error("Failed to load vacation requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    let filtered = requests;

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(req => req.status === filterStatus);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req =>
        req.user?.firstName?.toLowerCase().includes(query) ||
        req.user?.lastName?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [requests, filterStatus, searchQuery]);

  const handleApprove = async (id: number, managerComment: string) => {
    try {
      await fetch(`${API_URL}/vacation-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          managerComment: managerComment || undefined,
        }),
      });
      setSuccessMessage("Vakantie aanvraag goedgekeurd!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setSelectedRequest(null);
      setComment("");
      loadRequests();
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleReject = async (id: number, managerComment: string) => {
    try {
      await fetch(`${API_URL}/vacation-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          managerComment: managerComment || undefined,
        }),
      });
      setSuccessMessage("Vakantie aanvraag afgekeurd!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setSelectedRequest(null);
      setComment("");
      loadRequests();
    } catch (error) {
      console.error("Failed to reject:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Goedgekeurd</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">In behandeling</Badge>;
      case "rejected":
        return <Badge className="bg-red-500">Afgekeurd</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateDays = (start: string, end: string) => {
    return dayjs(end).diff(dayjs(start), "day") + 1;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Vakantie Aanvragen</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">{pendingCount} in behandeling</p>
      </div>

      {successMessage && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="w-5 h-5" />
              <span>{successMessage}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Zoek op naam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filterStatus === "pending" ? "default" : "outline"}
          onClick={() => setFilterStatus("pending")}
        >
          In behandeling
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

      {/* Requests */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="pt-6 pb-6 text-center text-slate-600 dark:text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Geen vakantie aanvragen gevonden</p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                      <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {request.user?.firstName} {request.user?.lastName}
                        </h3>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {request.user?.function || "Werknemer"}
                        </span>
                        {getStatusBadge(request.status)}
                      </div>

                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-900 dark:text-slate-100">
                            {dayjs(request.startDate).format("DD MMM YYYY")} - {dayjs(request.endDate).format("DD MMM YYYY")}
                          </span>
                        </div>
                        <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400">
                          {calculateDays(request.startDate, request.endDate)} dagen
                        </Badge>
                      </div>

                      {request.reason && (
                        <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Reden</p>
                          <p className="text-sm text-slate-900 dark:text-slate-100">{request.reason}</p>
                        </div>
                      )}

                      {request.managerComment && (
                        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Manager opmerking</p>
                          <p className="text-sm text-slate-900 dark:text-slate-100">{request.managerComment}</p>
                        </div>
                      )}

                      {selectedRequest === request.id && (
                        <div className="mt-4 space-y-3">
                          <Textarea
                            placeholder="Optionele opmerking..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleApprove(request.id, comment)}>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Goedkeuren
                            </Button>
                          <Button size="sm" variant="danger" onClick={() => handleReject(request.id, comment)}>
                            <XCircle className="w-4 h-4 mr-1" />
                            Afkeuren
                          </Button>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(null); setComment(""); }}>
                              Annuleren
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {request.status === "pending" && selectedRequest !== request.id && (
                    <Button size="sm" onClick={() => setSelectedRequest(request.id)}>
                      Behandelen
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
