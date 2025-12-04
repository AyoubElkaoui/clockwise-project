"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Search, AlertCircle, Building } from "lucide-react";
import dayjs from "dayjs";

export default function ManagerApprovePage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ingeleverd");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [entries, searchQuery, filterStatus]);

  const loadEntries = async () => {
    try {
      const managerId = Number(localStorage.getItem("userId"));
      const res = await fetch(`http://localhost:5000/api/time-entries/team?managerId=${managerId}`);
      const data = await res.json();
      setEntries(data);
    } catch (error) {
      console.error("Failed to load entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = entries;
    if (filterStatus !== "all") {
      filtered = filtered.filter(e => e.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.user?.firstName?.toLowerCase().includes(query) ||
        e.user?.lastName?.toLowerCase().includes(query) ||
        e.project?.name?.toLowerCase().includes(query)
      );
    }
    filtered.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    setFilteredEntries(filtered);
  };

  const handleApprove = async (id: number) => {
    try {
      await fetch(`http://localhost:5000/api/time-entries/${id}/approve`, {
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
      await fetch(`http://localhost:5000/api/time-entries/${id}/approve`, {
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
    const pending = entries.filter(e => e.status === "ingeleverd");
    for (const entry of pending) {
      await handleApprove(entry.id);
    }
  };

  const calculateHours = (entry: any) => {
    if (!entry.startTime || !entry.endTime) return 0;
    const diff = dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute");
    return (diff - (entry.breakMinutes || 0)) / 60;
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

  const pendingCount = entries.filter(e => e.status === "ingeleverd").length;

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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Team Goedkeuringen</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{pendingCount} uren wachten op goedkeuring</p>
        </div>
        {pendingCount > 0 && (
          <Button onClick={handleBulkApprove} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            Alles Goedkeuren ({pendingCount})
          </Button>
        )}
      </div>

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-green-800 dark:text-green-200">{successMessage}</span>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoek op naam, project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant={filterStatus === "ingeleverd" ? "default" : "outline"} onClick={() => setFilterStatus("ingeleverd")}>In behandeling</Button>
              <Button variant={filterStatus === "goedgekeurd" ? "default" : "outline"} onClick={() => setFilterStatus("goedgekeurd")}>Goedgekeurd</Button>
              <Button variant={filterStatus === "afgekeurd" ? "default" : "outline"} onClick={() => setFilterStatus("afgekeurd")}>Afgekeurd</Button>
              <Button variant={filterStatus === "all" ? "default" : "outline"} onClick={() => setFilterStatus("all")}>Alles</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Geen uren gevonden met de huidige filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                          {entry.user?.firstName?.charAt(0)}{entry.user?.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {entry.user?.firstName} {entry.user?.lastName}
                          </h3>
                          {getStatusBadge(entry.status)}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{entry.user?.function || "Medewerker"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Datum</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{dayjs(entry.startTime).format("DD MMM YYYY")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Tijd</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {dayjs(entry.startTime).format("HH:mm")} - {dayjs(entry.endTime).format("HH:mm")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Totaal</p>
                        <p className="font-medium text-green-600 dark:text-green-400">{calculateHours(entry).toFixed(2)}u</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Pauze</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{entry.breakMinutes || 0} min</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Building className="w-4 h-4" />
                      <span>{entry.project?.projectGroup?.company?.name || "Geen bedrijf"}</span>
                      <span>•</span>
                      <span>{entry.project?.name || "Geen project"}</span>
                    </div>

                    {entry.notes && (
                      <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded p-3">
                        <p className="font-medium mb-1">Opmerkingen:</p>
                        <p>{entry.notes}</p>
                      </div>
                    )}
                  </div>

                  {entry.status === "ingeleverd" && (
                    <div className="flex flex-col gap-2 ml-4">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(entry.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Goedkeuren
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleReject(entry.id)}>
                        <XCircle className="w-4 h-4 mr-1" />
                        Afkeuren
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
