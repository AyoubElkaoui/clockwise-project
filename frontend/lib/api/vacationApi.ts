// lib/api/vacationApi.ts
import axios from "axios";

const API_URL = "/api";

export interface VacationRequest {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  hours: number;
  reason: string;
  status: string;
}

export interface CreateVacationRequest {
  userId: number;
  startDate: string;
  endDate: string;
  hours: number;
  reason: string;
  status: string;
}

export async function getVacationRequests(): Promise<VacationRequest[]> {
  try {
    const res = await axios.get(`${API_URL}/vacation-requests`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Error fetching vacation requests:", error);
    return [];
  }
}

export async function registerVacationRequest(data: CreateVacationRequest): Promise<VacationRequest> {
  const response = await axios.post(`${API_URL}/vacation-requests`, data);
  return response.data;
}
