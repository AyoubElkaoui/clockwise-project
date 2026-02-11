// API calls for favorite projects
import axios from "axios";
import { API_URL } from "../api";

export interface FavoriteProject {
  id: number;
  userId: number;
  projectGcId: number;
  projectCode?: string;
  projectName?: string;
  projectGroupName?: string;
  companyName?: string;
  createdAt: string;
}

// Ensure headers are set
axios.interceptors.request.use((request) => {
  if (typeof window !== "undefined") {
    const userId = localStorage.getItem("userId");
    const medewGcId = localStorage.getItem("medewGcId");

    if (userId && !request.headers["X-USER-ID"]) {
      request.headers.set("X-USER-ID", userId);
    }
    if (medewGcId && !request.headers["X-MEDEW-GC-ID"]) {
      request.headers.set("X-MEDEW-GC-ID", medewGcId);
    }
  }
  return request;
});

/**
 * Get all favorite projects for the current user
 */
export async function getFavoriteProjects(): Promise<FavoriteProject[]> {
  const response = await axios.get(`${API_URL}/favorite-projects`);
  // Filter out any entries with invalid projectGcId (0 or missing)
  return (response.data || []).filter((f: FavoriteProject) => f.projectGcId > 0);
}

/**
 * Add a project to favorites
 */
export async function addFavoriteProject(projectGcId: number): Promise<FavoriteProject> {
  const response = await axios.post(`${API_URL}/favorite-projects`, { projectGcId });
  return response.data;
}

/**
 * Remove a project from favorites
 */
export async function removeFavoriteProject(projectGcId: number): Promise<void> {
  await axios.delete(`${API_URL}/favorite-projects/${projectGcId}`);
}

/**
 * Check if a project is favorited
 */
export async function isFavoriteProject(projectGcId: number): Promise<boolean> {
  const response = await axios.get(`${API_URL}/favorite-projects/check/${projectGcId}`);
  return response.data.isFavorite;
}
