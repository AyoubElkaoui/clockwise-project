"use client";
import { useState, useEffect } from "react";
import { getHolidays, createHoliday, updateHoliday, deleteHoliday, toggleWorkAllowed, generateHolidaysForYear, Holiday } from "@/lib/api/holidaysApi";
import { showToast } from "@/components/ui/toast";
import { ChevronLeft, ChevronRight, Plus, X, Check, Lock, Unlock, Trash2, AlertCircle } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/nl";

dayjs.locale("nl");

function getDayStyle(holiday: Holiday | undefined, isWeekend: boolean, isToday: boolean): React.CSSProperties {
  let bg = "var(--c-panel)", border = "1px solid var(--c-border)";
  if (holiday) {
    if (holiday.type === "national")       { bg = "var(--c-accent-weak)"; border = "1px solid color-mix(in srgb, var(--c-accent) 30%, transparent)"; }
    else if (holiday.isWorkAllowed)        { bg = "var(--c-green-weak)";  border = "1px solid color-mix(in srgb, var(--c-green) 30%, transparent)"; }
    else                                   { bg = "var(--c-red-weak)";    border = "1px solid color-mix(in srgb, var(--c-red) 30%, transparent)"; }
  } else if (isWeekend) {
    bg = "var(--c-panel-2)";
  }
  return { background: bg, border, outline: isToday ? "2px solid var(--c-accent)" : "none", outlineOffset: 1 };
}

export default function JaarkalenderPage() {
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState({ name: "", type: "company" as "company" | "closed", isWorkAllowed: false, notes: "" });

  useEffect(() => { loadHolidays(); }, [currentYear]);

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const data = await getHolidays(currentYear);
      setHolidays(Array.isArray(data) ? data : []);
      if (data.length === 0) showToast("Geen feestdagen gevonden — migration 012 uitgevoerd?", "info");
    } catch { showToast("Kon feestdagen niet laden", "error"); setHolidays([]); } finally { setLoading(false); }
  };

  const handleDateClick = (dateStr: string) => {
    const existing = holidays.find(h => h.holidayDate === dateStr);
    setSelectedDate(dateStr);
    if (existing) {
      setFormData({ name: existing.name, type: existing.type === "national" ? "company" : (existing.type as "company" | "closed"), isWorkAllowed: existing.isWorkAllowed, notes: existing.notes || "" });
      setModalMode("edit");
    } else {
      setFormData({ name: "", type: "closed", isWorkAllowed: false, notes: "" });
      setModalMode("add");
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedDate) return;
    try {
      if (modalMode === "add") {
        const finalName = formData.name.trim() || (formData.type === "closed" ? `Gesloten dag ${selectedDate}` : "");
        if (!finalName) { showToast("Naam is verplicht", "error"); return; }
        await createHoliday({ holidayDate: selectedDate, name: finalName, type: formData.type, isWorkAllowed: formData.isWorkAllowed, notes: formData.notes });
        showToast("Feestdag toegevoegd", "success");
      } else {
        const holiday = holidays.find(h => h.holidayDate === selectedDate);
        if (holiday) { await updateHoliday(holiday.id, { isWorkAllowed: formData.isWorkAllowed, notes: formData.notes }); showToast("Feestdag bijgewerkt", "success"); }
      }
      setShowModal(false); loadHolidays();
    } catch (e: any) { showToast(e.message || "Fout bij opslaan", "error"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Weet je zeker dat je deze dag wilt verwijderen?")) return;
    try { await deleteHoliday(id); showToast("Dag verwijderd", "success"); setShowModal(false); loadHolidays(); }
    catch (e: any) { showToast(e.message || "Fout bij verwijderen", "error"); }
  };

  const handleGenerateHolidays = async () => {
    if (!confirm(`Wil je de Nederlandse feestdagen genereren voor ${currentYear}?`)) return;
    try { const r = await generateHolidaysForYear(currentYear); showToast(r.message, "success"); loadHolidays(); }
    catch (e: any) { showToast(e.message || "Fout bij genereren", "error"); }
  };

  const renderCalendar = () =>
    Array.from({ length: 12 }, (_, month) => {
      const firstDay = dayjs().year(currentYear).month(month).startOf("month");
      const daysInMonth = firstDay.daysInMonth();
      const startOffset = (firstDay.day() === 0 ? 6 : firstDay.day() - 1);
      return (
        <div key={month} style={{ background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: "0 0 10px" }}>{firstDay.format("MMMM YYYY")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
            {["Ma","Di","Wo","Do","Vr","Za","Zo"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "var(--c-muted)", paddingBottom: 3 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {Array.from({ length: startOffset }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, d) => {
              const date = firstDay.date(d + 1);
              const dateStr = date.format("YYYY-MM-DD");
              const holiday = holidays.find(h => h.holidayDate === dateStr);
              const isWeekend = date.day() === 0 || date.day() === 6;
              const isToday = date.isSame(dayjs(), "day");
              return (
                <div
                  key={d}
                  onClick={() => handleDateClick(dateStr)}
                  style={{ ...getDayStyle(holiday, isWeekend, isToday), padding: "3px 2px", textAlign: "center", cursor: "pointer", borderRadius: 5, transition: "opacity 0.1s" }}
                  onMouseEnter={e => { if (!holiday && !isWeekend) e.currentTarget.style.opacity = "0.7"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--c-text)" }}>{d + 1}</span>
                  {holiday && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: 1 }}>
                      {holiday.isWorkAllowed
                        ? <Unlock size={8} color="var(--c-green)" />
                        : <Lock    size={8} color="var(--c-red)"   />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    });

  const selectedHoliday = selectedDate ? holidays.find(h => h.holidayDate === selectedDate) : null;
  const inputStyle: React.CSSProperties = { height: 34, width: "100%", padding: "0 10px", fontSize: 13, border: "1px solid var(--c-border)", borderRadius: 7, background: "var(--c-panel)", color: "var(--c-text)", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", marginBottom: 5 };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320 }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--c-border)", borderTopColor: "var(--c-accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>Jaarkalender</h1>
          <p style={{ fontSize: 13, color: "var(--c-muted)", margin: "3px 0 0" }}>Beheer feestdagen en gesloten dagen</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setCurrentYear(y => y - 1)} style={{ padding: "7px 10px", border: "1px solid var(--c-border)", borderRadius: 7, background: "none", cursor: "pointer", display: "flex" }}>
            <ChevronLeft size={16} color="var(--c-text)" />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--c-text)", minWidth: 56, textAlign: "center" }}>{currentYear}</span>
          <button onClick={() => setCurrentYear(y => y + 1)} style={{ padding: "7px 10px", border: "1px solid var(--c-border)", borderRadius: 7, background: "none", cursor: "pointer", display: "flex" }}>
            <ChevronRight size={16} color="var(--c-text)" />
          </button>
          <button
            onClick={handleGenerateHolidays}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "var(--c-accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", marginLeft: 4 }}
          >
            <Plus size={14} /> Feestdagen Genereren
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "12px 18px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
        {[
          { bg: "var(--c-accent-weak)", border: "color-mix(in srgb, var(--c-accent) 30%, transparent)", label: "Nationale feestdag" },
          { bg: "var(--c-red-weak)",    border: "color-mix(in srgb, var(--c-red) 30%, transparent)",    label: "Gesloten (geen uren)" },
          { bg: "var(--c-green-weak)",  border: "color-mix(in srgb, var(--c-green) 30%, transparent)",  label: "Feestdag (uren toegestaan)" },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: l.bg, border: `1px solid ${l.border}` }} />
            <span style={{ fontSize: 12, color: "var(--c-text-2)" }}>{l.label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Lock size={12} color="var(--c-red)" /><span style={{ fontSize: 12, color: "var(--c-text-2)" }}>Uren geblokkeerd</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Unlock size={12} color="var(--c-green)" /><span style={{ fontSize: 12, color: "var(--c-text-2)" }}>Uren toegestaan</span></div>
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        {renderCalendar()}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 12, width: "100%", maxWidth: 440, boxShadow: "var(--c-shadow)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--c-border)" }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>{modalMode === "add" ? "Dag Toevoegen" : "Dag Bewerken"}</p>
                <p style={{ fontSize: 12, color: "var(--c-muted)", margin: "3px 0 0" }}>{dayjs(selectedDate).format("dddd D MMMM YYYY")}</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {selectedHoliday?.type === "national" && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "var(--c-accent-weak)", borderRadius: 8, padding: "10px 14px" }}>
                  <AlertCircle size={14} color="var(--c-accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--c-accent)", margin: "0 0 3px" }}>Nationale Feestdag</p>
                    <p style={{ fontSize: 12, color: "var(--c-text-2)", margin: 0 }}>Je kunt aangeven of uren registratie toegestaan is op deze dag.</p>
                  </div>
                </div>
              )}
              {modalMode === "add" ? (
                <>
                  <div>
                    <label style={labelStyle}>Naam</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Bijv. Bedrijfsuitje" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as "company" | "closed" })} style={inputStyle}>
                      <option value="closed">Gesloten Dag</option>
                      <option value="company">Bedrijfsdag</option>
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)", margin: "0 0 6px" }}>{selectedHoliday?.name}</p>
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "var(--c-hover)", color: "var(--c-muted)" }}>
                    {selectedHoliday?.type === "national" ? "Nationale Feestdag" : selectedHoliday?.type === "company" ? "Bedrijfsdag" : "Gesloten Dag"}
                  </span>
                </div>
              )}
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" id="workAllowed" checked={formData.isWorkAllowed} onChange={(e) => setFormData({ ...formData, isWorkAllowed: e.target.checked })} style={{ width: 15, height: 15, accentColor: "var(--c-accent)" }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)" }}>Uren registratie toegestaan</span>
              </label>
              <div>
                <label style={labelStyle}>Notities</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Optionele notities..." style={{ ...inputStyle, height: "auto", padding: "8px 10px", resize: "none" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
                {selectedHoliday && selectedHoliday.type !== "national" && (
                  <button onClick={() => handleDelete(selectedHoliday.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "none", border: "1px solid var(--c-red)", color: "var(--c-red)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    <Trash2 size={13} /> Verwijderen
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <button onClick={() => setShowModal(false)} style={{ padding: "8px 14px", background: "none", border: "1px solid var(--c-border)", borderRadius: 8, fontSize: 13, color: "var(--c-text-2)", cursor: "pointer" }}>Annuleren</button>
                <button onClick={handleSubmit} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--c-accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <Check size={13} /> Opslaan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
