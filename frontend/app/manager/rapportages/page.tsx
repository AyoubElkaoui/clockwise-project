"use client";

/**
 * Rapportages (manager/admin): uren per medewerker, per project en verlof/budgetten van het team,
 * voor een gekozen week, maand of jaar. Export naar Excel per tabblad.
 */
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/nl";
import { ChevronLeft, ChevronRight, Download, Users, FolderKanban, Gauge, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { API_URL } from "@/lib/api";
import { getWorkflowEntriesByRange } from "@/lib/manager-api";
import { showToast } from "@/components/ui/toast";
import { STATUS_STYLE, type DayStatus } from "@/components/HoursMonthCalendar";

dayjs.extend(isoWeek);
dayjs.locale("nl");

type View = "week" | "month" | "year";
type Tab = "employees" | "projects" | "budgets";

interface Entry { medewGcId: number; employeeName?: string; werkGcId?: number | null; werkCode?: string; werkDescription?: string; taakCode?: string; taakDescription?: string; aantal: number; status: string; datum: string; distanceKm?: number; travelCosts?: number; otherExpenses?: number; travelHours?: number; eveningNightHours?: number }
interface User { id: number; medewGcId: number; firstName?: string; lastName?: string; role: string; isActive: boolean; contractHours?: number }
interface BudgetRow { medewGcId: number; firstName?: string; lastName?: string; vacationDays: number; usedVacationDays: number; taskCode?: string; taskDescription?: string; annualBudget?: number; used?: number }

const fmt = (n: number) => (n === 0 ? "–" : Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));
const money = (n: number) => (n ? `€ ${n.toFixed(2).replace(".", ",")}` : "–");
const statusOf = (s: string): DayStatus => (s === "APPROVED" ? "APPROVED" : s === "REJECTED" ? "REJECTED" : s === "SUBMITTED" || s === "APPROVING" ? "SUBMITTED" : "DRAFT");
const workdaysBetween = (a: dayjs.Dayjs, b: dayjs.Dayjs) => { let n = 0; for (let d = a; !d.isAfter(b, "day"); d = d.add(1, "day")) if (d.isoWeekday() <= 5) n++; return n; };

export default function RapportagesPage() {
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(dayjs().startOf("month"));
  const [tab, setTab] = useState<Tab>("employees");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  const from = anchor.startOf(view === "week" ? "isoWeek" : view);
  const to = anchor.endOf(view === "week" ? "isoWeek" : view);
  const title = view === "week" ? `Week ${from.isoWeek()} · ${from.format("D MMM")} – ${to.format("D MMM YYYY")}` : view === "month" ? from.format("MMMM YYYY") : from.format("YYYY");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [wf, us, bu] = await Promise.all([
          getWorkflowEntriesByRange(from.format("YYYY-MM-DD"), to.format("YYYY-MM-DD")),
          axios.get(`${API_URL}/users`),
          axios.get(`${API_URL}/users/budget-overview`, { params: { year: from.year() } }),
        ]);
        if (!active) return;
        setEntries((wf.entries || []).map((e: any) => ({ ...e, aantal: Number(e.aantal) || 0, datum: String(e.datum).split("T")[0] })));
        setUsers((us.data || []).filter((u: User) => u.role !== "admin"));
        setBudgets(bu.data || []);
      } catch {
        if (active) showToast("Rapportage kon niet geladen worden", "error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [from.valueOf(), to.valueOf()]);

  const nameOf = (medew: number) => { const u = users.find((x) => x.medewGcId === medew); return u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : entries.find((e) => e.medewGcId === medew)?.employeeName || `Medewerker ${medew}`; };
  const q = query.trim().toLowerCase();

  /* ---- per medewerker ---- */
  const perEmployee = useMemo(() => {
    const workdays = workdaysBetween(from, to);
    return users
      .filter((u) => u.isActive)
      .map((u) => {
        const own = entries.filter((e) => e.medewGcId === u.medewGcId);
        const by = (st: string[]) => own.filter((e) => st.includes(e.status)).reduce((s, e) => s + e.aantal, 0);
        const total = own.reduce((s, e) => s + e.aantal, 0);
        const expected = ((u.contractHours || 0) / 5) * workdays;
        const projects = new Map<string, { code: string; name: string; hours: number }>();
        for (const e of own) { const k = e.werkGcId ? `p${e.werkGcId}` : `t${e.taakCode}`; const cur = projects.get(k) || { code: e.werkCode || e.taakCode || "", name: e.werkDescription || e.taakDescription || "", hours: 0 }; cur.hours += e.aantal; projects.set(k, cur); }
        const km = own.reduce((s, e) => s + (Number(e.distanceKm) || 0), 0);
        const costs = own.reduce((s, e) => s + (Number(e.travelCosts) || 0) + (Number(e.otherExpenses) || 0), 0);
        const lastSubmitted = own.filter((e) => e.status !== "DRAFT").map((e) => e.datum).sort().pop();
        return { user: u, name: `${u.firstName || ""} ${u.lastName || ""}`.trim(), total, expected, draft: by(["DRAFT"]), submitted: by(["SUBMITTED", "APPROVING"]), approved: by(["APPROVED"]), rejected: by(["REJECTED"]), km, costs, lastSubmitted, projects: [...projects.values()].sort((a, b) => b.hours - a.hours) };
      })
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, entries, from, to, q]);

  const notSubmitted = perEmployee.filter((r) => r.submitted + r.approved === 0 && (r.user.contractHours || 0) > 0);

  /* ---- per project ---- */
  const perProject = useMemo(() => {
    const m = new Map<string, { key: string; code: string; name: string; hours: number; km: number; costs: number; employees: Map<number, number> }>();
    for (const e of entries) {
      const key = e.werkGcId ? `p${e.werkGcId}` : `t${e.taakCode}`;
      const cur = m.get(key) || { key, code: e.werkCode || e.taakCode || "", name: e.werkDescription || e.taakDescription || (e.werkGcId ? "" : "Indirecte uren"), hours: 0, km: 0, costs: 0, employees: new Map() };
      cur.hours += e.aantal; cur.km += Number(e.distanceKm) || 0; cur.costs += (Number(e.travelCosts) || 0) + (Number(e.otherExpenses) || 0);
      cur.employees.set(e.medewGcId, (cur.employees.get(e.medewGcId) || 0) + e.aantal);
      m.set(key, cur);
    }
    return [...m.values()].filter((p) => !q || `${p.code} ${p.name}`.toLowerCase().includes(q)).sort((a, b) => b.hours - a.hours);
  }, [entries, q]);
  const grand = entries.reduce((s, e) => s + e.aantal, 0);

  /* ---- budgetten ---- */
  const perBudget = useMemo(() => {
    const m = new Map<number, { medewGcId: number; name: string; vacationDays: number; usedVacationDays: number; codes: { code: string; desc: string; budget: number; used: number }[] }>();
    for (const b of budgets) {
      const cur = m.get(b.medewGcId) || { medewGcId: b.medewGcId, name: `${b.firstName || ""} ${b.lastName || ""}`.trim(), vacationDays: Number(b.vacationDays) || 0, usedVacationDays: Number(b.usedVacationDays) || 0, codes: [] };
      if (b.taskCode && (Number(b.annualBudget) || 0) > 0) cur.codes.push({ code: b.taskCode, desc: b.taskDescription || "", budget: Number(b.annualBudget) || 0, used: Number(b.used) || 0 });
      m.set(b.medewGcId, cur);
    }
    return [...m.values()].filter((r) => !q || r.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
  }, [budgets, q]);

  /* ---- export ---- */
  const exportExcel = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const head = (ws: any, cols: string[]) => { ws.addRow(cols); ws.getRow(1).font = { bold: true }; ws.columns = cols.map((c, i) => ({ width: i === 0 ? 30 : 14 })); };
      if (tab === "employees") {
        const ws = wb.addWorksheet("Per medewerker");
        head(ws, ["Medewerker", "Contract u/wk", "Verwacht", "Totaal", "Concept", "Ingeleverd", "Goedgekeurd", "Afgekeurd", "Km", "Kosten", "Laatst ingeleverd"]);
        perEmployee.forEach((r) => ws.addRow([r.name, r.user.contractHours || 0, r.expected, r.total, r.draft, r.submitted, r.approved, r.rejected, r.km, r.costs, r.lastSubmitted || ""]));
        const ws2 = wb.addWorksheet("Medewerker x project");
        head(ws2, ["Medewerker", "Project", "Omschrijving", "Uren"]);
        perEmployee.forEach((r) => r.projects.forEach((p) => ws2.addRow([r.name, p.code, p.name, p.hours])));
      } else if (tab === "projects") {
        const ws = wb.addWorksheet("Per project");
        head(ws, ["Project", "Omschrijving", "Uren", "Km", "Kosten", "Medewerkers"]);
        perProject.forEach((p) => ws.addRow([p.code, p.name, p.hours, p.km, p.costs, p.employees.size]));
        const ws2 = wb.addWorksheet("Project x medewerker");
        head(ws2, ["Project", "Medewerker", "Uren"]);
        perProject.forEach((p) => p.employees.forEach((h, medew) => ws2.addRow([`${p.code} ${p.name}`, nameOf(medew), h])));
      } else {
        const ws = wb.addWorksheet("Verlof en budgetten");
        head(ws, ["Medewerker", "Vakantiedagen", "Opgenomen", "Uurcode", "Omschrijving", "Jaarbudget", "Verbruikt", "Resterend"]);
        perBudget.forEach((r) => { if (r.codes.length === 0) ws.addRow([r.name, r.vacationDays, r.usedVacationDays]); r.codes.forEach((c) => ws.addRow([r.name, r.vacationDays, r.usedVacationDays, c.code, c.desc, c.budget, c.used, c.budget - c.used])); });
      }
      const buf = await wb.xlsx.writeBuffer();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      a.download = `clockd-rapportage-${tab}-${from.format("YYYY-MM-DD")}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { showToast("Export mislukt", "error"); }
  };

  /* ---- UI ---- */
  const step = (n: number) => setAnchor(anchor.add(n, view === "week" ? "week" : view));
  const th: React.CSSProperties = { font: "600 11.5px 'Geist'", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "8px 10px", font: "500 12.5px 'Geist'", color: "var(--text)", textAlign: "right", whiteSpace: "nowrap", borderTop: "1px solid var(--border)" };
  const Pill = ({ st, n }: { st: DayStatus; n: number }) => n > 0 ? <span style={{ padding: "1px 7px", borderRadius: 99, background: STATUS_STYLE[st].bg, color: STATUS_STYLE[st].fg, font: "600 11px 'Geist Mono', monospace" }}>{fmt(n)}</span> : <span style={{ color: "var(--muted)" }}>–</span>;
  const Bar = ({ used, total }: { used: number; total: number }) => { const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0; return <div style={{ height: 5, borderRadius: 99, background: "var(--border)", width: 90, display: "inline-block", verticalAlign: "middle", marginLeft: 8 }}><div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: pct >= 100 ? "var(--red)" : "var(--accent)" }} /></div>; };

  return (
    <div className="space-y-4" style={{ minWidth: 0 }}>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 style={{ font: "700 22px 'Geist'", letterSpacing: "-.015em", color: "var(--text)" }}>Rapportages</h1>
          <div style={{ font: "400 12.5px 'Geist'", color: "var(--muted)", marginTop: 2 }}>{title}</div>
        </div>
        <div className="flex items-center gap-1" style={{ marginLeft: 12 }}>
          <button type="button" onClick={() => step(-1)} style={btn}><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => setAnchor(dayjs().startOf(view === "week" ? "isoWeek" : view))} style={{ ...btn, width: "auto", padding: "0 12px" }}>Vandaag</button>
          <button type="button" onClick={() => step(1)} style={btn}><ChevronRight size={16} /></button>
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginLeft: 6 }}>
            {(["week", "month", "year"] as View[]).map((v) => (
              <button key={v} type="button" onClick={() => { setView(v); setAnchor(anchor.startOf(v === "week" ? "isoWeek" : v)); }} style={{ padding: "0 12px", height: 32, border: "none", cursor: "pointer", font: "600 12.5px 'Geist'", background: view === v ? "var(--accent-btn)" : "var(--panel)", color: view === v ? "#fff" : "var(--text-2)" }}>{v === "week" ? "Week" : v === "month" ? "Maand" : "Jaar"}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2" style={{ marginLeft: "auto" }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoeken…" style={{ height: 32, width: 200, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", font: "400 12.5px 'Geist'" }} />
          <button type="button" onClick={exportExcel} style={{ ...btn, width: "auto", padding: "0 12px", gap: 6, background: "var(--accent-btn)", color: "#fff", border: "none" }}><Download size={14} /> Excel</button>
        </div>
      </div>

      {/* KPI's */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Totaal uren", value: `${fmt(grand) === "–" ? "0" : fmt(grand)} u`, sub: `${entries.length} regels` },
          { label: "Wacht op beoordeling", value: `${entries.filter((e) => e.status === "SUBMITTED").reduce((s, e) => s + e.aantal, 0) || 0} u`, sub: "ingeleverd, nog niet beoordeeld", color: "var(--accent)" },
          { label: "Goedgekeurd", value: `${entries.filter((e) => e.status === "APPROVED").reduce((s, e) => s + e.aantal, 0) || 0} u`, sub: "geboekt in Syntess", color: "var(--green)" },
          { label: "Nog niets ingeleverd", value: String(notSubmitted.length), sub: notSubmitted.slice(0, 3).map((r) => r.name.split(" ")[0]).join(", ") + (notSubmitted.length > 3 ? "…" : ""), color: notSubmitted.length ? "var(--red)" : "var(--green)" },
        ].map((k) => (
          <div key={k.label} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
            <div style={{ font: "600 11.5px 'Geist'", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>{k.label}</div>
            <div style={{ font: "700 22px 'Geist'", color: k.color || "var(--text)", marginTop: 4 }}>{k.value}</div>
            <div style={{ font: "400 11.5px 'Geist'", color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
        {([["employees", "Per medewerker", Users], ["projects", "Per project", FolderKanban], ["budgets", "Verlof en budgetten", Gauge]] as const).map(([k, label, Icon]) => (
          <button key={k} type="button" onClick={() => setTab(k)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", border: "none", borderBottom: tab === k ? "2px solid var(--accent)" : "2px solid transparent", background: "transparent", cursor: "pointer", font: "600 13px 'Geist'", color: tab === k ? "var(--accent)" : "var(--text-2)" }}><Icon size={15} /> {label}</button>
        ))}
      </div>

      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, overflow: "auto" }}>
        {loading && <div style={{ padding: 24, font: "400 13px 'Geist'", color: "var(--muted)" }}>Laden…</div>}

        {!loading && tab === "employees" && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={{ ...th, textAlign: "left" }}>Medewerker</th><th style={th}>Contract</th><th style={th}>Verwacht</th><th style={th}>Totaal</th><th style={th}>Concept</th><th style={th}>Ingeleverd</th><th style={th}>Goedgekeurd</th><th style={th}>Afgekeurd</th><th style={th}>Km</th><th style={th}>Kosten</th><th style={{ ...th, textAlign: "left" }}>Laatst ingeleverd</th><th style={th} />
            </tr></thead>
            <tbody>
              {perEmployee.map((r) => {
                const key = `e${r.user.medewGcId}`; const isOpen = !!open[key]; const short = r.expected > 0 && r.total < r.expected * 0.9;
                return (
                  <React.Fragment key={key}>
                    <tr onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))} style={{ cursor: "pointer" }} className="hover:bg-[var(--hover)]">
                      <td style={{ ...td, textAlign: "left" }}>{r.name}{r.submitted + r.approved === 0 && (r.user.contractHours || 0) > 0 && <span title="Nog niets ingeleverd" style={{ marginLeft: 6, color: "var(--red)", verticalAlign: "middle" }}><AlertCircle size={13} /></span>}</td>
                      <td style={td}>{r.user.contractHours ? `${r.user.contractHours} u/wk` : "–"}</td>
                      <td style={{ ...td, color: "var(--muted)" }}>{fmt(Math.round(r.expected * 2) / 2)}</td>
                      <td style={{ ...td, font: "700 12.5px 'Geist Mono', monospace", color: short ? "var(--amber)" : "var(--text)" }} title={short ? "Minder dan verwacht op basis van contracturen" : ""}>{fmt(r.total)}</td>
                      <td style={td}><Pill st="DRAFT" n={r.draft} /></td><td style={td}><Pill st="SUBMITTED" n={r.submitted} /></td><td style={td}><Pill st="APPROVED" n={r.approved} /></td><td style={td}><Pill st="REJECTED" n={r.rejected} /></td>
                      <td style={td}>{fmt(r.km)}</td><td style={td}>{money(r.costs)}</td>
                      <td style={{ ...td, textAlign: "left", color: "var(--muted)" }}>{r.lastSubmitted ? dayjs(r.lastSubmitted).format("D MMM") : "–"}</td>
                      <td style={{ ...td, color: "var(--muted)" }}>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
                    </tr>
                    {isOpen && (
                      <tr><td colSpan={12} style={{ padding: "4px 10px 10px 30px", background: "var(--panel-2)", borderTop: "1px solid var(--border)" }}>
                        {r.projects.length === 0 ? <span style={{ font: "400 12px 'Geist'", color: "var(--muted)" }}>Geen uren in deze periode</span> : (
                          <table style={{ borderCollapse: "collapse" }}><tbody>
                            {r.projects.map((p) => <tr key={p.code + p.name}><td style={{ padding: "3px 16px 3px 0", font: "600 12px 'Geist Mono', monospace", color: "var(--text-2)" }}>{p.code}</td><td style={{ padding: "3px 16px 3px 0", font: "400 12px 'Geist'", color: "var(--text)" }}>{p.name}</td><td style={{ padding: "3px 0", font: "600 12px 'Geist Mono', monospace", textAlign: "right" }}>{fmt(p.hours)} u</td></tr>)}
                          </tbody></table>
                        )}
                      </td></tr>
                    )}
                  </React.Fragment>
                );
              })}
              {perEmployee.length === 0 && <tr><td colSpan={12} style={{ padding: 20, font: "400 13px 'Geist'", color: "var(--muted)" }}>Geen medewerkers gevonden</td></tr>}
            </tbody>
          </table>
        )}

        {!loading && tab === "projects" && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={{ ...th, textAlign: "left" }}>Project</th><th style={th}>Uren</th><th style={th}>Aandeel</th><th style={th}>Km</th><th style={th}>Kosten</th><th style={th}>Medewerkers</th><th style={th} /></tr></thead>
            <tbody>
              {perProject.map((p) => {
                const isOpen = !!open[p.key];
                return (
                  <React.Fragment key={p.key}>
                    <tr onClick={() => setOpen((o) => ({ ...o, [p.key]: !o[p.key] }))} style={{ cursor: "pointer" }} className="hover:bg-[var(--hover)]">
                      <td style={{ ...td, textAlign: "left" }}><span style={{ font: "600 12px 'Geist Mono', monospace", color: "var(--text-2)", marginRight: 8 }}>{p.code}</span>{p.name}</td>
                      <td style={{ ...td, font: "700 12.5px 'Geist Mono', monospace" }}>{fmt(p.hours)}</td>
                      <td style={td}>{grand ? `${Math.round((p.hours / grand) * 100)}%` : "–"}<Bar used={p.hours} total={grand} /></td>
                      <td style={td}>{fmt(p.km)}</td><td style={td}>{money(p.costs)}</td><td style={td}>{p.employees.size}</td>
                      <td style={{ ...td, color: "var(--muted)" }}>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
                    </tr>
                    {isOpen && (
                      <tr><td colSpan={7} style={{ padding: "4px 10px 10px 30px", background: "var(--panel-2)", borderTop: "1px solid var(--border)" }}>
                        <table style={{ borderCollapse: "collapse" }}><tbody>
                          {[...p.employees.entries()].sort((a, b) => b[1] - a[1]).map(([medew, h]) => <tr key={medew}><td style={{ padding: "3px 16px 3px 0", font: "400 12px 'Geist'", color: "var(--text)" }}>{nameOf(medew)}</td><td style={{ padding: "3px 0", font: "600 12px 'Geist Mono', monospace", textAlign: "right" }}>{fmt(h)} u</td></tr>)}
                        </tbody></table>
                      </td></tr>
                    )}
                  </React.Fragment>
                );
              })}
              {perProject.length === 0 && <tr><td colSpan={7} style={{ padding: 20, font: "400 13px 'Geist'", color: "var(--muted)" }}>Geen uren in deze periode</td></tr>}
            </tbody>
          </table>
        )}

        {!loading && tab === "budgets" && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={{ ...th, textAlign: "left" }}>Medewerker</th><th style={th}>Vakantiedagen</th><th style={{ ...th, textAlign: "left" }}>Uurcode</th><th style={th}>Jaarbudget</th><th style={th}>Verbruikt</th><th style={th}>Resterend</th></tr></thead>
            <tbody>
              {perBudget.map((r) => (r.codes.length ? r.codes : [null]).map((c, i) => (
                <tr key={`${r.medewGcId}-${c?.code || "x"}`}>
                  <td style={{ ...td, textAlign: "left", borderTop: i === 0 ? "1px solid var(--border)" : "none", color: i === 0 ? "var(--text)" : "transparent" }}>{r.name}</td>
                  <td style={{ ...td, borderTop: i === 0 ? "1px solid var(--border)" : "none" }}>{i === 0 ? <>{fmt(r.usedVacationDays)} / {fmt(r.vacationDays)}<Bar used={r.usedVacationDays} total={r.vacationDays} /></> : ""}</td>
                  <td style={{ ...td, textAlign: "left", borderTop: i === 0 ? "1px solid var(--border)" : "none" }}>{c ? <><span style={{ font: "600 12px 'Geist Mono', monospace", color: "var(--text-2)", marginRight: 8 }}>{c.code}</span>{c.desc}</> : <span style={{ color: "var(--muted)" }}>geen budgetten</span>}</td>
                  <td style={{ ...td, borderTop: i === 0 ? "1px solid var(--border)" : "none" }}>{c ? fmt(c.budget) : ""}</td>
                  <td style={{ ...td, borderTop: i === 0 ? "1px solid var(--border)" : "none", color: c && c.used >= c.budget ? "var(--red)" : "var(--text)" }}>{c ? <>{fmt(c.used)}<Bar used={c.used} total={c.budget} /></> : ""}</td>
                  <td style={{ ...td, borderTop: i === 0 ? "1px solid var(--border)" : "none" }}>{c ? fmt(c.budget - c.used) : ""}</td>
                </tr>
              )))}
              {perBudget.length === 0 && <tr><td colSpan={6} style={{ padding: 20, font: "400 13px 'Geist'", color: "var(--muted)" }}>Geen budgetten voor {from.year()}. Stel ze in bij Uurcodes.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const btn: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", font: "600 12.5px 'Geist'" };
