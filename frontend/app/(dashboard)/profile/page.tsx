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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black text-white p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold mb-2">{t("account.title")}</h1>
          <p className="text-gray-400">{t("account.subtitle")}</p>
        </div>

        {/* Grid layout voor profiel + medewerker info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profiel informatie */}
          <div className="lg:col-span-2 bg-neutral-900 border border-black rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">{t("account.profileInfo")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-1">Voornaam</label>
                <input
                  id="firstName"
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, firstName: e.target.value })
                  }
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600"
                />

              </div>
              <div>
                <label className="block text-gray-400 mb-1">Achternaam</label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  className="w-full bg-black border border-black rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 mb-1">E-mail</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="w-full bg-black border border-black rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-gray-400 mb-1">{t("account.address")}</label>
                <input
                  type="text"
                  value={profileData.address}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  className="w-full bg-black border border-black rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">{t("account.houseNumber")}</label>
                <input
                  type="text"
                  value={profileData.houseNumber}
                  onChange={(e) => setProfileData({ ...profileData, houseNumber: e.target.value })}
                  className="w-full bg-black border border-black rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-1">{t("account.postalCode")}</label>
                <input
                  type="text"
                  value={profileData.postalCode}
                  onChange={(e) => setProfileData({ ...profileData, postalCode: e.target.value })}
                  className="w-full bg-black border border-black rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">{t("account.city")}</label>
                <input
                  type="text"
                  value={profileData.city}
                  onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                  className="w-full bg-black border border-black rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-gray-400 mb-1">{t("account.bio")}</label>
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="w-full bg-black border border-black rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600 resize-none h-24"
                placeholder={t("account.bioPlaceholder")}
              />
            </div>
          </div>

          {/* Medewerker Informatie */}
          <div className="bg-neutral-900 border border-black rounded-xl p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
              {profileData.firstName.charAt(0)}
              {profileData.lastName.charAt(0)}
            </div>
            <h3 className="mt-4 font-semibold text-lg">
              {profileData.firstName} {profileData.lastName}
            </h3>
            <p className="text-gray-400">{profileData.email}</p>
            <p className="text-gray-400">{profileData.city}</p>
            <span className="inline-block mt-3 px-3 py-1 text-sm font-semibold text-blue-400 border border-blue-500 rounded-full">
              Medewerker
            </span>
          </div>
        </div>

        {/* Beveiliging + Voorkeuren naast elkaar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Beveiliging */}
          <div className="bg-neutral-900 border border-black rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5" /> Beveiliging
            </h2>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("account.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-black rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              onClick={handleUpdate}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {isLoading ? t("account.saving") : t("account.changePassword")}
            </button>
          </div>

          {/* Voorkeuren */}
          <div className="bg-neutral-900 border border-black rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5" /> Voorkeuren
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p>{t("account.emailNotifications")}</p>
                  <p className="text-sm text-gray-400">{t("account.emailNotificationsDesc")}</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) =>
                    setPreferences({ ...preferences, emailNotifications: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 bg-gray-800 border border-black rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p>{t("account.pushNotifications")}</p>
                  <p className="text-sm text-gray-400">{t("account.pushNotificationsDesc")}</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.pushNotifications}
                  onChange={(e) =>
                    setPreferences({ ...preferences, pushNotifications: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 bg-gray-800 border border-black rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p>{t("account.weeklyReports")}</p>
                  <p className="text-sm text-gray-400">{t("account.weeklyReportsDesc")}</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.weeklyReports}
                  onChange={(e) =>
                    setPreferences({ ...preferences, weeklyReports: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 bg-gray-800 border border-black rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p>{t("account.holidayReminders")}</p>
                  <p className="text-sm text-gray-400">{t("account.holidayRemindersDesc")}</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.holidayReminders}
                  onChange={(e) =>
                    setPreferences({ ...preferences, holidayReminders: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 bg-gray-800 border border-black rounded"
                />
              </div>
            </div>

            {/* Taal */}
            <div>
              <label className="block mb-1 text-gray-400">{t("account.language")}</label>
              <select
                value={preferences.language}
                onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                className="w-full bg-black border border-black rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-600"
              >
                <option value="nl">Nederlands</option>
                <option value="en">Engels</option>
                <option value="de">Duits</option>
                <option value="fr">Frans</option>
              </select>
            </div>

            {/* Tijdzone */}
            <div>
              <label className="block mb-1 text-gray-400">{t("account.timezone")}</label>
              <select
                value={preferences.timezone}
                onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                className="w-full bg-black border border-black rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-600"
              >
                <option value="Europe/Amsterdam">{t("account.timezoneAmsterdam")}</option>
                <option value="Europe/London">{t("account.timezoneLondon")}</option>
                <option value="Europe/Berlin">{t("account.timezoneBerlin")}</option>
                <option value="America/New_York">{t("account.timezoneNewYork")}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg flex items-center gap-3 ${isSuccess
                ? "bg-green-600/20 text-green-400 border border-green-600"
                : "bg-red-600/20 text-red-400 border border-red-600"
              }`}
          >
            {message}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
