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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

axios.defaults.headers.common["Content-Type"] = "application/json";
axios.interceptors.request.use((request) => {
  if (typeof window !== "undefined") {
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
export async function saveBulkEntries(
  userId: number,
  entries: TimeEntryAPI[],
  weekStart: Date,
): Promise<void> {
  // Fetch work tasks to get the correct TaakGcId dynamically
  const workTasks = await getWorkTasks();
  const montageTask = workTasks.find((t: any) => t.gcCode === "30"); // Montage
  if (!montageTask) {
    throw new Error("Montage task not found");
  }

  console.log(
    "Using TaakGcId:",
    montageTask.gcId,
    "for task:",
    montageTask.description,
  );
  console.log(
    "MedewGcId from localStorage:",
    localStorage.getItem("medewGcId"),
  );

  // Fetch periods to find the correct UrenperGcId
  const periods = await getPeriods();
  const entryDate = entries[0]?.date; // Assume all entries are in the same period
  const period = periods.find((p: any) => {
    const beginDate = new Date(p.BeginDatum);
    const endDate = new Date(p.EndDate);
    const date = new Date(entryDate);
    return date >= beginDate && date <= endDate;
  });
  if (!period) {
    throw new Error("No matching period found for the entries");
  }

  console.log(
    "Using UrenperGcId:",
    period.gcId,
    "for period:",
    period.description,
  );

  const regels = entries.map((entry) => ({
    TaakGcId: montageTask.gcId,
    WerkGcId: entry.projectId,
    Aantal: entry.hours,
    Datum: entry.date,
    GcOmschrijving: entry.notes || "",
    KostsrtGcId: null,
    BestparGcId: null,
  }));

  const dto = {
    UrenperGcId: period.gcId,
    Regels: regels,
    ClientRequestId: crypto.randomUUID(),
  };

  console.log("Sending DTO:", dto);

  const medewGcId = localStorage.getItem("medewGcId");
  if (!medewGcId) {
    throw new Error("User not logged in");
  }

  await axios.post(`${API_URL}/time-entries/work`, dto, {
    headers: { "X-MEDEW-GC-ID": medewGcId },
  });
}

// Lever entries in
export async function submitEntries(entryIds: number[]): Promise<void> {
  const promises = entryIds.map((id) =>
    axios.post(`${API_URL}/time-entries/${id}/submit`),
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
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const toDate = new Date();
  const from = fromDate.toISOString().split("T")[0];
  const to = toDate.toISOString().split("T")[0];
  console.log(
    "🔧 [API] Fetching time entries from:",
    `${API_URL}/time-entries?from=${from}&to=${to}`,
  );
  const response = await axios.get(
    `${API_URL}/time-entries?from=${from}&to=${to}`,
  );
  console.log("🔧 [API] Raw response:", response.data.length, "entries");
  console.log("🔧 [API] First raw entry:", response.data[0]);

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
    const date = entry.startTime ? entry.startTime.split("T")[0] : "";

    const result = {
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

    if (response.data.indexOf(entry) === 0) {
      console.log("🔧 [API] First transformed entry:", result);
      console.log("🔧 [API] Has hours?", result.hours);
      console.log("🔧 [API] Has date?", result.date);
    }

    return result;
  });

  console.log("🔧 [API] Returning", transformed.length, "transformed entries");
  return transformed;
}

// Create/Register a new time entry
export async function registerTimeEntry(data: any): Promise<any> {
  const response = await axios.post(`${API_URL}/time-entries`, data);
  return response.data;
}

// Update an existing time entry
export async function updateTimeEntry(
  id: number,
  data: Partial<any>,
): Promise<any> {
  const response = await axios.put(`${API_URL}/time-entries/${id}`, data);
  return response.data;
}

// Alias voor backwards compatibility
export const getTimeEntries = getAllTimeEntries;
