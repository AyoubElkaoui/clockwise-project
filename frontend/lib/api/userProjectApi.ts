// lib/api/userProjectApi.ts
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

export interface UserProject {
  id: number;
  userId: number;
  projectId: number;
  assignedByUserId: number;
  assignedAt: string;
}

export async function getUserProjects(userId: number): Promise<UserProject[]> {
  try {
    const res = await axios.get(`${API_URL}/user-projects/users/${userId}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("❌ Error fetching user projects:", error);
    return [];
  }
}

export async function getProjectUsers(projectId: number): Promise<UserProject[]> {
  try {
    const res = await axios.get(`${API_URL}/user-projects/projects/${projectId}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("❌ Error fetching project users:", error);
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
