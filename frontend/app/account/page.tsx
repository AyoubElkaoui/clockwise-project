"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { getUser, updateUser } from "@/lib/api";
import { ToastContainer } from "@/components/Toast";
import type { ToastType } from "@/components/Toast";
import dayjs from "dayjs";

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

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now().toString() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

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

  const handleInputChange = (field: keyof UserData, value: string | number) => {
    if (!userData) return;
    setUserData({ ...userData, [field]: value });
  };

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

  if (!userData) {
    return (
      <ProtectedRoute>
        <ModernLayout>
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400">Gebruikersgegevens niet gevonden</p>
          </div>
        </ModernLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="space-y-6 animate-fade-in max-w-4xl">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Mijn Account
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Beheer je profiel en account instellingen
            </p>
          </div>

          {/* Profile Info */}
          <Card variant="elevated" padding="lg">
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
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {userData.firstName.charAt(0)}{userData.lastName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {userData.firstName} {userData.lastName}
                  </h2>
                  {userData.rank && (
                    <p className="text-slate-600 dark:text-slate-400">{userData.rank}</p>
                  )}
                  {userData.employmentDate && (
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                      In dienst sinds {dayjs(userData.employmentDate).format('MMMM YYYY')}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <User className="w-4 h-4" />
                    Voornaam
                  </label>
                  <Input 
                    value={userData.firstName} 
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!editMode} 
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <User className="w-4 h-4" />
                    Achternaam
                  </label>
                  <Input 
                    value={userData.lastName} 
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!editMode} 
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <Mail className="w-4 h-4" />
                    E-mail
                  </label>
                  <Input 
                    value={userData.email} 
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!editMode} 
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <Phone className="w-4 h-4" />
                    Telefoon
                  </label>
                  <Input 
                    value={userData.phone || ""} 
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!editMode}
                    placeholder="Bijv: +31 6 12345678"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <Briefcase className="w-4 h-4" />
                    Functie/Rank
                  </label>
                  <Input 
                    value={userData.rank || ""} 
                    onChange={(e) => handleInputChange('rank', e.target.value)}
                    disabled={!editMode}
                    placeholder="Bijv: Senior Developer"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <Calendar className="w-4 h-4" />
                    Uurloon
                  </label>
                  <Input 
                    type="number"
                    value={userData.hourlyRate || ""} 
                    onChange={(e) => handleInputChange('hourlyRate', parseFloat(e.target.value))}
                    disabled={!editMode}
                    placeholder="Bijv: 50"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <MapPin className="w-4 h-4" />
                    Adres
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      value={userData.address || ""} 
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      disabled={!editMode}
                      placeholder="Straatnaam"
                      className="col-span-1"
                    />
                    <Input 
                      value={userData.houseNumber || ""} 
                      onChange={(e) => handleInputChange('houseNumber', e.target.value)}
                      disabled={!editMode}
                      placeholder="Huisnummer"
                      className="col-span-1"
                    />
                    <Input 
                      value={userData.postalCode || ""} 
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      disabled={!editMode}
                      placeholder="Postcode"
                      className="col-span-1"
                    />
                    <Input 
                      value={userData.city || ""} 
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      disabled={!editMode}
                      placeholder="Plaats"
                      className="col-span-1"
                    />
                  </div>
                </div>
              </div>
              
              {editMode && (
                <div className="flex gap-3 mt-6">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Opslaan
                  </Button>
                  <Button variant="outline" onClick={() => { setEditMode(false); loadUserData(); }}>
                    Annuleren
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle>Beveiliging</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Huidig Wachtwoord
                  </label>
                  <Input type="password" placeholder="Voer huidig wachtwoord in" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Nieuw Wachtwoord
                  </label>
                  <Input type="password" placeholder="Voer nieuw wachtwoord in" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Bevestig Nieuw Wachtwoord
                  </label>
                  <Input type="password" placeholder="Bevestig nieuw wachtwoord" />
                </div>
                <Button>Wachtwoord Wijzigen</Button>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle>Voorkeuren</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["E-mail Notificaties", "Browser Notificaties", "Dagelijkse Herinneringen", "Wekelijkse Rapporten", "Vakantie Herinneringen"].map((pref) => (
                  <label key={pref} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{pref}</span>
                    <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ModernLayout>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ProtectedRoute>
  );
}
