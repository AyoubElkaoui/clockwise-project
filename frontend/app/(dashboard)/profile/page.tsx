"use client";
import { useTranslation } from "react-i18next";
import React, { useState, useEffect, JSX } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { User, Shield, Eye, EyeOff, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { getUser, updateUser } from "@/lib/api";

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
    // Load user data from localStorage for immediate display
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
        bio: "", // Bio not stored in localStorage
      });
    }

    // Fetch latest data from API
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

  return (
    <ProtectedRoute>
      <div className="space-y-6 animate-fadeIn">
        <PageHeader title={t("account.title")} description={t("account.subtitle")} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profiel informatie */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                {t("account.profileInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Voornaam</label>
                  <Input
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Achternaam</label>
                  <Input
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">E-mail</label>
                <Input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("account.address")}</label>
                  <Input
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("account.houseNumber")}</label>
                  <Input
                    value={profileData.houseNumber}
                    onChange={(e) => setProfileData({ ...profileData, houseNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("account.postalCode")}</label>
                  <Input
                    value={profileData.postalCode}
                    onChange={(e) => setProfileData({ ...profileData, postalCode: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("account.city")}</label>
                  <Input
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("account.bio")}</label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none h-24"
                  placeholder={t("account.bioPlaceholder")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Avatar card */}
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {profileData.firstName.charAt(0)}{profileData.lastName.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                  {profileData.firstName} {profileData.lastName}
                </h3>
                <p className="text-sm text-slate-500">{profileData.email}</p>
                <p className="text-sm text-slate-500">{profileData.city}</p>
              </div>
              <span className="px-3 py-1 text-xs font-semibold text-blue-600 border border-blue-300 dark:border-blue-600 rounded-full bg-blue-50 dark:bg-blue-900/20">
                Medewerker
              </span>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Beveiliging */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-500" />
                Beveiliging
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("account.passwordPlaceholder")}</label>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <Button onClick={handleUpdate} disabled={isLoading} className="w-full">
                {isLoading ? t("account.saving") : t("account.changePassword")}
              </Button>
            </CardContent>
          </Card>

          {/* Voorkeuren */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-500" />
                Voorkeuren
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "emailNotifications", label: t("account.emailNotifications"), desc: t("account.emailNotificationsDesc") },
                { key: "pushNotifications", label: t("account.pushNotifications"), desc: t("account.pushNotificationsDesc") },
                { key: "weeklyReports", label: t("account.weeklyReports"), desc: t("account.weeklyReportsDesc") },
                { key: "holidayReminders", label: t("account.holidayReminders"), desc: t("account.holidayRemindersDesc") },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences[key as keyof typeof preferences] as boolean}
                    onChange={(e) => setPreferences({ ...preferences, [key]: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("account.language")}</label>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
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

        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 text-sm ${
            isSuccess
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800"
          }`}>
            {message}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
