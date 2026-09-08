"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { User, Shield, Eye, EyeOff, Lock, ExternalLink, Globe, BadgeCheck } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/components/ui/toast";
import { getMe, updateMe, changePassword, MyProfile } from "@/lib/api";

const ROLE_LABEL: Record<string, string> = {
  admin: "Beheerder",
  manager: "Manager",
  user: "Medewerker",
};

function apiError(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { error?: string; message?: string } } };
  return e?.response?.data?.error || e?.response?.data?.message || fallback;
}

export default function AccountPage() {
  const { i18n } = useTranslation();

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const [language, setLanguage] = useState(i18n.language?.startsWith("en") ? "en" : "nl");

  useEffect(() => {
    let active = true;
    getMe()
      .then((me) => {
        if (!active) return;
        setProfile(me);
        setForm({
          firstName: me.firstName ?? "",
          lastName: me.lastName ?? "",
          email: me.email ?? "",
          phone: me.phone ?? "",
        });
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(apiError(error, "Je gegevens konden niet worden geladen."));
      });
    return () => {
      active = false;
    };
  }, []);

  const saveProfile = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      showToast("Voornaam en achternaam zijn verplicht.", "error");
      return;
    }
    if (form.email && !form.email.includes("@")) {
      showToast("Vul een geldig e-mailadres in.", "error");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMe({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setProfile(updated);
      // Keep the name shown in the sidebar in sync.
      localStorage.setItem("firstName", updated.firstName ?? "");
      localStorage.setItem("lastName", updated.lastName ?? "");
      localStorage.setItem("email", updated.email ?? "");
      showToast("Gegevens opgeslagen.", "success");
    } catch (error) {
      showToast(apiError(error, "Opslaan is mislukt."), "error");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (pw.next.length < 8) {
      showToast("Het nieuwe wachtwoord moet minimaal 8 tekens zijn.", "error");
      return;
    }
    if (pw.next !== pw.confirm) {
      showToast("De wachtwoorden komen niet overeen.", "error");
      return;
    }
    setChangingPw(true);
    try {
      await changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      showToast("Wachtwoord gewijzigd.", "success");
    } catch (error) {
      showToast(apiError(error, "Wachtwoord wijzigen is mislukt."), "error");
    } finally {
      setChangingPw(false);
    }
  };

  const onLanguageChange = (lng: string) => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
    showToast(lng === "nl" ? "Taal ingesteld op Nederlands." : "Language set to English.", "success");
  };

  const initials = `${form.firstName.charAt(0)}${form.lastName.charAt(0)}`.toUpperCase();
  const fullName = `${form.firstName} ${form.lastName}`.trim();

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6 animate-fadeIn">
        <div>
          <h1 style={{ font: "700 22px 'Geist'", letterSpacing: "-.015em", color: "var(--text)" }}>
            Mijn account
          </h1>
          <p style={{ font: "400 13.5px 'Geist'", color: "var(--muted)", marginTop: 5 }}>
            Beheer je persoonlijke gegevens en beveiliging.
          </p>
        </div>

        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {loadError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  Persoonlijke gegevens
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Voornaam">
                    <Input
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="Voornaam"
                      disabled={!profile}
                    />
                  </Field>
                  <Field label="Achternaam">
                    <Input
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Achternaam"
                      disabled={!profile}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="E-mailadres">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="naam@bedrijf.nl"
                      disabled={!profile}
                    />
                  </Field>
                  <Field label="Telefoonnummer">
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="06 12345678"
                      disabled={!profile}
                    />
                  </Field>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={saveProfile} disabled={saving || !profile} size="sm">
                    {saving ? "Opslaan..." : "Wijzigingen opslaan"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  Taal
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <Field label="Weergavetaal">
                  <select
                    value={language}
                    onChange={(e) => onLanguageChange(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="nl">Nederlands</option>
                    <option value="en">English</option>
                  </select>
                </Field>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-slate-400" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="flex flex-col items-center gap-2 pb-4">
                  <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold">
                    {initials || <User className="w-7 h-7" />}
                  </div>
                  <div className="text-sm font-semibold">{fullName || "—"}</div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                    {ROLE_LABEL[profile?.role ?? "user"] ?? profile?.role}
                  </span>
                </div>
                <dl className="text-sm divide-y divide-slate-100 dark:divide-slate-700">
                  <Row label="Gebruikersnaam" value={profile?.username} />
                  <Row label="Medewerkernummer (Atrium)" value={profile?.medewGcId} />
                  <Row
                    label="Laatst ingelogd"
                    value={profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString("nl-NL") : "—"}
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  Beveiliging
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <Field label="Huidig wachtwoord">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={pw.current}
                    onChange={(e) => setPw({ ...pw, current: e.target.value })}
                    autoComplete="current-password"
                  />
                </Field>
                <Field label="Nieuw wachtwoord">
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      value={pw.next}
                      onChange={(e) => setPw({ ...pw, next: e.target.value })}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showPw ? "Verberg wachtwoord" : "Toon wachtwoord"}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>
                <Field label="Bevestig nieuw wachtwoord">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={pw.confirm}
                    onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                    autoComplete="new-password"
                  />
                </Field>
                <p className="text-xs text-slate-400">Minimaal 8 tekens.</p>
                <Button
                  onClick={savePassword}
                  disabled={changingPw || !pw.current || !pw.next}
                  className="w-full"
                  size="sm"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {changingPw ? "Bezig..." : "Wachtwoord wijzigen"}
                </Button>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="text-sm font-medium">Tweestapsverificatie</div>
                  <p className="text-xs text-slate-400 mt-1">
                    {profile?.twoFactorEnabled
                      ? "Ingeschakeld. Je account is extra beveiligd."
                      : "Beveilig je account met een authenticator-app of e-mailcode."}
                  </p>
                  <Link href="/account/2fa" className="block mt-3">
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {profile?.twoFactorEnabled ? "2FA beheren" : "2FA instellen"}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-right">{value ?? "—"}</dd>
    </div>
  );
}
