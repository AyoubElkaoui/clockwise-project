// API calls voor tijd registratie
import axios from "axios";

// Align with main api.ts: prefer same-origin on the client, internal URL on server
const runtimeBase =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || ""
    : process.env.NEXT_PUBLIC_API_URL || "";
const cleanBase = runtimeBase.replace(/\/$/, "");
const API_URL = `${cleanBase}/api`;

axios.defaults.headers.common["Content-Type"] = "application/json";
axios.interceptors.request.use((request) => {
  if (typeof window !== "undefined") {
    const medewGcId = localStorage.getItem("medewGcId");
    if (medewGcId) {
      request.headers = request.headers || {};
      if (!request.headers["X-MEDEW-GC-ID"]) {
        request.headers["X-MEDEW-GC-ID"] = medewGcId;
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
export async function getWeekEntries(userId: number, startDate: string): Promise<TimeEntryAPI[]> {
  const response = await axios.get(
    `${API_URL}/time-entries/user/${userId}/week?startDate=${startDate}`
  );
  return response.data;
}

// Sla meerdere entries op (bulk)
export async function saveBulkEntries(userId: number, entries: TimeEntryAPI[]): Promise<void> {
  const dtos = entries.map((entry) => ({
    id: entry.id,
    userId,
    date: entry.date,
    projectId: entry.projectId,
    hours: entry.hours,
    km: entry.km,
    expenses: entry.expenses,
    breakMinutes: entry.breakMinutes,
    notes: entry.notes,
    status: entry.status || "opgeslagen",
  }));

  await axios.post(`${API_URL}/time-entries/bulk`, dtos);
}

// Lever entries in
export async function submitEntries(entryIds: number[]): Promise<void> {
  const promises = entryIds.map((id) =>
    axios.post(`${API_URL}/time-entries/${id}/submit`)
  );
  await Promise.all(promises);
}

// Verwijder een entry
export async function deleteEntry(entryId: number): Promise<void> {
  await axios.delete(`${API_URL}/time-entries/${entryId}`);
}

export async function getTimeEntryDetails(id: number): Promise<any> {
  const res = await axios.get(`${API_URL}/time-entries/${id}/details`);
  return res.data;
}

export async function approveTimeEntry(id: number): Promise<void> {
  await axios.put(`${API_URL}/time-entries/${id}/approve`);
}

export async function rejectTimeEntry(id: number): Promise<void> {
  await axios.put(`${API_URL}/time-entries/${id}/reject`);
}

// Haal alle time entries op (inclusief relaties)
export async function getAllTimeEntries(): Promise<any[]> {
  console.log('🔧 [API] Fetching time entries from:', `${API_URL}/time-entries`);
  const response = await axios.get(`${API_URL}/time-entries`);
  console.log('🔧 [API] Raw response:', response.data.length, 'entries');
  console.log('🔧 [API] First raw entry:', response.data[0]);
  
  // Transform API data to frontend format
  const transformed = response.data.map((entry: any) => {
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
    const date = entry.startTime ? entry.startTime.split('T')[0] : '';

    const result = {
      id: entry.id,
      userId: entry.userId,
      date: date,
      projectId: entry.projectId,
      projectName: entry.project?.name || '',
      projectGroupId: entry.project?.projectGroupId || 0,
      projectGroupName: entry.project?.projectGroup?.name || '',
      companyId: entry.project?.projectGroup?.companyId || 0,
      companyName: entry.project?.projectGroup?.company?.name || '',
      hours: parseFloat(hours.toFixed(2)),
      km: entry.distanceKm || 0,
      expenses: entry.expenses || 0,
      breakMinutes: entry.breakMinutes || 0,
      notes: entry.notes || '',
      status: entry.status || 'opgeslagen',
      startTime: entry.startTime,
      endTime: entry.endTime,
    };
    
    if (response.data.indexOf(entry) === 0) {
      console.log('🔧 [API] First transformed entry:', result);
      console.log('🔧 [API] Has hours?', result.hours);
      console.log('🔧 [API] Has date?', result.date);
    }
    
    return result;
  });
  
  console.log('🔧 [API] Returning', transformed.length, 'transformed entries');
  return transformed;
}

// Create/Register a new time entry
export async function registerTimeEntry(data: any): Promise<any> {
  const response = await axios.post(`${API_URL}/time-entries`, data);
  return response.data;
}

// Update an existing time entry
export async function updateTimeEntry(id: number, data: Partial<any>): Promise<any> {
  const response = await axios.put(`${API_URL}/time-entries/${id}`, data);
  return response.data;
}

// Alias voor backwards compatibility
export const getTimeEntries = getAllTimeEntries;
