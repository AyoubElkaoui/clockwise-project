// lib/api.ts
import axios from "axios";
import { TimeEntry, User, Project, ProjectGroup, Company, VacationRequest, UserProject } from "./types";

// Exporteer de API_URL constante zodat deze beschikbaar is voor andere bestanden
export const API_URL = "http://localhost:5203/api";

export async function getCompanies() {
    const res = await axios.get(`${API_URL}/companies`);
    return res.data;
}

export async function getProjectGroups(companyId: number) {
    const res = await axios.get(`${API_URL}/projectgroups/${companyId}`);
    return res.data;
}

export async function getProjects(projectGroupId: number) {
    const res = await axios.get(`${API_URL}/projects?groupId=${projectGroupId}`);
    return res.data;
}

export async function getTimeEntries() {
    const res = await axios.get(`${API_URL}/time-entries`);
    return res.data;
}

export async function registerTimeEntry(data: Omit<TimeEntry, 'id' | 'localStatus'>) {
    return await axios.post(`${API_URL}/time-entries`, data);
}

export async function updateTimeEntry(id: number, data: Partial<TimeEntry>) {
    return await axios.put(`${API_URL}/time-entries/${id}`, data);
}

export async function deleteTimeEntry(id: number) {
    return await axios.delete(`${API_URL}/time-entries/${id}`);
}

export async function submitTimeEntry(id: number) {
    return await axios.post(`${API_URL}/time-entries/${id}/submit`);
}

// In je login functie, na het ontvangen van de gebruiker
export async function login(userInput: string, password: string) {
    try {
        const user = await axios.post(`${API_URL}/users/login`, {
            userInput,
            password,
        });

        // Wis eerst alle bestaande gebruikersgegevens
        localStorage.clear();

        // Sla nieuwe gegevens op
        localStorage.setItem("userId", user.data.id);
        localStorage.setItem("firstName", user.data.firstName);
        localStorage.setItem("lastName", user.data.lastName);
        localStorage.setItem("userRank", user.data.rank);

        // Zet cookies voor de server
        document.cookie = `userId=${user.data.id}; path=/; max-age=3600;`;
        document.cookie = `userRank=${user.data.rank}; path=/; max-age=3600;`;

        return user.data;
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
    const response = await axios.post(`${API_URL}/users/register`, data);
    return response.data;
}

// Voeg de functie registerVacationRequest toe
export async function registerVacationRequest(data: {
    userId: number;
    startDate: string;
    endDate: string;
    hours: number;
    reason: string;
    status: string;
}) {
    const response = await axios.post(`${API_URL}/vacation-requests`, data);
    return response.data;
}

export async function getVacationRequests() {
    const res = await axios.get(`${API_URL}/vacation-requests`);
    return res.data;
}

// Voeg deze functies toe aan je lib/api.ts

export async function getAdminStats() {
    const res = await axios.get(`${API_URL}/admin/stats`);
    return res.data;
}

export async function getAdminTimeEntries() {
    const res = await axios.get(`${API_URL}/admin/time-entries`);
    return res.data;
}

export async function getAdminVacationRequests() {
    const res = await axios.get(`${API_URL}/admin/vacation-requests`);
    return res.data;
}

export async function processVacationRequest(id: number, status: "approved" | "rejected") {
    const res = await axios.put(`${API_URL}/admin/vacation-requests/${id}`, { status });
    return res.data;
}

export async function createProject(projectData: { name: string, projectGroupId: number }) {
    const res = await axios.post(`${API_URL}/admin/projects`, projectData);
    return res.data;
}

export async function getUsers() {
    const res = await axios.get(`${API_URL}/users`);
    return res.data;
}

export async function getUser(id: number) {
    const res = await axios.get(`${API_URL}/users/${id}`);
    return res.data;
}

export async function updateUser(id: number, userData: Partial<User>) {
    const res = await axios.put(`${API_URL}/users/${id}`, userData);
    return res.data;
}

export async function deleteUser(id: number) {
    const res = await axios.delete(`${API_URL}/users/${id}`);
    return res.data;
}

export async function getTimeEntryDetails(id: number) {
    const res = await axios.get(`${API_URL}/time-entries/${id}/details`);
    return res.data;
}

export async function approveTimeEntry(id: number) {
    const res = await axios.put(`${API_URL}/time-entries/${id}/approve`);
    return res.data;
}

export async function rejectTimeEntry(id: number) {
    const res = await axios.put(`${API_URL}/time-entries/${id}/reject`);
    return res.data;
}

// Markeer alle activiteiten als gelezen
// in lib/api.ts
export async function markAllActivitiesAsRead() {
    try {
        const userId = Number(localStorage.getItem("userId"));
        if (!userId) throw new Error("No user ID found");

        const response = await axios.put(`${API_URL}/activities/read-all?userId=${userId}`);
        return response.data;
    } catch (error) {
        console.error("Error marking all activities as read:", error);
        throw error;
    }
}
// Voeg deze functies toe aan lib/api.ts

// Haal alle activiteiten op
// Voeg deze functies toe aan lib/api.ts

// Haal alle activiteiten op
export async function getActivities(limit: number = 10, userId?: number) {
    let url = `${API_URL}/activities?limit=${limit}`;
    if (userId) {
        url += `&userId=${userId}`;
    }

    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("Error fetching activities:", error);
        throw error;
    }
}

// Markeer een activiteit als gelezen
export async function markActivityAsRead(activityId: number) {
    try {
        const response = await axios.put(`${API_URL}/activities/${activityId}/read`);
        return response.data;
    } catch (error) {
        console.error("Error marking activity as read:", error);
        throw error;
    }
}

/// Toevoegen aan frontend/lib/api.ts
export async function getUserProjects(userId: number) {
    const res = await axios.get(`${API_URL}/user-projects/users/${userId}`);
    return res.data;
}

export async function getProjectUsers(projectId: number) {
    const res = await axios.get(`${API_URL}/user-projects/projects/${projectId}`);
    return res.data;
}

// In lib/api.ts
export async function assignUserToProject(userId: number, projectId: number, assignedByUserId: number) {
    try {
        const res = await axios.post(`${API_URL}/user-projects`, {
            userId,
            projectId,
            assignedByUserId
        });
        return res.data;
    } catch (error) {
        // Vang de foutmelding op en gooi deze opnieuw om afgehandeld te worden door de component
        if (axios.isAxiosError(error) && error.response) {
            // Als de server een foutmelding teruggeeft, gebruik deze
            throw new Error(error.response.data || "Fout bij toewijzen gebruiker aan project");
        }
        throw new Error("Fout bij toewijzen gebruiker aan project");
    }
}

export async function removeUserFromProject(userId: number, projectId: number) {
    const res = await axios.delete(`${API_URL}/user-projects/users/${userId}/projects/${projectId}`);
    return res.data;
}