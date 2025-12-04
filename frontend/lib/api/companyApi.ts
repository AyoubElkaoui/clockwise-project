// API calls voor bedrijven, project groepen en projecten
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

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
  try {
    console.log("Fetching companies from:", `${API_URL}/companies`);
    const response = await axios.get(`${API_URL}/companies`);
    console.log("Companies response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching companies:", error);
    throw error;
  }
}

// Haal project groups op voor een company
export async function getProjectGroups(companyId: number): Promise<ProjectGroup[]> {
  try {
    const response = await axios.get(`${API_URL}/project-groups/company/${companyId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching project groups:", error);
    throw error;
  }
}

// Haal projects op voor een project group
export async function getProjects(projectGroupId: number): Promise<Project[]> {
  try {
    const response = await axios.get(`${API_URL}/projects/group/${projectGroupId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }
}

// Maak een nieuwe project group aan
export async function createProjectGroup(data: { name: string; companyId: number }): Promise<ProjectGroup> {
  try {
    const response = await axios.post(`${API_URL}/project-groups`, data);
    return response.data;
  } catch (error) {
    console.error("Error creating project group:", error);
    throw error;
  }
}
