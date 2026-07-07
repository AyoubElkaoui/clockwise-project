"use client";

import { useTranslation } from "react-i18next";
import React, { useState, useEffect, JSX } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { User, Shield, Eye, EyeOff, Bell, Camera, Lock, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { getUser, updateUser } from "@/lib/api";
import Link from "next/link";

export default function AccountPage(): JSX.Element {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    houseNumber: "",
    postalCode: "",
    city: "",
    loginName: "",
    bio: "",
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true,
    holidayReminders: true,
    language: "nl",
    timezone: "Europe/Amsterdam",
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setProfileData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        address: user.address,
        houseNumber: user.houseNumber,
        postalCode: user.postalCode,
        city: user.city,
        loginName: user.loginName,
        bio: "",
      });
    }

    const userIdStr = localStorage.getItem("userId");
    if (userIdStr) {
      const userId = parseInt(userIdStr);
      getUser(userId)
        .then(setProfileData)
        .catch(() => {});
    }
  }, []);

  const handleUpdate = async (): Promise<void> => {
    const userIdStr = localStorage.getItem("userId");
    if (!userIdStr) return;

    const userId = parseInt(userIdStr);
    setIsLoading(true);
    setMessage("");

    try {
      const data: any = { ...profileData };
      if (password.trim() !== "") data.password = password;

      await updateUser(userId, data);

      setMessage(t("account.updateSuccess"));
      setIsSuccess(true);
      localStorage.setItem("firstName", profileData.firstName);
      localStorage.setItem("lastName", profileData.lastName);
      setPassword("");
    } catch (error: any) {
      setMessage(error.response?.data?.message || t("account.updateError"));
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const initials =
    (profileData.firstName?.charAt(0) ?? "") +
    (profileData.lastName?.charAt(0) ?? "");

  const fullName =
    profileData.firstName || profileData.lastName
      ? `${profileData.firstName} ${profileData.lastName}`.trim()
      : "";

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6 animate-fadeIn">
        <PageHeader
          title="Mijn Account"
          description={fullName || "Beheer je persoonlijke gegevens en beveiliging"}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Persoonlijke Gegevens */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    Persoonlijke Gegevens
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {/* Naam */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Voornaam
                    </label>
                    <Input
                      value={profileData.firstName}
                      onChange={(e) =>
                        setProfileData({ ...profileData, firstName: e.target.value })
                      }
                      placeholder="Voornaam"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Achternaam
                    </label>
                    <Input
                      value={profileData.lastName}
                      onChange={(e) =>
                        setProfileData({ ...profileData, lastName: e.target.value })
                      }
                      placeholder="Achternaam"
                    />
                  </div>
                </div>

                {/* E-mail */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    E-mailadres
                  </label>
                  <Input
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                    placeholder="naam@bedrijf.nl"
                  />
                </div>

                {/* Adres */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t("account.address")}
                    </label>
                    <Input
                      value={profileData.address}
                      onChange={(e) =>
                        setProfileData({ ...profileData, address: e.target.value })
                      }
                      placeholder="Straatnaam"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t("account.houseNumber")}
                    </label>
                    <Input
                      value={profileData.houseNumber}
                      onChange={(e) =>
                        setProfileData({ ...profileData, houseNumber: e.target.value })
                      }
                      placeholder="Nr."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t("account.postalCode")}
                    </label>
                    <Input
                      value={profileData.postalCode}
                      onChange={(e) =>
                        setProfileData({ ...profileData, postalCode: e.target.value })
                      }
                      placeholder="1234 AB"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t("account.city")}
                    </label>
                    <Input
                      value={profileData.city}
                      onChange={(e) =>
                        setProfileData({ ...profileData, city: e.target.value })
                      }
                      placeholder="Stad"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("account.bio")}
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none h-24"
                    placeholder={t("account.bioPlaceholder")}
                  />
                </div>

                {/* Meldingsbalk */}
                {message && (
                  <div
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                      isSuccess
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                    }`}
                  >
                    {isSuccess ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    {message}
                  </div>
                )}

                {/* Opslaan */}
                <div className="pt-1 flex justify-end">
                  <Button onClick={handleUpdate} disabled={isLoading} size="sm">
                    {isLoading ? t("account.saving") : "Wijzigingen opslaan"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Voorkeuren */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-400" />
                  Meldingen &amp; Voorkeuren
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {[
                  {
                    key: "emailNotifications",
                    label: t("account.emailNotifications"),
                    desc: t("account.emailNotificationsDesc"),
                  },
                  {
                    key: "pushNotifications",
                    label: t("account.pushNotifications"),
                    desc: t("account.pushNotificationsDesc"),
                  },
                  {
                    key: "weeklyReports",
                    label: t("account.weeklyReports"),
                    desc: t("account.weeklyReportsDesc"),
                  },
                  {
                    key: "holidayReminders",
                    label: t("account.holidayReminders"),
                    desc: t("account.holidayRemindersDesc"),
                  },
                ].map(({ key, label, desc }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 py-1"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={
                        preferences[key as keyof typeof preferences] as boolean
                      }
                      onChange={(e) =>
                        setPreferences({ ...preferences, [key]: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 flex-shrink-0"
                    />
                  </div>
                ))}

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("account.language")}
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) =>
                      setPreferences({ ...preferences, language: e.target.value })
                    }
                    className="h-9 w-full px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="nl">Nederlands</option>
                    <option value="en">Engels</option>
                    <option value="de">Duits</option>
                    <option value="fr">Frans</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column — 1/3 */}
          <div className="space-y-6">
            {/* Profielfoto */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Camera className="w-4 h-4 text-slate-400" />
                  Profielfoto
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 flex flex-col items-center text-center space-y-4">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold select-none">
                  {initials || <User className="w-8 h-8" />}
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {fullName || "—"}
                  </p>
                  {profileData.email && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[160px]">
                      {profileData.email}
                    </p>
                  )}
                  {profileData.city && (
                    <p className="text-xs text-slate-400 mt-0.5">{profileData.city}</p>
                  )}
                </div>

                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Medewerker
                </span>

                <Button size="sm" variant="outline" className="w-full" disabled>
                  <Camera className="w-3.5 h-3.5 mr-1.5" />
                  Foto uploaden
                </Button>
                <p className="text-xs text-slate-400">Binnenkort beschikbaar</p>
              </CardContent>
            </Card>

            {/* Beveiliging */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  Beveiliging
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {/* Wachtwoord wijzigen */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Nieuw wachtwoord
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("account.passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Laat leeg om het wachtwoord niet te wijzigen.
                  </p>
                </div>

                <Button
                  onClick={handleUpdate}
                  disabled={isLoading || !password.trim()}
                  size="sm"
                  className="w-full"
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                  {isLoading ? t("account.saving") : t("account.changePassword")}
                </Button>

                {/* Scheidingslijn */}
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Tweestapsverificatie
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Beveilig je account met 2FA via een authenticator app.
                      </p>
                    </div>
                  </div>
                  <Link href="/account/2fa" className="mt-3 block">
                    <Button size="sm" variant="outline" className="w-full">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      2FA beheren
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
