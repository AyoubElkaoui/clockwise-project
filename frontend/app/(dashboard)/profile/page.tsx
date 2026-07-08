"use client";
import { useTranslation } from "react-i18next";
import React, { useState, useEffect, JSX } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { User, Shield, Eye, EyeOff, Bell } from "lucide-react";
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

  const inputClass =
    "h-9 w-full px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("account.title")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t("account.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile info */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t("account.profileInfo")}
              </span>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Voornaam
                  </label>
                  <input
                    className={inputClass}
                    value={profileData.firstName}
                    onChange={(e) =>
                      setProfileData({ ...profileData, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Achternaam
                  </label>
                  <input
                    className={inputClass}
                    value={profileData.lastName}
                    onChange={(e) =>
                      setProfileData({ ...profileData, lastName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  E-mail
                </label>
                <input
                  type="email"
                  className={inputClass}
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData({ ...profileData, email: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("account.address")}
                  </label>
                  <input
                    className={inputClass}
                    value={profileData.address}
                    onChange={(e) =>
                      setProfileData({ ...profileData, address: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("account.houseNumber")}
                  </label>
                  <input
                    className={inputClass}
                    value={profileData.houseNumber}
                    onChange={(e) =>
                      setProfileData({ ...profileData, houseNumber: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("account.postalCode")}
                  </label>
                  <input
                    className={inputClass}
                    value={profileData.postalCode}
                    onChange={(e) =>
                      setProfileData({ ...profileData, postalCode: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("account.city")}
                  </label>
                  <input
                    className={inputClass}
                    value={profileData.city}
                    onChange={(e) =>
                      setProfileData({ ...profileData, city: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("account.bio")}
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) =>
                    setProfileData({ ...profileData, bio: e.target.value })
                  }
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
                  placeholder={t("account.bioPlaceholder")}
                />
              </div>
            </div>
          </div>

          {/* Avatar card */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {profileData.firstName.charAt(0)}
              {profileData.lastName.charAt(0)}
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
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
              <Shield className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Beveiliging
              </span>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("account.passwordPlaceholder")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("account.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 w-full px-3 pr-10 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <button
                onClick={handleUpdate}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
              >
                {isLoading ? t("account.saving") : t("account.changePassword")}
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
              <Bell className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Voorkeuren
              </span>
            </div>
            <div className="space-y-4">
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
                <div key={key} className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {label}
                    </p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences[key as keyof typeof preferences] as boolean}
                    onChange={(e) =>
                      setPreferences({ ...preferences, [key]: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("account.language")}
                </label>
                <select
                  value={preferences.language}
                  onChange={(e) =>
                    setPreferences({ ...preferences, language: e.target.value })
                  }
                  className="h-9 w-full border border-slate-200 dark:border-slate-700 rounded-md px-3 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="nl">Nederlands</option>
                  <option value="en">Engels</option>
                  <option value="de">Duits</option>
                  <option value="fr">Frans</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg flex items-center gap-3 text-sm ${
              isSuccess
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
