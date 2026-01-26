// lib/api/activityApi.ts
import axios from "axios";
import { API_URL } from "../api";

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
  } catch {
    return [];
  }
}

export async function markActivityAsRead(activityId: number): Promise<void> {
  await axios.put(`${API_URL}/activities/${activityId}/read`);
}

export async function markAllActivitiesAsRead(): Promise<void> {
  const userId = Number(localStorage.getItem("userId"));
  if (!userId) throw new Error("No user ID found");

  await axios.put(`${API_URL}/activities/read-all?userId=${userId}`);
}
