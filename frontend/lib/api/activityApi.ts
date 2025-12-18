// lib/api/activityApi.ts
import axios from "axios";

const API_URL = "/api";

export interface Activity {
  id: number;
  userId: number;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export async function getActivities(limit: number = 10, userId?: number): Promise<Activity[]> {
  try {
    let url = `${API_URL}/activities?limit=${limit}`;
    if (userId) {
      url += `&userId=${userId}`;
    }

    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Error fetching activities:", error);
    return [];
  }
}

export async function markActivityAsRead(activityId: number): Promise<void> {
  try {
    await axios.put(`${API_URL}/activities/${activityId}/read`);
  } catch (error) {
    console.error("Error marking activity as read:", error);
  }
}

export async function markAllActivitiesAsRead(): Promise<void> {
  try {
    const userId = Number(localStorage.getItem("userId"));
    if (!userId) throw new Error("No user ID found");

    await axios.put(`${API_URL}/activities/read-all?userId=${userId}`);
  } catch (error) {
    console.error("Error marking all activities as read:", error);
    throw error;
  }
}
