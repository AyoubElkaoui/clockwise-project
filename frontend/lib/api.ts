// Updated api.ts to match the new controller structure with manager hierarchy and processing tracking

import axios from "axios";
import {
    TimeEntry,
    User,

    ProcessVacationRequestDto,
    AdminStats,
    getNextApprover, getApprovalStage
} from "./types";
// Define the interface for user update data
interface UserUpdateData {
    firstName?: string;
    lastName?: string;
    email?: string;
    address?: string;
    houseNumber?: string;
    postalCode?: string;
    city?: string;
    loginName?: string;
    password?: string;
    function?: string;
    rank?: string;
    managerId?: number;
    managerIds?: number[];
}
// API URL - gebruik de ngrok URL direct voor nu
export const API_URL = "http://localhost:5203/api";

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
// Helper function for safe API calls
function safeApiCall<T>(fn: () => Promise<any>): Promise<T | null> {
    return fn()
        .then(safeApiResponse)
        .catch(err => {
            console.error("❌ safeApiCall error:", err);
            return null;
        });
}
// === COMPANY FUNCTIONS ===
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

// === USER FUNCTIONS - UPDATED ===
export async function getUsers(managerId?: number) {
    try {
        console.log('👥 Fetching users...', managerId ? `for manager ${managerId}` : '');

        let url = `${API_URL}/users`;
        if (managerId) {
            url += `?managerId=${managerId}`;
        }

        const res = await axios.get(url);
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

export async function getUser(id: number, requesterId?: number) {
    try {
        console.log('👤 Fetching user:', id, requesterId ? `by requester ${requesterId}` : '');

        let url = `${API_URL}/users/${id}`;
        if (requesterId) {
            url += `?requesterId=${requesterId}`;
        }

        const res = await axios.get(url);
        console.log('✅ User loaded');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error fetching user:", error);
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            throw new Error('Geen toegang tot deze gebruiker');
        }
        throw error;
    }
}
interface RegisterUserData {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    loginName: string;
    password: string;
    function?: string;
    rank?: 'user' | 'manager' | 'admin';
    managerId?: number | null;
}

export const registerUser = async (userData: RegisterUserData): Promise<User> => {
    try {
        console.log('👤 Registering new user...');
        console.log('📤 Registration data:', { ...userData, password: '***' });

        const response = await axios.post(`${API_URL}/users/register`, {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            address: userData.address,
            houseNumber: userData.houseNumber,
            postalCode: userData.postalCode,
            city: userData.city,
            loginName: userData.loginName,
            password: userData.password,
            function: userData.function || null,
            rank: userData.rank || 'user',
            managerId: userData.managerId || null
        });

        console.log('✅ User registered successfully');
        return safeApiResponse(response);
    } catch (error) {
        console.error('❌ Error registering user:', error);

        // Handle axios error responses
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 400) {
                throw new Error(error.response.data || 'Gebruiker met deze email of loginnaam bestaat al');
            }
            if (error.response?.data) {
                throw new Error(error.response.data);
            }
        }

        throw new Error('Er is een fout opgetreden bij het aanmaken van de gebruiker');
    }
};
// Updated updateUser function in api.ts
// Updated updateUser function in api.ts


export async function updateUser(id: number, userData: UserUpdateData, requesterId?: number) {
    try {
        console.log('✏️ Updating user:', id, requesterId ? `by requester ${requesterId}` : '');
        console.log('📋 Original update data:', userData);

        let url = `${API_URL}/users/${id}`;
        if (requesterId) {
            url += `?requesterId=${requesterId}`;
        }

        // FIXED: Ensure we send the data in the format the backend expects
        const backendData: any = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            address: userData.address,
            houseNumber: userData.houseNumber,
            postalCode: userData.postalCode,
            city: userData.city,
            loginName: userData.loginName,
            password: userData.password,
            function: userData.function,
            rank: userData.rank,
            managerId: userData.managerId
        };

        // Handle multiple managers - send as ManagerIds (PascalCase) for C# backend
        if (userData.managerIds && Array.isArray(userData.managerIds)) {
            backendData.ManagerIds = userData.managerIds;
            console.log('📋 Sending ManagerIds (PascalCase):', backendData.ManagerIds);
        }

        // Clean up undefined values
        Object.keys(backendData).forEach(key => {
            if (backendData[key] === undefined) {
                delete backendData[key];
            }
        });

        console.log('📤 Final request data:', backendData);

        const res = await axios.put(url, backendData);
        console.log('✅ User updated successfully');
        console.log('📥 Response:', res.data);

        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error updating user:", error);

        // Log more details about the error
        if (axios.isAxiosError(error)) {
            console.error("Response status:", error.response?.status);
            console.error("Response data:", error.response?.data);
            console.error("Request data sent:", error.config?.data);
        }

        if (axios.isAxiosError(error) && error.response?.status === 403) {
            throw new Error('Geen toegang om deze gebruiker te bewerken');
        }

        // Return more specific error message
        const errorMessage = axios.isAxiosError(error) && error.response?.data
            ? error.response.data
            : 'Er is een fout opgetreden bij het bijwerken van de gebruiker';

        throw new Error(errorMessage);
    }
}
export async function deleteUser(id: number, requesterId?: number) {
    try {
        console.log('🗑️ Deleting user:', id, requesterId ? `by requester ${requesterId}` : '');

        let url = `${API_URL}/users/${id}`;
        if (requesterId) {
            url += `?requesterId=${requesterId}`;
        }

        const res = await axios.delete(url);
        console.log('✅ User deleted');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error deleting user:", error);
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            throw new Error('Geen toegang om deze gebruiker te verwijderen');
        }
        throw error;
    }
}
export function setupAxiosInterceptor(): void {
    // Request interceptor - add token to all requests
    axios.interceptors.request.use(
        (config) => {
            const token = getAuthToken();
            const tokenType = localStorage.getItem("tokenType") || "Bearer";

            if (token && isTokenValid()) {
                config.headers.Authorization = `${tokenType} ${token}`;
            }

            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor - handle token expiration
    axios.interceptors.response.use(
        (response) => {
            return response;
        },
        (error) => {
            if (error.response && error.response.status === 401) {
                console.warn("🔒 Unauthorized response, token may be expired");

                // Check if we have a token that's expired
                const token = getAuthToken();
                if (token && !isTokenValid()) {
                    console.log("🕐 Token expired, logging out");
                    logout();
                }
            }

            return Promise.reject(error);
        }
    );
}
let isLoggingIn = false; // Flag to prevent logout during login process

export async function login(userInput: string, password: string) {
    try {
        isLoggingIn = true; // Set flag to prevent premature logout
        console.log("🔐 Login attempt starting...");

        const response = await axios.post(`${API_URL}/users/login`, {
            userInput,
            password,
        });

        const data = safeApiResponse(response);
        console.log("✅ Login successful, response:", data);

        if (!data || !data.token || !data.user) {
            throw new Error("Invalid server response - missing token or user data");
        }

        // Clear existing data first
        localStorage.clear();

        // Save JWT token
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("tokenType", data.tokenType || "Bearer");

        // Calculate and save expiration time
        const expiresAt = new Date(Date.now() + (data.expiresIn * 1000));
        localStorage.setItem("tokenExpiresAt", expiresAt.toISOString());

        // Save user data in BOTH formats for backward compatibility
        const user = data.user;

        // Save individual items for backward compatibility - IMPORTANT: Convert to string
        localStorage.setItem("userId", String(user.id));
        localStorage.setItem("firstName", String(user.firstName || ""));
        localStorage.setItem("lastName", String(user.lastName || ""));
        localStorage.setItem("userRank", String(user.rank || "user"));

        if (user.managerId) {
            localStorage.setItem("managerId", String(user.managerId));
        }

        // Save complete user object
        const userObject = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            rank: user.rank || "user",
            managerId: user.managerId,
            isAdmin: user.isAdmin,
            isManager: user.isManager,
            isNormalUser: user.isNormalUser,
            assignedManagerIds: user.assignedManagerIds || [],
            managers: user.managers || []
        };

        localStorage.setItem("user", JSON.stringify(userObject));

        // Force a small delay to ensure localStorage is written
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify what was actually saved
        console.log("🔍 Post-login verification:");
        console.log("  - userId in localStorage:", localStorage.getItem("userId"));
        console.log("  - getUserId() returns:", getUserId());
        console.log("  - authToken exists:", !!localStorage.getItem("authToken"));

        // Set up axios interceptor
        setupAxiosInterceptor();

        isLoggingIn = false; // Clear the flag
        console.log("✅ Login completed successfully!");

        return { token: data.token, user: user };
    } catch (error) {
        isLoggingIn = false; // Clear the flag on error
        console.error("❌ Login error:", error);
        throw error;
    }
}
export function getUserId(): number | null {
    try {
        // Don't check for user ID if we're in the middle of logging in
        if (isLoggingIn) {
            console.log("⏳ Login in progress, skipping user ID check");
            return null;
        }

        // Try to get from direct storage first (backward compatibility)
        const directUserId = localStorage.getItem("userId");

        if (directUserId) {
            const id = Number(directUserId);
            if (!isNaN(id) && id > 0) {
                console.log("✅ Valid user ID found:", id);
                return id;
            } else {
                console.warn("⚠️ Invalid user ID format:", directUserId);
            }
        }

        // Fallback to user object
        const userStr = localStorage.getItem("user");
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user && user.id) {
                    const id = Number(user.id);
                    if (!isNaN(id) && id > 0) {
                        console.log("✅ Valid user ID from object:", id);
                        return id;
                    }
                }
            } catch (parseError) {
                console.error("❌ Error parsing user object:", parseError);
            }
        }

        console.warn("⚠️ No valid user ID found in localStorage");
        return null;
    } catch (error) {
        console.error("❌ Error getting user ID:", error);
        return null;
    }
}
//Token management functions
export function getAuthToken(): string | null {
    return localStorage.getItem("authToken");
}

export function isTokenValid(): boolean {
    const token = getAuthToken();
    const expiresAt = localStorage.getItem("tokenExpiresAt");

    if (!token || !expiresAt) {
        return false;
    }

    const expiration = new Date(expiresAt);
    const now = new Date();

    // Check if token expires in the next 5 minutes (for auto-refresh)
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    return expiration > fiveMinutesFromNow;
}

export function removeAuthToken(): void {
    localStorage.removeItem("authToken");
    localStorage.removeItem("tokenType");
    localStorage.removeItem("tokenExpiresAt");
    localStorage.clear(); // Clear all user data
}

export function logout(): void {
    console.log("🚪 Logging out...");
    removeAuthToken();

    // Remove axios interceptor
    if (axios.defaults.headers.common['Authorization']) {
        delete axios.defaults.headers.common['Authorization'];
    }

    // Redirect to login page
    window.location.href = '/login';
}
//Initialize interceptor on app start
export function initializeAuth(): void {
    // Check if user is logged in and token is valid
    if (getAuthToken() && isTokenValid()) {
        setupAxiosInterceptor();
        console.log("✅ Auth initialized with valid token");
    } else if (getAuthToken()) {
        console.log("⚠️ Found expired token, cleaning up");
        logout();
    }
}
// === MANAGER-SPECIFIC USER FUNCTIONS ===
export async function getAllManagers() {
    try {
        console.log('👨‍💼 Fetching managers...');
        const res = await axios.get(`${API_URL}/users/managers`);
        const data = safeApiResponse(res);
        console.log('✅ Managers loaded:', Array.isArray(data) ? data.length : 'not array');
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("❌ Error fetching managers:", error);
        return [];
    }
}


// === TIME ENTRY FUNCTIONS ===
export async function getTimeEntries() {
    try {
        const userId = getUserId();
        if (!userId) {
            console.error("❌ No user ID found in localStorage");
            // Try to redirect to login if no user ID found
            if (window.location.pathname !== '/login') {
                logout();
            }
            return [];
        }

        console.log('⏰ Fetching time entries for user:', userId);
        const res = await axios.get(`${API_URL}/time-entries/user/${userId}`);
        const data = safeApiResponse(res);
        console.log('✅ Time entries loaded:', Array.isArray(data) ? data.length : 'not array');

        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.timeEntries)) return data.timeEntries;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("⚠️ Unexpected time entries response structure:", data);
        return [];
    } catch (error) {
        console.error("❌ Error fetching time entries:", error);

        // If we get a 401, the token might be expired
        if (error.response && error.response.status === 401) {
            console.log("🔒 Unauthorized - redirecting to login");
            logout();
        }

        return [];
    }
}

export async function registerTimeEntry(data: Omit<TimeEntry, 'id' | 'localStatus'>) {
    try {
        console.log('💾 Registering time entry...');
        const backendData = {
            ...data,
            status: convertStatusToBackend(data.status)
        };
        const response = await axios.post(`${API_URL}/time-entries`, backendData);
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
        const backendData = {
            ...data,
            id,
            status: data.status ? convertStatusToBackend(data.status) : undefined
        };
        const response = await axios.put(`${API_URL}/time-entries/${id}`, backendData);
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

// FIXED: Admin time entry approval and rejection functions in api.ts

export async function approveTimeEntry(id: number, processingNotes?: string) {
    try {
        console.log('✅ Admin approving time entry:', id, processingNotes ? 'with notes' : 'without notes');

        // Get current user (admin) info - THIS WAS MISSING!
        const currentUser = getCurrentUser();
        if (!currentUser || !currentUser.isAdmin) {
            throw new Error("Only admins can approve time entries using this function");
        }

        const requestData = {
            adminId: currentUser.id,  // Pass the admin's ID explicitly (camelCase for frontend)
            notes: processingNotes || ""
        };

        console.log('📦 Sending admin approval request with data:', requestData);

        // Use the admin-specific endpoint for consistency
        const res = await axios.put(`${API_URL}/admin/time-entries/${id}/approve`, requestData, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('✅ Time entry approved by admin');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error approving time entry as admin:", error);
        if (axios.isAxiosError(error) && error.response?.data) {
            throw new Error(error.response.data);
        }
        throw error;
    }
}

export async function rejectTimeEntry(id: number, processingNotes: string) {
    try {
        console.log('❌ Admin rejecting time entry:', id, 'with notes:', processingNotes);

        // Get current user (admin) info - THIS WAS MISSING!
        const currentUser = getCurrentUser();
        if (!currentUser || !currentUser.isAdmin) {
            throw new Error("Only admins can reject time entries using this function");
        }

        const requestData = {
            adminId: currentUser.id,  // Pass the admin's ID explicitly (camelCase for frontend)
            notes: processingNotes
        };

        console.log('📦 Sending admin rejection request with data:', requestData);

        // Use the admin-specific endpoint for consistency
        const res = await axios.put(`${API_URL}/admin/time-entries/${id}/reject`, requestData, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('✅ Time entry rejected by admin');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error rejecting time entry as admin:", error);
        console.error("❌ Response data:", error.response?.data);
        console.error("❌ Response status:", error.response?.status);
        throw error;
    }
}
// === ADMIN TIME ENTRY FUNCTIONS ===
export async function getAdminTimeEntries() {
    try {
        console.log('⏰ Fetching admin time entries...');
        const res = await axios.get(`${API_URL}/admin/time-entries`); // Use admin endpoint
        const data = safeApiResponse(res);
        console.log('✅ Admin time entries loaded:', Array.isArray(data) ? data.length : 'not array');

        // Transform the data to match frontend expectations
        if (Array.isArray(data)) {
            return data.map((entry: any) => ({
                ...entry,
                // Ensure processedByUser is properly
                processedByUser: entry.processedByUser ? {
                    id: entry.processedByUser.id,
                    firstName: entry.processedByUser.firstName,
                    lastName: entry.processedByUser.lastName,
                    fullName: entry.processedByUser.fullName || `${entry.processedByUser.firstName} ${entry.processedByUser.lastName}`,
                    rank: entry.processedByUser.rank
                } : null,
                // Ensure user is properly formatted
                user: entry.user ? {
                    ...entry.user,
                    fullName: entry.user.fullName || `${entry.user.firstName} ${entry.user.lastName}`
                } : null
            }));
        }

        if (data && typeof data === 'object') {
            // Handle nested response structures
            if ('timeEntries' in data && Array.isArray(data.timeEntries)) {
                return data.timeEntries;
            }
            if ('data' in data && Array.isArray(data.data)) {
                return data.data;
            }
        }

        console.warn("⚠️ Unexpected admin time entries response structure:", data);
        return [];
    } catch (error) {
        console.error("❌ Error fetching admin time entries:", error);
        return [];
    }
}

// === MANAGER TIME ENTRY FUNCTIONS ===
export async function getManagerTimeEntries(managerId?: string) {
    try {
        console.log('⏰ Fetching manager time entries...');

        // Use passed managerId or get from current user
        let targetManagerId = managerId;
        if (!targetManagerId) {
            const currentUser = getCurrentUser();
            if (!currentUser || !currentUser.isManager) {
                console.error("❌ User is not a manager");
                return [];
            }
            targetManagerId = currentUser.id;
        }

        const res = await axios.get(`${API_URL}/manager/time-entries?managerId=${targetManagerId}`);
        const data = safeApiResponse(res);
        console.log('✅ Manager time entries loaded:', Array.isArray(data) ? data.length : 'not array');
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("❌ Error fetching manager time entries:", error);
        return [];
    }
}

export async function getTeamTimeEntries(managerId: number) {
    try {
        console.log('⏰ Fetching team time entries for manager:', managerId);
        const res = await axios.get(`${API_URL}/manager/time-entries/team/${managerId}`);
        const data = safeApiResponse(res);
        console.log('✅ Team time entries loaded:', Array.isArray(data) ? data.length : 'not array');
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("❌ Error fetching team time entries:", error);
        return [];
    }
}

export async function approveTimeEntryAsManager(id: number, processingNotes?: string) {
    try {
        const currentUser = getCurrentUser();
        console.log('✅ Manager approving time entry:', id);
        console.log('🔎 Current user:', currentUser);

        if (!currentUser || !currentUser.isManager || !currentUser.id) {
            throw new Error("Only managers with valid ID can approve time entries");
        }

        const requestData = {
            ManagerId: currentUser.id, // must be manager's own ID
            Notes: processingNotes || ""
        };

        console.log('📦 Sending approval request with data:', requestData);

        const res = await axios.put(`${API_URL}/manager/time-entries/${id}/approve`, requestData, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('✅ Time entry approved by manager');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error approving time entry as manager:", error);
        if (axios.isAxiosError(error) && error.response?.data) {
            throw new Error(error.response.data);
        }
        throw error;
    }
}

export async function rejectTimeEntryAsManager(id: number, processingNotes: string) {
    try {
        console.log('❌ Manager rejecting time entry:', id);

        // Get current user (manager) info
        const currentUser = getCurrentUser();
        if (!currentUser || !currentUser.isManager) {
            throw new Error("Only managers can reject time entries");
        }

        const requestData = {
            managerId: currentUser.id,
            notes: processingNotes
        };

        const res = await axios.put(`${API_URL}/manager/time-entries/${id}/reject`, requestData);

        console.log('✅ Time entry rejected by manager');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error rejecting time entry as manager:", error);
        if (axios.isAxiosError(error) && error.response?.data) {
            throw new Error(error.response.data);
        }
        throw error;
    }
}

// === STATUS CONVERSION FUNCTIONS ===
function convertStatusToBackend(frontendStatus?: string): string {
    if (!frontendStatus) return 'opgeslagen';

    switch (frontendStatus) {
        case 'concept': return 'opgeslagen';
        case 'ingediend': return 'ingeleverd';
        case 'goedgekeurd': return 'goedgekeurd';
        case 'afgekeurd': return 'opgeslagen';
        default: return 'opgeslagen';
    }
}

export function convertStatusToFrontend(backendStatus: string): string {
    switch (backendStatus) {
        case 'opgeslagen': return 'concept';
        case 'ingeleverd': return 'ingediend';
        case 'goedgekeurd': return 'goedgekeurd';
        case 'afgekeurd': return 'afgekeurd';
        default: return 'concept';
    }
}

// === PROJECT FUNCTIONS ===
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
export async function getUserProjects(userId: number) {
    return safeApiCall(() => axios.get(`${API_URL}/user-projects/users/${userId}`));
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

// === VACATION REQUEST FUNCTIONS ===
export async function getVacationRequests() {
    try {
        console.log('🏖️ Fetching vacation requests...');
        const res = await axios.get(`${API_URL}/vacation-requests`);
        const data = safeApiResponse(res);
        console.log('✅ Vacation requests loaded:', Array.isArray(data) ? data.length : 'not array');

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

//vacation request creation function
export async function createVacationRequest(data: {
    userId: number;
    startDate: string;
    endDate: string;
    hours?: number;
    reason: string;
    status?: string;
}) {
    try {
        console.log('🏖️ Creating vacation request...');

        // Get current user to determine approval path
        const currentUser = getCurrentUser();
        const isManagerOrAdmin = currentUser && (currentUser.isManager || currentUser.isAdmin);

        const requestData = {
            ...data,
            status: data.status || 'pending'
        };

        console.log(`Creating vacation request for ${isManagerOrAdmin ? 'manager/admin' : 'regular user'} - approval path: ${isManagerOrAdmin ? 'direct admin' : 'two-step'}`);

        const response = await axios.post(`${API_URL}/vacation-requests`, requestData);
        const result = safeApiResponse(response);

        console.log('✅ Vacation request created:', result);

        // Show appropriate message based on approval path
        if (result.approvalPath === 'direct_admin') {
            console.log('🚀 Manager/Admin request created - sent directly to admin approval');
        }

        return result;
    } catch (error) {
        console.error("❌ Error creating vacation request:", error);
        throw error;
    }
}

// === ADMIN VACATION FUNCTIONS ===
// Admin vacation functions - only show manager-approved requests

//  admin vacation requests function with enhanced tracking
export async function getAdminVacationRequests() {
    try {
        console.log('🏖️ Fetching admin vacation requests (manager-approved, direct admin, and processed)...');
        const res = await axios.get(`${API_URL}/admin/vacation-requests`);
        const data = safeApiResponse(res);
        console.log('✅ Admin vacation requests loaded:', Array.isArray(data) ? data.length : 'not array');

        if (Array.isArray(data)) {
            const transformedData = data.map((request: any, index: number) => {
                // DEBUG: Log raw manager approval data
                console.log(`🔍 DEBUG Request ${index} (ID: ${request.id}):`, {
                    managerApprovedBy: request.managerApprovedBy || request.ManagerApprovedBy,
                    managerApprovedByUser: request.managerApprovedByUser || request.ManagerApprovedByUser,
                    managerApprovedDate: request.managerApprovedDate || request.ManagerApprovedDate,
                    isDirectAdminRequest: request.isDirectAdminRequest || request.IsDirectAdminRequest,
                    userRank: request.user?.rank || request.user?.Rank
                });

                const transformedRequest = {
                    ...request,
                    approvalStage: request.approvalStage || getApprovalStage(request.status),
                    nextApprover: request.nextApprover || getNextApprover(request.status),

                    // Enhanced approval path tracking
                    approvalPath: request.approvalPath || 'two_step',
                    isDirectAdminRequest: request.isDirectAdminRequest || request.IsDirectAdminRequest || false,

                    // FIXED: Better manager approval info handling with multiple field names
                    managerApprovedByUser: request.managerApprovedByUser ||
                        request.ManagerApprovedByUser ||
                        null,
                    managerApprovedBy: request.managerApprovedBy ||
                        request.ManagerApprovedBy ||
                        null,
                    managerApprovedDate: request.managerApprovedDate ||
                        request.ManagerApprovedDate ||
                        null,
                    managerApprovalNotes: request.managerApprovalNotes ||
                        request.ManagerApprovalNotes ||
                        null,

                    // Admin processing info
                    processedByUser: request.processedByUser || request.ProcessedByUser || null,
                    processedBy: request.processedBy || request.ProcessedBy || null,
                    processedDate: request.processedDate || request.ProcessedDate || null,
                    processingNotes: request.processingNotes || request.ProcessingNotes || null,

                    // User info
                    user: request.user ? {
                        ...request.user,
                        fullName: request.user.fullName || `${request.user.firstName} ${request.user.lastName}`,
                        rank: request.user.rank || request.user.Rank
                    } : null
                };

                // Additional check: If managerApprovedBy exists but managerApprovedByUser is null,
                // and it's a direct admin request, try to get user info from the user object
                if (transformedRequest.managerApprovedBy &&
                    !transformedRequest.managerApprovedByUser &&
                    transformedRequest.managerApprovedBy === transformedRequest.userId) {

                    console.log(`🔧 Fixing missing managerApprovedByUser for direct admin request ${transformedRequest.id}`);
                    transformedRequest.managerApprovedByUser = {
                        id: transformedRequest.user?.id,
                        firstName: transformedRequest.user?.firstName,
                        lastName: transformedRequest.user?.lastName,
                        fullName: transformedRequest.user?.fullName,
                        rank: transformedRequest.user?.rank
                    };
                    transformedRequest.isDirectAdminRequest = true;
                }

                // Log direct admin requests for debugging
                if (transformedRequest.isDirectAdminRequest) {
                    console.log(`🚀 Direct admin request confirmed: ID ${transformedRequest.id} from ${transformedRequest.user?.fullName} (${transformedRequest.user?.rank})`);
                    console.log(`   Manager approval data:`, {
                        managerApprovedBy: transformedRequest.managerApprovedBy,
                        managerApprovedByUser: transformedRequest.managerApprovedByUser,
                        managerApprovedDate: transformedRequest.managerApprovedDate
                    });
                }

                return transformedRequest;
            });

            // Count different types of requests
            const directAdminRequests = transformedData.filter(r => r.isDirectAdminRequest).length;
            const twoStepRequests = transformedData.filter(r => !r.isDirectAdminRequest).length;
            const requestsWithManagerApproval = transformedData.filter(r => r.managerApprovedByUser).length;

            console.log(`📊 Request breakdown: ${directAdminRequests} direct admin, ${twoStepRequests} two-step, ${requestsWithManagerApproval} with manager approval data`);

            return transformedData;
        }

        return [];
    } catch (error) {
        console.error("❌ Error fetching admin vacation requests:", error);
        return [];
    }
}
export async function processVacationRequestAsAdmin(
    id: number,
    status: "approved" | "rejected",
    processedByUserId?: number,
    processingNotes?: string
) {
    try {
        console.log('✏️ Admin processing vacation request (final step):', id, status);

        const currentUserId = processedByUserId || Number(localStorage.getItem("userId"));
        if (!currentUserId) {
            throw new Error("No user ID found for processing");
        }

        // This should preserve manager approval info and only update admin processing fields
        const requestData: ProcessVacationRequestDto = {
            status: status,
            processedByUserId: currentUserId,  // Admin ID for final processing
            processingNotes: processingNotes || undefined
        };

        console.log('📦 Sending admin processing request:', requestData);

        const res = await axios.put(`${API_URL}/admin/vacation-requests/${id}`, requestData, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('✅ Vacation request processed by admin (final step completed)');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error processing vacation request as admin:", error);
        if (axios.isAxiosError(error) && error.response?.data) {
            throw new Error(error.response.data);
        }
        throw error;
    }
}
// === MANAGER VACATION FUNCTIONS ===
export async function getManagerVacationRequests(managerId?: number) {
    try {
        console.log('🏖️ Fetching manager vacation requests (pending manager approval)...');

        let url = `${API_URL}/manager/vacation-requests`;
        if (managerId) {
            url += `?managerId=${managerId}`;
        }

        const res = await axios.get(url);
        const data = safeApiResponse(res);
        console.log('✅ Manager vacation requests loaded:', Array.isArray(data) ? data.length : 'not array');

        // Transform data to ensure proper typing and tracking info
        if (Array.isArray(data)) {
            return data.map((request: any) => ({
                ...request,
                approvalStage: request.approvalStage || getApprovalStage(request.status),
                nextApprover: request.nextApprover || getNextApprover(request.status),

                // Ensure user info includes manager relationship
                user: request.user ? {
                    ...request.user,
                    fullName: request.user.fullName || `${request.user.firstName} ${request.user.lastName}`,
                    managerId: request.user.managerId,
                    manager: request.user.manager ? {
                        ...request.user.manager,
                        fullName: request.user.manager.fullName || `${request.user.manager.firstName} ${request.user.manager.lastName}`
                    } : null
                } : null
            }));
        }

        return [];
    } catch (error) {
        console.error("❌ Error fetching manager vacation requests:", error);
        return [];
    }
}
export async function approveVacationRequestAsManager(
    id: number,
    managerId: number,
    notes?: string
) {
    try {
        console.log('✅ Manager approving vacation request:', id, 'by manager:', managerId);

        const requestData = {
            managerId: managerId,         // Manager ID for tracking
            notes: notes || "",           // Manager approval notes
            // Try both naming conventions
            ManagerId: managerId,         // PascalCase for C# backend
            Notes: notes || ""            // PascalCase for C# backend
        };

        console.log('📦 Sending manager approval request with data:', requestData);

        // Use the manager-specific approval endpoint
        const res = await axios.put(`${API_URL}/manager/vacation-requests/${id}/approve`, requestData, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('✅ Vacation request approved by manager');
        console.log('📥 Manager approval response:', res.data);

        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error approving vacation request as manager:", error);
        if (axios.isAxiosError(error)) {
            console.error("❌ Response status:", error.response?.status);
            console.error("❌ Response data:", error.response?.data);
        }
        throw error;
    }
}

export async function rejectVacationRequestAsManager(
    id: number,
    managerId: number,
    notes: string
) {
    try {
        console.log('❌ Manager rejecting vacation request:', id, 'by manager:', managerId);

        if (!notes || notes.trim() === '') {
            throw new Error('Reden voor afwijzing is verplicht');
        }

        const requestData = {
            managerId: managerId,        // Manager ID for tracking
            notes: notes                // Manager rejection notes
        };

        console.log('📦 Sending manager rejection request with data:', requestData);

        // Use the manager-specific rejection endpoint
        const res = await axios.put(`${API_URL}/manager/vacation-requests/${id}/reject`, requestData, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('✅ Vacation request rejected by manager');
        return safeApiResponse(res);
    } catch (error) {
        console.error("❌ Error rejecting vacation request as manager:", error);
        if (axios.isAxiosError(error) && error.response?.data) {
            throw new Error(error.response.data);
        }
        throw error;
    }
}
// === VACATION BALANCE FUNCTIONS ===
export async function getVacationBalance(userId?: number) {
    try {
        console.log('💰 Fetching vacation balance...');
        const endpoint = userId
            ? `${API_URL}/vacation-balance/${userId}`
            : `${API_URL}/vacation-balance`;

        const res = await axios.get(endpoint);
        const data = safeApiResponse(res);
        console.log('✅ Vacation balance loaded');
        return data;
    } catch (error) {
        console.error("❌ Error fetching vacation balance:", error);
        return {
            totalHours: 200,
            usedHours: 0,
            pendingHours: 0,
            remainingHours: 200,
            year: new Date().getFullYear(),
            totalDays: 25,
            usedDays: 0,
            pendingDays: 0,
            remainingDays: 25
        };
    }
}

export async function getVacationBalanceForUser(userId: number) {
    try {
        console.log('💰 Fetching vacation balance for user:', userId);
        const res = await axios.get(`${API_URL}/vacation-requests/balance/${userId}`);
        const data = safeApiResponse(res);
        console.log('✅ User vacation balance loaded');
        return data;
    } catch (error) {
        console.error("❌ Error fetching user vacation balance:", error);
        return {
            totalHours: 200,
            usedHours: 0,
            pendingHours: 0,
            remainingHours: 200,
            year: new Date().getFullYear()
        };
    }
}


// === STATISTICS FUNCTIONS ===
export async function getAdminStats(): Promise<AdminStats> {
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
// === ACTIVITY FUNCTIONS ===
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

// === UTILITY FUNCTIONS ===
export function getCurrentUser(): any {
    try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            return JSON.parse(userStr);
        }

        // Fallback to individual items for backward compatibility
        const userId = getUserId();
        if (userId) {
            return {
                id: userId,
                firstName: localStorage.getItem("firstName") || "",
                lastName: localStorage.getItem("lastName") || "",
                rank: localStorage.getItem("userRank") || "user",
                managerId: localStorage.getItem("managerId") ? Number(localStorage.getItem("managerId")) : null
            };
        }

        return null;
    } catch (error) {
        console.error("Error parsing user data:", error);
        return null;
    }
}
// Helper function to check if user is logged in
export function isLoggedIn(): boolean {
    const userId = getUserId();
    const token = getAuthToken();
    return userId !== null && token !== null && isTokenValid();
}
export function calculateWorkingDays(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) return 0;

    let workingDays = 0;
    const currentDate = new Date(start);

    while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            workingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
}

export function formatHoursToDays(hours: number): string {
    const days = hours / 8;
    if (days === Math.floor(days)) {
        return `${days} dag${days !== 1 ? 'en' : ''}`;
    }
    return `${hours}u (${days.toFixed(1)} dagen)`;
}

export function getVacationStatusInfo(status: string) {
    const statusMap = {
        pending: {
            text: 'In behandeling',
            color: 'warning',
            icon: '⏳'
        },
        approved: {
            text: 'Goedgekeurd',
            color: 'success',
            icon: '✅'
        },
        rejected: {
            text: 'Afgewezen',
            color: 'error',
            icon: '❌'
        }
    };

    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
}
