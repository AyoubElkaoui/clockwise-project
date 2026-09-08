// lib/api/userApi.ts
import axios from "axios";
import { API_URL } from "../api";

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  loginName: string;
  rank: string;
}

export async function getUsers(): Promise<User[]> {
  try {
    const res = await axios.get(`${API_URL}/users`);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

export async function getUser(id: number): Promise<User | null> {
  try {
    const res = await axios.get(`${API_URL}/users/${id}`);
    return res.data;
  } catch {
    return null;
  }
}


export async function updateUser(id: number, userData: Partial<User>): Promise<User> {
  const res = await axios.put(`${API_URL}/users/${id}`, userData);
  return res.data;
}


