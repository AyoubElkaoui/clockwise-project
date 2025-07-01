// lib/api.ts
import axios from "axios";
import { TimeEntry, User} from "./types";

// API URL - gebruik de ngrok URL direct voor nu
export const API_URL = "https://3df4-2a01-7c8-bb0b-19b-e916-96b-421e-1ad6.ngrok-free.app/api";

// Configureer axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

// Add request interceptor voor debugging
axios.interceptors.request.use(request => {
    console.log('🚀 API Request:', request.method?.toUpperCase(), request.url);
    return request;
});

// Add response interceptor voor debugging
axios.interceptors.response.use(
    response => {
        console.log('✅ API Response:', response.status, response.config.url);
        return response;
    },
    error => {
        console.error('❌ API Error:', error.response?.status, error.config?.url, error.message);
        return Promise.reject(error);
    }
);

// Safe response handler
function safeApiResponse(response: any): any {
    if (!response) return [];
    if (response.data !== undefined) return response.data;
    return response;
}

export async function getCompanies() {
    try {
        console.log('📊 Fetching companies...');
        const res = await axios.get(`${API_URL}/companies`);
        const data = safeApiResponse(res);
        console.log('✅ Companies loaded:', Array.isArray(data) ? data.length : 'not array');
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("❌ Error fetching companies:", error);
        return [];
    }
}

export async function getUsers() {
    try {
        console.log('👥 Fetching users...');
        const res = await axios.get(`${API_URL}/users`);
        const data = safeApiResponse(res);
        console.log('✅ Users loaded:', Array.isArray(data) ? data.length : 'not array');

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.users)) return data.users;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("⚠️ Unexpected users response structure:", data);
        return [];
    } catch (error) {
        console.error("❌ Error fetching users:", error);
        return [];
    }
}

export async function getTimeEntries() {
    try {
        console.log('⏰ Fetching time entries...');
        const res = await axios.get(`${API_URL}/time-entries`);
        const data = safeApiResponse(res);
        console.log('✅ Time entries loaded:', Array.isArray(data) ? data.length : 'not array');

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.timeEntries)) return data.timeEntries;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("⚠️ Unexpected time entries response structure:", data);
        return [];
    } catch (error) {
        console.error("❌ Error fetching time entries:", error);
        return [];
    }
}

export async function getProjectGroups(companyId: number) {
    try {
        console.log('🏢 Fetching project groups for company:', companyId);
        const res = await axios.get(`${API_URL}/projectgroups/${companyId}`);
        const data = safeApiResponse(res);
        console.log('✅ Project groups loaded:', Array.isArray(data) ? data.length : 'not array');
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("❌ Error fetching project groups:", error);
        return [];
    }
}

export async function getProjects(projectGroupId: number) {
    try {
        console.log('📋 Fetching projects for group:', projectGroupId);
        const res = await axios.get(`${API_URL}/projects?groupId=${projectGroupId}`);
        const data = safeApiResponse(res);
        console.log('✅ Projects loaded:', Array.isArray(data) ? data.length : 'not array');
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("❌ Error fetching projects:", error);
        return [];
    }
}

export async function registerTimeEntry(data: Omit<TimeEntry, 'id' | 'localStatus'>) {
    try {
        console.log('💾 Registering time entry...');
        const response = await axios.post(`${API_URL}/time-entries`, data);
        console.log('✅ Time entry registered');
        return response;
    } catch (error) {
        console.error("❌ Error registering time entry:", error);
        throw error;
    }
}

export async function updateTimeEntry(id: number, data: Partial<TimeEntry>) {
    try {
        console.log('✏️ Updating time entry:', id);
        const response = await axios.put(`${API_URL}/time-entries/${id}`, data);
        console.log('✅ Time entry updated');
        return response;
    } catch (error) {
        console.error("❌ Error updating time entry:", error);
        throw error;
    }
}

export async function deleteTimeEntry(id: number) {
    try {
        console.log('🗑️ Deleting time entry:', id);
        const response = await axios.delete(`${API_URL}/time-entries/${id}`);
        console.log('✅ Time entry deleted');
        return response;
    } catch (error) {
        console.error("❌ Error deleting time entry:", error);
        throw error;
    }
}

export async function submitTimeEntry(id: number) {
    try {
        console.log('📤 Submitting time entry:', id);
        const response = await axios.post(`${API_URL}/time-entries/${id}/submit`);
        console.log('✅ Time entry submitted');
        return response;
    } catch (error) {
        console.error("❌ Error submitting time entry:", error);
        throw error;
    }
}

export async function login(userInput: string, password: string) {
    try {
        console.log("🔐 Login attempt starting...");
        const response = await axios.post(`${API_URL}/users/login`, {
            userInput,
            password,
        });

        const user = safeApiResponse(response);
        console.log("✅ Login successful, response:", user);

        if (!user || !user.id) {
            throw new Error("Invalid server response");
        }

        // Clear existing user data first
        localStorage.clear();

        // Save new data
        localStorage.setItem("userId", String(user.id));
        localStorage.setItem("firstName", user.firstName || "");
        localStorage.setItem("lastName", user.lastName || "");
        localStorage.setItem("userRank", user.rank || "user");

        console.log("✅ Login data saved, ready to redirect");

        return user;
    } catch (error) {
        console.error("❌ Login error:", error);
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
        console.log('👤 Registering new user...');
        const response = await axios.post(`${API_URL}/users/register`, data);
        console.log('✅ User registered');
        return safeApiResponse(response);
    } catch (error) {
        console.error("❌ Error registering user:", error);
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
        console.log('🏖️ Registering vacation request...');
        const response = await axios.post(`${API_URL}/vacation-requests`, data);
        console.log('✅ Vacation request registered');
        return safeApiResponse(response);
    } catch (error) {
        console.error("❌ Error registering vacation request:", error);
        throw error;
    }
}

export async function getVacationRequests() {
    try {
        console.log('🏖️ Fetching vacation requests...');
        const res = await axios.get(`${API_URL}/vacation-requests`);
        const data = safeApiResponse(res);
        console.log('✅ Vacation requests loaded:', Array.isArray(data) ? data.length : 'not array');

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.vacations)) return data.vacations;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("⚠️ Unexpected vacation requests response structure:", data);
        return [];
    } catch (error) {
        console.error("❌ Error fetching vacation requests:", error);
        return [];
    }
}

export async function getAdminStats() {
    try {
        console.log('📊 Fetching admin stats...');
        const res = await axios.get(`${API_URL}/admin/stats`);
        const data = safeApiResponse(res);
        console.log('✅ Admin stats loaded');
        return data;
    } catch (error) {
        console.error("❌ Error fetching admin stats:", error);
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
        console.log('⏰ Fetching admin time entries...');
        const res = await axios.get(`${API_URL}/admin/time-entries`);
        const data = safeApiResponse(res);
        console.log('✅ Admin time entries loaded:', Array.isArray(data) ? data.length : 'not array');

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.timeEntries)) return data.timeEntries;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("⚠️ Unexpected admin time entries response structure:", data);
        return [];
    } catch (error) {
        console.error("❌ Error fetching admin time entries:", error);
        return [];
    }
}

export async function getAdminVacationRequests() {
    try {
        console.log('🏖️ Fetching admin vacation requests...');
        const res = await axios.get(`${API_URL}/admin/vacation-requests`);
        const data = safeApiResponse(res);
        console.log('✅ Admin vacation requests loaded:', Array.isArray(data) ? data.length : 'not array');

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.vacations)) return data.vacations;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("⚠️ Unexpected admin vacation requests response structure:", data);
        return [];
    } catch (error) {
        console.error("❌ Error fetching admin vacation requests:", error);
        return [];
    }
}

export async function processVacationRequest(id: number, status: "approved" | "rejected") {
    try {
        console.log('✏️ Processing vacation request:', id, status);
        const res = await axios.put(`${API_URL}/admin/vacation-requests/${id}`, { status });
        console.log('✅ Vacation request processed');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error processing vacation request:", error);
        throw error;
    }
}

export async function createProject(projectData: { name: string, projectGroupId: number }) {
    try {
        console.log('🆕 Creating project...');
        const res = await axios.post(`${API_URL}/admin/projects`, projectData);
        console.log('✅ Project created');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error creating project:", error);
        throw error;
    }
}

export async function getUser(id: number) {
    try {
        console.log('👤 Fetching user:', id);
        const res = await axios.get(`${API_URL}/users/${id}`);
        console.log('✅ User loaded');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error fetching user:", error);
        throw error;
    }
}

export async function updateUser(id: number, userData: Partial<User>) {
    try {
        console.log('✏️ Updating user:', id);
        const res = await axios.put(`${API_URL}/users/${id}`, userData);
        console.log('✅ User updated');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error updating user:", error);
        throw error;
    }
}

export async function deleteUser(id: number) {
    try {
        console.log('🗑️ Deleting user:', id);
        const res = await axios.delete(`${API_URL}/users/${id}`);
        console.log('✅ User deleted');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error deleting user:", error);
        throw error;
    }
}

export async function getTimeEntryDetails(id: number) {
    try {
        console.log('🔍 Fetching time entry details:', id);
        const res = await axios.get(`${API_URL}/time-entries/${id}/details`);
        console.log('✅ Time entry details loaded');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error fetching time entry details:", error);
        throw error;
    }
}

export async function approveTimeEntry(id: number) {
    try {
        console.log('✅ Approving time entry:', id);
        const res = await axios.put(`${API_URL}/time-entries/${id}/approve`);
        console.log('✅ Time entry approved');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error approving time entry:", error);
        throw error;
    }
}

export async function rejectTimeEntry(id: number) {
    try {
        console.log('❌ Rejecting time entry:', id);
        const res = await axios.put(`${API_URL}/time-entries/${id}/reject`);
        console.log('✅ Time entry rejected');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error rejecting time entry:", error);
        throw error;
    }
}

export async function markAllActivitiesAsRead() {
    try {
        const userId = Number(localStorage.getItem("userId"));
        if (!userId) throw new Error("No user ID found");

        console.log('📖 Marking all activities as read for user:', userId);
        const response = await axios.put(`${API_URL}/activities/read-all?userId=${userId}`);
        console.log('✅ All activities marked as read');
        return safeApiResponse(response);
    } catch (error) {
        console.error("❌ Error marking all activities as read:", error);
        throw error;
    }
}

export async function getActivities(limit: number = 10, userId?: number) {
    try {
        let url = `${API_URL}/activities?limit=${limit}`;
        if (userId) {
            url += `&userId=${userId}`;
        }

        console.log('📋 Fetching activities...');
        const response = await axios.get(url);
        const data = safeApiResponse(response);
        console.log('✅ Activities loaded:', Array.isArray(data) ? data.length : 'not array');

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.activities)) return data.activities;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("⚠️ Unexpected activities response structure:", data);
        return [];
    } catch (error) {
        console.error("❌ Error fetching activities:", error);
        return [];
    }
}

export async function markActivityAsRead(activityId: number) {
    try {
        console.log('📖 Marking activity as read:', activityId);
        const response = await axios.put(`${API_URL}/activities/${activityId}/read`);
        console.log('✅ Activity marked as read');
        return safeApiResponse(response);
    } catch (error) {
        console.error("❌ Error marking activity as read:", error);
        throw error;
    }
}

export async function getUserProjects(userId: number) {
    try {
        console.log('🔗 Fetching user projects for user:', userId);
        const res = await axios.get(`${API_URL}/user-projects/users/${userId}`);
        const data = safeApiResponse(res);
        console.log('✅ User projects loaded:', Array.isArray(data) ? data.length : 'not array');

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.userProjects)) return data.userProjects;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("⚠️ Unexpected user projects response structure:", data);
        return [];
    } catch (error) {
        console.error("❌ Error fetching user projects:", error);
        return [];
    }
}
//test change
export async function getProjectUsers(projectId: number) {
    try {
        console.log('👥 Fetching project users for project:', projectId);
        const res = await axios.get(`${API_URL}/user-projects/projects/${projectId}`);
        const data = safeApiResponse(res);
        console.log('✅ Project users loaded:', Array.isArray(data) ? data.length : 'not array');

        // Handle different possible response structures
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.projectUsers)) return data.projectUsers;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("⚠️ Unexpected project users response structure:", data);
        return [];
    } catch (error) {
        console.error("❌ Error fetching project users:", error);
        return [];
    }
}

export async function assignUserToProject(userId: number, projectId: number, assignedByUserId: number) {
    try {
        console.log('🔗 Assigning user to project:', userId, projectId);
        const res = await axios.post(`${API_URL}/user-projects`, {
            userId,
            projectId,
            assignedByUserId
        });
        console.log('✅ User assigned to project');
        return safeApiResponse(res);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(error.response.data || "Error assigning user to project");
        }
        throw new Error("Error assigning user to project");
    }
}

export async function removeUserFromProject(userId: number, projectId: number) {
    try {
        console.log('🗑️ Removing user from project:', userId, projectId);
        const res = await axios.delete(`${API_URL}/user-projects/users/${userId}/projects/${projectId}`);
        console.log('✅ User removed from project');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error removing user from project:", error);
        throw error;
    }
}