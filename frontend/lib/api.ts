// lib/api.ts
import axios from "axios";

const API_URL = "http://localhost:5203/api";

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

export async function registerTimeEntry(data: any) {
    return await axios.post(`${API_URL}/time-entries`, data);
}

export async function updateTimeEntry(id: number, data: any) {
    return await axios.put(`${API_URL}/time-entries/${id}`, data);
}

export async function deleteTimeEntry(id: number) {
    return await axios.delete(`${API_URL}/time-entries/${id}`);
}

export async function submitTimeEntry(id: number) {
    return await axios.post(`${API_URL}/time-entries/${id}/submit`);
}

export async function login(userInput: string, password: string) {
    const response = await axios.post(`${API_URL}/users/login`, {
        userInput,
        password,
    });
    return response.data;
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

export async function updateUser(id: number, userData: any) {
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

