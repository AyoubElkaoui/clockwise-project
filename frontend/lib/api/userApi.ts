// lib/api/userApi.ts
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

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

export interface RegisterUserData {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  loginName: string;
  password: string;
}

export async function getUsers(): Promise<User[]> {
  try {
    const res = await axios.get(`${API_URL}/users`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function getUser(id: number): Promise<User | null> {
  try {
    const res = await axios.get(`${API_URL}/users/${id}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export async function registerUser(data: RegisterUserData): Promise<User> {
  const response = await axios.post(`${API_URL}/users/register`, data);
  return response.data;
}

export async function updateUser(id: number, userData: Partial<User>): Promise<User> {
  const res = await axios.put(`${API_URL}/users/${id}`, userData);
  return res.data;
}

export async function deleteUser(id: number): Promise<void> {
  await axios.delete(`${API_URL}/users/${id}`);
}

export async function login(userInput: string, password: string): Promise<User> {
  const response = await axios.post(`${API_URL}/users/login`, {
    userInput,
    password,
  });

  const user = response.data;
  
  if (!user || !user.id) {
    throw new Error("Invalid server response");
  }

  // Save to localStorage
  localStorage.clear();
  localStorage.setItem("userId", String(user.id));
  localStorage.setItem("firstName", user.firstName || "");
  localStorage.setItem("lastName", user.lastName || "");
  localStorage.setItem("userRank", user.rank || "user");

  // Set X-MEDEW-GC-ID header for all subsequent requests
  axios.defaults.headers.common['X-MEDEW-GC-ID'] = user.id;

  return user;
}
