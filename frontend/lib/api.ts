// lib/api.ts
import axios from "axios";
import { TimeEntry, User} from "./types";

// API URL - gebruik de ngrok URL direct voor nu
// Backend gebruikt /api prefix voor alle routes
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
export const API_URL = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

// Configureer axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

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
        let rawEntries = [];
        if (Array.isArray(data)) rawEntries = data;
        else if (data && Array.isArray(data.timeEntries)) rawEntries = data.timeEntries;
        else if (data && Array.isArray(data.data)) rawEntries = data.data;
        else {
            console.warn("⚠️ Unexpected time entries response structure:", data);
            return [];
        }

        // Transform API data to frontend format
        console.log('🔄 Transforming', rawEntries.length, 'entries...');
        const transformed = rawEntries.map((entry: any) => {
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

            return {
                ...entry, // Keep all original fields
                date: date,
                hours: parseFloat(hours.toFixed(2)),
                projectName: entry.project?.name || '',
                projectGroupId: entry.project?.projectGroupId || 0,
                projectGroupName: entry.project?.projectGroup?.name || '',
                companyId: entry.project?.projectGroup?.companyId || 0,
                companyName: entry.project?.projectGroup?.company?.name || '',
                km: entry.distanceKm || 0,
                expenses: entry.expenses || 0,
                breakMinutes: entry.breakMinutes || 0,
                notes: entry.notes || '',
                status: entry.status || 'opgeslagen',
            };
        });

        console.log('✅ Transformed first entry:', transformed[0]);
        console.log('✅ First entry has hours?', transformed[0]?.hours);
        console.log('✅ First entry has date?', transformed[0]?.date);
        
        return transformed;
    } catch (error) {
        console.error("❌ Error fetching time entries:", error);
        return [];
    }
}

export async function getProjectGroups(companyId: number) {
    try {
        console.log('🏢 Fetching project groups for company:', companyId);
        const res = await axios.get(`${API_URL}/project-groups/company/${companyId}`);
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
        const res = await axios.get(`${API_URL}/projects/group/${projectGroupId}`);
        const data = safeApiResponse(res);
        console.log('✅ Projects loaded:', Array.isArray(data) ? data.length : 'not array');
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("❌ Error fetching projects:", error);
        return [];
    }
}

export async function getAllProjects() {
    try {
        console.log('📋 Fetching all projects...');
        const res = await axios.get(`${API_URL}/projects`);
        const data = safeApiResponse(res);
        console.log('✅ All projects loaded:', Array.isArray(data) ? data.length : 'not array');
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("❌ Error fetching all projects:", error);
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
    const response = await axios.put(`${API_URL}/activities/${activityId}/read`);
    return safeApiResponse(response);
  } catch (error) {
    console.error("❌ Error marking activity as read:", error);
    return null;
  }
}


export async function getUserProjects(userId: number) {
  return safeApiCall(() => axios.get(`${API_URL}/user-projects/users/${userId}`));
}

//test change

export async function getProjectUsers(projectId: number) {
  return safeApiCall(() => axios.get(`${API_URL}/user-projects/projects/${projectId}`));
}

export async function assignUserToProject(userId: number, projectId: number, assignedByUserId: number) {
  try {
    return safeApiCall(() =>
        axios.post(`${API_URL}/user-projects`, { userId, projectId, assignedByUserId })
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data || "Fout bij toewijzen gebruiker aan project");
    }
    throw new Error("Fout bij toewijzen gebruiker aan project");
  }
}

export async function removeUserFromProject(userId: number, projectId: number) {
  return safeApiCall(() =>
      axios.delete(`${API_URL}/user-projects/users/${userId}/projects/${projectId}`)
  );
}
function safeApiCall<T>(fn: () => Promise<any>): Promise<T | null> {
  return fn()
      .then(safeApiResponse)
      .catch(err => {
        console.error("❌ safeApiCall error:", err);
        return null;
      });
}

