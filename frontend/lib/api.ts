import axios from "axios";
import { TimeEntry } from "./types";

/**
 * API base URL. NEXT_PUBLIC_API_URL is the backend origin (e.g. https://api.clockd.nl);
 * all routes live under /api.
 */
const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
export const API_URL = `${baseURL.replace(/\/$/, "")}/api`;

axios.defaults.headers.common["Content-Type"] = "application/json";

export function handleUnauthorized(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.clear();
    document.cookie = "token=; path=/; max-age=0";
    document.cookie = "userId=; path=/; max-age=0";
    document.cookie = "userRank=; path=/; max-age=0";
  } catch {
    /* ignore */
  }
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login?expired=1";
  }
}

const isLoginUrl = (url?: string) => !!url && url.includes("/api/auth/login");

// Attach the Bearer token to every API request (except login).
axios.interceptors.request.use((config) => {
  const isApiRequest = config.url?.includes("/api/");
  if (isApiRequest && !isLoginUrl(config.url) && typeof localStorage !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && !config.headers["Authorization"]) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

// A 401 on any API call means the session is gone: log out instead of showing empty pages.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !isLoginUrl(error?.config?.url)) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  },
);

// Helper: clean response
function safeApiResponse(response: any): any {
  if (!response) return [];
  if (response.data !== undefined) return response.data;
  return response;
}

// Normalise time entries from the API into the shape the UI expects
function transformTimeEntries(raw: any[]) {
  return raw.map((entry: any, index: number) => {
    const userId =
      Number(
        entry.userId ??
          entry.medewGcId ??
          entry.MedewGcId ??
          entry.MEDEW_GC_ID ??
          entry.medew_gc_id ??
          null,
      ) || 0;

    let hours = 0;
    if (entry.startTime && entry.endTime) {
      const diffMs =
        new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime();
      const minutes = diffMs / (1000 * 60);
      const workMinutes = minutes - (entry.breakMinutes || 0);
      hours = workMinutes > 0 ? workMinutes / 60 : 0;
    }

    // Map Firebird fields when there are no start/end times
    if (!hours && (entry.Aantal !== undefined || entry.aantal !== undefined)) {
      hours = Number(entry.Aantal ?? entry.aantal ?? 0);
    }

    const date =
      entry.startTime?.split("T")[0] ||
      entry.date?.split("T")[0] ||
      entry.datum?.split("T")[0] ||
      (entry.Datum ? entry.Datum.toString().split("T")[0] : "") ||
      "";

    const startTime =
      entry.startTime || (date ? `${date}T00:00:00.000Z` : undefined);
    const endTime =
      entry.endTime ||
      (date && hours
        ? new Date(
            new Date(date).getTime() + hours * 60 * 60 * 1000,
          ).toISOString()
        : undefined);

    return {
      ...entry,
      id: entry.GcId || entry.gcId || entry.id || index + 1,
      userId,
      date,
      startTime,
      endTime,
      hours: parseFloat(hours.toFixed(2)),
      projectId:
        entry.projectId ??
        entry.werkGcId ??
        entry.WerkGcId ??
        entry.WERK_GC_ID ??
        0,
      projectCode: entry.ProjectCode || entry.projectCode,
      projectName: entry.ProjectName || entry.projectName || entry.project?.name || "",
      taskName: entry.TaskName || entry.taskName,
      projectGroupId: entry.project?.projectGroupId || 0,
      projectGroupName: entry.project?.projectGroup?.name || "",
      companyId: entry.project?.projectGroup?.companyId || 0,
      companyName: entry.project?.projectGroup?.company?.name || "",
      km: entry.distanceKm || 0,
      expenses: entry.expenses || 0,
      breakMinutes: entry.breakMinutes || 0,
      notes: entry.notes || entry.Description || entry.description || entry.GcOmschrijving || entry.GC_OMSCHRIJVING || "",
      status: entry.status || entry.Status || "opgeslagen",
    };
  });
}

/* ----------------------------
   YOUR API FUNCTIONS (unchanged)
----------------------------- */

export async function getCompanies() {
  try {
    const res = await axios.get(`${API_URL}/companies`);
    const data = safeApiResponse(res);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

export async function getUsers() {
  try {
    const res = await axios.get(`${API_URL}/users`);
    const data = safeApiResponse(res);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.users)) return data.users;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch {
    return [];
  }
}

export async function getProjectGroups(companyId?: number) {
  try {
    const url = companyId
      ? `${API_URL}/project-groups/company/${companyId}`
      : `${API_URL}/project-groups`;
    const res = await axios.get(url);
    const data = safeApiResponse(res);
    if (!Array.isArray(data)) {
      return [];
    }
    return data ?? [];
  } catch (error) {
    return [];
  }
}

export const getAllProjects = () => getProjects();

export async function getProjects(groupId?: number) {
  try {
    const params = groupId ? `?groupId=${groupId}` : "";
    const res = await axios.get(`${API_URL}/projects${params}`);
    const data = safeApiResponse(res);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

export async function getWorkTasks() {
  try {
    const res = await axios.get(`${API_URL}/tasks/work`);
    return safeApiResponse(res) ?? [];
  } catch {
    return [];
  }
}

export async function getPeriods(count: number = 50) {
  try {
    const res = await axios.get(`${API_URL}/periods?count=${count}`);
    return safeApiResponse(res) ?? [];
  } catch {
    return [];
  }
}

export async function getTimeEntries(from?: string, to?: string) {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today to include full day

  // Clamp to/today so the backend doesn't 500 on future ranges
  const requestedTo = to ? new Date(to) : today;
  let safeTo = requestedTo > today ? today : requestedTo;
  // Set to end of day to include entries ON that day
  safeTo.setHours(23, 59, 59, 999);

  const defaultFrom = new Date(safeTo);
  // Fetch a wider window (±90 days) so October/November entries are included by default
  defaultFrom.setMonth(defaultFrom.getMonth() - 2);
  const requestedFrom = from ? new Date(from) : defaultFrom;
  const safeFrom = requestedFrom > safeTo ? safeTo : requestedFrom;

  // Ensure from is not in the future either
  const clampedFrom =
    safeFrom > today
      ? new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      : safeFrom;

  const fromDate = clampedFrom.toISOString().split("T")[0];
  const toDate = safeTo.toISOString().split("T")[0];

  // Prevent API call if dates are invalid or in the future
  if (
    new Date(fromDate) > new Date(toDate) ||
    new Date(toDate) > today ||
    new Date(fromDate) > today
  ) {
    return [];
  }

  const medewGcId =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("medewGcId")
      : null;
  if (!medewGcId) {
    return [];
  }

  try {
    const res = await axios.get(`${API_URL}/time-entries`, {
      params: { from: fromDate, to: toDate },
      headers: { "X-MEDEW-GC-ID": medewGcId },
    });
    const data = safeApiResponse(res);

    let raw: any[] = [];
    // Backend returnt TimeEntriesResponse met entries (camelCase!)
    if (Array.isArray(data)) raw = data;
    else if (Array.isArray(data?.entries)) raw = data.entries;
    else if (Array.isArray(data?.Entries)) raw = data.Entries;
    else if (Array.isArray(data?.timeEntries)) raw = data.timeEntries;
    else if (Array.isArray(data?.data)) raw = data.data;
    else return [];

    return transformTimeEntries(raw);
  } catch {
    return [];
  }
}

export async function getEnrichedTimeEntries(from?: string, to?: string) {
  const [entries, projects, projectGroups, companies] = await Promise.all([
    getTimeEntries(from, to),
    getProjects().catch(() => []),
    getProjectGroups().catch(() => []),
    getCompanies().catch(() => []),
  ]);

  const projectMap = new Map(
    projects.map((p: any) => [
      p.gcId,
      { gcCode: p.gcCode, werkgrpGcId: p.werkgrpGcId },
    ]),
  );
  const groupMap = new Map(
    projectGroups.map((g: any) => [
      g.gcId,
      { gcCode: g.gcCode, adminisGcId: g.adminisGcId },
    ]),
  );
  const companyMap = new Map(companies.map((c: any) => [c.id, c.name]));

  return entries.map((entry: any) => {
    const project = projectMap.get(entry.projectId);
    const group = project ? groupMap.get(project.werkgrpGcId) : null;
    const company = group ? companyMap.get(group.adminisGcId) : null;

    return {
      ...entry,
      projectCode: entry.projectCode || (project ? project.gcCode : `Project ${entry.projectId}`),
      projectName: entry.projectName || (project ? project.gcCode : `Project ${entry.projectId}`),
      projectGroupName: group ? group.gcCode : "",
      companyName: company || `Bedrijf ${group?.adminisGcId || 0}`,
    };
  });
}

export async function getVacationRequests() {
  const res = await axios.get(`${API_URL}/vacation`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function markAllActivitiesAsRead() {
  const userId = Number(localStorage.getItem("userId"));
  if (!userId) throw new Error("No user ID found");
  return axios
    .put(`${API_URL}/activities/read-all?userId=${userId}`)
    .then(safeApiResponse);
}

export async function getActivities(limit = 10, userId?: number) {
  if (
    typeof localStorage !== "undefined" &&
    !localStorage.getItem("medewGcId")
  ) {
    return [];
  }

  let url = `${API_URL}/activities?limit=${limit}`;
  if (userId) url += `&userId=${userId}`;
  try {
    const res = await axios.get(url);
    const data = safeApiResponse(res);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.activities)) return data.activities;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch {
    return [];
  }
}

export async function markActivityAsRead(activityId: number) {
  return axios
    .put(`${API_URL}/activities/${activityId}/read`)
    .then(safeApiResponse);
}

function safeApiCall<T>(fn: () => Promise<any>, defaultValue: T | null = null): Promise<T | null> {
  return fn()
    .then(safeApiResponse)
    .catch(() => defaultValue);
}

export async function getUserProjects(userId: number): Promise<any[]> {
  const result = await safeApiCall<any[]>(() =>
    axios.get(`${API_URL}/user-projects/users/${userId}`),
    []
  );
  return Array.isArray(result) ? result : [];
}

export async function getProjectUsers(projectId: number): Promise<any[]> {
  const result = await safeApiCall<any[]>(() =>
    axios.get(`${API_URL}/user-projects/projects/${projectId}`),
    []
  );
  return Array.isArray(result) ? result : [];
}

export async function assignUserToProject(
  userId: number,
  projectId: number,
  assignedByUserId: number,
) {
  return safeApiCall(() =>
    axios.post(`${API_URL}/user-projects`, {
      userId,
      projectId,
      assignedByUserId,
    }),
  );
}

export async function removeUserFromProject(userId: number, projectId: number) {
  return safeApiCall(() =>
    axios.delete(
      `${API_URL}/user-projects/users/${userId}/projects/${projectId}`,
    ),
  );
}

// Team-related functions for managers
// ---------- Own profile (uses the JWT identity, never an id from localStorage) ----------
export interface MyProfile {
  id: number;
  medewGcId: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  allowedTasks: string | null;
  lastLogin: string | null;
  createdAt: string | null;
}

export async function getMe(): Promise<MyProfile> {
  const res = await axios.get(`${API_URL}/users/me`);
  return res.data;
}

export async function updateMe(data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}): Promise<MyProfile> {
  const res = await axios.put(`${API_URL}/users/me`, data);
  return res.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await axios.post(`${API_URL}/auth/change-password`, { currentPassword, newPassword });
}
