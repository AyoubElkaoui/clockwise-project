"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, User, Lock, Briefcase, Eye, EyeOff } from "lucide-react";
import { showToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  AdminRole,
  AdminUser,
  AtriumEmployee,
  createAdminUser,
  getAdminUsers,
  getApiErrorMessage,
  getAtriumEmployees,
} from "@/lib/api/adminUsersApi";

const selectClass =
  "flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50";

const labelClass = "text-sm font-medium text-slate-700 dark:text-slate-300";

/** Voorstel gebruikersnaam: eerste letter voornaam + "." + achternaam, zonder spaties/diakrieten. */
function suggestUsername(firstName: string, lastName: string): string {
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const f = clean(firstName);
  const l = clean(lastName);
  if (!l) return f;
  return f ? `${f.charAt(0)}.${l}` : l;
}

/** Splitst een Atrium-naam ("Achternaam, Voornaam" of "Voornaam Achternaam") in voor- en achternaam. */
function splitName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  if (trimmed.includes(",")) {
    const [last, first] = trimmed.split(",").map((s) => s.trim());
    return { firstName: first ?? "", lastName: last ?? "" };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export default function CreateUserPage() {
  const router = useRouter();
  const [loadingLists, setLoadingLists] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<AtriumEmployee[]>([]);
  const [managers, setManagers] = useState<AdminUser[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);

  const [form, setForm] = useState({
    medewGcId: "",
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "user" as AdminRole,
    managerId: "",
    contractHours: "40",
    vacationDays: "25",
  });

  useEffect(() => {
    const load = async () => {
      const [emp, users] = await Promise.allSettled([getAtriumEmployees(), getAdminUsers()]);
      if (emp.status === "fulfilled") setEmployees(emp.value);
      else showToast(getApiErrorMessage(emp.reason, "Atrium-medewerkers konden niet worden geladen"), "error");
      if (users.status === "fulfilled")
        setManagers(users.value.filter((u) => u.isActive && (u.role === "manager" || u.role === "admin")));
      else showToast(getApiErrorMessage(users.reason, "Managers konden niet worden geladen"), "error");
      setLoadingLists(false);
    };
    load();
  }, []);

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Gebruikersnaam automatisch voorstellen zolang de admin het veld niet zelf heeft aangepast
  useEffect(() => {
    if (!usernameTouched) {
      setForm((prev) => ({ ...prev, username: suggestUsername(prev.firstName, prev.lastName) }));
    }
  }, [form.firstName, form.lastName, usernameTouched]);

  const handleEmployeeChange = (value: string) => {
    set("medewGcId", value);
    const emp = employees.find((e) => String(e.medewGcId) === value);
    if (emp?.name && !form.firstName && !form.lastName) {
      const { firstName, lastName } = splitName(emp.name);
      setForm((prev) => ({ ...prev, medewGcId: value, firstName, lastName }));
    }
  };

  const availableEmployees = useMemo(() => employees.filter((e) => !e.linked), [employees]);
  const linkedCount = employees.length - availableEmployees.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medewGcId) {
      showToast("Kies een Atrium-medewerker", "error");
      return;
    }
    if (form.password.length < 8) {
      showToast("Wachtwoord moet minimaal 8 tekens zijn", "error");
      return;
    }
    if (!form.username.trim()) {
      showToast("Gebruikersnaam is verplicht", "error");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createAdminUser({
        medewGcId: Number(form.medewGcId),
        username: form.username.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        role: form.role,
        contractHours: form.contractHours === "" ? undefined : Number(form.contractHours),
        vacationDays: form.vacationDays === "" ? undefined : Number(form.vacationDays),
        managerId: form.managerId ? Number(form.managerId) : undefined,
      });
      showToast(`Gebruiker ${result.username} aangemaakt`, "success");
      router.push("/admin/users");
    } catch (err) {
      showToast(getApiErrorMessage(err, "Gebruiker kon niet worden aangemaakt"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingLists) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Gegevens laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Nieuwe gebruiker"
        description="Koppel een Atrium-medewerker aan een ClockWise-account"
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
              <Briefcase className="w-5 h-5 text-blue-600" />
              Atrium-medewerker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <label className={labelClass} htmlFor="medewGcId">
              Medewerker uit Syntess Atrium *
            </label>
            <select
              id="medewGcId"
              value={form.medewGcId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              required
              className={selectClass}
            >
              <option value="">— Kies een medewerker —</option>
              {employees.map((emp) => (
                <option key={emp.medewGcId} value={emp.medewGcId} disabled={emp.linked}>
                  {emp.name || "(zonder naam)"} — #{emp.medewGcId}
                  {emp.linked ? " (heeft al een account)" : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Uren worden in Atrium op dit medewerkernummer geboekt.{" "}
              {availableEmployees.length} beschikbaar, {linkedCount} al gekoppeld.
            </p>
          </CardContent>
        </Card>

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
                <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="naam@bedrijf.nl" />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="phone">Telefoon</label>
                <Input id="phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="06-12345678" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              Inloggegevens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="username">Gebruikersnaam *</label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => {
                    setUsernameTouched(true);
                    set("username", e.target.value);
                  }}
                  required
                  autoComplete="off"
                  placeholder="v.achternaam"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Voorstel: eerste letter voornaam + achternaam. Wordt in kleine letters opgeslagen.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="password">Wachtwoord *</label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="pr-10"
                    error={
                      form.password && form.password.length < 8 ? "Minimaal 8 tekens" : undefined
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-[20px] -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    aria-label={showPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Minimaal 8 tekens</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Rol en dienstverband
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="role">Rol *</label>
                <select id="role" value={form.role} onChange={(e) => set("role", e.target.value)} className={selectClass}>
                  <option value="user">Medewerker</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="managerId">Manager</label>
                <select id="managerId" value={form.managerId} onChange={(e) => set("managerId", e.target.value)} className={selectClass}>
                  <option value="">— Geen manager —</option>
                  {managers.map((m) => (
                    <option key={m.medewGcId} value={m.medewGcId}>
                      {`${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.username} ({m.role === "admin" ? "Admin" : "Manager"})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Deze manager beoordeelt de uren van de medewerker.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="contractHours">Contracturen per week</label>
                <Input id="contractHours" type="number" min={0} max={60} step={1} value={form.contractHours} onChange={(e) => set("contractHours", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="vacationDays">Vakantiedagen per jaar</label>
                <Input id="vacationDays" type="number" min={0} max={100} step={1} value={form.vacationDays} onChange={(e) => set("vacationDays", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.push("/admin/users")} disabled={submitting}>
            Annuleren
          </Button>
          <Button type="submit" className="flex-1" isLoading={submitting}>
            {!submitting && <Save className="w-4 h-4" />}
            Gebruiker aanmaken
          </Button>
        </div>
      </form>
    </div>
  );
}
