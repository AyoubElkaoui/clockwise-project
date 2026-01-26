// API calls voor bedrijven, project groepen en projecten
import axios from "axios";
import { API_URL } from "../api";

export interface Company {
  id: number;
  name: string;
}

export interface ProjectGroup {
  id: number;
  name: string;
  companyId: number;
}

export interface Project {
  id: number;
  name: string;
  projectGroupId: number;
}

// Haal alle companies op
export async function getCompanies(): Promise<Company[]> {
  const response = await axios.get(`${API_URL}/companies`, {
    headers: { "ngrok-skip-browser-warning": "1" },
  });
  return response.data;
}

// Haal project groups op voor een company
export async function getProjectGroups(
  companyId: number,
): Promise<ProjectGroup[]> {
  const response = await axios.get(
    `${API_URL}/project-groups/company/${companyId}`,
    { headers: { "ngrok-skip-browser-warning": "1" } },
  );
  return response.data.map((g: any) => ({
    id: g.gcId,
    name: g.description || g.gcCode,
    companyId: companyId,
  }));
}

// Haal projects op voor een project group
export async function getProjects(projectGroupId: number): Promise<Project[]> {
  const response = await axios.get(
    `${API_URL}/projects/group/${projectGroupId}`,
    { headers: { "ngrok-skip-browser-warning": "1" } },
  );
  return response.data.map((p: any) => ({
    id: p.gcId,
    name: p.gcCode,
    projectGroupId: p.werkgrpGcId,
  }));
}

// Maak een nieuwe project group aan
export async function createProjectGroup(data: {
  name: string;
  companyId: number;
}): Promise<ProjectGroup> {
  const response = await axios.post(`${API_URL}/project-groups`, data);
  return response.data;
}
