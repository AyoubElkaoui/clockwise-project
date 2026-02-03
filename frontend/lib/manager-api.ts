import axios from "axios";
import { API_URL } from "./api";
import authUtils from "./auth-utils";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const getAuthHeaders = () => {
  const medewGcId = localStorage.getItem("medewGcId");
  const userRole = authUtils.getRole();
  return medewGcId ? { 
    "X-MEDEW-GC-ID": medewGcId,
    "X-USER-ROLE": userRole || ""
  } : {};
};

// Helper function to get current period ID
export async function getCurrentPeriodId(): Promise<number> {
  const response = await axios.get(`${API_URL}/periods?count=50`);
  const periods = response.data;

  if (!Array.isArray(periods) || periods.length === 0) {
    throw new Error("Geen periodes gevonden in database");
  }

  // Find period that contains today's date
  const today = dayjs();
  const currentPeriod = periods.find((p: any) => {
    const startDate = dayjs(p.beginDatum || p.startDate || p.gcVanDatum);
    const endDate = dayjs(p.endDatum || p.endDate || p.gcTotDatum);
    return today.isSameOrAfter(startDate, 'day') && today.isSameOrBefore(endDate, 'day');
  });

  if (currentPeriod) {
    return currentPeriod.gcId || currentPeriod.id;
  }

  // If no matching period, return the most recent one
  const sorted = periods.sort((a: any, b: any) => {
    const dateA = new Date(a.beginDatum || a.startDate || a.gcVanDatum);
    const dateB = new Date(b.beginDatum || b.startDate || b.gcVanDatum);
    return dateB.getTime() - dateA.getTime();
  });

  if (!sorted[0]) {
    throw new Error("Geen geldige periode gevonden");
  }

  return sorted[0].gcId || sorted[0].id;
}

export interface TimeEntryDto {
  id: number;
  userId: number;
  date: string;
  hours: number;
  projectId: number;
  notes?: string;
  status: string;
  userFirstName?: string;
  userLastName?: string;
  projectCode?: string;
  projectName?: string;
}

export interface TimeEntryStatsDto {
  totalUsers: number;
  totalEntries: number;
  pendingApprovals: number;
  approvedEntries: number;
  hoursThisWeek: number;
  hoursThisMonth: number;
}

export async function getManagerStats(): Promise<TimeEntryStatsDto> {
  const response = await axios.get(`${API_URL}/manager/dashboard/stats`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function getAllTimeEntries(from?: string, to?: string): Promise<TimeEntryDto[]> {
  const params = new URLSearchParams();
  if (from) params.append("from", from);
  if (to) params.append("to", to);

  const response = await axios.get(`${API_URL}/manager/time-entries?${params}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function getPendingApprovals(): Promise<TimeEntryDto[]> {
  const response = await axios.get(`${API_URL}/manager/time-entries/pending`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function approveTimeEntry(id: number, approved: boolean): Promise<void> {
  await axios.put(
    `${API_URL}/manager/time-entries/${id}/approve`,
    { approved },
    { headers: getAuthHeaders() }
  );
}

export async function getAllUsers(): Promise<any[]> {
  const response = await axios.get(`${API_URL}/manager/users`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

// ============================================================================
// WORKFLOW API - For time entry approval workflow
// ============================================================================

export interface WorkflowEntry {
  id: number;
  medewGcId: number;
  urenperGcId: number;
  taakGcId: number;
  werkGcId?: number;
  datum: string;
  aantal: number;
  omschrijving?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: number;
  rejectionReason?: string;
  firebirdGcId?: number;
  createdAt: string;
  updatedAt: string;
  // Enriched data
  employeeName?: string;
  taakCode?: string;
  taakDescription?: string;
  werkCode?: string;
  werkDescription?: string;
}

export interface WorkflowEntriesResponse {
  entries: WorkflowEntry[];
  totalCount: number;
  totalHours: number;
}

/**
 * Get all submitted time entries awaiting approval (for managers)
 */
export async function getSubmittedWorkflowEntries(urenperGcId: number): Promise<WorkflowEntriesResponse> {
  console.log("=== getSubmittedWorkflowEntries START ===");
  console.log("API_URL:", API_URL);
  console.log("urenperGcId:", urenperGcId);
  
  const headers = getAuthHeaders();
  console.log("Headers:", headers);
  
  try {
    const response = await axios.get(`${API_URL}/workflow/review/pending`, {
      params: { urenperGcId },
      headers,
    });
    console.log("Response status:", response.status);
    console.log("Response data:", response.data);
    console.log("=== getSubmittedWorkflowEntries END ===");
    return response.data;
  } catch (error) {
    console.error("=== getSubmittedWorkflowEntries ERROR ===");
    console.error("Error:", error);
    if (axios.isAxiosError(error)) {
      console.error("Response status:", error.response?.status);
      console.error("Response data:", error.response?.data);
    }
    throw error;
  }
}

/**
 * Get all workflow entries for a period with optional status filter
 * @param urenperGcId Period ID
 * @param status Optional status filter: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' or undefined for all
 */
export async function getAllWorkflowEntries(
  urenperGcId: number, 
  status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
): Promise<WorkflowEntriesResponse> {
  const response = await axios.get(`${API_URL}/workflow/entries`, {
    params: { urenperGcId, status },
    headers: getAuthHeaders(),
  });
  return response.data;
}

/**
 * Review (approve/reject) workflow entries
 */
export async function reviewWorkflowEntries(
  entryIds: number[],
  approve: boolean,
  rejectionReason?: string
): Promise<{ success: boolean; message: string; processedCount: number; errors: string[] }> {
  const response = await axios.post(
    `${API_URL}/workflow/review`,
    { entryIds, approve, rejectionReason },
    { headers: getAuthHeaders() }
  );
  return response.data;
}

// ============================================================================
// VACATION API - For vacation request management
// ============================================================================

export interface VacationRequest {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  managerComment?: string;
  createdAt?: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    function?: string;
  };
}

/**
 * Get all vacation requests (optionally filtered by user)
 */
export async function getAllVacationRequests(userId?: number): Promise<VacationRequest[]> {
  const response = await axios.get(`${API_URL}/vacation/all`, {
    headers: getAuthHeaders(),
  });

  let data = response.data;
  if (userId) {
    data = data.filter((r: VacationRequest) => r.userId === userId);
  }

  return data;
}

/**
 * Update vacation request status (approve/reject)
 */
export async function updateVacationRequestStatus(
  id: number,
  status: 'approved' | 'rejected',
  managerComment?: string
): Promise<void> {
  const managerId = localStorage.getItem("userId");
  
  if (status === 'approved') {
    await axios.post(
      `${API_URL}/vacation/${id}/approve`,
      { managerComment, reviewedBy: Number(managerId) },
      { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }
    );
  } else if (status === 'rejected') {
    await axios.post(
      `${API_URL}/vacation/${id}/reject`,
      { managerComment, reviewedBy: Number(managerId) },
      { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }
    );
  }
}
