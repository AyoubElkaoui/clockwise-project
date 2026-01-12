import axios from "axios";
import authUtils from "./auth-utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Types
export interface SaveDraftRequest {
  urenperGcId: number;
  taakGcId: number;
  werkGcId?: number;
  datum: string;
  aantal: number;
  omschrijving?: string;
}

export interface SubmitTimeEntriesRequest {
  urenperGcId: number;
  entryIds: number[];
}

export interface ReviewTimeEntriesRequest {
  entryIds: number[];
  approve: boolean;
  rejectionReason?: string;
}

export interface WorkflowEntry {
  id: number;
  medewGcId: number;
  urenperGcId: number;
  taakGcId: number;
  werkGcId?: number;
  datum: string;
  aantal: number;
  omschrijving?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: number;
  rejectionReason?: string;
  firebirdGcId?: number;
  employeeName?: string;
  taakCode?: string;
  taakDescription?: string;
  werkCode?: string;
  werkDescription?: string;
}

export interface DraftResponse {
  message: string;
  entry: WorkflowEntry;
  isDuplicate: boolean;
}

export interface WorkflowResponse {
  message: string;
  successCount: number;
  failedCount: number;
  entries: WorkflowEntry[];
}

export interface WorkflowEntriesResponse {
  entries: WorkflowEntry[];
  totalCount: number;
}

// Helper function to get headers
const getHeaders = () => {
  const medewGcId = authUtils.getUserId();
  const userRole = authUtils.getRole();
  
  return {
    "Content-Type": "application/json",
    "X-MEDEW-GC-ID": medewGcId?.toString() || "",
    "X-USER-ROLE": userRole || "",
  };
};

/**
 * Save a time entry as draft
 */
export async function saveDraft(data: SaveDraftRequest): Promise<DraftResponse> {
  const response = await axios.post(`${API_URL}/api/workflow/draft`, data, {
    headers: getHeaders(),
  });
  return response.data;
}

/**
 * Get all drafts for a period
 */
export async function getDrafts(urenperGcId: number): Promise<WorkflowEntriesResponse> {
  const response = await axios.get(`${API_URL}/api/workflow/drafts`, {
    headers: getHeaders(),
    params: { urenperGcId },
  });
  return response.data;
}

/**
 * Get all submitted entries for a period
 */
export async function getSubmitted(urenperGcId: number): Promise<WorkflowEntriesResponse> {
  const response = await axios.get(`${API_URL}/api/workflow/submitted`, {
    headers: getHeaders(),
    params: { urenperGcId },
  });
  return response.data;
}

/**
 * Get all rejected entries for a period
 */
export async function getRejected(urenperGcId: number): Promise<WorkflowEntriesResponse> {
  const response = await axios.get(`${API_URL}/api/workflow/rejected`, {
    headers: getHeaders(),
    params: { urenperGcId },
  });
  return response.data;
}

/**
 * Submit draft entries for manager review
 */
export async function submitEntries(data: SubmitTimeEntriesRequest): Promise<WorkflowResponse> {
  const response = await axios.post(`${API_URL}/api/workflow/submit`, data, {
    headers: getHeaders(),
  });
  return response.data;
}

/**
 * Resubmit rejected entries
 */
export async function resubmitRejected(data: SubmitTimeEntriesRequest): Promise<WorkflowResponse> {
  const response = await axios.post(`${API_URL}/api/workflow/resubmit`, data, {
    headers: getHeaders(),
  });
  return response.data;
}

/**
 * Delete a draft entry
 */
export async function deleteDraft(id: number): Promise<{ message: string }> {
  const response = await axios.delete(`${API_URL}/api/workflow/draft/${id}`, {
    headers: getHeaders(),
  });
  return response.data;
}

/**
 * Get pending entries for manager review
 */
export async function getPendingReview(urenperGcId: number): Promise<WorkflowEntriesResponse> {
  const response = await axios.get(`${API_URL}/api/workflow/review/pending`, {
    headers: getHeaders(),
    params: { urenperGcId },
  });
  return response.data;
}

/**
 * Get all workflow entries for a period (manager only)
 */
export async function getAllWorkflowEntries(
  urenperGcId: number,
  status?: string
): Promise<WorkflowEntriesResponse> {
  const response = await axios.get(`${API_URL}/api/workflow/entries`, {
    headers: getHeaders(),
    params: { urenperGcId, status },
  });
  return response.data;
}

/**
 * Review (approve/reject) time entries (manager only)
 */
export async function reviewEntries(data: ReviewTimeEntriesRequest): Promise<WorkflowResponse> {
  const response = await axios.post(`${API_URL}/api/workflow/review`, data, {
    headers: getHeaders(),
  });
  return response.data;
}
