// frontend/components/NotificationBell.tsx - COMPLETE VERSION
"use client";
import { useState, useEffect } from "react";
import { getActivities, markActivityAsRead, markAllActivitiesAsRead } from "@/lib/api";
import { BellIcon, EnvelopeOpenIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { Activity } from "@/lib/types";
import { safeArray, safeToFixed } from "@/lib/type-safe-utils";

const NotificationBell = () => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("all");

    const fetchActivities = async () => {
        try {
            setLoading(true);
            let userId: number | undefined = undefined;
            
            if (typeof window !== 'undefined') {
                const userIdStr = localStorage.getItem("userId");
                userId = userIdStr ? Number(userIdStr) : undefined;
                if (!userId) return;
            }

            const data = await getActivities(20, userId);
            const activitiesArray = safeArray<Activity>(data);
            setActivities(activitiesArray);

            // Safe unread count
            let unreadCountNum = 0;
            for (const activity of activitiesArray) {
                if (activity && !activity.read) {
                    unreadCountNum++;
                }
            }
            setUnreadCount(unreadCountNum);

        } catch (error) {
            console.error("Error fetching notifications:", error);
            setActivities([]);
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            fetchActivities();
            const interval = setInterval(fetchActivities, 30000);
            return () => clearInterval(interval);
        }
    }, []);

    const handleMarkAsRead = async (activityId: number) => {
        try {
            await markActivityAsRead(activityId);

            const updatedActivities: Activity[] = [];
            for (const activity of activities) {
                if (activity.id === activityId) {
                    updatedActivities.push({ ...activity, read: true });
                } else {
                    updatedActivities.push(activity);
                }
            }

            setActivities(updatedActivities);
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking activity as read:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllActivitiesAsRead();

            const updatedActivities: Activity[] = [];
            for (const activity of activities) {
                updatedActivities.push({ ...activity, read: true });
            }

            setActivities(updatedActivities);
            setUnreadCount(0);
        } catch (error) {
            console.error("Error marking all activities as read:", error);
        }
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    // Safe filtering zonder .filter()
    const filteredActivities: Activity[] = [];
    for (const activity of activities) {
        if (!activity) continue;

        if (activeTab === "unread" && activity.read) continue;
        if (activeTab === "read" && !activity.read) continue;

        filteredActivities.push(activity);
    }

    const formatTimestamp = (timestamp: string) => {
        try {
            if (!timestamp) return 'Onbekend';

            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return 'Onbekend';

            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 60) {
                return `${diffMins} min. geleden`;
            } else if (diffHours < 24) {
                return `${diffHours} uur geleden`;
            } else if (diffDays < 7) {
                return `${diffDays} dag${diffDays !== 1 ? 'en' : ''} geleden`;
            } else {
                return date.toLocaleDateString();
            }
        } catch (error) {
            return 'Onbekend';
        }
    };

    const getActivityIcon = (activity: Activity) => {
        try {
            const activityType = activity.type || "";

            if (activityType === "time_entry") {
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>;
            } else if (activityType === "vacation") {
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>;
            }
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>;
        } catch (error) {
            return <span>📋</span>;
        }
    };

    return (
        <div className="relative">
            <button
                onClick={toggleDropdown}
                className="btn btn-ghost btn-circle"
            >
                <div className="indicator">
                    <BellIcon className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <span className="indicator-item badge badge-primary badge-sm">{unreadCount}</span>
                    )}
                </div>
            </button>

            {showDropdown && (
                <div className="absolute right-0 mt-2 w-96 bg-base-100 shadow-xl rounded-lg overflow-hidden z-50">
                    <div className="flex justify-between items-center p-3 border-b">
                        <h3 className="font-bold text-lg">Notificaties</h3>
                        <button
                            onClick={() => setShowDropdown(false)}
                            className="btn btn-ghost btn-sm btn-circle"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex border-b">
                        <button
                            className={`flex-1 py-2 px-4 text-center ${activeTab === 'all' ? 'bg-base-200 font-semibold' : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            Alle ({activities.length})
                        </button>
                        <button
                            className={`flex-1 py-2 px-4 text-center ${activeTab === 'unread' ? 'bg-base-200 font-semibold' : ''}`}
                            onClick={() => setActiveTab('unread')}
                        >
                            <div className="flex items-center justify-center gap-1">
                                <EnvelopeIcon className="h-4 w-4" />
                                <span>Ongelezen ({unreadCount})</span>
                            </div>
                        </button>
                        <button
                            className={`flex-1 py-2 px-4 text-center ${activeTab === 'read' ? 'bg-base-200 font-semibold' : ''}`}
                            onClick={() => setActiveTab('read')}
                        >
                            <div className="flex items-center justify-center gap-1">
                                <EnvelopeOpenIcon className="h-4 w-4" />
                                <span>Gelezen ({activities.length - unreadCount})</span>
                            </div>
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-4">
                            <div className="loading loading-spinner loading-md"></div>
                        </div>
                    ) : filteredActivities.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            Geen notificaties gevonden
                        </div>
                    ) : (
                        <div className="max-h-96 overflow-y-auto">
                            {filteredActivities.map((activity, index) => (
                                <div
                                    key={activity.id || index}
                                    className={`p-3 hover:bg-base-200 flex gap-3 items-start ${!activity.read ? 'bg-base-200' : ''}`}
                                    onClick={() => !activity.read && handleMarkAsRead(activity.id)}
                                >
                                    <div className="shrink-0 mt-1">
                                        {getActivityIcon(activity)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <span className="font-medium line-clamp-2">{activity.message || 'Geen bericht'}</span>
                                            {!activity.read && (
                                                <span className="badge badge-primary badge-sm ml-1 shrink-0">nieuw</span>
                                            )}
                                        </div>
                                        {activity.details && (
                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{activity.details}</p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">{formatTimestamp(activity.timestamp)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {unreadCount > 0 && (
                        <div className="p-3 border-t">
                            <button
                                onClick={handleMarkAllAsRead}
                                className="btn btn-sm btn-outline w-full"
                            >
                                Alles markeren als gelezen
                            </button>
                        </div>
                    )}

                    <div className="p-3 border-t">
                        <button
                            onClick={fetchActivities}
                            className="btn btn-sm btn-outline w-full"
                        >
                            Vernieuwen
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;

