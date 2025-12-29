import axios from "axios";
import { API_URL } from "./api";

const getAuthHeaders = () => {
  const medewGcId = localStorage.getItem("medewGcId");
  return medewGcId ? { "X-MEDEW-GC-ID": medewGcId } : {};
};

export interface TimeEntryDto {
  id: number;
  userId: number;
  date: string;
  hours: number;
  projectId: number;
  notes?: string;
  status: string;
  userFirstName?: string;
  userLastName?: string;
  projectCode?: string;
  projectName?: string;
}

export interface TimeEntryStatsDto {
  totalUsers: number;
  totalEntries: number;
  pendingApprovals: number;
  approvedEntries: number;
  hoursThisWeek: number;
  hoursThisMonth: number;
}

export async function getManagerStats(): Promise<TimeEntryStatsDto> {
  const response = await axios.get(`${API_URL}/manager/dashboard/stats`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function getAllTimeEntries(from?: string, to?: string): Promise<TimeEntryDto[]> {
  const params = new URLSearchParams();
  if (from) params.append("from", from);
  if (to) params.append("to", to);

  const response = await axios.get(`${API_URL}/manager/time-entries?${params}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function getPendingApprovals(): Promise<TimeEntryDto[]> {
  const response = await axios.get(`${API_URL}/manager/time-entries/pending`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function approveTimeEntry(id: number, approved: boolean): Promise<void> {
  await axios.put(
    `${API_URL}/manager/time-entries/${id}/approve`,
    { approved },
    { headers: getAuthHeaders() }
  );
}

export async function getAllUsers(): Promise<any[]> {
  const response = await axios.get(`${API_URL}/manager/users`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}
