import axios from "axios";
import { TimeEntry, User } from "./types";

/** 
 * Dynamische API URL:
 * - Client-side → localhost:5000
 * - Server-side (Next.js in Docker) → clockwise-backend:5000
 */
const baseURL =
    typeof window === "undefined"
        ? process.env.INTERNAL_API_URL                // server-side (Docker)
        : process.env.NEXT_PUBLIC_API_URL;            // browser

// Fallback
const cleanBase = baseURL ? baseURL.replace(/\/$/, "") : "http://localhost:5000";

// Backend always uses /api prefix
export const API_URL = `${cleanBase}/api`;

// Set default axios headers
axios.defaults.headers.common["Content-Type"] = "application/json";

// Request logging
axios.interceptors.request.use(request => {
    console.log("API Request:", request.method?.toUpperCase(), request.url);
    return request;
});

// Response logging
axios.interceptors.response.use(
    response => {
        console.log("API Response:", response.status, response.config.url);
        return response;
    },
    error => {
        console.error("API Error:", error.response?.status, error.config?.url, error.message);
        return Promise.reject(error);
    }
);

// Helper: clean response
function safeApiResponse(response: any): any {
    if (!response) return [];
    if (response.data !== undefined) return response.data;
    return response;
}

/* ----------------------------
   YOUR API FUNCTIONS (unchanged)
----------------------------- */

export async function getCompanies() {
    try {
        const res = await axios.get(`${API_URL}/companies`);
        return safeApiResponse(res) ?? [];
    } catch (error) {
        console.error(" Error fetching companies:", error);
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
    } catch (error) {
        console.error(" Error fetching users:", error);
        return [];
    }
}

export async function getTimeEntries() {
    try {
        const res = await axios.get(`${API_URL}/time-entries`);
        const data = safeApiResponse(res);

        let raw = [];
        if (Array.isArray(data)) raw = data;
        else if (Array.isArray(data?.timeEntries)) raw = data.timeEntries;
        else if (Array.isArray(data?.data)) raw = data.data;
        else return [];

        return raw.map((entry: any) => {
            let hours = 0;
            if (entry.startTime && entry.endTime) {
                const diffMs = new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime();
                const minutes = diffMs / (1000 * 60);
                const workMinutes = minutes - (entry.breakMinutes || 0);
                hours = workMinutes > 0 ? workMinutes / 60 : 0;
            }

            return {
                ...entry,
                date: entry.startTime?.split("T")[0] || "",
                hours: parseFloat(hours.toFixed(2)),
                projectName: entry.project?.name || "",
                projectGroupId: entry.project?.projectGroupId || 0,
                projectGroupName: entry.project?.projectGroup?.name || "",
                companyId: entry.project?.projectGroup?.companyId || 0,
                companyName: entry.project?.projectGroup?.company?.name || "",
                km: entry.distanceKm || 0,
                expenses: entry.expenses || 0,
                breakMinutes: entry.breakMinutes || 0,
                notes: entry.notes || "",
                status: entry.status || "opgeslagen"
            };
        });
    } catch (error) {
        console.error(" Error fetching time entries:", error);
        return [];
    }
}

export async function getProjectGroups(companyId: number) {
    try {
        const res = await axios.get(`${API_URL}/project-groups/company/${companyId}`);
        return safeApiResponse(res) ?? [];
    } catch (error) {
        console.error(" Error fetching groups:", error);
        return [];
    }
}

export async function getProjects(projectGroupId: number) {
    try {
        const res = await axios.get(`${API_URL}/projects/group/${projectGroupId}`);
        return safeApiResponse(res) ?? [];
    } catch (error) {
        console.error(" Error:", error);
        return [];
    }
}

export async function getAllProjects() {
    try {
        const res = await axios.get(`${API_URL}/projects`);
        return safeApiResponse(res) ?? [];
    } catch (error) {
        console.error(" Error:", error);
        return [];
    }
}

export async function registerTimeEntry(data: any) {
    return axios.post(`${API_URL}/time-entries`, data).then(safeApiResponse);
}

export async function updateTimeEntry(id: number, data: any) {
    return axios.put(`${API_URL}/time-entries/${id}`, data).then(safeApiResponse);
}

export async function deleteTimeEntry(id: number) {
    return axios.delete(`${API_URL}/time-entries/${id}`).then(safeApiResponse);
}

export async function submitTimeEntry(id: number) {
    return axios.post(`${API_URL}/time-entries/${id}/submit`).then(safeApiResponse);
}

export async function login(userInput: string, password: string) {
    const response = await axios.post(`${API_URL}/users/login`, { userInput, password });
    const user = safeApiResponse(response);
    if (!user?.id) throw new Error("Invalid server response");

    localStorage.clear();
    localStorage.setItem("userId", String(user.id));
    localStorage.setItem("firstName", user.firstName || "");
    localStorage.setItem("lastName", user.lastName || "");
    localStorage.setItem("userRank", user.rank || "user");
    return user;
}

export async function registerUser(data: any) {
    return axios.post(`${API_URL}/users/register`, data).then(safeApiResponse);
}

export async function registerVacationRequest(data: any) {
    return axios.post(`${API_URL}/vacation-requests`, data).then(safeApiResponse);
}

export async function getVacationRequests() {
    const res = await axios.get(`${API_URL}/vacation-requests`);
    const data = safeApiResponse(res);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.vacations)) return data.vacations;
    if (Array.isArray(data?.data)) return data.data;
    return [];
}

export async function getAdminStats() {
    try {
        const res = await axios.get(`${API_URL}/admin/stats`);
        return safeApiResponse(res);
    } catch {
        return { totalUsers: 0, hoursThisMonth: 0, activeProjects: 0, pendingVacations: 0, totalHours: 0 };
    }
}

export async function getAdminTimeEntries() {
    const res = await axios.get(`${API_URL}/admin/time-entries`);
    const data = safeApiResponse(res);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.timeEntries)) return data.timeEntries;
    if (Array.isArray(data?.data)) return data.data;
    return [];
}

export async function getAdminVacationRequests() {
    const res = await axios.get(`${API_URL}/admin/vacation-requests`);
    const data = safeApiResponse(res);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.vacations)) return data.vacations;
    if (Array.isArray(data?.data)) return data.data;
    return [];
}

export async function processVacationRequest(id: number, status: string) {
    return axios.put(`${API_URL}/admin/vacation-requests/${id}`, { status }).then(safeApiResponse);
}

export async function createProject(data: any) {
    return axios.post(`${API_URL}/admin/projects`, data).then(safeApiResponse);
}

export async function getUser(id: number) {
    return axios.get(`${API_URL}/users/${id}`).then(safeApiResponse);
}

export async function updateUser(id: number, data: any) {
    return axios.put(`${API_URL}/users/${id}`, data).then(safeApiResponse);
}

export async function deleteUser(id: number) {
    return axios.delete(`${API_URL}/users/${id}`).then(safeApiResponse);
}

export async function getTimeEntryDetails(id: number) {
    return axios.get(`${API_URL}/time-entries/${id}/details`).then(safeApiResponse);
}

export async function approveTimeEntry(id: number) {
    return axios.put(`${API_URL}/time-entries/${id}/approve`).then(safeApiResponse);
}

export async function rejectTimeEntry(id: number) {
    return axios.put(`${API_URL}/time-entries/${id}/reject`).then(safeApiResponse);
}

export async function markAllActivitiesAsRead() {
    const userId = Number(localStorage.getItem("userId"));
    if (!userId) throw new Error("No user ID found");
    return axios.put(`${API_URL}/activities/read-all?userId=${userId}`).then(safeApiResponse);
}

export async function getActivities(limit = 10, userId?: number) {
    let url = `${API_URL}/activities?limit=${limit}`;
    if (userId) url += `&userId=${userId}`;
    const res = await axios.get(url);
    const data = safeApiResponse(res);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.activities)) return data.activities;
    if (Array.isArray(data?.data)) return data.data;
    return [];
}

export async function markActivityAsRead(activityId: number) {
    return axios.put(`${API_URL}/activities/${activityId}/read`).then(safeApiResponse);
}

function safeApiCall<T>(fn: () => Promise<any>): Promise<T | null> {
    return fn()
        .then(safeApiResponse)
        .catch(err => {
            console.error(" safeApiCall error:", err);
            return null;
        });
}

export async function getUserProjects(userId: number) {
    return safeApiCall(() => axios.get(`${API_URL}/user-projects/users/${userId}`));
}

export async function getProjectUsers(projectId: number) {
    return safeApiCall(() => axios.get(`${API_URL}/user-projects/projects/${projectId}`));
}

export async function assignUserToProject(userId: number, projectId: number, assignedByUserId: number) {
    return safeApiCall(() =>
        axios.post(`${API_URL}/user-projects`, { userId, projectId, assignedByUserId })
    );
}

export async function removeUserFromProject(userId: number, projectId: number) {
    return safeApiCall(() =>
        axios.delete(`${API_URL}/user-projects/users/${userId}/projects/${projectId}`)
    );
}
