"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToastContainer } from "@/components/Toast";
import type { ToastType } from "@/components/Toast";
import { getUser, updateUser } from "@/lib/api";

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
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [userId] = useState(1); // TODO: Get from auth context
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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
      const data = await getUser(userId);
      setUserData(data);
    } catch (error) {
      console.error("Failed to load user data:", error);
      addToast("Kon gebruikersgegevens niet laden", "error");
    } finally {
      setLoading(false);
    }
  };

  // Opslaan Save user updates
  const handleSave = async () => {
    if (!userData) return;
    setSaving(true);

    try {
      await updateUser(userId, userData);
      addToast("Profiel succesvol bijgewerkt!", "success");
      setEditMode(false);
    } catch (error) {
      console.error("Failed to update user:", error);
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

  // 🌀 Loading state
  if (loading) {
    return (
      <ProtectedRoute>
        <ModernLayout>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
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
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400">
              Gebruikersgegevens niet gevonden
            </p>
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
              Mijn Account 
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Beheer je profiel en account instellingen
            </p>
          </div>

          {/* GRID: Profiel + Beveiliging */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Profiel Informatie */}
            <Card variant="elevated" padding="lg" className="h-full w-full">
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
                  <InputField
                    label="Functie/Rank"
                    icon={<Briefcase className="w-4 h-4" />}
                    value={userData.rank || ""}
                    onChange={(v) => handleInputChange("rank", v)}
                    disabled={!editMode}
                    placeholder="Bijv: Senior Developer"
                  />
                  <InputField
                    label="Uurloon"
                    icon={<Calendar className="w-4 h-4" />}
                    type="number"
                    value={userData.hourlyRate || ""}
                    onChange={(v) =>
                      handleInputChange("hourlyRate", parseFloat(v))
                    }
                    disabled={!editMode}
                    placeholder="Bijv: 50"
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
                  <PasswordField label="Huidig Wachtwoord" />
                  <PasswordField label="Nieuw Wachtwoord" />
                  <PasswordField label="Bevestig Nieuw Wachtwoord" />
                  <Button>Wachtwoord Wijzigen</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Onderste sectie: Voorkeuren */}
          <Card variant="elevated" padding="xl" className="w-full">
            <CardHeader>
              <CardTitle>Voorkeuren</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  "E-mail Notificaties",
                  "Browser Notificaties",
                  "Dagelijkse Herinneringen",
                  "Wekelijkse Rapporten",
                  "Vakantie Herinneringen",
                ].map((pref) => (
                  <label
                    key={pref}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {pref}
                    </span>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      defaultChecked
                    />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
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

function PasswordField({ label }: { label: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
        {label}
      </label>
      <Input type="password" placeholder={label} />
    </div>
  );
}
