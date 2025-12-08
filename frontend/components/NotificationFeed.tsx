"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getActivities, markActivityAsRead, markAllActivitiesAsRead } from "@/lib/api";
import { BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Activity } from "@/lib/types";

interface NotificationFeedProps {
  limit?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationFeed({ limit = 5, isOpen, onClose }: NotificationFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const userId = Number(localStorage.getItem("userId"));
      if (!userId) return;

      const data = await getActivities(limit, userId);
      const activitiesArray: Activity[] = Array.isArray(data) ? data : [];

      setActivities(activitiesArray);
      setUnreadCount(activitiesArray.filter(a => !a.read).length);
      setError(null);
    } catch {
      setError("Kon activiteiten niet laden");
      setActivities([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // 👇 Alleen fetchen als de modal open is
  useEffect(() => {
    if (!isOpen) return;
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [isOpen, fetchActivities]);

  // 👇 Als niet open: niets renderen
  if (!isOpen) return null;

  const handleActivityClick = async (activityId: number) => {
    try {
      const target = activities.find(a => a.id === activityId);
      if (target && !target.read) {
        await markActivityAsRead(activityId);
        setActivities(prev =>
          prev.map(a => (a.id === activityId ? { ...a, read: true } : a))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllActivitiesAsRead();
      setActivities(prev => prev.map(a => ({ ...a, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    }
  };

  // ...formatTimestamp & getActivityIcon blijven hetzelfde

  return (
    <div
      className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm
                 flex justify-center items-start pt-24 z-50"
      onClick={onClose}  // 👈 klik op backdrop sluit
    >
      <div
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100
                   shadow-xl rounded-xl overflow-hidden transition-colors duration-300
                   border border-slate-200 dark:border-slate-700 w-[380px] max-h-[80vh]"
        onClick={(e) => e.stopPropagation()} // 👈 voorkom sluiten bij klik binnen modal
      >
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b
                        border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
          <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <BellIcon className="h-5 w-5" />
            Notificaties
            {unreadCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded bg-blue-600 text-white">
                {unreadCount}
              </span>
            )}
          </h3>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                className="text-sm px-3 py-1 rounded text-slate-700 dark:text-slate-200
                           hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                onClick={handleMarkAllAsRead}
              >
                Alles gelezen
              </button>
            )}

            <button
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              onClick={onClose}
              aria-label="Sluit notificaties"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content + Footer blijven zoals je had */}
        {/* ... */}
      </div>
    </div>
  );
}
