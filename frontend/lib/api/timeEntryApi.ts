// API calls voor tijd registratie
import axios from "axios";
import { getWorkTasks, getPeriods } from "@/lib/api";

// Transform raw TimeEntry from backend to TimeEntryAPI
function transformTimeEntries(raw: any[]): TimeEntryAPI[] {
  return raw.map((entry: any) => {
    const userId = entry.MedewGcId || entry.medewGcId || 1;
    let hours = entry.Aantal || entry.aantal || 0;
    // Assume if hours > 24, it's minutes
    if (hours > 24) {
      hours = hours / 60;
    }
    const date = entry.Datum || entry.datum;
    const startTime = null;
    const endTime = null;
    return {
      id: entry.GcId || entry.gcId || entry.id,
      date: date ? new Date(date).toISOString().split("T")[0] : "",
      companyId: 0,
      companyName: "",
      projectGroupId: 0,
      projectGroupName: "",
      projectId: entry.WerkGcId || entry.werkGcId || entry.projectId || 0,
      projectName: "",
      hours,
      km: 0,
      expenses: 0,
      breakMinutes: 0,
      notes: entry.GcOmschrijving || entry.gcOmschrijving || "",
      status: "opgeslagen",
    };
  });
}

import { API_URL } from "../api";

axios.defaults.headers.common["Content-Type"] = "application/json";
axios.interceptors.request.use((request) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && !request.headers["Authorization"]) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    const medewGcId = localStorage.getItem("medewGcId");
    if (medewGcId) {
      if (!request.headers["X-MEDEW-GC-ID"]) {
        request.headers.set("X-MEDEW-GC-ID", medewGcId);
      }
    }
  }
  return request;
});

export interface TimeEntryAPI {
  id?: number;
  date: string;
  companyId: number;
  companyName?: string;
  projectGroupId: number;
  projectGroupName?: string;
  projectId: number;
  projectName?: string;
  hours: number;
  km: number;
  expenses: number;
  breakMinutes: number;
  notes: string;
  status?: string;
}

// Haal entries op voor een week
export async function getWeekEntries(
  userId: number,
  startDate: string,
): Promise<TimeEntryAPI[]> {
  const response = await axios.get(
    `${API_URL}/time-entries/user/${userId}/week?startDate=${startDate}`,
  );
  const data = response.data;
  let raw: any[] = Array.isArray(data) ? data : data?.entries || [];
  return transformTimeEntries(raw);
}

// Sla meerdere entries op (bulk)

// Lever entries in (legacy — gebruik submitEntries uit workflowApi)

// Verwijder een entry




// Haal alle time entries op (inclusief relaties)
export async function getAllTimeEntries(): Promise<any[]> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const toDate = new Date();
  const from = fromDate.toISOString().split("T")[0];
  const to = toDate.toISOString().split("T")[0];

  const response = await axios.get(
    `${API_URL}/time-entries?from=${from}&to=${to}`,
  );

  // Transform API data to frontend format
  return response.data.map((entry: any) => {
    // Calculate hours from startTime and endTime
    let hours = 0;
    if (entry.startTime && entry.endTime) {
      const start = new Date(entry.startTime);
      const end = new Date(entry.endTime);
      const diffMs = end.getTime() - start.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      const workMinutes = diffMinutes - (entry.breakMinutes || 0);
      hours = workMinutes > 0 ? workMinutes / 60 : 0;
    }

    // Extract date from startTime
    const date = entry.startTime ? entry.startTime.split("T")[0] : "";

    return {
      id: entry.id,
      userId: entry.userId,
      date: date,
      projectId: entry.projectId,
      projectName: entry.project?.name || "",
      projectGroupId: entry.project?.projectGroupId || 0,
      projectGroupName: entry.project?.projectGroup?.name || "",
      companyId: entry.project?.projectGroup?.companyId || 0,
      companyName: entry.project?.projectGroup?.company?.name || "",
      hours: parseFloat(hours.toFixed(2)),
      km: entry.distanceKm || 0,
      expenses: entry.expenses || 0,
      breakMinutes: entry.breakMinutes || 0,
      notes: entry.notes || "",
      status: entry.status || "opgeslagen",
      startTime: entry.startTime,
      endTime: entry.endTime,
    };
  });
}

// Create/Register a new time entry

// Update an existing time entry

// Alias voor backwards compatibility
export const getTimeEntries = getAllTimeEntries;
