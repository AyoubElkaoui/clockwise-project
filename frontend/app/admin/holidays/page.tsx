"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Plus, Trash2, Shield, ShieldOff, Pencil, Wand2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dayjs from "dayjs";
import "dayjs/locale/nl";
import {
  AdminHoliday,
  getHolidaysForYear,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  toggleHolidayWork,
  generateHolidays,
  getApiErrorMessage,
} from "@/lib/api/adminUsersApi";

dayjs.locale("nl");

const selectClass =
  "h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

const typeLabel = (type: string) => {
  switch (type) {
    case "national":
      return "Nationale feestdag";
    case "company":
      return "Bedrijfsdag";
    case "closed":
      return "Sluitingsdag";
    default:
      return type;
  }
};

const typeVariant = (type: string): "success" | "info" | "warning" | "default" => {
  if (type === "national") return "success";
  if (type === "company") return "info";
  if (type === "closed") return "warning";
  return "default";
};

const emptyForm = {
  name: "",
  holidayDate: "",
  type: "company" as "company" | "closed",
  isWorkAllowed: false,
  notes: "",
};

export default function HolidaysPage() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  const [holidays, setHolidays] = useState<AdminHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<AdminHoliday | null>(null);
  const [editForm, setEditForm] = useState({ isWorkAllowed: false, notes: "" });

  const [pendingDelete, setPendingDelete] = useState<AdminHoliday | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    try {
      setHolidays(await getHolidaysForYear(selectedYear));
    } catch (err) {
      showToast(getApiErrorMessage(err, "Feestdagen konden niet worden geladen"), "error");
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createHoliday({
        holidayDate: form.holidayDate,
        name: form.name.trim(),
        type: form.type,
        isWorkAllowed: form.isWorkAllowed,
        notes: form.notes.trim() || undefined,
      });
      showToast(`${form.name.trim()} toegevoegd`, "success");
      setShowCreate(false);
      setForm(emptyForm);
      const year = dayjs(form.holidayDate).year();
      if (year !== selectedYear) setSelectedYear(year);
      else await loadHolidays();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Dag kon niet worden toegevoegd"), "error");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (h: AdminHoliday) => {
    setEditing(h);
    setEditForm({ isWorkAllowed: h.isWorkAllowed, notes: h.notes ?? "" });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await updateHoliday(editing.id, {
        isWorkAllowed: editForm.isWorkAllowed,
        notes: editForm.notes.trim() || null,
      });
      showToast(`${editing.name} bijgewerkt`, "success");
      setEditing(null);
      await loadHolidays();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Dag kon niet worden bijgewerkt"), "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setSaving(true);
    try {
      await deleteHoliday(pendingDelete.id);
      showToast(`${pendingDelete.name} verwijderd`, "success");
      setPendingDelete(null);
      await loadHolidays();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Dag kon niet worden verwijderd"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWork = async (h: AdminHoliday) => {
    setBusyId(h.id);
    try {
      const result = await toggleHolidayWork(h.id);
      setHolidays((prev) =>
        prev.map((x) => (x.id === h.id ? { ...x, isWorkAllowed: result.isWorkAllowed } : x)),
      );
    } catch (err) {
      showToast(getApiErrorMessage(err, "Werken toegestaan kon niet worden gewijzigd"), "error");
    } finally {
      setBusyId(null);
    }
  };

  const confirmGenerate = async () => {
    setSaving(true);
    try {
      const result = await generateHolidays(selectedYear);
      showToast(result.message || `${result.count} feestdagen gegenereerd voor ${selectedYear}`, "success");
      setShowGenerate(false);
      await loadHolidays();
    } catch (err) {
      showToast(getApiErrorMessage(err, `Feestdagen voor ${selectedYear} konden niet worden gegenereerd`), "error");
    } finally {
      setSaving(false);
    }
  };

  const nationalCount = holidays.filter((h) => h.type === "national").length;

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Feestdagen en sluitingsdagen"
        description="Nationale feestdagen, bedrijfsdagen en sluitingsdagen per jaar"
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className={selectClass}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Button variant="outline" onClick={() => setShowGenerate(true)} disabled={nationalCount > 0}>
              <Wand2 className="w-4 h-4" />
              Genereer {selectedYear}
            </Button>
            <Button onClick={() => { setForm({ ...emptyForm, holidayDate: `${selectedYear}-01-01` }); setShowCreate(true); }}>
              <Plus className="w-4 h-4" />
              Nieuwe dag
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingSpinner className="w-8 h-8" />
      ) : (
        <Card>
          <CardContent className="p-0">
            {holidays.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-10 h-10" />}
                title={`Geen dagen voor ${selectedYear}`}
                description="Genereer de Nederlandse nationale feestdagen of voeg zelf een bedrijfs- of sluitingsdag toe."
                action={{ label: `Genereer feestdagen ${selectedYear}`, onClick: () => setShowGenerate(true) }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Datum</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Naam</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Werken toegestaan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Notities</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Acties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {holidays.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-medium tabular-nums">{dayjs(h.holidayDate).format("DD-MM-YYYY")}</p>
                          <p className="text-xs text-slate-500 capitalize">{dayjs(h.holidayDate).format("dddd")}</p>
                        </td>
                        <td className="px-4 py-3 font-medium">{h.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={typeVariant(h.type)} size="sm">{typeLabel(h.type)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleToggleWork(h)}
                            disabled={busyId === h.id}
                            title="Klik om te wisselen"
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium disabled:opacity-50 ${
                              h.isWorkAllowed
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
                            }`}
                          >
                            {h.isWorkAllowed ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                            {h.isWorkAllowed ? "Ja" : "Nee"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{h.notes || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(h)} title="Bewerken">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {h.type !== "national" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => setPendingDelete(h)}
                                title="Verwijderen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Nieuwe dag */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && !saving && setShowCreate(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe dag toevoegen</DialogTitle>
            <DialogDescription>Nationale feestdagen genereer je via de knop &quot;Genereer&quot;.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="h-name">Naam *</label>
              <Input id="h-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bijv. Bedrijfsuitje" required />
            </div>
            <div>
              <label className={labelClass} htmlFor="h-date">Datum *</label>
              <Input id="h-date" type="date" value={form.holidayDate} onChange={(e) => setForm({ ...form, holidayDate: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass} htmlFor="h-type">Type</label>
              <select
                id="h-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "company" | "closed" })}
                className={`${selectClass} w-full`}
              >
                <option value="company">Bedrijfsdag</option>
                <option value="closed">Sluitingsdag</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="h-notes">Notities</label>
              <Textarea id="h-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Extra informatie..." rows={2} />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="h-work" checked={form.isWorkAllowed} onCheckedChange={(c) => setForm({ ...form, isWorkAllowed: c })} />
              <label htmlFor="h-work" className="text-sm cursor-pointer">Werken toegestaan op deze dag</label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>Annuleren</Button>
              <Button type="submit" isLoading={saving}>Toevoegen</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bewerken */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && !saving && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
            <DialogDescription>
              {editing ? dayjs(editing.holidayDate).format("dddd D MMMM YYYY") : ""} — alleen &quot;werken toegestaan&quot; en notities zijn aanpasbaar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="e-notes">Notities</label>
              <Textarea id="e-notes" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="e-work" checked={editForm.isWorkAllowed} onCheckedChange={(c) => setEditForm({ ...editForm, isWorkAllowed: c })} />
              <label htmlFor="e-work" className="text-sm cursor-pointer">Werken toegestaan op deze dag</label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={saving}>Annuleren</Button>
              <Button type="submit" isLoading={saving}>Opslaan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Verwijderen */}
      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && !saving && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dag verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je &quot;{pendingDelete?.name}&quot; op{" "}
              {pendingDelete ? dayjs(pendingDelete.holidayDate).format("D MMMM YYYY") : ""} wilt verwijderen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={saving}>Annuleren</Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={saving}>Verwijderen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Genereren */}
      <Dialog open={showGenerate} onOpenChange={(open) => !open && !saving && setShowGenerate(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feestdagen {selectedYear} genereren</DialogTitle>
            <DialogDescription>
              Voegt de Nederlandse nationale feestdagen toe (Nieuwjaarsdag, Goede Vrijdag, Pasen, Koningsdag,
              Bevrijdingsdag, Hemelvaart, Pinksteren en Kerst) met &quot;werken toegestaan: nee&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)} disabled={saving}>Annuleren</Button>
            <Button onClick={confirmGenerate} isLoading={saving}>Genereren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
