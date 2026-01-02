import axios from "axios";
import { API_URL } from "./api";

const getAuthHeaders = () => {
  const medewGcId = localStorage.getItem("medewGcId");
  return medewGcId ? { "X-MEDEW-GC-ID": medewGcId } : {};
};

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
  const response = await axios.get(`${API_URL}/workflow/submitted`, {
    params: { urenperGcId },
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
