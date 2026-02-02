"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import dayjs from "dayjs";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Loader2,
  Save,
  Shield,
  Globe,
  Moon,
  Sun,
} from "lucide-react";

import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToastContainer } from "@/components/Toast";
import type { ToastType } from "@/components/Toast";
import { getUser, updateUser } from "@/lib/api";
import authUtils from "@/lib/auth-utils";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme-context";
import i18n from "i18next";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface UserData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  rank?: string;
  hourlyRate?: number;
  employmentDate?: string;
}

export default function AccountPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Toast helpers
  const addToast = (message: string, type: ToastType) => {
    const id = Date.now().toString() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 📦 Load user on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const medewGcId = authUtils.getMedewGcId();
      const userId = medewGcId ? Number(medewGcId) : null;
      
      
      if (!userId) {
        addToast("Niet ingelogd. Ga naar login pagina.", "error");
        setTimeout(() => window.location.href = "/login", 2000);
        return;
      }
      
      
      const data = await getUser(userId);
      
      
      if (!data) {
        addToast("Gebruikersgegevens niet gevonden voor ID " + userId, "error");
        return;
      }
      setUserData(data);
      addToast("Gegevens geladen", "success");
    } catch (error) {
      
      addToast("Kon gebruikersgegevens niet laden: " + error, "error");
    } finally {
      setLoading(false);
    }
  };

  // Opslaan Save user updates
  const handleSave = async () => {
    if (!userData) return;
    
    const medewGcId = authUtils.getMedewGcId();
    const userId = medewGcId ? Number(medewGcId) : null;
    if (!userId) {
      addToast("Gebruiker niet gevonden. Log opnieuw in.", "error");
      return;
    }
    
    setSaving(true);

    try {
      await updateUser(userId, userData);
      addToast("Profiel succesvol bijgewerkt!", "success");
      setEditMode(false);
    } catch (error) {
      addToast("Opslaan mislukt. Probeer opnieuw.", "error");
    } finally {
      setSaving(false);
    }
  };

  //  Handle input updates
  const handleInputChange = (field: keyof UserData, value: string | number) => {
    if (!userData) return;
    setUserData({ ...userData, [field]: value });
  };

  // Password change handler
  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      addToast("Vul alle wachtwoordvelden in", "error");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addToast("Nieuwe wachtwoorden komen niet overeen", "error");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      addToast("Nieuw wachtwoord moet minimaal 6 tekens bevatten", "error");
      return;
    }

    const medewGcId = authUtils.getMedewGcId();
    const userId = medewGcId ? Number(medewGcId) : null;
    if (!userId) {
      addToast("Gebruiker niet gevonden. Log opnieuw in.", "error");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch(`${API_URL}/users/${userId}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Wachtwoord wijzigen mislukt");
      }

      addToast("Wachtwoord succesvol gewijzigd!", "success");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Wachtwoord wijzigen mislukt", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  // 🌀 Loading state
  if (loading) {
    return (
      <ProtectedRoute>
        <ModernLayout>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-12 h-12 animate-spin text-timr-orange" />
          </div>
        </ModernLayout>
      </ProtectedRoute>
    );
  }

  // No user data
  if (!userData) {
    return (
      <ProtectedRoute>
        <ModernLayout>
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <User className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Gebruikersgegevens niet gevonden
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-md">
                We kunnen je profielgegevens niet laden. Dit kan komen doordat je niet correct bent ingelogd.
              </p>
            </div>
            <Button
              onClick={() => {
                authUtils.clearAuth();
                window.location.href = "/login";
              }}
              variant="outline"
            >
              Opnieuw inloggen
            </Button>
          </div>
        </ModernLayout>
      </ProtectedRoute>
    );
  }

  // Main UI
  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="animate-fade-in w-full px-6 md:px-12 lg:px-20 space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {t("account.title")}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Beheer je profiel en account instellingen
            </p>
          </div>

          {/* GRID: Profiel + Beveiliging + Theme + Taal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Profiel Informatie */}
            <Card variant="elevated" padding="lg" className="h-full w-full lg:row-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Profiel Informatie</CardTitle>
                  {!editMode && (
                    <Button variant="outline" onClick={() => setEditMode(true)}>
                      Profiel Bewerken
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {/* Avatar + Naam */}
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    {userData.firstName.charAt(0)}
                    {userData.lastName.charAt(0)}
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {userData.firstName} {userData.lastName}
                    </h2>
                    {userData.rank && (
                      <p className="text-slate-600 dark:text-slate-400">
                        {userData.rank}
                      </p>
                    )}
                    {userData.employmentDate && (
                      <p className="text-sm text-slate-500 dark:text-slate-500">
                        In dienst sinds{" "}
                        {dayjs(userData.employmentDate).format("MMMM YYYY")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    label="Voornaam"
                    icon={<User className="w-4 h-4" />}
                    value={userData.firstName}
                    onChange={(v) => handleInputChange("firstName", v)}
                    disabled={!editMode}
                  />
                  <InputField
                    label="Achternaam"
                    icon={<User className="w-4 h-4" />}
                    value={userData.lastName}
                    onChange={(v) => handleInputChange("lastName", v)}
                    disabled={!editMode}
                  />
                  <InputField
                    label="E-mail"
                    icon={<Mail className="w-4 h-4" />}
                    value={userData.email}
                    onChange={(v) => handleInputChange("email", v)}
                    disabled={!editMode}
                  />
                  <InputField
                    label="Telefoon"
                    icon={<Phone className="w-4 h-4" />}
                    value={userData.phone || ""}
                    onChange={(v) => handleInputChange("phone", v)}
                    disabled={!editMode}
                    placeholder="Bijv: +31 6 12345678"
                  />

                  {/* Adres */}
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      <MapPin className="w-4 h-4" />
                      Adres
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        value={userData.address || ""}
                        onChange={(e) =>
                          handleInputChange("address", e.target.value)
                        }
                        disabled={!editMode}
                        placeholder="Straatnaam"
                      />
                      <Input
                        value={userData.houseNumber || ""}
                        onChange={(e) =>
                          handleInputChange("houseNumber", e.target.value)
                        }
                        disabled={!editMode}
                        placeholder="Huisnummer"
                      />
                      <Input
                        value={userData.postalCode || ""}
                        onChange={(e) =>
                          handleInputChange("postalCode", e.target.value)
                        }
                        disabled={!editMode}
                        placeholder="Postcode"
                      />
                      <Input
                        value={userData.city || ""}
                        onChange={(e) =>
                          handleInputChange("city", e.target.value)
                        }
                        disabled={!editMode}
                        placeholder="Plaats"
                      />
                    </div>
                  </div>
                </div>

                {/* Save / Cancel Buttons */}
                {editMode && (
                  <div className="flex gap-3 mt-6">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Opslaan
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditMode(false);
                        loadUserData();
                      }}
                    >
                      Annuleren
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Beveiliging */}
            <Card variant="elevated" padding="lg" className="h-full w-full">
              <CardHeader>
                <CardTitle>Beveiliging</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <PasswordField 
                    label="Huidig Wachtwoord" 
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                  <PasswordField 
                    label="Nieuw Wachtwoord" 
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                  <PasswordField 
                    label="Bevestig Nieuw Wachtwoord" 
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                  <Button onClick={handleChangePassword} disabled={changingPassword}>
                    {changingPassword ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Wachtwoord Wijzigen
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tweestapsverificatie Card */}
            <Card variant="elevated" padding="lg" className="h-full w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Tweestapsverificatie (2FA)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Extra beveiliging voor je account. Bij inloggen heb je een
                    tweede verificatiestap nodig via authenticator app.
                  </p>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                          Waarom 2FA?
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          Zelfs als iemand je wachtwoord kent, kunnen ze niet
                          inloggen zonder toegang tot je tweede factor (bijv. je
                          telefoon).
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => (window.location.href = "/account/2fa")}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    2FA Beheren
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Theme Settings */}
            <Card variant="elevated" padding="lg" className="h-full w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {theme === "dark" ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                  {t("settings.theme")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Wissel tussen lichte en donkere modus
                </p>
                <div className="flex gap-3">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => setTheme("light")}
                    className="flex items-center gap-2 flex-1"
                  >
                    <Sun className="h-4 w-4" />
                    {t("settings.light")}
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => setTheme("dark")}
                    className="flex items-center gap-2 flex-1"
                  >
                    <Moon className="h-4 w-4" />
                    {t("settings.dark")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Language Settings */}
            <Card variant="elevated" padding="lg" className="h-full w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {t("settings.language")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Kies de taal van de applicatie
                </p>
                <div className="flex gap-3">
                  <Button
                    variant={i18n.language === "nl" ? "default" : "outline"}
                    onClick={() => i18n.changeLanguage("nl")}
                    className="flex-1"
                  >
                    Nederlands
                  </Button>
                  <Button
                    variant={i18n.language === "en" ? "default" : "outline"}
                    onClick={() => i18n.changeLanguage("en")}
                    className="flex-1"
                  >
                    English
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </ModernLayout>
    </ProtectedRoute>
  );
}

/* 🧩 Kleine helper-componenten */
function InputField({
  label,
  icon,
  value,
  onChange,
  disabled,
  placeholder,
  type = "text",
}: {
  label: string;
  icon: React.ReactNode;
  value: string | number;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {icon}
        {label}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  );
}

function PasswordField({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
        {label}
      </label>
      <Input type="password" value={value} onChange={onChange} />
    </div>
  );
}
