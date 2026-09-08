"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Plane, Gauge } from "lucide-react";
import { API_URL, getMe } from "@/lib/api";

/**
 * Verlofsaldo en jaarbudgetten per uurcode van de ingelogde medewerker
 * (bron: users.vacation_days/used_vacation_days en user_hour_allocations).
 */
interface Allocation { taskCode: string; taskDescription?: string; annualBudget: number; used: number; year: number }

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

export default function BudgetOverview({ year }: { year?: number }) {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [vacation, setVacation] = useState<{ total: number; used: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const y = year ?? new Date().getFullYear();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const medew = localStorage.getItem("medewGcId");
        const [alloc, me] = await Promise.all([
          medew ? axios.get(`${API_URL}/users/${medew}/hour-allocations`) : Promise.resolve({ data: [] }),
          getMe(),
        ]);
        if (!active) return;
        const rows: Allocation[] = (alloc.data || []).map((a: any) => ({
          taskCode: a.taskCode, taskDescription: a.taskDescription, annualBudget: Number(a.annualBudget) || 0, used: Number(a.used) || 0, year: Number(a.year) || y,
        }));
        setAllocations(rows.filter((r) => r.annualBudget > 0 && r.year === y));
        const total = Number((me as any).vacationDays) || 0;
        const used = Number((me as any).usedVacationDays) || 0;
        setVacation({ total, used });
      } catch {
        if (active) setError("Budgetten konden niet geladen worden.");
      }
    })();
    return () => { active = false; };
  }, [y]);

  const Bar = ({ used, total, color }: { used: number; total: number; color: string }) => {
    const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
    return (
      <div style={{ height: 6, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "var(--red)" : color, transition: "width .3s" }} />
      </div>
    );
  };

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
      <div style={{ font: "600 13px 'Geist'", color: "var(--text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Gauge size={15} style={{ color: "var(--accent)" }} /> Verlof en budgetten {y}
      </div>
      {error && <div style={{ font: "400 12px 'Geist'", color: "var(--red)" }}>{error}</div>}

      {vacation && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", font: "500 12px 'Geist'", color: "var(--text-2)", marginBottom: 4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Plane size={12} /> Vakantiedagen</span>
            <span style={{ font: "600 12px 'Geist Mono', monospace", color: "var(--text)" }}>{fmt(vacation.used)} / {fmt(vacation.total)} dagen</span>
          </div>
          <Bar used={vacation.used} total={vacation.total} color="var(--green)" />
          <div style={{ font: "400 11px 'Geist'", color: "var(--muted)", marginTop: 3 }}>{fmt(Math.max(0, vacation.total - vacation.used))} dagen beschikbaar</div>
        </div>
      )}

      {allocations.length === 0 && !error && (
        <div style={{ font: "400 12px 'Geist'", color: "var(--muted)" }}>Geen urenbudgetten ingesteld voor {y}. Je manager stelt die in bij Uurcodes.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {allocations.map((a) => (
          <div key={a.taskCode}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, font: "500 12px 'Geist'", color: "var(--text-2)", marginBottom: 4 }}>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span style={{ font: "600 11px 'Geist Mono', monospace", color: "var(--muted)", marginRight: 6 }}>{a.taskCode}</span>{a.taskDescription || ""}</span>
              <span style={{ font: "600 12px 'Geist Mono', monospace", color: a.used >= a.annualBudget ? "var(--red)" : "var(--text)", whiteSpace: "nowrap" }}>{fmt(a.used)} / {fmt(a.annualBudget)} u</span>
            </div>
            <Bar used={a.used} total={a.annualBudget} color="var(--accent)" />
          </div>
        ))}
      </div>
    </div>
  );
}
