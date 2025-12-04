"use client";
import { useState, useEffect, useMemo } from "react";
import { API_URL } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, Search, CheckCircle, XCircle, AlertCircle, User, Building } from "lucide-react";
import dayjs from "dayjs";

export default function AdminApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ingeleverd");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const res = await fetch("${API_URL}/time-entries");
      const data = await res.json();
      setEntries(data);
    } catch (error) {
      console.error("Failed to load entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(entry => entry.status === filterStatus);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.user?.firstName?.toLowerCase().includes(query) ||
        entry.user?.lastName?.toLowerCase().includes(query) ||
        entry.project?.name?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [entries, filterStatus, searchQuery]);

  const handleApprove = async (id: number) => {
    try {
      await fetch(`${API_URL}/time-entries/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      });
      setSuccessMessage("Uren goedgekeurd!");
      setTimeout(() => setSuccessMessage(""), 3000);
      loadEntries();
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await fetch(`${API_URL}/time-entries/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: false }),
      });
      setSuccessMessage("Uren afgekeurd!");
      setTimeout(() => setSuccessMessage(""), 3000);
      loadEntries();
    } catch (error) {
      console.error("Failed to reject:", error);
    }
  };

  const handleBulkApprove = async () => {
    const pending = filteredEntries.filter(e => e.status === "ingeleverd");
    for (const entry of pending) {
      await handleApprove(entry.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return <Badge className="bg-green-500">Goedgekeurd</Badge>;
      case "ingeleverd":
        return <Badge className="bg-yellow-500">In behandeling</Badge>;
      case "afgekeurd":
        return <Badge className="bg-red-500">Afgekeurd</Badge>;
      default:
        return <Badge variant="secondary">Concept</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingCount = entries.filter(e => e.status === "ingeleverd").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Alle Goedkeuringen</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{pendingCount} in behandeling</p>
        </div>
        {pendingCount > 0 && (
          <Button onClick={handleBulkApprove}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Alles Goedkeuren ({pendingCount})
          </Button>
        )}
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
              placeholder="Zoek op naam, project..."
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
          variant={filterStatus === "ingeleverd" ? "default" : "outline"}
          onClick={() => setFilterStatus("ingeleverd")}
        >
          In behandeling
        </Button>
        <Button
          variant={filterStatus === "goedgekeurd" ? "default" : "outline"}
          onClick={() => setFilterStatus("goedgekeurd")}
        >
          Goedgekeurd
        </Button>
        <Button
          variant={filterStatus === "afgekeurd" ? "default" : "outline"}
          onClick={() => setFilterStatus("afgekeurd")}
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

      {/* Entries */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="pt-6 pb-6 text-center text-slate-600 dark:text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Geen registraties gevonden</p>
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-lg transition">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {entry.user?.firstName?.charAt(0)}{entry.user?.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {entry.user?.firstName} {entry.user?.lastName}
                        </h3>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {entry.user?.function || "Werknemer"}
                        </span>
                        {getStatusBadge(entry.status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Datum</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {dayjs(entry.startTime).format("DD MMM YYYY")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Tijd</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {dayjs(entry.startTime).format("HH:mm")} - {dayjs(entry.endTime).format("HH:mm")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Totaal</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {((dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") - (entry.breakMinutes || 0)) / 60).toFixed(2)} uur
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Pauze</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {entry.breakMinutes || 0} min
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
                        <Building className="w-4 h-4" />
                        <span>{entry.project?.projectGroup?.company?.name} • {entry.project?.name}</span>
                      </div>

                      {entry.notes && (
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Notities</p>
                          <p className="text-sm text-slate-900 dark:text-slate-100">{entry.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {entry.status === "ingeleverd" && (
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" onClick={() => handleApprove(entry.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Goedkeuren
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(entry.id)}>
                        <XCircle className="w-4 h-4 mr-1" />
                        Afkeuren
                      </Button>
                    </div>
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
