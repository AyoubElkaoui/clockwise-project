"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, Loader2, Clock, CalendarDays, FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";
import { showToast } from "@/components/ui/toast";
import authUtils from "@/lib/auth-utils";
import { API_URL } from "@/lib/api";

dayjs.extend(relativeTime);
dayjs.locale("nl");

async function safeJsonParse(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const bodyText = await response.text();
    throw new Error(`Expected JSON response but got ${contentType || 'unknown'}: ${bodyText.substring(0, 100)}`);
  }
  return response.json();
}

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

type FilterType = "all" | "unread" | "read";

export default function NotificatiesPage() {
  const [notifications, setNotifications] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  useEffect(() => {
    const rank = localStorage.getItem("userRank") || "";
    setUserRank(rank);
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const userId = authUtils.getUserId();

      if (!userId) {
        showToast("Gebruiker niet ingelogd", "error");
        return;
      }

      const url = `${API_URL}/notifications`;

      const response = await fetch(url, {
        headers: {
          "X-USER-ID": userId.toString(),
          "ngrok-skip-browser-warning": "1",
        },
      });

      if (!response.ok) {
        showToast("Fout bij laden notificaties", "error");
        setNotifications([]);
        return;
      }

      const data = await safeJsonParse(response);

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

      setNotifications(mappedData);
    } catch (error) {
      showToast("Fout bij laden notificaties", "error");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const userId = authUtils.getUserId();
      if (!userId) return;

      const response = await fetch(`${API_URL}/notifications/mark-all-read`, {
        method: "POST",
        headers: {
          "X-USER-ID": userId.toString(),
          "ngrok-skip-browser-warning": "1",
        },
      });

      if (response.ok) {
        showToast("Alle notificaties gemarkeerd als gelezen", "success");
        loadNotifications();
      } else {
        showToast("Fout bij markeren als gelezen", "error");
      }
    } catch (error) {
      showToast("Fout bij markeren als gelezen", "error");
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      const userId = authUtils.getUserId();
      if (!userId) return;

      const response = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "POST",
        headers: {
          "X-USER-ID": userId.toString(),
          "ngrok-skip-browser-warning": "1",
        },
      });

      if (response.ok) {
        loadNotifications();
      } else {
        showToast("Fout bij markeren als gelezen", "error");
      }
    } catch (error) {
      showToast("Fout bij markeren als gelezen", "error");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "unread") return !n.read;
    if (activeFilter === "read") return n.read;
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "time_entry":
        return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case "vacation":
        return <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "project":
        return <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
    }
  };

  const filterTabs: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "Alle", count: notifications.length },
    { key: "unread", label: "Ongelezen", count: unreadCount },
    { key: "read", label: "Gelezen", count: readCount },
  ];

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="p-6 space-y-6 animate-fadeIn">
          <PageHeader
            title="Notificaties"
            description={
              userRank === "manager"
                ? "Team notificaties en updates"
                : userRank === "admin"
                ? "Alle systeem notificaties"
                : "Jouw persoonlijke notificaties"
            }
            actions={
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {unreadCount} ongelezen
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Alles gelezen
                </Button>
              </div>
            }
          />

          {/* Filter tabs */}
          <div className="flex items-center gap-0 border-b border-slate-200 dark:border-slate-700">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeFilter === tab.key
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs text-slate-400">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Notifications card */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-400" />
                  {activeFilter === "all" && "Alle notificaties"}
                  {activeFilter === "unread" && "Ongelezen notificaties"}
                  {activeFilter === "read" && "Gelezen notificaties"}
                </CardTitle>
                <span className="text-xs text-slate-500">
                  {filteredNotifications.length} item{filteredNotifications.length !== 1 ? "s" : ""}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
                  <span className="text-sm text-slate-500">Notificaties laden...</span>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                    <Bell className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Geen notificaties</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {activeFilter === "unread"
                      ? "Geen ongelezen notificaties."
                      : activeFilter === "read"
                      ? "Geen gelezen notificaties."
                      : "Er zijn nog geen notificaties beschikbaar."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => !notification.read && handleMarkRead(notification.id)}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                        !notification.read
                          ? "bg-blue-50/30 dark:bg-blue-900/10 cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-900/20"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      }`}
                    >
                      {/* Unread / read dot */}
                      <div className="flex-shrink-0 mt-3.5">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            !notification.read
                              ? "bg-blue-500"
                              : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        />
                      </div>

                      {/* Type icon in circle */}
                      <div className="flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                          {getTypeIcon(notification.type)}
                        </div>
                      </div>

                      {/* Text content */}
                      <div className="flex-1 min-w-0 py-0.5">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {notification.details || notification.message}
                        </p>
                        {notification.details && notification.message !== notification.details && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {notification.message}
                          </p>
                        )}
                      </div>

                      {/* Time + mark-read button */}
                      <div className="flex-shrink-0 flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {dayjs(notification.timestamp).fromNow()}
                        </span>
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(notification.id);
                            }}
                            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Markeer als gelezen"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
