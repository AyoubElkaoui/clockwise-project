"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, User, Briefcase, ShieldCheck, AlertTriangle } from "lucide-react";
import { showToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import dayjs from "dayjs";
import "dayjs/locale/nl";
import {
  AdminRole,
  AdminUser,
  getAdminUser,
  updateAdminUser,
  getApiErrorMessage,
} from "@/lib/api/adminUsersApi";

dayjs.locale("nl");

const selectClass =
  "flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const labelClass = "text-sm font-medium text-slate-700 dark:text-slate-300";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const medewGcId = Number(params.id);

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "user" as AdminRole,
    isActive: true,
    contractHours: "",
    vacationDays: "",
    usedVacationDays: "",
  });

  useEffect(() => {
    if (!Number.isInteger(medewGcId) || medewGcId <= 0) {
      showToast("Ongeldig medewerkernummer in de URL", "error");
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const data = await getAdminUser(medewGcId);
        setUser(data);
        setForm({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          role: (["user", "manager", "admin"].includes(data.role) ? data.role : "user") as AdminRole,
          isActive: !!data.isActive,
          contractHours: data.contractHours === null ? "" : String(data.contractHours),
          vacationDays: data.vacationDays === null ? "" : String(data.vacationDays),
          usedVacationDays: data.usedVacationDays === null ? "" : String(data.usedVacationDays),
        });
      } catch (err) {
        showToast(getApiErrorMessage(err, "Gebruiker kon niet worden geladen"), "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [medewGcId]);

  const set = (field: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      showToast("Voornaam en achternaam zijn verplicht", "error");
      return;
    }
    if (form.email.trim() && !form.email.includes("@")) {
      showToast("Ongeldig e-mailadres", "error");
      return;
    }
    setSubmitting(true);
    try {
      await updateAdminUser(medewGcId, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        isActive: form.isActive,
        contractHours: form.contractHours === "" ? undefined : Number(form.contractHours),
        vacationDays: form.vacationDays === "" ? undefined : Number(form.vacationDays),
        usedVacationDays: form.usedVacationDays === "" ? undefined : Number(form.usedVacationDays),
      });
      showToast("Gebruiker bijgewerkt", "success");
      router.push("/admin/users");
    } catch (err) {
      showToast(getApiErrorMessage(err, "Gebruiker kon niet worden bijgewerkt"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Gebruiker laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-10 h-10" />}
        title="Gebruiker niet gevonden"
        description={`Er is geen account gekoppeld aan Atrium-medewerker #${params.id}.`}
        action={{ label: "Terug naar gebruikers", onClick: () => router.push("/admin/users") }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Gebruiker bewerken"
        description={`${user.username} — Atrium #${user.medewGcId}`}
        badge={
          <Badge variant={user.isActive ? "success" : "outline"} size="sm">
            {user.isActive ? "Actief" : "Inactief"}
          </Badge>
        }
        actions={
          <Button variant="outline" onClick={() => router.push("/admin/users")}>
            <ArrowLeft className="w-4 h-4" />
            Terug
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Persoonlijke gegevens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="firstName">Voornaam *</label>
                <Input id="firstName" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="lastName">Achternaam *</label>
                <Input id="lastName" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="email">E-mail</label>
                <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="phone">Telefoon</label>
                <Input id="phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Gebruikersnaam</label>
                <Input value={user.username} disabled />
                <p className="text-xs text-slate-500 dark:text-slate-400">Kan niet worden gewijzigd.</p>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Tweestapsverificatie</label>
                <div className="h-10 flex items-center">
                  <Badge variant={user.twoFactorEnabled ? "success" : "outline"} size="sm">
                    {user.twoFactorEnabled ? "Ingeschakeld" : "Niet ingeschakeld"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Rol en status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="role">Rol</label>
                <select id="role" value={form.role} onChange={(e) => set("role", e.target.value)} className={selectClass}>
                  <option value="user">Medewerker</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Status</label>
                <div className="h-10 flex items-center gap-3">
                  <Checkbox
                    id="isActive"
                    checked={form.isActive}
                    onCheckedChange={(checked) => set("isActive", checked)}
                  />
                  <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    Account actief (kan inloggen)
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Dienstverband
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="contractHours">Contracturen per week</label>
                <Input id="contractHours" type="number" min={0} max={60} step={0.5} value={form.contractHours} onChange={(e) => set("contractHours", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="vacationDays">Vakantiedagen per jaar</label>
                <Input id="vacationDays" type="number" min={0} max={100} step={1} value={form.vacationDays} onChange={(e) => set("vacationDays", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="usedVacationDays">Opgenomen vakantiedagen</label>
                <Input id="usedVacationDays" type="number" min={0} max={100} step={1} value={form.usedVacationDays} onChange={(e) => set("usedVacationDays", e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              Aangemaakt op {user.createdAt ? dayjs(user.createdAt).format("D MMMM YYYY") : "onbekend"}
              {" · "}Laatste login: {user.lastLogin ? dayjs(user.lastLogin).format("D MMMM YYYY HH:mm") : "nooit"}
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.push("/admin/users")} disabled={submitting}>
            Annuleren
          </Button>
          <Button type="submit" className="flex-1" isLoading={submitting}>
            {!submitting && <Save className="w-4 h-4" />}
            Opslaan
          </Button>
        </div>
      </form>
    </div>
  );
}
