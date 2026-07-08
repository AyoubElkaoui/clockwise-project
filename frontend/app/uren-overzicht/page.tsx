"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import {
  Clock, Filter, Download, Search, Calendar,
  ChevronLeft, ChevronRight, CalendarDays, BarChart3,
} from "lucide-react";
import { getDrafts, getSubmitted, getRejected } from "@/lib/api/workflowApi";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/nl";
import { showToast } from "@/components/ui/toast";
import authUtils from "@/lib/auth-utils";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.locale("nl");

interface TimeEntryWithDetails {
  id: number;
  userId: number;
  date: string;
  projectId: number;
  projectCode?: string;
  projectName?: string;
  taskName?: string;
  companyId: number;
  companyName?: string;
  projectGroupId: number;
  projectGroupName?: string;
  hours: number;
  km: number;
  expenses: number;
  breakMinutes: number;
  notes: string;
  status: string;
  startTime?: string;
  endTime?: string;
}

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  goedgekeurd: { label: "Goedgekeurd",    color: "var(--c-green)",  bg: "var(--c-green-weak)"  },
  ingeleverd:  { label: "In Behandeling", color: "var(--c-amber)",  bg: "var(--c-amber-weak)"  },
  SUBMITTED:   { label: "In Behandeling", color: "var(--c-amber)",  bg: "var(--c-amber-weak)"  },
  afgekeurd:   { label: "Afgekeurd",      color: "var(--c-red)",    bg: "var(--c-red-weak)"    },
};

function getStatusMeta(status: string) {
  return statusMeta[status] || { label: "Concept", color: "var(--c-muted)", bg: "var(--c-hover)" };
}

function getStatusLabel(status: string) {
  return getStatusMeta(status).label;
}

export default function UrenOverzichtPage() {
  const [entries, setEntries] = useState<TimeEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPeriod, setCurrentPeriod] = useState(dayjs().startOf("isoWeek"));
  const [viewMode, setViewMode] = useState<"week" | "month" | "year">("month");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedYear, setSelectedYear] = useState(dayjs().year());

  useEffect(() => { loadEntries(); }, []);
  useEffect(() => { if (startDate && endDate) loadEntries(startDate, endDate); }, [startDate, endDate]);

  const loadEntries = async (from?: string, to?: string) => {
    try {
      const userId = authUtils.getUserId();
      if (!userId) { showToast("Gebruiker niet ingelogd", "error"); return; }
      const urenperGcId = 100426;
      const [drafts, submitted, rejected] = await Promise.all([
        getDrafts(urenperGcId), getSubmitted(urenperGcId), getRejected(urenperGcId),
      ]);
      const allEntries = [...drafts, ...submitted, ...rejected];
      const transformed = allEntries.map((e: any) => ({
        id: e.id,
        userId,
        date: e.datum.split("T")[0],
        projectId: e.werkGcId || 0,
        projectCode: e.werkCode || "",
        projectName: e.werkDescription || `Project ${e.werkGcId}`,
        taskName: e.taakDescription || "",
        hours: e.aantal,
        km: 0, expenses: 0, breakMinutes: 0,
        notes: e.omschrijving || "",
        status: e.status,
        startTime: e.datum, endTime: e.datum,
        companyId: 0, companyName: "", projectGroupId: 0, projectGroupName: "",
      }));
      setEntries(transformed);
    } catch {
      showToast("Fout bij laden uren", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = useMemo(() => {
    let filtered = entries;
    if (startDate && endDate) {
      const start = dayjs(startDate), end = dayjs(endDate);
      filtered = filtered.filter((e) => dayjs(e.date || e.startTime).isBetween(start, end, null, "[]"));
    } else {
      if (viewMode === "week") {
        const ws = currentPeriod.startOf("day"), we = currentPeriod.add(6, "day").endOf("day");
        filtered = filtered.filter((e) => dayjs(e.date || e.startTime).isBetween(ws, we, null, "[]"));
      } else if (viewMode === "month") {
        const ms = currentPeriod.startOf("month"), me = currentPeriod.endOf("month");
        filtered = filtered.filter((e) => dayjs(e.date || e.startTime).isBetween(ms, me, null, "[]"));
      } else {
        const ys = currentPeriod.startOf("year"), ye = currentPeriod.endOf("year");
        filtered = filtered.filter((e) => dayjs(e.date || e.startTime).isBetween(ys, ye, null, "[]"));
      }
    }
    if (statusFilter !== "all") filtered = filtered.filter((e) => e.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((e) =>
        e.projectName?.toLowerCase().includes(q) || e.companyName?.toLowerCase().includes(q) || e.notes?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [entries, currentPeriod, viewMode, statusFilter, searchQuery, startDate, endDate]);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = useMemo(() => filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredEntries, currentPage, itemsPerPage]);

  const chartData = useMemo(() => {
    const days = viewMode === "week" ? 7 : dayjs(currentPeriod).daysInMonth();
    return Array.from({ length: days }, (_, i) => {
      const date = viewMode === "week" ? currentPeriod.add(i, "day") : currentPeriod.date(i + 1);
      const hours = filteredEntries.filter((e) => dayjs(e.date || e.startTime).isSame(date, "day")).reduce((s, e) => s + (e.hours || 0), 0);
      return { day: date.format("DD/MM"), hours, fullDate: date.format("YYYY-MM-DD") };
    });
  }, [filteredEntries, currentPeriod, viewMode]);

  const stats = useMemo(() => ({
    total:    filteredEntries.reduce((s, e) => s + (e.hours || 0), 0),
    approved: filteredEntries.filter((e) => e.status === "goedgekeurd").reduce((s, e) => s + (e.hours || 0), 0),
    pending:  filteredEntries.filter((e) => e.status === "ingeleverd").reduce((s, e) => s + (e.hours || 0), 0),
  }), [filteredEntries]);

  const weekGroups = useMemo(() => {
    const groups = new Map<string, { label: string; entries: TimeEntryWithDetails[]; total: number }>();
    paginatedEntries.forEach((entry) => {
      const d = dayjs(entry.date || entry.startTime);
      const key = `${d.year()}-W${String(d.isoWeek()).padStart(2, "0")}`;
      if (!groups.has(key)) {
        const ws = d.startOf("isoWeek");
        groups.set(key, { label: `Week ${d.isoWeek()} · ${ws.format("DD/MM")} – ${ws.add(6, "day").format("DD/MM")}`, entries: [], total: 0 });
      }
      const g = groups.get(key)!;
      g.entries.push(entry);
      g.total += entry.hours || 0;
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [paginatedEntries]);

  const handlePrev = () => setCurrentPeriod((p) => p.subtract(1, viewMode === "week" ? "week" : viewMode === "month" ? "month" : "year"));
  const handleNext = () => setCurrentPeriod((p) => p.add(1, viewMode === "week" ? "week" : viewMode === "month" ? "month" : "year"));
  const handleToday = () => setCurrentPeriod(dayjs().startOf(viewMode === "week" ? "isoWeek" : viewMode === "month" ? "month" : "year"));
  const toggleView = () => {
    setViewMode((prev) => {
      const next = prev === "week" ? "month" : prev === "month" ? "year" : "week";
      setCurrentPeriod(dayjs().startOf(next === "week" ? "isoWeek" : next === "month" ? "month" : "year"));
      return next;
    });
  };
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setStartDate(`${year}-01-01`);
    setEndDate(`${year + 1}-01-01`);
    setViewMode("year");
    setCurrentPeriod(dayjs().year(year).startOf("year"));
  };
  const resetFilters = () => { setSearchQuery(""); setStatusFilter("all"); setStartDate(""); setEndDate(""); setCurrentPage(1); };

  const exportToCSV = () => {
    const rows = [["Datum","Groep","Project","Uren","KM","Onkosten","Status","Opmerkingen"].join(","),
      ...filteredEntries.map((e) => [e.date, e.projectGroupName||"", e.projectName, e.hours, e.km, e.expenses, getStatusLabel(e.status), `"${e.notes||""}"`].join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([rows], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url;
    a.download = `uren-${viewMode}-${currentPeriod.format("YYYY-MM-DD")}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const periodLabel = viewMode === "week"
    ? `Week ${currentPeriod.isoWeek()} • ${currentPeriod.format("DD/MM")} – ${currentPeriod.add(6, "day").format("DD/MM/YYYY")}`
    : viewMode === "month" ? currentPeriod.format("MMMM YYYY") : currentPeriod.format("YYYY");

  const inputStyle: React.CSSProperties = {
    height: 34, padding: "0 10px", fontSize: 13, border: "1px solid var(--c-border)",
    borderRadius: 7, background: "var(--c-panel)", color: "var(--c-text)",
    outline: "none", fontFamily: "inherit",
  };
  const panelStyle: React.CSSProperties = {
    background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10,
  };
  const thStyle: React.CSSProperties = {
    padding: "9px 16px", textAlign: "left", fontSize: 11, fontWeight: 600,
    color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
    borderBottom: "1px solid var(--c-border)", background: "var(--c-panel-2)",
  };

  const SimpleBarChart = ({ data }: { data: { day: string; hours: number }[] }) => {
    const maxH = Math.max(...data.map((d) => d.hours), 1);
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 112, overflowX: "auto" }}>
        {data.map((item, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 24 }}>
            <div
              title={`${item.day}: ${item.hours}u`}
              style={{
                width: "100%", background: "var(--c-accent)", borderRadius: "3px 3px 0 0",
                height: `${(item.hours / maxH) * 80}px`, minHeight: item.hours > 0 ? 4 : 0,
                opacity: item.hours > 0 ? 1 : 0.15, transition: "height 0.3s",
              }}
            />
            <span style={{ fontSize: 9, color: "var(--c-muted)", marginTop: 3, whiteSpace: "nowrap" }}>{item.day}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>Uren Overzicht</h1>
              <p style={{ fontSize: 13, color: "var(--c-muted)", margin: "3px 0 0" }}>Bekijk en beheer al je tijdregistraties</p>
            </div>
            <button
              onClick={exportToCSV}
              disabled={filteredEntries.length === 0}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--c-accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: filteredEntries.length === 0 ? "not-allowed" : "pointer", opacity: filteredEntries.length === 0 ? 0.5 : 1 }}
            >
              <Download size={14} /> Exporteren
            </button>
          </div>

          {/* Period navigation */}
          <div style={{ ...panelStyle, padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={handlePrev} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "none", border: "1px solid var(--c-border)", borderRadius: 7, fontSize: 13, color: "var(--c-text)", cursor: "pointer" }}>
                <ChevronLeft size={15} /> Vorige
              </button>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <button onClick={handleToday} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "none", border: "none", borderRadius: 6, fontSize: 12, color: "var(--c-muted)", cursor: "pointer" }}>
                  <Calendar size={13} /> Vandaag
                </button>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)" }}>{periodLabel}</span>
                <button onClick={toggleView} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "none", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 12, color: "var(--c-text-2)", cursor: "pointer" }}>
                  <CalendarDays size={13} />
                  {viewMode === "week" ? "Maand" : viewMode === "month" ? "Jaar" : "Week"}
                </button>
                {viewMode === "year" && (
                  <select value={selectedYear} onChange={(e) => handleYearChange(parseInt(e.target.value))} style={inputStyle}>
                    {Array.from({ length: dayjs().year() - 2017 }, (_, i) => 2018 + i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                )}
              </div>
              <button onClick={handleNext} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "none", border: "1px solid var(--c-border)", borderRadius: 7, fontSize: 13, color: "var(--c-text)", cursor: "pointer" }}>
                Volgende <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {[
              { label: "Totaal Uren",     value: `${stats.total.toFixed(1)}u`,    color: "var(--c-accent)" },
              { label: "Goedgekeurd",     value: `${stats.approved.toFixed(1)}u`, color: "var(--c-green)" },
              { label: "In Behandeling",  value: `${stats.pending.toFixed(1)}u`,  color: "var(--c-amber)" },
            ].map((s) => (
              <div key={s.label} style={{ ...panelStyle, padding: "18px 20px" }}>
                <p style={{ fontSize: 11, color: "var(--c-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{s.label}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: "4px 0 0" }}>{loading ? "—" : s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ ...panelStyle, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--c-muted)", pointerEvents: "none" }} />
                <input
                  style={{ ...inputStyle, width: "100%", paddingLeft: 32, boxSizing: "border-box" }}
                  placeholder="Zoek project, bedrijf..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
                <option value="all">Alle statussen</option>
                <option value="concept">Concept</option>
                <option value="ingeleverd">In Behandeling</option>
                <option value="goedgekeurd">Goedgekeurd</option>
                <option value="afgekeurd">Afgekeurd</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
              {[{ label: "Start", state: startDate, set: setStartDate }, { label: "Eind", state: endDate, set: setEndDate }].map((f) => (
                <div key={f.label}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", marginBottom: 4 }}>{f.label}</label>
                  <input type="date" value={f.state} onChange={(e) => f.set(e.target.value)} style={inputStyle} />
                </div>
              ))}
              <button onClick={resetFilters} style={{ display: "flex", alignItems: "center", gap: 5, height: 34, padding: "0 12px", background: "none", border: "1px solid var(--c-border)", borderRadius: 7, fontSize: 13, color: "var(--c-text-2)", cursor: "pointer" }}>
                <Filter size={13} /> Reset
              </button>
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ ...panelStyle, padding: "16px 18px" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <BarChart3 size={14} color="var(--c-muted)" /> Uren per dag
            </p>
            <SimpleBarChart data={chartData} />
          </div>

          {/* Entries table */}
          <div style={{ ...panelStyle, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>
                Registraties <span style={{ color: "var(--c-muted)", fontWeight: 400, fontSize: 12 }}>({filteredEntries.length})</span>
              </span>
            </div>

            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "56px 0" }}>
                <div style={{ width: 28, height: 28, border: "3px solid var(--c-border)", borderTopColor: "var(--c-accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 24px", textAlign: "center", gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--c-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Calendar size={20} color="var(--c-muted)" />
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: 0 }}>Geen registraties</p>
                <p style={{ fontSize: 12, color: "var(--c-muted)", margin: 0 }}>
                  {searchQuery || statusFilter !== "all" || startDate || endDate ? "Probeer andere filters" : "Start met het registreren van je uren"}
                </p>
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Datum</th>
                      <th style={thStyle}>Project</th>
                      <th style={{ ...thStyle }}>Taak</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Uren</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Notitie</th>
                    </tr>
                  </thead>
                  {weekGroups.map((group, gi) => (
                    <tbody key={gi}>
                      {group.entries.map((entry) => {
                        const meta = getStatusMeta(entry.status);
                        return (
                          <tr
                            key={entry.id}
                            style={{ borderBottom: "1px solid var(--c-border)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--c-hover)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            <td style={{ padding: "10px 16px", color: "var(--c-text)", whiteSpace: "nowrap" }}>
                              {dayjs(entry.date || entry.startTime).format("ddd DD/MM")}
                            </td>
                            <td style={{ padding: "10px 16px", maxWidth: 200 }}>
                              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {entry.projectName}
                              </p>
                              {entry.projectCode && <p style={{ fontSize: 11, color: "var(--c-muted)", margin: 0 }}>{entry.projectCode}</p>}
                            </td>
                            <td style={{ padding: "10px 16px", color: "var(--c-muted)" }}>{entry.taskName}</td>
                            <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: "var(--c-accent)" }}>
                              {entry.hours}u
                            </td>
                            <td style={{ padding: "10px 16px" }}>
                              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color }}>
                                {meta.label}
                              </span>
                            </td>
                            <td style={{ padding: "10px 16px", color: "var(--c-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {entry.notes}
                            </td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: "var(--c-panel-2)", borderBottom: "1px solid var(--c-border)" }}>
                        <td colSpan={6} style={{ padding: "7px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{group.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text)" }}>{group.total.toFixed(1)}u totaal</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  ))}
                </table>

                {totalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--c-border)" }}>
                    <span style={{ fontSize: 12, color: "var(--c-muted)" }}>Pagina {currentPage} van {totalPages} · {filteredEntries.length} registraties</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} style={{ display: "flex", alignItems: "center", gap: 3, padding: "5px 10px", border: "1px solid var(--c-border)", borderRadius: 7, background: "none", fontSize: 12, color: "var(--c-text-2)", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.4 : 1 }}>
                        <ChevronLeft size={13} /> Vorige
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i).map((page) => (
                        <button key={page} onClick={() => setCurrentPage(page)} style={{ padding: "5px 10px", border: `1px solid ${page === currentPage ? "var(--c-accent)" : "var(--c-border)"}`, borderRadius: 7, background: page === currentPage ? "var(--c-accent)" : "none", color: page === currentPage ? "#fff" : "var(--c-text-2)", fontSize: 12, fontWeight: page === currentPage ? 700 : 400, cursor: "pointer" }}>
                          {page}
                        </button>
                      ))}
                      <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} style={{ display: "flex", alignItems: "center", gap: 3, padding: "5px 10px", border: "1px solid var(--c-border)", borderRadius: 7, background: "none", fontSize: 12, color: "var(--c-text-2)", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.4 : 1 }}>
                        Volgende <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
