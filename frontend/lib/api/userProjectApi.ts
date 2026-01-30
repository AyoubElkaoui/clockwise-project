// lib/api/userProjectApi.ts
import axios from "axios";
import { API_URL } from "../api";

export interface UserProject {
  id: number;
  userId: number;
  projectId: number;
  assignedByUserId: number;
  assignedAt: string;
  userName?: string;
}

export interface PostgresUser {
  id: number;
  medewGcId: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export async function getUserProjects(userId: number): Promise<UserProject[]> {
  try {
    const res = await axios.get(`${API_URL}/user-projects/users/${userId}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

export async function getProjectUsers(projectId: number): Promise<UserProject[]> {
  try {
    const res = await axios.get(`${API_URL}/user-projects/projects/${projectId}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

export async function getPostgresUsers(): Promise<PostgresUser[]> {
  try {
    const res = await axios.get(`${API_URL}/user-projects/pg-users`);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

export async function assignUserToProject(
  userId: number,
  projectId: number,
  assignedByUserId: number
): Promise<UserProject> {
  try {
    const res = await axios.post(`${API_URL}/user-projects`, {
      userId,
      projectId,
      assignedByUserId
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data || "Fout bij toewijzen gebruiker aan project");
    }
    throw new Error("Fout bij toewijzen gebruiker aan project");
  }
}

export async function removeUserFromProject(userId: number, projectId: number): Promise<void> {
  await axios.delete(`${API_URL}/user-projects/users/${userId}/projects/${projectId}`);
}
