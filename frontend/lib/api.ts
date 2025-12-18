import axios from "axios";
import { TimeEntry, User } from "./types";

/**
 * Dynamische API URL:
 * - Client-side → localhost:5000
 * - Server-side (Next.js in Docker) → clockwise-backend:5000
 */
const baseURL = "https://loath-lila-unflowing.ngrok-free.dev";

// Fallback to relative /api when no base is set
const cleanBase = baseURL ? baseURL.replace(/\/$/, "") : "";

// Backend always uses /api prefix
export const API_URL = "/api";

// Set default axios headers
axios.defaults.headers.common["Content-Type"] = "application/json";

// Belangrijk voor ngrok (ERR_NGROK_6024 HTML pagina omzeilen)
axios.defaults.headers.common["ngrok-skip-browser-warning"] = "1";

// Set X-MEDEW-GC-ID if user is logged in
const userId = localStorage.getItem("userId");
if (userId) {
  axios.defaults.headers.common['X-MEDEW-GC-ID'] = userId;
}

// Request logging
axios.interceptors.request.use((config) => {
  console.log('API Request:', config.method?.toUpperCase(), config.url, 'Headers:', config.headers);
  return config;
});

// Response logging
axios.interceptors.response.use(
  (response) => {
    console.log("API Response:", response.status, response.config.url);
    return response;
  },
  (error) => {
    // Silence logging for 404s on activities endpoint as it's not implemented in backend v1
    if (
      error.response?.status === 404 &&
      error.config?.url?.includes("/api/activities")
    ) {
      return Promise.reject(error);
    }
    console.error(
      "API Error:",
      error.response?.status,
      error.config?.url,
      error.message,
    );
    return Promise.reject(error);
  },
);

// Helper: clean response
function safeApiResponse(response: any): any {
  if (!response) return [];
  if (response.data !== undefined) return response.data;
  return response;
}

function getMedewHeaders() {
  if (typeof localStorage === "undefined") return undefined;
  const medewGcId = localStorage.getItem("medewGcId");
  return medewGcId ? { "X-MEDEW-GC-ID": medewGcId } : undefined;
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
    if (!Array.isArray(data)) {
      console.error('Received non-array response from /companies:', data);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error(" Error fetching companies:", error);
    return [];
  }
}

// Delete not implemented in new backend
export async function deleteTimeEntry(id: number) {
  // Dummy
  return Promise.resolve(null);
}

export async function getUsers() {
  try {
    const res = await axios.get(`${API_URL}/users`);
    const data = safeApiResponse(res);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.users)) return data.users;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch (error) {
    console.error(" Error fetching users:", error);
    return [];
  }
}

// Update user not implemented

export async function getProjectGroups() {
  try {
    const res = await axios.get(`${API_URL}/project-groups`);
    const data = safeApiResponse(res);
    if (!Array.isArray(data)) {
      console.error('Received non-array response from /project-groups:', data);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error(" Error fetching groups:", error);
    return [];
  }
}

export async function getProjects(groupId?: number) {
  try {
    const params = groupId ? `?groupId=${groupId}` : "";
    const res = await axios.get(`${API_URL}/projects${params}`);
    const data = safeApiResponse(res);
    if (!Array.isArray(data)) {
      console.error('Received non-array response from /projects:', data);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error(" Error:", error);
    return [];
  }
}

export async function getWorkTasks() {
  try {
    const res = await axios.get(`${API_URL}/tasks/work`);
    return safeApiResponse(res) ?? [];
  } catch (error) {
    console.error(" Error fetching work tasks:", error);
    return [];
  }
}

export async function getVacationTasks() {
  try {
    const res = await axios.get(`${API_URL}/tasks/vacation`);
    return safeApiResponse(res) ?? [];
  } catch (error) {
    console.error(" Error fetching vacation tasks:", error);
    return [];
  }
}

export async function getPeriods(count: number = 50) {
  try {
    const res = await axios.get(`${API_URL}/periods?count=${count}`);
    return safeApiResponse(res) ?? [];
  } catch (error) {
    console.error(" Error fetching periods:", error);
    return [];
  }
}

export async function registerWorkTimeEntries(
  urenperGcId: number,
  entries: any[],
) {
  const data = { UrenperGcId: urenperGcId, Regels: entries };
  return axios
    .post(`${API_URL}/time-entries/work`, data, {
      headers: { "X-MEDEW-GC-ID": localStorage.getItem("medewGcId") || "1" },
    })
    .then(safeApiResponse);
}

export async function registerVacationTimeEntries(
  urenperGcId: number,
  entries: any[],
) {
  const data = { UrenperGcId: urenperGcId, Regels: entries };
  return axios
    .post(`${API_URL}/time-entries/vacation`, data, {
      headers: { "X-MEDEW-GC-ID": localStorage.getItem("medewGcId") || "1" },
    })
    .then(safeApiResponse);
}

export async function getTimeEntries(from?: string, to?: string) {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today to include full day

  // Clamp to/today so the backend doesn’t 500 on future ranges
  const requestedTo = to ? new Date(to) : today;
  const safeTo = requestedTo > today ? today : requestedTo;
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
    console.warn("Invalid or future date range; skipping time entry fetch.");
    return [];
  }

  const medewGcId =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("medewGcId")
      : null;
  if (!medewGcId) {
    console.warn("No medewGcId set; skipping time entry fetch.");
    return [];
  }

  try {
    const res = await axios.get(`${API_URL}/time-entries`, {
      params: { from: fromDate, to: toDate },
      headers: { "X-MEDEW-GC-ID": medewGcId },
    });
    const data = safeApiResponse(res);

    let raw: any[] = [];
    if (Array.isArray(data)) raw = data;
    else if (Array.isArray(data?.timeEntries)) raw = data.timeEntries;
    else if (Array.isArray(data?.data)) raw = data.data;
    else return [];

    return transformTimeEntries(raw);
  } catch (error) {
    console.error(" Error fetching time entries:", error);
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

  console.log("getEnrichedTimeEntries - entries:", entries);
  console.log("getEnrichedTimeEntries - projects:", projects);
  console.log("getEnrichedTimeEntries - projectGroups:", projectGroups);
  console.log("getEnrichedTimeEntries - companies:", companies);

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

  console.log("getEnrichedTimeEntries - projectMap:", projectMap);
  console.log("getEnrichedTimeEntries - groupMap:", groupMap);
  console.log("getEnrichedTimeEntries - companyMap:", companyMap);

  return entries.map((entry: any) => {
    const project = projectMap.get(entry.projectId);
    const group = project ? groupMap.get(project.werkgrpGcId) : null;
    const company = group ? companyMap.get(group.adminisGcId) : null;

    const enriched = {
      ...entry,
      projectCode: entry.projectCode || (project ? project.gcCode : `Project ${entry.projectId}`),
      projectName: entry.projectName || (project ? project.gcCode : `Project ${entry.projectId}`),
      projectGroupName: group ? group.gcCode : "",
      companyName: company || `Bedrijf ${group?.adminisGcId || 0}`,
    };

    console.log(
      `Enriching entry ${entry.id}: projectId=${entry.projectId}, project=${project}, projectName=${enriched.projectName}`,
    );

    return enriched;
  });
}

export async function login(medewGcId: string) {
  const response = await axios.post(`${API_URL}/users/login`, {
    medewGcId: parseInt(medewGcId),
  });
  const user = response.data;

  // Clear and set localStorage
  localStorage.clear();
  localStorage.setItem("medewGcId", medewGcId);
  localStorage.setItem("userId", user.id.toString());
  localStorage.setItem("firstName", user.firstName);
  localStorage.setItem("lastName", user.lastName);
  localStorage.setItem("userRank", user.rank || "user");

  return user;
}

export async function registerWorkTimeEntry(
  urenperGcId: number,
  entries: any[],
) {
  const clientRequestId = crypto.randomUUID();
  const data = {
    UrenperGcId: urenperGcId,
    Regels: entries,
    ClientRequestId: clientRequestId,
  };
  const medewGcId = localStorage.getItem("medewGcId");
  if (!medewGcId) throw new Error("Not logged in");
  return axios
    .post(`${API_URL}/time-entries/work`, data, {
      headers: { "X-MEDEW-GC-ID": medewGcId },
    })
    .then(safeApiResponse);
}

export async function registerVacationTimeEntry(
  urenperGcId: number,
  entries: any[],
) {
  const clientRequestId = crypto.randomUUID();
  const data = {
    UrenperGcId: urenperGcId,
    Regels: entries,
    ClientRequestId: clientRequestId,
  };
  const medewGcId = localStorage.getItem("medewGcId");
  if (!medewGcId) throw new Error("Not logged in");
  return axios
    .post(`${API_URL}/time-entries/vacation`, data, {
      headers: { "X-MEDEW-GC-ID": medewGcId },
    })
    .then(safeApiResponse);
}

// Vacation requests not in new backend
export async function getVacationRequests() {
  // Dummy
  return [];
}

// Admin stats not implemented
export async function getAdminStats() {
  return {
    totalUsers: 0,
    totalCompanies: 0,
    totalProjects: 0,
    totalHours: 0,
    hoursThisMonth: 0,
    hoursLastMonth: 0,
    hoursLastWeek: 0,
    usersLastWeek: 0,
    projectsLastWeek: 0,
    activeProjects: 0,
    pendingVacations: 0,
    pendingApprovals: 0,
    completionRate: 0,
    activeUsersThisMonth: 0,
    avgHoursPerUser: 0,
    systemHealth: 0,
  };
}

// Admin time entries not implemented
export async function getAdminTimeEntries() {
  return [];
}

// Admin vacation requests not implemented
export async function getAdminVacationRequests() {
  return [];
}

// System status not implemented
export async function getSystemStatus() {
  return [
    {
      id: 1,
      component: "API Server",
      status: "unknown",
      uptime: "0%",
      responseTime: "N/A",
    },
    {
      id: 2,
      component: "Database",
      status: "unknown",
      uptime: "0%",
      responseTime: "N/A",
    },
  ];
}

// Process vacation not implemented
export async function processVacationRequest(id: number, status: string) {
  return Promise.resolve(null);
}

// Register not implemented
export async function registerUser(data: any) {
  // Dummy
  return Promise.resolve(null);
}

// Delete project not implemented
export async function deleteProject(id: number) {
  return Promise.resolve(null);
}

// Get user not implemented
export async function getUser(id: number) {
  const medewGcId = localStorage.getItem("medewGcId");
  if (!medewGcId) return null;
  return axios
    .get(`${API_URL}/users/${id}`, {
      headers: { "X-MEDEW-GC-ID": medewGcId },
    })
    .then(safeApiResponse);
}

export async function updateUser(id: number, data: any) {
  const medewGcId = localStorage.getItem("medewGcId");
  if (!medewGcId) return null;
  return axios
    .put(`${API_URL}/users/${id}`, data, {
      headers: { "X-MEDEW-GC-ID": medewGcId },
    })
    .then(safeApiResponse);
}

// Update not needed for new backend
export async function updateTimeEntry(id: number, data: any) {
  // Dummy for compatibility
  return Promise.resolve(null);
}

// Delete user not implemented
export async function deleteUser(id: number) {
  return Promise.resolve(null);
}

// Time entry details not implemented
export async function getTimeEntryDetails(id: number) {
  return Promise.resolve(null);
}

// Submit not separate in new backend
export async function submitTimeEntry(id: number) {
  // Dummy
  return Promise.resolve(null);
}

// Approve not implemented
export async function approveTimeEntry(id: number) {
  return Promise.resolve(null);
}

// Reject time entry not implemented
export async function rejectTimeEntry(id: number) {
  return Promise.resolve(null);
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
    console.warn("No medewGcId set; skipping activities fetch.");
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
  } catch (error: any) {
    // Backend v1 has no /activities endpoint; silence 404s for now
    if (error?.response?.status === 404) return [];
    console.error("Error fetching activities:", error);
    return [];
  }
}

export async function markActivityAsRead(activityId: number) {
  return axios
    .put(`${API_URL}/activities/${activityId}/read`)
    .then(safeApiResponse);
}

function safeApiCall<T>(fn: () => Promise<any>): Promise<T | null> {
  return fn()
    .then(safeApiResponse)
    .catch((err) => {
      console.error(" safeApiCall error:", err);
      return null;
    });
}

export async function getUserProjects(userId: number) {
  return safeApiCall(() =>
    axios.get(`${API_URL}/user-projects/users/${userId}`),
  );
}

export async function getProjectUsers(projectId: number) {
  return safeApiCall(() =>
    axios.get(`${API_URL}/user-projects/projects/${projectId}`),
  );
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
export async function getMyTeam(managerId: number) {
  try {
    const res = await axios.get(`${API_URL}/users`);
    const users = safeApiResponse(res);
    // Filter users who have this manager as their manager
    return Array.isArray(users)
      ? users.filter((u: any) => u.managerId === managerId)
      : [];
  } catch (error) {
    console.error("Error fetching team:", error);
    return [];
  }
}

export async function getTeamTimeEntries(managerId: number) {
  try {
    const team = await getMyTeam(managerId);
    const teamUserIds = team.map((u: any) => u.id);
    const allEntries = await getTimeEntries();
    return allEntries.filter((e: any) => teamUserIds.includes(e.userId));
  } catch (error) {
    console.error("Error fetching team time entries:", error);
    return [];
  }
}

export async function getTeamPendingHours(managerId: number) {
  try {
    const teamEntries = await getTeamTimeEntries(managerId);
    return teamEntries.filter((e: any) => e.status === "ingeleverd");
  } catch (error) {
    console.error("Error fetching team pending hours:", error);
    return [];
  }
}

export async function getTeamPendingVacations(managerId: number) {
  try {
    const team = await getMyTeam(managerId);
    const teamUserIds = team.map((u: any) => u.id);
    const allVacations = await getVacationRequests();
    return allVacations.filter(
      (v: any) => teamUserIds.includes(v.userId) && v.status === "Pending",
    );
  } catch (error) {
    console.error("Error fetching team pending vacations:", error);
    return [];
  }
}

export async function getTeamVacations(managerId: number) {
  try {
    const team = await getMyTeam(managerId);
    const teamUserIds = team.map((u: any) => u.id);
    const allVacations = await getVacationRequests();
    return allVacations.filter((v: any) => teamUserIds.includes(v.userId));
  } catch (error) {
    console.error("Error fetching team vacations:", error);
    return [];
  }
}

// Dashboard endpoints
export async function getDashboardHealth() {
  try {
    const res = await axios.get(`${API_URL}/admin/dashboard/health`);
    return safeApiResponse(res);
  } catch (error) {
    console.error("Error fetching dashboard health:", error);
    return {
      databaseStatus: "unknown",
      latencyMs: 0,
      lastError: null,
      timestamp: new Date(),
    };
  }
}

export async function getDashboardAlerts() {
  try {
    const res = await axios.get(`${API_URL}/admin/dashboard/alerts`);
    return safeApiResponse(res) ?? [];
  } catch (error) {
    console.error("Error fetching dashboard alerts:", error);
    return [];
  }
}

// Employees endpoints
export async function getEmployees(
  search?: string,
  department?: string,
  active?: boolean,
) {
  try {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (department) params.append("department", department);
    if (active !== undefined) params.append("active", active.toString());

    const res = await axios.get(`${API_URL}/admin/employees?${params}`);
    return safeApiResponse(res) ?? [];
  } catch (error) {
    console.error("Error fetching employees:", error);
    return [];
  }
}

export async function getEmployeeDetail(id: number) {
  try {
    const res = await axios.get(`${API_URL}/admin/employees/${id}`);
    return safeApiResponse(res);
  } catch (error) {
    console.error("Error fetching employee detail:", error);
    return null;
  }
}

export async function getEmployeeHours(id: number, period: string = "month") {
  try {
    const res = await axios.get(
      `${API_URL}/admin/employees/${id}/hours?period=${period}`,
    );
    return safeApiResponse(res) ?? [];
  } catch (error) {
    console.error("Error fetching employee hours:", error);
    return [];
  }
}

// Time entries aggregates and validations
export async function getTimeEntriesAggregates(
  groupBy: string = "employee",
  period: string = "month",
) {
  try {
    const res = await axios.get(
      `${API_URL}/admin/time-entries/aggregates?groupBy=${groupBy}&period=${period}`,
    );
    return safeApiResponse(res) ?? [];
  } catch (error) {
    console.error("Error fetching time entries aggregates:", error);
    return [];
  }
}

export async function getTimeEntriesValidations() {
  try {
    const res = await axios.get(`${API_URL}/admin/time-entries/validations`);
    return safeApiResponse(res) ?? [];
  } catch (error) {
    console.error("Error fetching time entries validations:", error);
    return [];
  }
}

// Projects endpoints
export async function getAdminProjects() {
  try {
    const res = await axios.get(`${API_URL}/admin/projects`);
    return safeApiResponse(res) ?? [];
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

export async function getProjectDetail(id: number) {
  try {
    const res = await axios.get(`${API_URL}/admin/projects/${id}`);
    return safeApiResponse(res);
  } catch (error) {
    console.error("Error fetching project detail:", error);
    return null;
  }
}

export async function getDepartments() {
  try {
    const res = await axios.get(`${API_URL}/admin/departments`);
    return safeApiResponse(res) ?? [];
  } catch (error) {
    console.error("Error fetching departments:", error);
    return [];
  }
}

// Validations endpoints
export async function getValidations() {
  try {
    const res = await axios.get(`${API_URL}/admin/validations`);
    return safeApiResponse(res) ?? [];
  } catch (error) {
    console.error("Error fetching validations:", error);
    return [];
  }
}

export async function runValidations() {
  try {
    const res = await axios.post(`${API_URL}/admin/validations/run`);
    return safeApiResponse(res);
  } catch (error) {
    console.error("Error running validations:", error);
    return null;
  }
}

export async function getValidationsHistory() {
  try {
    const res = await axios.get(`${API_URL}/admin/validations/history`);
    return safeApiResponse(res) ?? [];
  } catch (error) {
    console.error("Error fetching validations history:", error);
    return [];
  }
}

// Logs endpoints
export async function getLogs(
  level?: string,
  component?: string,
  limit: number = 50,
) {
  try {
    const params = new URLSearchParams();
    if (level) params.append("level", level);
    if (component) params.append("component", component);
    params.append("limit", limit.toString());

    const res = await axios.get(`${API_URL}/admin/logs?${params}`);
    return safeApiResponse(res) ?? [];
  } catch (error) {
    console.error("Error fetching logs:", error);
    return [];
  }
}

export async function getLogDetail(id: number) {
  try {
    const res = await axios.get(`${API_URL}/admin/logs/${id}`);
    return safeApiResponse(res);
  } catch (error) {
    console.error("Error fetching log detail:", error);
    return null;
  }
}

export async function cleanupLogs(olderThanDays: number = 30) {
  try {
    const res = await axios.delete(
      `${API_URL}/admin/logs?olderThanDays=${olderThanDays}`,
    );
    return safeApiResponse(res);
  } catch (error) {
    console.error("Error cleaning up logs:", error);
    return null;
  }
}

// System endpoints
export async function getSystemHealth() {
  try {
    const res = await axios.get(`${API_URL}/admin/system/health`);
    return safeApiResponse(res);
  } catch (error) {
    console.error("Error fetching system health:", error);
    return {
      databaseStatus: "unknown",
      latencyMs: 0,
      lastError: null,
      timestamp: new Date(),
    };
  }
}

export async function getSystemConfig() {
  try {
    const res = await axios.get(`${API_URL}/admin/system/config`);
    return safeApiResponse(res);
  } catch (error) {
    console.error("Error fetching system config:", error);
    return null;
  }
}

export async function updateSystemConfig(config: any) {
  try {
    const res = await axios.put(`${API_URL}/admin/system/config`, config);
    return safeApiResponse(res);
  } catch (error) {
    console.error("Error updating system config:", error);
    return null;
  }
}
