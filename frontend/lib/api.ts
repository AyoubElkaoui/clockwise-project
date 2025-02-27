// lib/api.ts
import axios from "axios";

const API_URL = "http://localhost:5203/api";

export async function login(email: string) {
    return await axios.post(`${API_URL}/users/login`, { email });
}

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
