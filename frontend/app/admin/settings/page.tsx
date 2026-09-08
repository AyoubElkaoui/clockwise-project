"use client";
import { useCallback, useEffect, useState } from "react";
import { showToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Save, AlertTriangle, Mail, Send, RefreshCw } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/nl";
import {
  ReminderStatus,
  getSystemSettings,
  saveSystemSettings,
  getReminderStatus,
  sendEmployeeReminder,
  sendManagerOverview,
  getApiErrorMessage,
} from "@/lib/api/adminUsersApi";

dayjs.locale("nl");

const labelClass = "text-sm font-medium text-slate-700 dark:text-slate-300";
const helpClass = "text-xs text-slate-500 dark:text-slate-400";

interface SettingsForm {
  require2fa: boolean;
  sessionTimeoutMinutes: string;
  maxLoginAttempts: string;
  allowPasswordReset: boolean;
}

const dayLabel = (day: string) => {
  const map: Record<string, string> = {
    Monday: "maandag",
    Tuesday: "dinsdag",
    Wednesday: "woensdag",
    Thursday: "donderdag",
    Friday: "vrijdag",
    Saturday: "zaterdag",
    Sunday: "zondag",
  };
  return map[day] ?? day;
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SettingsForm>({
    require2fa: false,
    sessionTimeoutMinutes: "60",
    maxLoginAttempts: "5",
    allowPasswordReset: true,
  });

  const [reminderStatus, setReminderStatus] = useState<ReminderStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [pendingReminder, setPendingReminder] = useState<"employee" | "manager" | null>(null);
  const [sending, setSending] = useState(false);

  const loadReminderStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      setReminderStatus(await getReminderStatus());
    } catch (err) {
      setReminderStatus(null);
      showToast(getApiErrorMessage(err, "Herinneringsstatus kon niet worden geladen"), "error");
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await getSystemSettings();
        setForm({
          require2fa: (s.require_2fa ?? "false").toLowerCase() === "true",
          sessionTimeoutMinutes: s.session_timeout_minutes ?? "60",
          maxLoginAttempts: s.max_login_attempts ?? "5",
          allowPasswordReset: (s.allow_password_reset ?? "true").toLowerCase() === "true",
        });
      } catch (err) {
        showToast(getApiErrorMessage(err, "Instellingen konden niet worden geladen"), "error");
      } finally {
        setLoading(false);
      }
      loadReminderStatus();
    };
    load();
  }, [loadReminderStatus]);

  const handleSave = async () => {
    const timeout = Number(form.sessionTimeoutMinutes);
    const attempts = Number(form.maxLoginAttempts);
    if (!Number.isInteger(timeout) || timeout < 0) {
      showToast("Sessie-timeout moet een geheel getal (minuten) zijn, 0 = uit", "error");
      return;
    }
    if (!Number.isInteger(attempts) || attempts < 1) {
      showToast("Maximum aantal inlogpogingen moet minimaal 1 zijn", "error");
      return;
    }
    setSaving(true);
    try {
      await saveSystemSettings({
        require_2fa: String(form.require2fa),
        session_timeout_minutes: String(timeout),
        max_login_attempts: String(attempts),
        allow_password_reset: String(form.allowPasswordReset),
      });
      showToast("Instellingen opgeslagen", "success");
    } catch (err) {
      showToast(getApiErrorMessage(err, "Instellingen konden niet worden opgeslagen"), "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmSendReminder = async () => {
    if (!pendingReminder) return;
    setSending(true);
    try {
      const result =
        pendingReminder === "employee" ? await sendEmployeeReminder() : await sendManagerOverview();
      showToast(
        result?.message ||
          (pendingReminder === "employee"
            ? "Herinneringen aan medewerkers verstuurd"
            : "Overzicht aan managers verstuurd"),
        "success",
      );
      setPendingReminder(null);
    } catch (err) {
      showToast(getApiErrorMessage(err, "E-mails konden niet worden verstuurd"), "error");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Instellingen laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader title="Instellingen" description="Beveiliging en e-mailherinneringen" />

      <div className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Beveiliging
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3">
              <Checkbox
                id="require2fa"
                checked={form.require2fa}
                onCheckedChange={(c) => setForm({ ...form, require2fa: c })}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <label htmlFor="require2fa" className={`${labelClass} cursor-pointer`}>
                  Tweestapsverificatie verplicht voor alle gebruikers
                </label>
                <p className={helpClass}>
                  Gebruikers zonder 2FA moeten dit na het inloggen eerst instellen voordat ze verder kunnen.
                </p>
              </div>
            </div>
            {form.require2fa && (
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <AlertDescription className="flex items-start gap-2 text-blue-900 dark:text-blue-100">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Dit geldt direct na opslaan, ook voor beheerders.</span>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-start gap-3">
              <Checkbox
                id="allowPasswordReset"
                checked={form.allowPasswordReset}
                onCheckedChange={(c) => setForm({ ...form, allowPasswordReset: c })}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <label htmlFor="allowPasswordReset" className={`${labelClass} cursor-pointer`}>
                  Wachtwoord opnieuw instellen via e-mail toestaan
                </label>
                <p className={helpClass}>Als dit uitstaat, kan alleen een beheerder een wachtwoord resetten.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label htmlFor="sessionTimeout" className={labelClass}>
                  Sessie-timeout (minuten)
                </label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min={0}
                  step={5}
                  value={form.sessionTimeoutMinutes}
                  onChange={(e) => setForm({ ...form, sessionTimeoutMinutes: e.target.value })}
                />
                <p className={helpClass}>Automatisch uitloggen na inactiviteit. 0 = nooit automatisch uitloggen.</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="maxLoginAttempts" className={labelClass}>
                  Maximum aantal inlogpogingen
                </label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  min={1}
                  step={1}
                  value={form.maxLoginAttempts}
                  onChange={(e) => setForm({ ...form, maxLoginAttempts: e.target.value })}
                />
                <p className={helpClass}>Daarna wordt het account tijdelijk geblokkeerd.</p>
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={handleSave} isLoading={saving}>
                {!saving && <Save className="w-4 h-4" />}
                Instellingen opslaan
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-violet-600" />
                E-mailherinneringen
              </CardTitle>
              <Button size="sm" variant="outline" onClick={loadReminderStatus} isLoading={loadingStatus}>
                {!loadingStatus && <RefreshCw className="w-4 h-4" />}
                Status vernieuwen
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {reminderStatus ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-[var(--border)] p-4 space-y-2">
                  <p className="text-sm font-semibold text-[var(--text)]">Herinnering aan medewerkers</p>
                  <p className={helpClass}>
                    Elke {dayLabel(reminderStatus.schedule.employeeReminder.day)} om{" "}
                    {reminderStatus.schedule.employeeReminder.time} aan medewerkers die hun uren nog niet hebben ingediend.
                  </p>
                  <p className="text-xs text-[var(--text-2)]">
                    Volgende run: {dayjs(reminderStatus.schedule.employeeReminder.nextRun).format("dddd D MMMM YYYY HH:mm")}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setPendingReminder("employee")}>
                    <Send className="w-4 h-4" />
                    Nu versturen
                  </Button>
                </div>
                <div className="rounded-lg border border-[var(--border)] p-4 space-y-2">
                  <p className="text-sm font-semibold text-[var(--text)]">Overzicht aan managers</p>
                  <p className={helpClass}>
                    Elke {dayLabel(reminderStatus.schedule.managerOverview.day)} om{" "}
                    {reminderStatus.schedule.managerOverview.time} met de openstaande uren van hun team.
                  </p>
                  <p className="text-xs text-[var(--text-2)]">
                    Volgende run: {dayjs(reminderStatus.schedule.managerOverview.nextRun).format("dddd D MMMM YYYY HH:mm")}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setPendingReminder("manager")}>
                    <Send className="w-4 h-4" />
                    Nu versturen
                  </Button>
                </div>
              </div>
            ) : (
              <p className={helpClass}>
                {loadingStatus ? "Status laden..." : "Herinneringsstatus is niet beschikbaar."}
              </p>
            )}
            {reminderStatus && (
              <p className={helpClass}>
                Servertijd: {reminderStatus.currentTime} ({dayLabel(reminderStatus.currentDay)})
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={pendingReminder !== null} onOpenChange={(open) => !open && !sending && setPendingReminder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingReminder === "employee" ? "Herinnering aan medewerkers versturen" : "Overzicht aan managers versturen"}
            </DialogTitle>
            <DialogDescription>
              {pendingReminder === "employee"
                ? "Alle medewerkers die hun uren voor de huidige periode nog niet hebben ingediend, ontvangen nu een e-mail."
                : "Alle managers ontvangen nu een e-mail met de openstaande uren van hun team."}{" "}
              Dit staat los van de geplande verzending.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingReminder(null)} disabled={sending}>
              Annuleren
            </Button>
            <Button onClick={confirmSendReminder} isLoading={sending}>
              {!sending && <Send className="w-4 h-4" />}
              Versturen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
