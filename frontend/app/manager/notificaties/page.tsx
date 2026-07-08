"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Loader2, User, Users, FileText, CheckCircle, XCircle, CalendarDays, Settings } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";
import { showToast } from "@/components/ui/toast";
import authUtils from "@/lib/auth-utils";
import { API_URL } from "@/lib/api";

dayjs.extend(relativeTime);
dayjs.locale("nl");


interface Activity {
  id: number;
  userId: number;
  type: string;
  action: string;
  message: string;
  details: string;
  read: boolean;
  timestamp: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export default function ManagerNotificatiesPage() {
  const [notifications, setNotifications] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<string>("manager");

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const userId = authUtils.getUserId();
      if (!userId) {
        showToast("Gebruiker niet ingelogd", "error");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/notifications`, {
        headers: {
          "X-USER-ID": userId.toString(),
          "ngrok-skip-browser-warning": "1",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const mappedData = data.map((n: any) => ({
        id: n.id,
        userId: userId,
        type: n.type,
        action: n.type,
        message: n.message,
        details: n.title || "",
        read: n.isRead,
        timestamp: n.createdAt,
      }));

      setNotifications(Array.isArray(mappedData) ? mappedData : []);
    } catch (error) {
      showToast("Kon notificaties niet laden", "error");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      const userId = authUtils.getUserId();
      const response = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          "X-USER-ID": userId?.toString() || "",
          "ngrok-skip-browser-warning": "1",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark as read");
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      showToast("Gemarkeerd als gelezen", "success");
    } catch (error) {
      showToast("Fout bij markeren", "error");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const userId = authUtils.getUserId();

      const response = await fetch(`${API_URL}/notifications/mark-all-read`, {
        method: "PUT",
        headers: {
          "X-USER-ID": userId?.toString() || "",
          "ngrok-skip-browser-warning": "1",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark all as read");
      }

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      showToast("Alle notificaties gemarkeerd als gelezen", "success");
    } catch (error) {
      showToast("Fout bij markeren", "error");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "workflow":   return <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case "approval":  return <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "rejection": return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case "vacation":  return <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case "system":    return <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
      default:          return <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "workflow":   return "text-amber-600 dark:text-amber-400";
      case "approval":  return "text-emerald-600 dark:text-emerald-400";
      case "rejection": return "text-red-600 dark:text-red-400";
      case "vacation":  return "text-blue-600 dark:text-blue-400";
      default:          return "text-slate-500 dark:text-slate-400";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Notificaties</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Team notificaties en updates{unreadCount > 0 ? ` • ${unreadCount} ongelezen` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <Users className="w-3.5 h-3.5" />
            Team overzicht
          </span>
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
          >
            <Check className="w-4 h-4" />
            <span className="hidden sm:inline">Alles Gelezen</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Totaal</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {loading ? "..." : notifications.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Ongelezen</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {loading ? "..." : unreadCount}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Gelezen</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {loading ? "..." : readCount}
          </p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Team Notificaties
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">Notificaties laden...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Geen notificaties</p>
            <p className="text-sm text-slate-500 mt-1">Er zijn nog geen team notificaties</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                  !notification.read
                    ? "bg-amber-50/40 dark:bg-amber-900/10"
                    : "hover:bg-slate-50 dark:hover:bg-slate-700/20"
                }`}
              >
                {/* Icon */}
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {notification.details || notification.message}
                        </span>
                        {!notification.read && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            Nieuw
                          </span>
                        )}
                      </div>
                      {notification.details && notification.message !== notification.details && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          {notification.message}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{dayjs(notification.timestamp).fromNow()}</span>
                        {notification.user && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {notification.user.firstName} {notification.user.lastName}
                          </span>
                        )}
                        <span className={`capitalize ${getTypeColor(notification.type)}`}>
                          {notification.type.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    {!notification.read && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Gelezen</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
