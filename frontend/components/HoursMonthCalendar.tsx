"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Maandkalender voor de urenregistratie, zoals het "Urenoverzicht" in ClockWise:
 * per week een rij (weeknummer, ma..zo, totaal) met per dag de uren, gekleurd op status.
 *   concept (opgeslagen)  = amber
 *   ingeleverd            = blauw (accentkleur)
 *   goedgekeurd           = groen
 *   afgekeurd             = rood
 */
export type CalendarEntry = { datum: string; aantal: number; status?: string };

export type DayStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "NONE";

export const STATUS_STYLE: Record<DayStatus, { bg: string; fg: string; label: string }> = {
  DRAFT: { bg: "var(--amber-weak)", fg: "var(--amber)", label: "Opgeslagen" },
  SUBMITTED: { bg: "var(--accent-weak)", fg: "var(--accent)", label: "Ingeleverd" },
  APPROVED: { bg: "var(--green-weak)", fg: "var(--green)", label: "Goedgekeurd" },
  REJECTED: { bg: "var(--red-weak)", fg: "var(--red)", label: "Afgekeurd" },
  NONE: { bg: "transparent", fg: "var(--muted)", label: "" },
};

/** Bepaalt de dominante status van een dag: afgekeurd > ingeleverd > concept > goedgekeurd. */
export function dayStatus(statuses: (string | undefined)[]): DayStatus {
  const s = statuses.map((x) => (x || "DRAFT").toUpperCase());
  if (s.length === 0) return "NONE";
  if (s.includes("REJECTED")) return "REJECTED";
  if (s.includes("SUBMITTED") || s.includes("APPROVING")) return "SUBMITTED";
  if (s.some((x) => x === "DRAFT" || x === "OPGESLAGEN")) return "DRAFT";
  if (s.every((x) => x === "APPROVED")) return "APPROVED";
  return "DRAFT";
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
}

function mondayOf(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = r.getDay();
  r.setDate(r.getDate() + (wd === 0 ? -6 : 1 - wd));
  return r;
}

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const DAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

export default function HoursMonthCalendar({
  month,
  entries,
  selectedDate,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  compact = false,
}: {
  month: Date;
  entries: CalendarEntry[];
  selectedDate?: string;
  onSelectDay?: (date: Date) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  compact?: boolean;
}) {
  const perDay = useMemo(() => {
    const m: Record<string, { hours: number; statuses: string[] }> = {};
    for (const e of entries) {
      const key = String(e.datum).split("T")[0];
      const cur = m[key] || { hours: 0, statuses: [] };
      cur.hours += Number(e.aantal) || 0;
      cur.statuses.push(e.status || "DRAFT");
      m[key] = cur;
    }
    return m;
  }, [entries]);

  const weeks = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const rows: Date[][] = [];
    let cursor = mondayOf(first);
    while (cursor <= last) {
      const row: Date[] = [];
      for (let i = 0; i < 7; i++) {
        row.push(new Date(cursor));
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      }
      rows.push(row);
    }
    return rows;
  }, [month]);

  const today = iso(new Date());
  const monthTotal = weeks.flat().reduce((s, d) => (d.getMonth() === month.getMonth() ? s + (perDay[iso(d)]?.hours || 0) : s), 0);
  const fmt = (h: number) => (h % 1 === 0 ? String(h) : h.toFixed(1));
  const cell = compact ? 26 : 32;

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div style={{ font: "600 13px 'Geist'", color: "var(--text)" }}>
          Urenoverzicht {MONTHS[month.getMonth()]}
        </div>
        {(onPrevMonth || onNextMonth) && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={onPrevMonth} aria-label="Vorige maand" className="rounded-md hover:bg-[var(--hover)]" style={{ padding: 2, color: "var(--muted)" }}>
              <ChevronLeft size={14} />
            </button>
            <button type="button" onClick={onNextMonth} aria-label="Volgende maand" className="rounded-md hover:bg-[var(--hover)]" style={{ padding: 2, color: "var(--muted)" }}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `28px repeat(7, 1fr) 40px`, gap: 3, alignItems: "center" }}>
        <div style={{ font: "600 11px 'Geist'", color: "var(--muted)" }}>Wk</div>
        {DAYS.map((d) => (
          <div key={d} style={{ font: "600 11px 'Geist'", color: "var(--muted)", textAlign: "center" }}>{d}</div>
        ))}
        <div style={{ font: "600 11px 'Geist'", color: "var(--muted)", textAlign: "right" }}>Tot.</div>

        {weeks.map((row) => {
          const wk = isoWeek(row[0]);
          const weekTotal = row.reduce((s, d) => s + (perDay[iso(d)]?.hours || 0), 0);
          const inMonth = row.some((d) => d.getMonth() === month.getMonth());
          return (
            <React.Fragment key={wk + "-" + iso(row[0])}>
              <div style={{ font: "600 11px 'Geist Mono', monospace", color: inMonth ? "var(--text-2)" : "var(--muted)" }}>{wk}</div>
              {row.map((d) => {
                const key = iso(d);
                const info = perDay[key];
                const st = info ? dayStatus(info.statuses) : "NONE";
                const style = STATUS_STYLE[st];
                const outside = d.getMonth() !== month.getMonth();
                const isToday = key === today;
                const isSelected = key === selectedDate;
                const weekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectDay?.(d)}
                    title={`${d.getDate()} ${MONTHS[d.getMonth()]}${info ? ` · ${fmt(info.hours)}u · ${style.label}` : ""}`}
                    style={{
                      height: cell,
                      borderRadius: 6,
                      border: isSelected ? "1.5px solid var(--accent)" : isToday ? "1px solid var(--accent-border)" : "1px solid transparent",
                      background: st === "NONE" ? (weekend ? "var(--weekend, transparent)" : "transparent") : style.bg,
                      color: st === "NONE" ? "var(--muted)" : style.fg,
                      opacity: outside ? 0.45 : 1,
                      font: `${info ? 600 : 500} 11px 'Geist'`,
                      cursor: onSelectDay ? "pointer" : "default",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                      gap: 2,
                    }}
                  >
                    {compact ? (
                      <span>{info ? fmt(info.hours) : d.getDate()}</span>
                    ) : (
                      <>
                        <span style={{ fontSize: 10, opacity: 0.8 }}>{d.getDate()}</span>
                        <span>{info ? `${fmt(info.hours)}u` : ""}</span>
                      </>
                    )}
                  </button>
                );
              })}
              <div style={{ font: "600 11px 'Geist Mono', monospace", color: weekTotal > 0 ? "var(--text)" : "var(--muted)", textAlign: "right" }}>
                {weekTotal > 0 ? fmt(weekTotal) : "–"}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex items-center justify-between" style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"] as DayStatus[]).map((k) => (
            <span key={k} className="flex items-center gap-1" style={{ font: "500 11px 'Geist'", color: "var(--text-2)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_STYLE[k].fg, display: "inline-block" }} />
              {STATUS_STYLE[k].label}
            </span>
          ))}
        </div>
        <div style={{ font: "600 11px 'Geist Mono', monospace", color: "var(--text)" }}>{fmt(monthTotal)}u</div>
      </div>
    </div>
  );
}
