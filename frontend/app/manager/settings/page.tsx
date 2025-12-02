"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, User, Save, CheckCircle } from "lucide-react";

export default function ManagerSettingsPage() {
  const router = useRouter();
  
  // Notification settings
  const [emailOnRequests, setEmailOnRequests] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);
  
  // UI State
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const loadSettings = () => {
      try {
        const settings = localStorage.getItem("managerSettings");
        if (settings) {
          const parsed = JSON.parse(settings);
          setEmailOnRequests(parsed.emailOnRequests ?? true);
          setPushNotifications(parsed.pushNotifications ?? true);
          setDailySummary(parsed.dailySummary ?? false);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    loadSettings();
  }, []);

  const handleSave = () => {
    setSaving(true);
    
    const settings = {
      emailOnRequests,
      pushNotifications,
      dailySummary,
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem("managerSettings", JSON.stringify(settings));
    
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 500);
  };

  const handleEditProfile = () => {
    router.push("/account");
  };

  return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Instellingen
          </h1>
          <p className="text-gray-600 dark:text-slate-400">Manager voorkeuren</p>
        </div>

        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notificaties</h3>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={emailOnRequests}
                  onChange={(e) => setEmailOnRequests(e.target.checked)}
                />
                <span className="text-sm text-gray-700 dark:text-slate-300">Email bij nieuwe aanvragen</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={pushNotifications}
                  onChange={(e) => setPushNotifications(e.target.checked)}
                />
                <span className="text-sm text-gray-700 dark:text-slate-300">Push notificaties</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={dailySummary}
                  onChange={(e) => setDailySummary(e.target.checked)}
                />
                <span className="text-sm text-gray-700 dark:text-slate-300">Dagelijkse samenvatting</span>
              </label>
            </div>
          </div>

          {/* Profile */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profiel</h3>
            </div>
            <button 
              onClick={handleEditProfile}
              className="btn btn-outline gap-2"
            >
              <User className="w-4 h-4" />
              Bewerk Profiel
            </button>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button 
              onClick={handleSave}
              disabled={saving || saved}
              className="btn btn-primary gap-2"
            >
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Opslaan...
                </>
              ) : saved ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Opgeslagen!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Wijzigingen Opslaan
                </>
              )}
            </button>
            
            {saved && (
              <span className="text-sm text-green-600 dark:text-green-400">
                ✓ Voorkeuren succesvol opgeslagen
              </span>
            )}
          </div>
        </div>
      </div>
  );
}
