// lib/api.ts
import axios from "axios";
import { TimeEntry, User} from "./types";

// Exporteer de API_URL constante zodat deze beschikbaar is voor andere bestanden
export const API_URL = "https://07c4-2a01-7c8-bb0b-19b-e916-96b-421e-1ad6.ngrok-free.app/api";

// Safe response handler
function safeApiResponse(response: any): any {
    if (!response) return [];
    if (response.data !== undefined) return response.data;
    return response;
}

export async function getCompanies() {
    try {
        const res = await axios.get(`${API_URL}/companies`);
        const data = safeApiResponse(res);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error fetching companies:", error);
        return [];
    }
}

export async function getProjectGroups(companyId: number) {
    try {
        const res = await axios.get(`${API_URL}/projectgroups/${companyId}`);
        const data = safeApiResponse(res);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error fetching project groups:", error);
        return [];
    }
}

export async function getProjects(projectGroupId: number) {
    try {
        const res = await axios.get(`${API_URL}/projects?groupId=${projectGroupId}`);
        const data = safeApiResponse(res);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
    }
}

export async function getTimeEntries() {
    try {
        const res = await axios.get(`${API_URL}/time-entries`);
        const data = safeApiResponse(res);

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.timeEntries)) return data.timeEntries;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("Unexpected time entries response structure:", data);
        return [];
    } catch (error) {
        console.error("Error fetching time entries:", error);
        return [];
    }
}

export async function registerTimeEntry(data: Omit<TimeEntry, 'id' | 'localStatus'>) {
    try {
        return await axios.post(`${API_URL}/time-entries`, data);
    } catch (error) {
        console.error("Error registering time entry:", error);
        throw error;
    }
}

export async function updateTimeEntry(id: number, data: Partial<TimeEntry>) {
    try {
        return await axios.put(`${API_URL}/time-entries/${id}`, data);
    } catch (error) {
        console.error("Error updating time entry:", error);
        throw error;
    }
}

export async function deleteTimeEntry(id: number) {
    try {
        return await axios.delete(`${API_URL}/time-entries/${id}`);
    } catch (error) {
        console.error("Error deleting time entry:", error);
        throw error;
    }
}

export async function submitTimeEntry(id: number) {
    try {
        return await axios.post(`${API_URL}/time-entries/${id}/submit`);
    } catch (error) {
        console.error("Error submitting time entry:", error);
        throw error;
    }
}

export async function login(userInput: string, password: string) {
    try {
        console.log("Login poging starten...");
        const response = await axios.post(`${API_URL}/users/login`, {
            userInput,
            password,
        });

        const user = safeApiResponse(response);
        console.log("Login succesvol, response:", user);

        if (!user || !user.id) {
            throw new Error("Ongeldige response van server");
        }

        // Wis eerst alle bestaande gebruikersgegevens
        localStorage.clear();

        // Sla nieuwe gegevens op
        localStorage.setItem("userId", String(user.id));
        localStorage.setItem("firstName", user.firstName || "");
        localStorage.setItem("lastName", user.lastName || "");
        localStorage.setItem("userRank", user.rank || "user");

        console.log("Login data opgeslagen, klaar om te redirecten");

        return user;
    } catch (error) {
        console.error("Login error:", error);
        throw error;
    }
}

export async function registerUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    loginName: string;
    password: string;
}) {
    try {
        const response = await axios.post(`${API_URL}/users/register`, data);
        return safeApiResponse(response);
    } catch (error) {
        console.error("Error registering user:", error);
        throw error;
    }
}

export async function registerVacationRequest(data: {
    userId: number;
    startDate: string;
    endDate: string;
    hours: number;
    reason: string;
    status: string;
}) {
    try {
        const response = await axios.post(`${API_URL}/vacation-requests`, data);
        return safeApiResponse(response);
    } catch (error) {
        console.error("Error registering vacation request:", error);
        throw error;
    }
}

export async function getVacationRequests() {
    try {
        const res = await axios.get(`${API_URL}/vacation-requests`);
        const data = safeApiResponse(res);

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.vacations)) return data.vacations;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("Unexpected vacation requests response structure:", data);
        return [];
    } catch (error) {
        console.error("Error fetching vacation requests:", error);
        return [];
    }
}

export async function getAdminStats() {
    try {
        const res = await axios.get(`${API_URL}/admin/stats`);
        return safeApiResponse(res);
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

export async function getAdminTimeEntries() {
    try {
        const res = await axios.get(`${API_URL}/admin/time-entries`);
        const data = safeApiResponse(res);

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.timeEntries)) return data.timeEntries;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("Unexpected admin time entries response structure:", data);
        return [];
    } catch (error) {
        console.error("Error fetching admin time entries:", error);
        return [];
    }
}

export async function getAdminVacationRequests() {
    try {
        const res = await axios.get(`${API_URL}/admin/vacation-requests`);
        const data = safeApiResponse(res);

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.vacations)) return data.vacations;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("Unexpected admin vacation requests response structure:", data);
        return [];
    } catch (error) {
        console.error("Error fetching admin vacation requests:", error);
        return [];
    }
}

export async function processVacationRequest(id: number, status: "approved" | "rejected") {
    try {
        const res = await axios.put(`${API_URL}/admin/vacation-requests/${id}`, { status });
        return safeApiResponse(res);
    } catch (error) {
        console.error("Error processing vacation request:", error);
        throw error;
    }
}

export async function createProject(projectData: { name: string, projectGroupId: number }) {
    try {
        const res = await axios.post(`${API_URL}/admin/projects`, projectData);
        return safeApiResponse(res);
    } catch (error) {
        console.error("Error creating project:", error);
        throw error;
    }
}

export async function getUsers() {
    try {
        const res = await axios.get(`${API_URL}/users`);
        const data = safeApiResponse(res);

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.users)) return data.users;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("Unexpected users response structure:", data);
        return [];
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
}

export async function getUser(id: number) {
    try {
        const res = await axios.get(`${API_URL}/users/${id}`);
        return safeApiResponse(res);
    } catch (error) {
        console.error("Error fetching user:", error);
        throw error;
    }
}

export async function updateUser(id: number, userData: Partial<User>) {
    try {
        const res = await axios.put(`${API_URL}/users/${id}`, userData);
        return safeApiResponse(res);
    } catch (error) {
        console.error("Error updating user:", error);
        throw error;
    }
}

export async function deleteUser(id: number) {
    try {
        const res = await axios.delete(`${API_URL}/users/${id}`);
        return safeApiResponse(res);
    } catch (error) {
        console.error("Error deleting user:", error);
        throw error;
    }
}

export async function getTimeEntryDetails(id: number) {
    try {
        const res = await axios.get(`${API_URL}/time-entries/${id}/details`);
        return safeApiResponse(res);
    } catch (error) {
        console.error("Error fetching time entry details:", error);
        throw error;
    }
}

export async function approveTimeEntry(id: number) {
    try {
        const res = await axios.put(`${API_URL}/time-entries/${id}/approve`);
        return safeApiResponse(res);
    } catch (error) {
        console.error("Error approving time entry:", error);
        throw error;
    }
}

export async function rejectTimeEntry(id: number) {
    try {
        const res = await axios.put(`${API_URL}/time-entries/${id}/reject`);
        return safeApiResponse(res);
    } catch (error) {
        console.error("Error rejecting time entry:", error);
        throw error;
    }
}

export async function markAllActivitiesAsRead() {
    try {
        const userId = Number(localStorage.getItem("userId"));
        if (!userId) throw new Error("No user ID found");

        const response = await axios.put(`${API_URL}/activities/read-all?userId=${userId}`);
        return safeApiResponse(response);
    } catch (error) {
        console.error("Error marking all activities as read:", error);
        throw error;
    }
}

export async function getActivities(limit: number = 10, userId?: number) {
    try {
        let url = `${API_URL}/activities?limit=${limit}`;
        if (userId) {
            url += `&userId=${userId}`;
        }

        const response = await axios.get(url);
        const data = safeApiResponse(response);

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.activities)) return data.activities;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("Unexpected activities response structure:", data);
        return [];
    } catch (error) {
        console.error("Error fetching activities:", error);
        return [];
    }
}

export async function markActivityAsRead(activityId: number) {
    try {
        const response = await axios.put(`${API_URL}/activities/${activityId}/read`);
        return safeApiResponse(response);
    } catch (error) {
        console.error("Error marking activity as read:", error);
        throw error;
    }
}

export async function getUserProjects(userId: number) {
    try {
        const res = await axios.get(`${API_URL}/user-projects/users/${userId}`);
        const data = safeApiResponse(res);

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.userProjects)) return data.userProjects;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("Unexpected user projects response structure:", data);
        return [];
    } catch (error) {
        console.error("Error fetching user projects:", error);
        return [];
    }
}

export async function getProjectUsers(projectId: number) {
    try {
        const res = await axios.get(`${API_URL}/user-projects/projects/${projectId}`);
        const data = safeApiResponse(res);

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.projectUsers)) return data.projectUsers;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("Unexpected project users response structure:", data);
        return [];
    } catch (error) {
        console.error("Error fetching project users:", error);
        return [];
    }
}

export async function assignUserToProject(userId: number, projectId: number, assignedByUserId: number) {
    try {
        const res = await axios.post(`${API_URL}/user-projects`, {
            userId,
            projectId,
            assignedByUserId
        });
        return safeApiResponse(res);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(error.response.data || "Fout bij toewijzen gebruiker aan project");
        }
        throw new Error("Fout bij toewijzen gebruiker aan project");
    }
}

export async function removeUserFromProject(userId: number, projectId: number) {
    try {
        const res = await axios.delete(`${API_URL}/user-projects/users/${userId}/projects/${projectId}`);
        return safeApiResponse(res);
    } catch (error) {
        console.error("Error removing user from project:", error);
        throw error;
    }
}