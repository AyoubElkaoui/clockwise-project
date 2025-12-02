"use client";
import { useState, useEffect } from "react";
import { Settings, Bell, Shield, Database, Save, CheckCircle } from "lucide-react";

export default function AdminSettingsPage() {
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  
  // Security settings
  const [require2FA, setRequire2FA] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(false);
  
  // UI State
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const loadSettings = () => {
      try {
        const settings = localStorage.getItem("adminSettings");
        if (settings) {
          const parsed = JSON.parse(settings);
          setEmailNotifications(parsed.emailNotifications ?? true);
          setPushNotifications(parsed.pushNotifications ?? true);
          setRequire2FA(parsed.require2FA ?? false);
          setSessionTimeout(parsed.sessionTimeout ?? false);
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
      emailNotifications,
      pushNotifications,
      require2FA,
      sessionTimeout,
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem("adminSettings", JSON.stringify(settings));
    
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 500);
  };

  const handleBackup = () => {
    alert("Database backup functionaliteit wordt binnenkort toegevoegd!");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Systeem Instellingen
        </h1>
        <p className="text-gray-600 dark:text-slate-400">Beheer systeem configuratie</p>
      </div>

      <div className="space-y-6">
        {/* Notifications */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notificaties</h3>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="checkbox checkbox-primary" 
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              <span className="text-sm text-gray-700 dark:text-slate-300">Email notificaties</span>
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
          </div>
        </div>

        {/* Security */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Beveiliging</h3>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="checkbox checkbox-primary" 
                checked={require2FA}
                onChange={(e) => setRequire2FA(e.target.checked)}
              />
              <span className="text-sm text-gray-700 dark:text-slate-300">Two-factor authenticatie vereist</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="checkbox checkbox-primary" 
                checked={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.checked)}
              />
              <span className="text-sm text-gray-700 dark:text-slate-300">Session timeout na 1 uur</span>
            </label>
          </div>
        </div>

        {/* Database */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Database</h3>
          </div>
          <button 
            onClick={handleBackup}
            className="btn btn-outline gap-2"
          >
            <Database className="w-4 h-4" />
            Backup Database
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
              ✓ Instellingen succesvol opgeslagen
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
