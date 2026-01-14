import axios from "axios";
import { API_URL } from "./api";
import authUtils from "./auth-utils";
import dayjs from "dayjs";

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
  try {
    const response = await axios.get(`${API_URL}/periods?count=50`);
    const periods = response.data;
    
    if (!Array.isArray(periods) || periods.length === 0) {
      throw new Error("No periods found");
    }
    
    // Find period that contains today's date
    const today = dayjs();
    const currentPeriod = periods.find((p: any) => {
      const startDate = dayjs(p.startDate || p.gcVanDatum);
      const endDate = dayjs(p.endDate || p.gcTotDatum);
      return today.isAfter(startDate) && today.isBefore(endDate);
    });
    
    if (currentPeriod) {
      return currentPeriod.gcId || currentPeriod.id;
    }
    
    // If no matching period, return the most recent one
    const sorted = periods.sort((a: any, b: any) => {
      const dateA = new Date(a.startDate || a.gcVanDatum);
      const dateB = new Date(b.startDate || b.gcVanDatum);
      return dateB.getTime() - dateA.getTime();
    });
    
    return sorted[0].gcId || sorted[0].id;
  } catch (error) {
    console.error("Error getting current period:", error);
    // Fallback to a default period ID
    return 100426;
  }
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
  const response = await axios.get(`${API_URL}/workflow/review/pending`, {
    params: { urenperGcId },
    headers: getAuthHeaders(),
  });
  return response.data;
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
