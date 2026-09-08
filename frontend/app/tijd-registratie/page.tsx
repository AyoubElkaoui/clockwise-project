"use client";

/**
 * Uren registreren - rasterinvoer naar ClockWise-model:
 *  - rijen = projecten (en indirecte uurcodes), kolommen = dagen van de week of maand
 *  - per cel: uren; details (nacht, reisuren, km, reiskosten, onkosten, opmerking, taaktype) in een paneel
 *  - status per cel gekleurd: opgeslagen (amber), ingeleverd (blauw), goedgekeurd (groen), afgekeurd (rood)
 *  - elke datum wordt in zijn eigen Syntess-urenperiode opgeslagen en ingeleverd
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Save, Send, Search, Plus, X, Star, Info, Moon, Clock, Car, Ticket, Euro, MessageSquare, Copy, AlertTriangle,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { showToast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { API_URL } from "@/lib/api";
import { getPeriods } from "@/lib/api";
import { saveDraft, submitEntries, resubmitRejected, deleteDraft, getMyEntries, getWorkflowConfig, type WorkflowConfig } from "@/lib/api/workflowApi";
import { getFavoriteProjects, addFavoriteProject, removeFavoriteProject, type FavoriteProject } from "@/lib/api/favoriteProjectsApi";
import { getHolidays, type Holiday } from "@/lib/api/holidaysApi";
import { getUserProjects } from "@/lib/api/userProjectApi";
import { dayStatus, STATUS_STYLE, type DayStatus } from "@/components/HoursMonthCalendar";

/* ---------- types ---------- */
type TaskType = "MONTAGE" | "TEKENKAMER";
type RowKind = "project" | "task";

interface Row {
  key: string;            // "p:<werkGcId>" of "t:<taakGcId>"
  kind: RowKind;
  projectId?: number;
  taakGcId?: number;
  code: string;
  name: string;
  group: string;          // projectgroep of "Indirecte uren"
  budget?: number;        // indirect: jaarbudget
  used?: number;
}

interface Entry {
  id?: number;
  date: string;
  rowKey: string;
  hours: number;
  night: number;
  travelHours: number;
  km: number;
  travelCosts: number;
  otherExpenses: number;
  notes: string;
  taskType: TaskType;
  status?: string;        // DRAFT | SUBMITTED | APPROVED | REJECTED
  rejectionReason?: string | null;
  dirty?: boolean;
}

interface Period { gcId: number; beginDatum: string; endDatum: string; code?: string }
interface CatalogProject { id: number; code: string; name: string; groupId: number; groupName: string }

/* ---------- date helpers ---------- */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mondayOf = (d: Date) => addDays(d, d.getDay() === 0 ? -6 : 1 - d.getDay());
const isoWeek = (d: Date) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
};
const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const DAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const fmtH = (h: number) => (h === 0 ? "" : h % 1 === 0 ? String(h) : h.toFixed(1).replace(".", ","));
const parseNum = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isNaN(n) ? 0 : Math.max(0, n); };
const isLocked = (s?: string) => s === "SUBMITTED" || s === "APPROVED" || s === "APPROVING";
const entryKey = (date: string, rowKey: string) => `${date}|${rowKey}`;
const hasExtras = (e: Entry) => !!(e.night || e.travelHours || e.km || e.travelCosts || e.otherExpenses || e.notes);
const isEmpty = (e: Entry) => !e.hours && !hasExtras(e);

const ROWS_STORAGE = "clockd.hours.rows";

export default function TijdRegistratiePage() {
  /* ---------- state ---------- */
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [view, setView] = useState<"week" | "month" | "list">("week");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [config, setConfig] = useState<WorkflowConfig | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [allowedTasks, setAllowedTasks] = useState<"BOTH" | "MONTAGE_ONLY" | "TEKENKAMER_ONLY">("BOTH");

  const [catalog, setCatalog] = useState<CatalogProject[]>([]);
  const [assigned, setAssigned] = useState<Set<number> | null>(null);
  const [maxHours, setMaxHours] = useState<Record<number, number>>({});
  const [favorites, setFavorites] = useState<FavoriteProject[]>([]);
  const [taskRows, setTaskRows] = useState<Row[]>([]);
  const [extraRowIds, setExtraRowIds] = useState<number[]>([]);

  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<{ date: string; rowKey: string } | null>(null);
  const [picker, setPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [rowFilter, setRowFilter] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const askConfirm = (title: string, body: string, okLabel = "Doorgaan", danger = false) => confirmDialog({ title, body, okLabel, danger });

  /* ---------- derived dates ---------- */
  const days = useMemo<Date[]>(() => {
    if (view !== "month") { const m = mondayOf(anchor); return Array.from({ length: 7 }, (_, i) => addDays(m, i)); }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const out: Date[] = []; for (let d = first; d <= last; d = addDays(d, 1)) out.push(d); return out;
  }, [anchor, view]);
  const rangeFrom = iso(days[0]);
  const rangeTo = iso(days[days.length - 1]);
  const todayIso = iso(new Date());
  const weeksInMonth = useMemo(() => {
    const first = mondayOf(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const out: Date[] = []; for (let m = first; m <= last; m = addDays(m, 7)) out.push(m); return out;
  }, [anchor]);

  const holidayMap = useMemo(() => Object.fromEntries(holidays.map((h) => [String(h.holidayDate).split("T")[0], h])), [holidays]);
  const dayInfo = useCallback((d: Date) => {
    const k = iso(d); const h = holidayMap[k];
    return { key: k, weekend: d.getDay() === 0 || d.getDay() === 6, holiday: h, closed: !!h && !h.isWorkAllowed, today: k === todayIso };
  }, [holidayMap, todayIso]);

  const periodFor = useCallback((date: string) => {
    const p = periods.find((x) => x.beginDatum && x.beginDatum <= date && (!x.endDatum || date <= x.endDatum));
    if (!p) throw new Error(`Geen urenperiode gevonden voor ${date}. Vraag de beheerder de periodes in Syntess aan te maken.`);
    return p.gcId;
  }, [periods]);

  /* ---------- initial loads ---------- */
  useEffect(() => {
    const at = localStorage.getItem("allowedTasks");
    if (at === "MONTAGE_ONLY" || at === "TEKENKAMER_ONLY") setAllowedTasks(at);
    try { const saved = JSON.parse(localStorage.getItem(ROWS_STORAGE) || "[]"); if (Array.isArray(saved)) setExtraRowIds(saved.filter((n) => Number.isFinite(n))); } catch { /* ignore */ }
    const q = new URLSearchParams(window.location.search).get("date");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) setAnchor(new Date(q + "T00:00:00"));
    const onGoto = (ev: Event) => { const d = (ev as CustomEvent<string>).detail; if (d) { setAnchor(new Date(d + "T00:00:00")); setView("week"); } };
    window.addEventListener("clockd:goto-date", onGoto);

    (async () => {
      try {
        const [p, cfg, projs, groups, favs] = await Promise.all([
          getPeriods(120), getWorkflowConfig(),
          axios.get(`${API_URL}/projects`), axios.get(`${API_URL}/project-groups`), getFavoriteProjects(),
        ]);
        setPeriods((Array.isArray(p) ? p : []).map((x: any) => ({ gcId: x.gcId ?? x.id, code: x.gcCode, beginDatum: String(x.beginDatum || "").split("T")[0], endDatum: String(x.endDatum || "").split("T")[0] })));
        setConfig(cfg);
        const gname: Record<number, string> = {};
        for (const g of groups.data || []) gname[g.gcId ?? g.id] = g.description || g.gcCode || g.name || "";
        setCatalog((projs.data || []).map((x: any) => ({
          id: x.gcId ?? x.id, code: x.gcCode ?? x.code ?? "", name: x.description ?? x.name ?? "", groupId: x.werkgrpGcId ?? x.projectGroupId ?? 0, groupName: gname[x.werkgrpGcId ?? x.projectGroupId ?? 0] || "",
        })));
        setFavorites(favs);
      } catch {
        showToast("Kon projecten of instellingen niet laden. Herlaad de pagina.", "error");
      }
      try {
        const userId = Number(localStorage.getItem("userId")) || 0;
        if (userId > 0) {
          const ups = await getUserProjects(userId);
          const ids = ups.map((u: any) => u.projectId || u.projectGcId).filter((n: number) => n > 0);
          setAssigned(ids.length ? new Set(ids) : null);
          const mh: Record<number, number> = {}; for (const u of ups as any[]) { const pid = u.projectId || u.projectGcId; if (pid && u.maxHours) mh[pid] = u.maxHours; }
          setMaxHours(mh);
        }
      } catch { /* toewijzingen zijn optioneel */ }
      try {
        const medew = localStorage.getItem("medewGcId");
        if (medew) {
          const [alloc, tasks] = await Promise.all([axios.get(`${API_URL}/users/${medew}/hour-allocations`), axios.get(`${API_URL}/tasks`)]);
          const all = tasks.data?.tasks || tasks.data || [];
          const rows: Row[] = [];
          for (const a of alloc.data || []) {
            if ((a.annualBudget || 0) <= 0) continue;
            const t = all.find((x: any) => (x.code || x.gcCode) === a.taskCode);
            if (t) rows.push({ key: `t:${t.id ?? t.gcId}`, kind: "task", taakGcId: t.id ?? t.gcId, code: a.taskCode, name: a.taskDescription || t.description || t.omschrijving || a.taskCode, group: "Indirecte uren", budget: a.annualBudget, used: a.used || 0 });
          }
          setTaskRows(rows);
        }
      } catch { /* geen indirecte codes */ }
    })();
    return () => window.removeEventListener("clockd:goto-date", onGoto);
  }, []);

  useEffect(() => { getHolidays(anchor.getFullYear()).then(setHolidays).catch(() => setHolidays([])); }, [anchor.getFullYear()]);

  /* ---------- entries ---------- */
  const catalogById = useMemo(() => Object.fromEntries(catalog.map((c) => [c.id, c])), [catalog]);
  const taskById = useMemo(() => Object.fromEntries(taskRows.map((t) => [t.taakGcId!, t])), [taskRows]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getMyEntries(rangeFrom, rangeTo);
      const map: Record<string, Entry> = {};
      for (const e of rows as any[]) {
        const date = String(e.datum).split("T")[0];
        const rowKey = e.werkGcId ? `p:${e.werkGcId}` : `t:${e.taakGcId}`;
        map[entryKey(date, rowKey)] = {
          id: e.id, date, rowKey, hours: Number(e.aantal) || 0,
          night: Number(e.eveningNightHours) || 0, travelHours: Number(e.travelHours) || 0, km: Number(e.distanceKm) || 0,
          travelCosts: Number(e.travelCosts) || 0, otherExpenses: Number(e.otherExpenses) || 0, notes: e.omschrijving || "",
          taskType: config && e.taakGcId === config.tekenkamerTaakGcId ? "TEKENKAMER" : "MONTAGE",
          status: e.status, rejectionReason: e.rejectionReason || null,
        };
        // onbekende projecten (uit een eerdere sessie) toch als rij tonen
        if (e.werkGcId && !catalogById[e.werkGcId]) {
          catalogById[e.werkGcId] = { id: e.werkGcId, code: e.werkCode || "", name: e.werkDescription || `Project ${e.werkGcId}`, groupId: 0, groupName: "" };
        }
      }
      setEntries(map);
    } catch {
      showToast("Kon uren niet laden", "error");
    } finally {
      setLoading(false);
    }
  }, [rangeFrom, rangeTo, config, catalogById]);
  useEffect(() => { if (config) loadEntries(); }, [loadEntries, config]);

  /* ---------- rows ---------- */
  const projectRows = useMemo<Row[]>(() => {
    const ids = new Set<number>();
    favorites.forEach((f) => ids.add(f.projectGcId));
    extraRowIds.forEach((id) => ids.add(id));
    Object.values(entries).forEach((e) => { if (e.rowKey.startsWith("p:")) ids.add(Number(e.rowKey.slice(2))); });
    const rows: Row[] = [];
    ids.forEach((id) => {
      const c = catalogById[id] || favorites.find((f) => f.projectGcId === id) && { id, code: favorites.find((f) => f.projectGcId === id)!.projectCode || "", name: favorites.find((f) => f.projectGcId === id)!.projectName || "", groupId: 0, groupName: favorites.find((f) => f.projectGcId === id)!.projectGroupName || "" };
      if (!c) return;
      rows.push({ key: `p:${id}`, kind: "project", projectId: id, code: c.code, name: c.name, group: c.groupName || "Projecten" });
    });
    rows.sort((a, b) => a.group.localeCompare(b.group) || a.code.localeCompare(b.code));
    return rows;
  }, [favorites, extraRowIds, entries, catalogById]);

  const allRows = useMemo(() => [...projectRows, ...taskRows], [projectRows, taskRows]);
  const visibleRows = useMemo(() => {
    const q = rowFilter.trim().toLowerCase();
    return q ? allRows.filter((r) => `${r.code} ${r.name} ${r.group}`.toLowerCase().includes(q)) : allRows;
  }, [allRows, rowFilter]);
  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of visibleRows) { const g = r.kind === "task" ? "Indirecte uren" : r.group; (m.get(g) || m.set(g, []).get(g)!).push(r); }
    // projectgroepen eerst, indirecte uren onderaan
    return [...m.entries()].sort((a, b) => (a[0] === "Indirecte uren" ? 1 : b[0] === "Indirecte uren" ? -1 : a[0].localeCompare(b[0])));
  }, [visibleRows]);

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.projectGcId)), [favorites]);
  const pickerItems = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const inRows = new Set(projectRows.map((r) => r.projectId));
    return catalog
      .filter((c) => !inRows.has(c.id))
      .filter((c) => !assigned || assigned.has(c.id))
      .filter((c) => !q || `${c.code} ${c.name} ${c.groupName}`.toLowerCase().includes(q))
      .slice(0, 60);
  }, [catalog, pickerQuery, projectRows, assigned]);

  useEffect(() => {
    if (!picker) return;
    const onDoc = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPicker(false); };
    document.addEventListener("mousedown", onDoc); return () => document.removeEventListener("mousedown", onDoc);
  }, [picker]);

  const addRow = (id: number) => {
    setExtraRowIds((prev) => { const next = prev.includes(id) ? prev : [...prev, id]; localStorage.setItem(ROWS_STORAGE, JSON.stringify(next)); return next; });
    setPicker(false); setPickerQuery("");
  };
  const removeRow = async (row: Row) => {
    const own = Object.values(entries).filter((e) => e.rowKey === row.key);
    if (own.some((e) => isLocked(e.status))) { showToast("Deze rij heeft ingeleverde of goedgekeurde uren en kan niet verwijderd worden.", "error"); return; }
    if (own.some((e) => e.hours > 0 || e.id) && !(await askConfirm("Rij verwijderen", `"${row.code} ${row.name}" en de opgeslagen concept-uren in dit bereik worden verwijderd.`, "Verwijderen", true))) return;
    try {
      for (const e of own) if (e.id) await deleteDraft(e.id);
      setEntries((prev) => { const n = { ...prev }; own.forEach((e) => delete n[entryKey(e.date, e.rowKey)]); return n; });
      if (row.projectId) setExtraRowIds((prev) => { const next = prev.filter((x) => x !== row.projectId); localStorage.setItem(ROWS_STORAGE, JSON.stringify(next)); return next; });
      if (row.projectId && favoriteIds.has(row.projectId)) await toggleFavorite(row.projectId, true);
    } catch { showToast("Verwijderen mislukt", "error"); }
  };
  const toggleFavorite = async (projectId: number, silent = false) => {
    try {
      if (favoriteIds.has(projectId)) { await removeFavoriteProject(projectId); setFavorites((p) => p.filter((f) => f.projectGcId !== projectId)); if (!silent) showToast("Uit favorieten gehaald", "info"); }
      else { const f = await addFavoriteProject(projectId); setFavorites((p) => [...p, f]); if (!silent) showToast("Toegevoegd aan favorieten", "success"); }
    } catch { showToast("Favoriet aanpassen mislukt", "error"); }
  };

  /* ---------- editing ---------- */
  const getEntry = (date: string, row: Row): Entry =>
    entries[entryKey(date, row.key)] || { date, rowKey: row.key, hours: 0, night: 0, travelHours: 0, km: 0, travelCosts: 0, otherExpenses: 0, notes: "", taskType: allowedTasks === "TEKENKAMER_ONLY" ? "TEKENKAMER" : "MONTAGE" };
  const patch = (date: string, row: Row, p: Partial<Entry>) =>
    setEntries((prev) => { const cur = prev[entryKey(date, row.key)] || getEntry(date, row); return { ...prev, [entryKey(date, row.key)]: { ...cur, ...p, dirty: true } }; });

  const dirtyList = useMemo(() => Object.values(entries).filter((e) => e.dirty), [entries]);
  const totalsPerDay = useMemo(() => { const t: Record<string, number> = {}; for (const e of Object.values(entries)) t[e.date] = (t[e.date] || 0) + e.hours; return t; }, [entries]);
  const statusPerDay = useMemo(() => { const m: Record<string, DayStatus> = {}; for (const d of days) { const k = iso(d); m[k] = dayStatus(Object.values(entries).filter((e) => e.date === k && !isEmpty(e)).map((e) => e.status || "DRAFT")); } return m; }, [entries, days]);
  const rowTotal = (row: Row) => days.reduce((s, d) => s + (entries[entryKey(iso(d), row.key)]?.hours || 0), 0);
  const grandTotal = days.reduce((s, d) => s + (totalsPerDay[iso(d)] || 0), 0);
  const hoursPerDay = config?.hoursPerDay || 8;

  const taakIdFor = (e: Entry, row: Row) => {
    if (row.kind === "task") return row.taakGcId!;
    if (!config) throw new Error("Instellingen nog niet geladen");
    return e.taskType === "TEKENKAMER" ? config.tekenkamerTaakGcId : config.montageTaakGcId;
  };

  const saveAll = async (): Promise<boolean> => {
    if (dirtyList.length === 0) return true;
    const over = days.map(iso).filter((k) => (totalsPerDay[k] || 0) > 24);
    if (over.length) { showToast(`Meer dan 24 uur op ${over.join(", ")}`, "error"); return false; }
    setSaving(true);
    try {
      const next = { ...entries };
      for (const e of dirtyList) {
        const row = allRows.find((r) => r.key === e.rowKey); if (!row) continue;
        if (isLocked(e.status)) continue;
        if (isEmpty(e)) {
          if (e.id) await deleteDraft(e.id);
          delete next[entryKey(e.date, e.rowKey)];
          continue;
        }
        const res = await saveDraft({
          id: e.id, urenperGcId: periodFor(e.date), taakGcId: taakIdFor(e, row), werkGcId: row.kind === "project" ? row.projectId! : null,
          datum: e.date, aantal: e.hours, omschrijving: e.notes || "", eveningNightHours: e.night, travelHours: e.travelHours, distanceKm: e.km, travelCosts: e.travelCosts, otherExpenses: e.otherExpenses,
        } as any);
        next[entryKey(e.date, e.rowKey)] = { ...e, id: res.entry.id, status: res.entry.status, dirty: false };
      }
      setEntries(next);
      showToast(`${dirtyList.length} regel(s) opgeslagen`, "success");
      window.dispatchEvent(new Event("clockd:hours-changed"));
      return true;
    } catch (err: any) {
      showToast(err?.response?.data?.error || err?.message || "Opslaan mislukt", "error");
      return false;
    } finally { setSaving(false); }
  };

  const submitAll = async () => {
    if (!(await saveAll())) return;
    const toSubmit = Object.values(entries).filter((e) => e.id && !isEmpty(e) && (e.status === "DRAFT" || e.status === "REJECTED" || !e.status));
    if (toSubmit.length === 0) { showToast("Geen opgeslagen uren om in te leveren in dit bereik.", "info"); return; }
    const hrs = toSubmit.reduce((a, e) => a + e.hours, 0);
    if (!(await askConfirm("Uren inleveren", `${toSubmit.length} regel${toSubmit.length === 1 ? "" : "s"} (${fmtH(hrs) || 0} uur) worden ter goedkeuring naar je manager gestuurd. Daarna kun je ze niet meer wijzigen.`, "Inleveren"))) return;
    setSaving(true);
    try {
      const byPeriod: Record<number, { draft: number[]; rejected: number[] }> = {};
      for (const e of toSubmit) { const p = periodFor(e.date); byPeriod[p] ||= { draft: [], rejected: [] }; (e.status === "REJECTED" ? byPeriod[p].rejected : byPeriod[p].draft).push(e.id!); }
      for (const [p, ids] of Object.entries(byPeriod)) {
        if (ids.draft.length) await submitEntries({ urenperGcId: Number(p), entryIds: ids.draft });
        if (ids.rejected.length) await resubmitRejected({ urenperGcId: Number(p), entryIds: ids.rejected });
      }
      showToast(`${toSubmit.length} regel(s) ingeleverd`, "success");
      await loadEntries();
      window.dispatchEvent(new Event("clockd:hours-changed"));
    } catch (err: any) {
      showToast(err?.response?.data?.error || err?.message || "Inleveren mislukt", "error");
    } finally { setSaving(false); }
  };

  const copyPreviousWeek = async () => {
    if (view === "month") return;
    try {
      const prevFrom = iso(addDays(days[0], -7)), prevTo = iso(addDays(days[6], -7));
      const rows = await getMyEntries(prevFrom, prevTo);
      let n = 0;
      setEntries((prev) => {
        const next = { ...prev };
        for (const e of rows as any[]) {
          const date = iso(addDays(new Date(String(e.datum).split("T")[0] + "T00:00:00"), 7));
          const rowKey = e.werkGcId ? `p:${e.werkGcId}` : `t:${e.taakGcId}`;
          const k = entryKey(date, rowKey);
          if (next[k] && (isLocked(next[k].status) || !isEmpty(next[k]))) continue;
          next[k] = { date, rowKey, hours: Number(e.aantal) || 0, night: Number(e.eveningNightHours) || 0, travelHours: Number(e.travelHours) || 0, km: Number(e.distanceKm) || 0, travelCosts: Number(e.travelCosts) || 0, otherExpenses: Number(e.otherExpenses) || 0, notes: e.omschrijving || "", taskType: config && e.taakGcId === config.tekenkamerTaakGcId ? "TEKENKAMER" : "MONTAGE", dirty: true };
          if (e.werkGcId && !catalogById[e.werkGcId]) catalogById[e.werkGcId] = { id: e.werkGcId, code: e.werkCode || "", name: e.werkDescription || `Project ${e.werkGcId}`, groupId: 0, groupName: "" };
          n++;
        }
        return next;
      });
      showToast(n ? `${n} regel(s) overgenomen van vorige week (nog niet opgeslagen)` : "Vorige week heeft geen uren", n ? "success" : "info");
    } catch { showToast("Kon vorige week niet ophalen", "error"); }
  };

  /* ---------- navigation ---------- */
  const step = (n: number) => setAnchor(view === "month" ? new Date(anchor.getFullYear(), anchor.getMonth() + n, 1) : addDays(anchor, 7 * n));
  const subtitle = view === "month" ? `${days.length} dagen` : `${days[0].getDate()} ${MONTHS[days[0].getMonth()]} – ${days[6].getDate()} ${MONTHS[days[6].getMonth()]} ${days[6].getFullYear()}`;

  /* ---------- render ---------- */
  const detailRow = detail ? allRows.find((r) => r.key === detail.rowKey) : undefined;
  const leftW = view === "month" ? 230 : 280, dayW = view === "month" ? 54 : 104, totW = 76;
  const gridCols = `${leftW}px repeat(${days.length}, ${dayW}px) ${totW}px`;
  const cellStatus = (e: Entry): DayStatus => (isEmpty(e) ? "NONE" : e.status === "REJECTED" ? "REJECTED" : isLocked(e.status) ? (e.status === "APPROVED" ? "APPROVED" : "SUBMITTED") : "DRAFT");
  const toggleDetail = (date: string, rowKey: string) => setDetail((d) => (d && d.date === date && d.rowKey === rowKey ? null : { date, rowKey }));

  const renderDetail = (row: Row, e: Entry) => (
    <DetailForm row={row} entry={e} allowedTasks={allowedTasks} config={config} onChange={(p) => patch(e.date, row, p)} onClose={() => setDetail(null)} />
  );

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="space-y-4" style={{ minWidth: 0 }}>
          {/* Header */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 style={{ font: "700 22px 'Geist'", letterSpacing: "-.015em", color: "var(--text)" }}>Uren registreren</h1>
              <div style={{ font: "400 12.5px 'Geist'", color: "var(--muted)", marginTop: 2 }}>{subtitle}</div>
            </div>
            <div className="flex flex-wrap items-center gap-1" style={{ marginLeft: 12 }}>
              <IconBtn onClick={() => step(-1)} title="Vorige"><ChevronLeft size={16} /></IconBtn>
              <select value={view === "month" ? iso(new Date(anchor.getFullYear(), anchor.getMonth(), 1)) : iso(days[0])}
                onChange={(e) => setAnchor(new Date(e.target.value + "T00:00:00"))}
                style={{ height: 34, minWidth: 190, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", font: "600 13px 'Geist'" }}>
                {view !== "month"
                  ? weeksInMonth.map((m) => <option key={iso(m)} value={iso(m)}>Week {isoWeek(m)} ({m.getDate()} {MONTHS[m.getMonth()].slice(0, 3)} – {addDays(m, 6).getDate()} {MONTHS[addDays(m, 6).getMonth()].slice(0, 3)})</option>)
                  : Array.from({ length: 12 }, (_, mi) => new Date(anchor.getFullYear(), mi, 1)).map((m) => <option key={iso(m)} value={iso(m)}>{MONTHS[m.getMonth()]} {m.getFullYear()}</option>)}
              </select>
              <IconBtn onClick={() => step(1)} title="Volgende"><ChevronRight size={16} /></IconBtn>
              <Btn onClick={() => setAnchor(new Date())} variant="outline">Vandaag</Btn>
              <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginLeft: 6 }}>
                {([["week", "Week"], ["list", "Per dag"], ["month", "Maand"]] as const).map(([v, label]) => (
                  <button key={v} type="button" onClick={() => { setView(v); setDetail(null); }} style={{ padding: "0 12px", height: 32, font: "600 12.5px 'Geist'", border: "none", cursor: "pointer", background: view === v ? "var(--accent-btn)" : "var(--panel)", color: view === v ? "#fff" : "var(--text-2)" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2" style={{ marginLeft: "auto" }}>
              {view !== "month" && <Btn onClick={copyPreviousWeek} variant="outline" title="Projecten en uren van vorige week overnemen"><Copy size={14} /> Vorige week</Btn>}
              <Btn onClick={saveAll} disabled={saving || dirtyList.length === 0} variant="primary"><Save size={14} /> Opslaan{dirtyList.length ? ` (${dirtyList.length})` : ""}</Btn>
              <Btn onClick={submitAll} disabled={saving} variant="success"><Send size={14} /> Inleveren</Btn>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1" style={{ font: "500 11px 'Geist'", color: "var(--text-2)" }}>
            {(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"] as DayStatus[]).map((k) => (
              <span key={k} className="flex items-center gap-1"><span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_STYLE[k].fg }} />{STATUS_STYLE[k].label}</span>
            ))}
            <span className="flex items-center gap-1"><Info size={12} /> Klik op een cel voor nacht, reisuren, km, kosten en opmerking</span>
            {dirtyList.length > 0 && <span className="flex items-center gap-1" style={{ color: "var(--amber)" }}><AlertTriangle size={12} /> Niet-opgeslagen wijzigingen</span>}
          </div>

          {/* Toolbar: filter + project toevoegen (buiten het scrollende raster, zodat het zoekvenster nooit afgekapt wordt) */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ width: 260 }}><RowFilter value={rowFilter} onChange={setRowFilter} /></div>
            <ProjectPicker open={picker} setOpen={setPicker} query={pickerQuery} setQuery={setPickerQuery} items={pickerItems} loaded={catalog.length > 0} onPick={addRow} anchorRef={pickerRef} favoriteIds={favoriteIds} />
            <span style={{ font: "400 11.5px 'Geist'", color: "var(--muted)" }}>{allRows.length} rij{allRows.length === 1 ? "" : "en"} · ster = favoriet, staat altijd klaar</span>
          </div>

          {/* ===== LIST VIEW: dagen onder elkaar ===== */}
          {view === "list" && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)", overflow: "hidden" }}>
              {loading && <div style={{ padding: 24, font: "400 13px 'Geist'", color: "var(--muted)" }}>Uren laden…</div>}
              {!loading && allRows.length === 0 && <EmptyRows />}
              {!loading && days.map((d) => {
                const info = dayInfo(d); const total = totalsPerDay[info.key] || 0; const st = statusPerDay[info.key];
                return (
                  <div key={info.key} style={{ borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: info.today ? "var(--accent-weak)" : info.closed ? "var(--red-weak)" : info.weekend ? "var(--weekend)" : "var(--panel-2)" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: info.today ? "var(--accent-btn)" : "var(--panel)", color: info.today ? "#fff" : "var(--text)", border: "1px solid var(--border)" }}>
                        <span style={{ font: "700 14px 'Geist'", lineHeight: 1 }}>{d.getDate()}</span>
                        <span style={{ font: "600 11px 'Geist'", letterSpacing: ".08em", textTransform: "uppercase", opacity: .85 }}>{DAYS[(d.getDay() + 6) % 7]}</span>
                      </div>
                      <div style={{ flex: 1, font: "600 13px 'Geist'", color: "var(--text)" }}>
                        {["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"][(d.getDay() + 6) % 7]} {d.getDate()} {MONTHS[d.getMonth()]}
                        {info.holiday && <span style={{ marginLeft: 8, font: "500 11px 'Geist'", color: info.closed ? "var(--red)" : "var(--muted)" }}>{info.holiday.name}{info.closed ? " · gesloten" : ""}</span>}
                      </div>
                      <div style={{ font: "700 13px 'Geist Mono', monospace", color: total ? STATUS_STYLE[st]?.fg || "var(--text)" : "var(--muted)" }}>{total ? `${fmtH(total)} u` : "–"}</div>
                    </div>
                    {visibleRows.map((row) => {
                      const e = getEntry(info.key, row); const locked = isLocked(e.status) || info.closed; const cs = cellStatus(e); const style = STATUS_STYLE[cs];
                      const open = detail?.date === info.key && detail?.rowKey === row.key;
                      return (
                        <React.Fragment key={row.key}>
                          <div onClick={() => toggleDetail(info.key, row.key)} style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 90px 1fr 28px", alignItems: "center", gap: 10, padding: "6px 12px 6px 56px", cursor: "pointer", background: open ? "var(--accent-weak)" : cs !== "NONE" ? style.bg : "transparent", borderTop: "1px solid var(--border)" }}>
                            <div style={{ minWidth: 0, font: "500 12.5px 'Geist'", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              <span style={{ color: "var(--muted)" }}>{row.kind === "task" ? "Indirect" : row.group} › </span>{row.code} {row.name}
                            </div>
                            <input type="text" inputMode="decimal" value={fmtH(e.hours)} disabled={locked} placeholder={info.closed ? "×" : "0"}
                              onClick={(ev) => ev.stopPropagation()} onFocus={(ev) => ev.target.select()}
                              onChange={(ev) => patch(info.key, row, { hours: parseNum(ev.target.value) })}
                              style={{ width: "100%", height: 30, textAlign: "center", borderRadius: 6, border: `1px solid ${e.dirty ? "var(--amber)" : "var(--border)"}`, background: locked ? "var(--panel-2)" : "var(--panel)", color: cs !== "NONE" ? style.fg : "var(--text)", font: "600 13px 'Geist Mono', monospace" }} />
                            <div style={{ font: "400 11.5px 'Geist'", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{summary(e) || (cs !== "NONE" ? style.label : "")}</div>
                            <span style={{ color: "var(--muted)", display: "flex", justifyContent: "center" }}>{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
                          </div>
                          {open && <div style={{ padding: "0 12px 12px 56px", background: "var(--accent-weak)" }}>{renderDetail(row, e)}</div>}
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== GRID VIEW: week / maand ===== */}
          {view !== "list" && (
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)", overflowX: "auto", overflowY: "visible", maxWidth: "100%" }}>
            <div style={{ minWidth: leftW + days.length * dayW + totW }}>
              {view === "month" && (
                <div style={{ display: "grid", gridTemplateColumns: gridCols, borderBottom: "1px solid var(--border)" }}>
                  <div />
                  {days.map((d, i) => <div key={iso(d)} style={{ height: 20, font: "600 11px 'Geist'", letterSpacing: ".08em", color: "var(--muted)", paddingLeft: 6, borderLeft: d.getDay() === 1 ? "2px solid var(--border)" : "none", whiteSpace: "nowrap" }}>{d.getDay() === 1 || i === 0 ? `WEEK ${isoWeek(d)}` : ""}</div>)}
                  <div />
                </div>
              )}

              {/* Day header */}
              <div style={{ display: "grid", gridTemplateColumns: gridCols, background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
                <div style={{ padding: "12px 12px", font: "600 12px 'Geist'", color: "var(--text-2)", position: "sticky", left: 0, background: "var(--panel)", zIndex: 4, display: "flex", alignItems: "center" }}>Project</div>
                {days.map((d) => {
                  const info = dayInfo(d);
                  return (
                    <div key={info.key} title={info.holiday ? info.holiday.name : ""} style={{ textAlign: "center", padding: "6px 0", borderLeft: view === "month" && d.getDay() === 1 ? "2px solid var(--border)" : "1px solid var(--border)", background: info.today ? "var(--accent-btn)" : info.closed ? "var(--red-weak)" : info.weekend ? "var(--weekend)" : "transparent", color: info.today ? "#fff" : info.closed ? "var(--red)" : "var(--text)" }}>
                      <div style={{ font: "700 15px 'Geist'", lineHeight: 1.1 }}>{d.getDate()}</div>
                      <div style={{ font: "600 11.5px 'Geist'", letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.85 }}>{DAYS[(d.getDay() + 6) % 7]}{info.holiday ? " •" : ""}</div>
                    </div>
                  );
                })}
                <div style={{ textAlign: "center", padding: "10px 0", font: "600 12px 'Geist'", color: "var(--text-2)", borderLeft: "1px solid var(--border)" }}>Totaal</div>
              </div>

              {/* Totals row */}
              <div style={{ display: "grid", gridTemplateColumns: gridCols, background: "var(--accent-weak)", borderBottom: "1px solid var(--border)" }}>
                <div style={{ padding: "8px 12px", font: "700 11px 'Geist'", letterSpacing: ".1em", color: "var(--accent)", position: "sticky", left: 0, background: "var(--accent-weak)", zIndex: 2 }}>TOTAAL UREN</div>
                {days.map((d) => { const k = iso(d); const t = totalsPerDay[k] || 0; const st = statusPerDay[k]; return (
                  <div key={k} style={{ textAlign: "center", padding: "8px 0", font: "700 12.5px 'Geist Mono', monospace", color: t > hoursPerDay + 4 ? "var(--red)" : t > 0 ? STATUS_STYLE[st]?.fg || "var(--text)" : "var(--muted)", borderLeft: "1px solid var(--border)" }}>{t ? fmtH(t) : "–"}</div>
                ); })}
                <div style={{ textAlign: "center", padding: "8px 0", font: "700 12.5px 'Geist Mono', monospace", color: "var(--accent)", borderLeft: "1px solid var(--border)" }}>{fmtH(grandTotal) || "0"}</div>
              </div>

              {loading && <div style={{ padding: 24, font: "400 13px 'Geist'", color: "var(--muted)" }}>Uren laden…</div>}
              {!loading && allRows.length === 0 && <EmptyRows />}
              {groups.map(([group, rows]) => (
                <React.Fragment key={group}>
                  <div style={{ display: "grid", gridTemplateColumns: gridCols, background: "var(--panel-2)", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ padding: "6px 12px", font: "700 11.5px 'Geist'", color: "var(--text-2)", position: "sticky", left: 0, background: "var(--panel-2)", zIndex: 2 }}>{group}</div>
                    {days.map((d) => <div key={iso(d)} style={{ borderLeft: "1px solid var(--border)", background: dayInfo(d).weekend ? "var(--weekend)" : "transparent" }} />)}
                    <div style={{ borderLeft: "1px solid var(--border)" }} />
                  </div>
                  {rows.map((row) => {
                    const total = rowTotal(row);
                    const mh = row.projectId ? maxHours[row.projectId] : undefined;
                    const openHere = detailRow?.key === row.key && detail ? getEntry(detail.date, row) : null;
                    return (
                      <React.Fragment key={row.key}>
                        <div className="group/row" style={{ display: "grid", gridTemplateColumns: gridCols, borderBottom: openHere ? "none" : "1px solid var(--border)" }}>
                          <div style={{ padding: "6px 8px 6px 12px", display: "flex", alignItems: "center", gap: 6, minWidth: 0, position: "sticky", left: 0, background: "var(--panel)", zIndex: 2 }}>
                            {row.kind === "project" ? (
                              <button type="button" onClick={() => toggleFavorite(row.projectId!)} title={favoriteIds.has(row.projectId!) ? "Uit favorieten" : "Favoriet: altijd in je overzicht"} style={{ border: "none", background: "transparent", cursor: "pointer", color: favoriteIds.has(row.projectId!) ? "var(--amber)" : "var(--border)", padding: 0, display: "flex" }}>
                                <Star size={14} fill={favoriteIds.has(row.projectId!) ? "currentColor" : "none"} />
                              </button>
                            ) : <Clock size={14} style={{ color: "var(--muted)", flex: "none" }} />}
                            <div style={{ minWidth: 0, flex: 1 }} title={`${row.code} ${row.name}`}>
                              <div style={{ font: "600 12.5px 'Geist'", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.code} <span style={{ fontWeight: 500, color: "var(--text-2)" }}>{row.name}</span></div>
                              {row.kind === "task" && row.budget != null && <div style={{ font: "400 11.5px 'Geist'", color: (row.used || 0) >= row.budget ? "var(--red)" : "var(--muted)" }}>{fmtH(row.used || 0) || 0} / {fmtH(row.budget)} u dit jaar</div>}
                              {mh != null && <div style={{ font: "400 11.5px 'Geist'", color: total >= mh ? "var(--red)" : "var(--muted)" }}>max {fmtH(mh)} u</div>}
                            </div>
                            <button type="button" onClick={() => removeRow(row)} title="Rij verwijderen" className="opacity-0 group-hover/row:opacity-100" style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", padding: 2, display: "flex" }}><X size={13} /></button>
                          </div>
                          {days.map((d) => {
                            const info = dayInfo(d); const e = getEntry(info.key, row); const locked = isLocked(e.status) || info.closed;
                            const cs = cellStatus(e); const style = STATUS_STYLE[cs];
                            const active = detail?.date === info.key && detail?.rowKey === row.key;
                            return (
                              <div key={info.key} onClick={() => toggleDetail(info.key, row.key)} style={{ borderLeft: "1px solid var(--border)", background: active ? "var(--accent-weak)" : cs !== "NONE" ? style.bg : info.weekend ? "var(--weekend)" : "transparent", padding: 3, position: "relative", cursor: "pointer", boxShadow: active ? "inset 0 0 0 2px var(--accent)" : "none" }}>
                                <input
                                  type="text" inputMode="decimal"
                                  value={fmtH(e.hours)}
                                  disabled={locked}
                                  placeholder={info.closed ? "×" : ""}
                                  onClick={(ev) => ev.stopPropagation()}
                                  onChange={(ev) => patch(info.key, row, { hours: parseNum(ev.target.value) })}
                                  onFocus={(ev) => { ev.target.select(); setDetail({ date: info.key, rowKey: row.key }); }}
                                  title={info.closed ? `Gesloten: ${info.holiday?.name}` : e.status === "REJECTED" && e.rejectionReason ? `Afgekeurd: ${e.rejectionReason}` : cs !== "NONE" ? style.label : "Uren"}
                                  style={{ width: "100%", height: 30, textAlign: "center", borderRadius: 6, border: `1px solid ${e.dirty ? "var(--amber)" : "transparent"}`, background: locked ? "transparent" : "var(--panel)", color: cs !== "NONE" ? style.fg : "var(--text)", font: "600 13px 'Geist Mono', monospace", cursor: locked ? "not-allowed" : "text" }}
                                />
                                {hasExtras(e) && <span title={summary(e)} style={{ position: "absolute", right: 5, top: 5, width: 7, height: 7, borderRadius: 99, background: style.fg === "var(--muted)" ? "var(--accent)" : style.fg }} />}
                              </div>
                            );
                          })}
                          <div style={{ borderLeft: "1px solid var(--border)", textAlign: "center", padding: "9px 0", font: "600 12.5px 'Geist Mono', monospace", color: total ? "var(--text)" : "var(--muted)" }}>{fmtH(total) || "–"}</div>
                        </div>
                        {openHere && (
                          <div style={{ borderBottom: "1px solid var(--border)", background: "var(--accent-weak)", position: "sticky", left: 0 }}>
                            <div style={{ padding: "10px 12px", maxWidth: "calc(100vw - 320px)", position: "sticky", left: 0 }}>{renderDetail(row, openHere)}</div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
          )}
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}

/* ---------- helpers ---------- */
function summary(e: Entry): string {
  const parts: string[] = [];
  if (e.night) parts.push(`nacht ${fmtH(e.night)}u`);
  if (e.travelHours) parts.push(`reis ${fmtH(e.travelHours)}u`);
  if (e.km) parts.push(`${fmtH(e.km)} km`);
  if (e.travelCosts) parts.push(`€${e.travelCosts.toFixed(2).replace(".", ",")} reis`);
  if (e.otherExpenses) parts.push(`€${e.otherExpenses.toFixed(2).replace(".", ",")} onk.`);
  if (e.notes) parts.push(e.notes);
  return parts.join(" · ");
}

function EmptyRows() {
  return (
    <div style={{ padding: 32, textAlign: "center", font: "400 13px 'Geist'", color: "var(--muted)" }}>
      Nog geen projecten in je overzicht. Klik op <b>+ Project</b> om een project toe te voegen, of markeer projecten met een ster zodat ze altijd klaarstaan.
    </div>
  );
}

function RowFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <Search size={13} style={{ position: "absolute", left: 8, top: 10, color: "var(--muted)" }} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Rijen filteren…" style={{ width: "100%", height: 32, paddingLeft: 26, borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)", font: "400 12.5px 'Geist'" }} />
    </div>
  );
}

function ProjectPicker({ open, setOpen, query, setQuery, items, loaded, onPick, anchorRef, favoriteIds }: {
  open: boolean; setOpen: (f: (v: boolean) => boolean) => void; query: string; setQuery: (q: string) => void; items: CatalogProject[]; loaded: boolean; onPick: (id: number) => void; anchorRef: React.RefObject<HTMLDivElement | null>; favoriteIds: Set<number>;
}) {
  const grouped = useMemo(() => {
    const m = new Map<string, CatalogProject[]>();
    for (const c of items) (m.get(c.groupName || "Overig") || m.set(c.groupName || "Overig", []).get(c.groupName || "Overig")!).push(c);
    return [...m.entries()];
  }, [items]);
  const highlight = (text: string) => {
    const q = query.trim();
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return text;
    return <>{text.slice(0, i)}<mark style={{ background: "var(--amber-weak)", color: "inherit", borderRadius: 2 }}>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
  };
  return (
    <div ref={anchorRef} style={{ position: "relative" }}>
      <Btn onClick={() => setOpen((v) => !v)} variant="primary" title="Project toevoegen aan je overzicht"><Plus size={14} /> Project toevoegen</Btn>
      {open && (
        <div style={{ position: "absolute", top: 38, left: 0, width: 480, maxHeight: 460, display: "flex", flexDirection: "column", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 16px 40px rgba(0,0,0,.2)", zIndex: 40 }}>
          <div style={{ padding: 10, borderBottom: "1px solid var(--border)" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--muted)" }} />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setOpen(() => false); if (e.key === "Enter" && items[0]) onPick(items[0].id); }}
                placeholder="Zoek op projectnummer, naam of groep…"
                style={{ width: "100%", height: 36, paddingLeft: 32, paddingRight: 10, borderRadius: 8, border: "1px solid var(--accent-border)", background: "var(--panel-2)", color: "var(--text)", font: "400 13px 'Geist'", outline: "none" }} />
            </div>
            <div style={{ marginTop: 6, font: "400 11px 'Geist'", color: "var(--muted)" }}>Enter kiest het eerste resultaat · Esc sluit</div>
          </div>
          <div style={{ overflow: "auto" }}>
            {items.length === 0 && <div style={{ padding: 16, font: "400 12.5px 'Geist'", color: "var(--muted)" }}>{loaded ? "Geen projecten gevonden" : "Projecten laden…"}</div>}
            {grouped.map(([group, list]) => (
              <div key={group}>
                <div style={{ padding: "8px 12px 4px", font: "700 11.5px 'Geist'", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", position: "sticky", top: 0, background: "var(--panel)" }}>{group}</div>
                {list.map((c) => (
                  <button key={c.id} type="button" onClick={() => onPick(c.id)} className="hover:bg-[var(--hover)]" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer" }}>
                    <span style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent-weak)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Plus size={14} /></span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: "block", font: "600 12.5px 'Geist Mono', monospace", color: "var(--text)" }}>{highlight(c.code)}</span>
                      <span style={{ display: "block", font: "400 12.5px 'Geist'", color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{highlight(c.name)}</span>
                    </span>
                    {favoriteIds.has(c.id) && <Star size={13} style={{ color: "var(--amber)", flex: "none" }} fill="currentColor" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return <button type="button" onClick={onClick} title={title} className="hover:bg-[var(--hover)]" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text-2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{children}</button>;
}
function Btn({ children, onClick, variant = "outline", disabled, title }: { children: React.ReactNode; onClick: () => void; variant?: "outline" | "primary" | "success"; disabled?: boolean; title?: string }) {
  const bg = variant === "primary" ? "var(--accent-btn)" : variant === "success" ? "var(--green-btn)" : "var(--panel)";
  const fg = variant === "outline" ? "var(--text-2)" : "#fff";
  return <button type="button" onClick={onClick} disabled={disabled} title={title} style={{ height: 32, padding: "0 12px", borderRadius: 8, border: variant === "outline" ? "1px solid var(--border)" : "1px solid transparent", background: bg, color: fg, font: "600 12.5px 'Geist'", display: "inline-flex", alignItems: "center", gap: 6, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, whiteSpace: "nowrap" }}>{children}</button>;
}

/** Detailblok onder een rij: alle velden van één dag/project naast elkaar. */
function DetailForm({ row, entry, allowedTasks, config, onChange, onClose }: {
  row: Row; entry: Entry; allowedTasks: string; config: WorkflowConfig | null; onChange: (p: Partial<Entry>) => void; onClose: () => void;
}) {
  const locked = isLocked(entry.status);
  const d = new Date(entry.date + "T00:00:00");
  const st: DayStatus = isEmpty(entry) ? "NONE" : entry.status === "REJECTED" ? "REJECTED" : locked ? (entry.status === "APPROVED" ? "APPROVED" : "SUBMITTED") : "DRAFT";
  const inputStyle: React.CSSProperties = { width: "100%", height: 34, padding: "0 28px 0 10px", borderRadius: 8, border: "1px solid var(--border)", background: locked ? "var(--panel-2)" : "var(--panel)", color: "var(--text)", font: "600 13.5px 'Geist Mono', monospace" };
  const Field = ({ label, icon, k, suffix, width = 120 }: { label: string; icon: React.ReactNode; k: keyof Entry; suffix?: string; width?: number }) => (
    <div style={{ width }}>
      <label className="field-label">{icon}{label}</label>
      <div style={{ position: "relative" }}>
        <input type="text" inputMode="decimal" disabled={locked} value={fmtH(Number(entry[k]) || 0)} onChange={(e) => onChange({ [k]: parseNum(e.target.value) } as any)} onFocus={(e) => e.target.select()} placeholder="0" style={inputStyle} />
        {suffix && <span style={{ position: "absolute", right: 10, top: 9, font: "500 11px 'Geist'", color: "var(--muted)" }}>{suffix}</span>}
      </div>
    </div>
  );
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--accent-border)", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ font: "600 11.5px 'Geist'", letterSpacing: ".1em", color: "var(--muted)", textTransform: "uppercase" }}>{DAYS[(d.getDay() + 6) % 7]} {d.getDate()} {MONTHS[d.getMonth()]}</div>
        <div style={{ font: "700 13px 'Geist'", color: "var(--text)" }}>{row.code} {row.name}</div>
        {st !== "NONE" && <span style={{ padding: "2px 8px", borderRadius: 99, background: STATUS_STYLE[st].bg, color: STATUS_STYLE[st].fg, font: "600 11px 'Geist'" }}>{STATUS_STYLE[st].label}</span>}
        {locked && <span style={{ font: "400 11.5px 'Geist'", color: "var(--muted)" }}>Ingeleverd, niet meer te wijzigen</span>}
        <button type="button" onClick={onClose} title="Sluiten" style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", display: "flex" }}><X size={16} /></button>
      </div>
      {entry.status === "REJECTED" && entry.rejectionReason && (
        <div style={{ marginBottom: 10, padding: 8, borderRadius: 8, background: "var(--red-weak)", color: "var(--red)", font: "500 12px 'Geist'" }}><b>Afgekeurd:</b> {entry.rejectionReason} — pas aan en lever opnieuw in.</div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
        <Field label="Uren" icon={<Clock size={11} />} k="hours" suffix="u" width={100} />
        {row.kind === "project" && allowedTasks === "BOTH" && config && (
          <div>
            <label className="field-label">Taaktype</label>
            <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", height: 34 }}>
              {(["MONTAGE", "TEKENKAMER"] as TaskType[]).map((t) => (
                <button key={t} type="button" disabled={locked} onClick={() => onChange({ taskType: t })} style={{ padding: "0 12px", border: "none", cursor: "pointer", font: "600 12px 'Geist'", background: entry.taskType === t ? "var(--accent)" : "var(--panel)", color: entry.taskType === t ? "#fff" : "var(--text-2)" }}>{t === "MONTAGE" ? "Montage" : "Tekenkamer"}</button>
              ))}
            </div>
          </div>
        )}
        {row.kind === "project" && (
          <>
            <Field label="Avond / nacht" icon={<Moon size={11} />} k="night" suffix="u" width={110} />
            <Field label="Reisuren" icon={<Clock size={11} />} k="travelHours" suffix="u" width={100} />
            <Field label="Kilometers" icon={<Car size={11} />} k="km" suffix="km" width={100} />
            <Field label="Reiskosten" icon={<Ticket size={11} />} k="travelCosts" suffix="€" width={110} />
            <Field label="Onkosten" icon={<Euro size={11} />} k="otherExpenses" suffix="€" width={110} />
          </>
        )}
        <div style={{ flex: 1, minWidth: 220 }}>
          <label className="field-label"><MessageSquare size={11} />Opmerking</label>
          <input type="text" disabled={locked} value={entry.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Wat heb je gedaan?" style={{ ...inputStyle, padding: "0 10px", font: "400 13px 'Geist'" }} />
        </div>
      </div>
    </div>
  );
}
