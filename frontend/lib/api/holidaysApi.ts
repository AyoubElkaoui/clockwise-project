import { API_URL } from "./index";
import authUtils from "../auth-utils";

export interface Holiday {
  id: number;
  holidayDate: string;
  name: string;
  type: "national" | "company" | "closed";
  isWorkAllowed: boolean;
  createdBy?: number;
  createdAt?: string;
  notes?: string;
}

export async function getHolidays(year?: number): Promise<Holiday[]> {
  const userId = authUtils.getUserId();
  const targetYear = year || new Date().getFullYear();
  
  const response = await fetch(`${API_URL}/holidays?year=${targetYear}`, {
    headers: {
      "X-User-ID": userId?.toString() || "",
      "ngrok-skip-browser-warning": "1",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch holidays");
  }

  return response.json();
}

export async function getHolidayByDate(date: string): Promise<Holiday | null> {
  const userId = authUtils.getUserId();
  
  const response = await fetch(`${API_URL}/holidays/${date}`, {
    headers: {
      "X-User-ID": userId?.toString() || "",
      "ngrok-skip-browser-warning": "1",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to fetch holiday");
  }

  return response.json();
}

export async function createHoliday(data: {
  holidayDate: string;
  name: string;
  type: "company" | "closed";
  isWorkAllowed: boolean;
  notes?: string;
}): Promise<{ id: number }> {
  const userId = authUtils.getUserId();
  
  const response = await fetch(`${API_URL}/holidays`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-ID": userId?.toString() || "",
      "ngrok-skip-browser-warning": "1",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create holiday");
  }

  return response.json();
}

export async function updateHoliday(
  id: number,
  data: {
    isWorkAllowed: boolean;
    notes?: string;
  }
): Promise<void> {
  const userId = authUtils.getUserId();
  
  const response = await fetch(`${API_URL}/holidays/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-User-ID": userId?.toString() || "",
      "ngrok-skip-browser-warning": "1",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update holiday");
  }
}

export async function deleteHoliday(id: number): Promise<void> {
  const userId = authUtils.getUserId();
  
  const response = await fetch(`${API_URL}/holidays/${id}`, {
    method: "DELETE",
    headers: {
      "X-User-ID": userId?.toString() || "",
      "ngrok-skip-browser-warning": "1",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete holiday");
  }
}

export async function toggleWorkAllowed(id: number): Promise<{ isWorkAllowed: boolean }> {
  const userId = authUtils.getUserId();
  
  const response = await fetch(`${API_URL}/holidays/toggle-work/${id}`, {
    method: "POST",
    headers: {
      "X-User-ID": userId?.toString() || "",
      "ngrok-skip-browser-warning": "1",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to toggle work permission");
  }

  return response.json();
}

export async function isWorkingDay(date: string): Promise<boolean> {
  try {
    const holiday = await getHolidayByDate(date);
    if (!holiday) {
      return true; // No holiday, normal working day
    }
    return holiday.isWorkAllowed;
  } catch (error) {
    console.error("Error checking working day:", error);
    return true; // Default to allowing work if check fails
  }
}
