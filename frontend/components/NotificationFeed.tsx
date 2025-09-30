// frontend/components/NotificationFeed.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { getActivities, markActivityAsRead, markAllActivitiesAsRead } from "@/lib/api";
import { BellIcon } from "@heroicons/react/24/outline";
import { Activity } from "@/lib/types";

interface NotificationFeedProps {
  limit?: number;
}

export default function NotificationFeed({ limit = 5 }: NotificationFeedProps) {
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
      let activitiesArray: Activity[] = Array.isArray(data) ? data : [];

      setActivities(activitiesArray);

      const unreadCountNum = activitiesArray.filter(a => a && !a.read).length;
      setUnreadCount(unreadCountNum);
      setError(null);
    } catch (error) {
      console.error("Error fetching activities:", error);
      setError("Kon activiteiten niet laden");
      setActivities([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  const handleActivityClick = async (activityId: number) => {
    try {
      const targetActivity = activities.find(a => a.id === activityId);
      if (targetActivity && !targetActivity.read) {
        await markActivityAsRead(activityId);
        setActivities(prev =>
          prev.map(a => (a.id === activityId ? { ...a, read: true } : a))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking activity as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllActivitiesAsRead();
      setActivities(prev => prev.map(a => ({ ...a, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      if (!timestamp) return "Onbekend";
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Onbekend";

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) return `${diffMins} min. geleden`;
      if (diffHours < 24) return `${diffHours} uur geleden`;
      if (diffDays < 7) return `${diffDays} dag${diffDays !== 1 ? "en" : ""} geleden`;
      return date.toLocaleDateString();
    } catch {
      return "Onbekend";
    }
  };

  const getActivityIcon = (activity: Activity) => {
    const activityType = activity.type || "";
    if (activityType === "time_entry") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
      );
    } else if (activityType === "vacation") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
            clipRule="evenodd"
          />
        </svg>
      );
    } else if (activityType === "project") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z"
          />
          <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
        </svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 bg-gray-800 flex justify-between items-center">
        <h3 className="font-bold flex items-center gap-2 text-blue-400">
          <BellIcon className="h-5 w-5" />
          Activiteiten
          {unreadCount > 0 && (
            <span className="ml-1 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            className="text-xs text-blue-400 hover:text-blue-300"
            onClick={handleMarkAllAsRead}
          >
            Alles gelezen
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center p-4 h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="p-4 text-center text-red-400">{error}</div>
      ) : activities.length === 0 ? (
        <div className="p-4 text-center text-gray-500">Geen activiteiten</div>
      ) : (
        <div className="divide-y divide-gray-700 max-h-64 overflow-y-auto">
          {activities.map((activity, index) => (
            <div
              key={activity.id || index}
              className={`p-3 hover:bg-gray-800 cursor-pointer flex items-start gap-3 ${
                !activity.read ? "bg-gray-800/60" : ""
              }`}
              onClick={() => handleActivityClick(activity.id)}
            >
              <div className="mt-1">{getActivityIcon(activity)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white whitespace-normal break-words">
                  {activity.message}
                  {!activity.read && (
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full ml-1"></span>
                  )}
                </p>
                {activity.details && (
                  <p className="text-xs text-gray-400 mt-1 whitespace-normal break-words">
                    {activity.details}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {formatTimestamp(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="p-2 bg-gray-800 border-t border-gray-700">
        <button
          className="w-full text-xs font-semibold text-blue-400 hover:text-blue-300"
          onClick={fetchActivities}
        >
          Vernieuwen
        </button>
      </div>
    </div>
  );
}
