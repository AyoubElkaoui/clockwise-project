// lib/api/adminApi.ts
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

export interface AdminStats {
  totalUsers: number;
  hoursThisMonth: number;
  activeProjects: number;
  pendingVacations: number;
  totalHours: number;
}

export interface TimeEntryWithDetails {
  id: number;
  userId: number;
  userName: string;
  date: string;
  projectId: number;
  projectName: string;
  hours: number;
  status: string;
}

export interface VacationRequestWithUser {
  id: number;
  userId: number;
  userName: string;
  startDate: string;
  endDate: string;
  hours: number;
  reason: string;
  status: string;
}

export async function getAdminStats(): Promise<AdminStats> {
  try {
    const res = await axios.get(`${API_URL}/admin/stats`);
    return res.data;
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return {
      totalUsers: 0,
      hoursThisMonth: 0,
      activeProjects: 0,
      pendingVacations: 0,
      totalHours: 0
    };
  }
}

export async function getAdminTimeEntries(): Promise<TimeEntryWithDetails[]> {
  try {
    const res = await axios.get(`${API_URL}/admin/time-entries`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Error fetching admin time entries:", error);
    return [];
  }
}

export async function getAdminVacationRequests(): Promise<VacationRequestWithUser[]> {
  try {
    const res = await axios.get(`${API_URL}/admin/vacation-requests`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Error fetching admin vacation requests:", error);
    return [];
  }
}

export async function processVacationRequest(id: number, status: "approved" | "rejected"): Promise<void> {
  await axios.put(`${API_URL}/admin/vacation-requests/${id}`, { status });
}

export async function createProject(projectData: { name: string, projectGroupId: number }): Promise<any> {
  const res = await axios.post(`${API_URL}/admin/projects`, projectData);
  return res.data;
}
