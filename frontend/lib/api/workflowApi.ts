// API calls voor workflow (draft/submit/approve/reject)
import axios from "axios";

const API_URL = "/api";

// Ensure X-MEDEW-GC-ID header is set
axios.interceptors.request.use((request) => {
  if (typeof window !== "undefined") {
    const medewGcId = localStorage.getItem("medewGcId");
    if (medewGcId && !request.headers["X-MEDEW-GC-ID"]) {
      request.headers.set("X-MEDEW-GC-ID", medewGcId);
    }
  }
  return request;
});

// Types
export interface SaveDraftRequest {
  id?: number; // Optional: if provided, updates existing draft
  urenperGcId: number;
  taakGcId: number;
  werkGcId: number | null;
  datum: string;
  aantal: number;
  omschrijving: string;
  eveningNightHours?: number;
  travelHours?: number;
  distanceKm?: number;
  travelCosts?: number;
  otherExpenses?: number;
}

export interface WorkflowEntry {
  id: number;
  medewGcId: number;
  urenperGcId: number;
  taakGcId: number;
  werkGcId: number | null;
  datum: string;
  aantal: number;
  omschrijving: string;
  eveningNightHours?: number;
  travelHours?: number;
  distanceKm?: number;
  travelCosts?: number;
  otherExpenses?: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: number | null;
  rejectionReason: string | null;
  firebirdGcId: number | null;
  // Enriched data from Firebird
  taakCode?: string;
  taakDescription?: string;
  werkCode?: string;
  werkDescription?: string;
  medewName?: string;
  periodCode?: string;
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

// Save or update a draft
export async function saveDraft(data: SaveDraftRequest): Promise<WorkflowEntry> {
  const response = await axios.post(`${API_URL}/workflow/draft`, data);
  return response.data;
}

// Get all drafts for current user and period
export async function getDrafts(urenperGcId: number): Promise<WorkflowEntry[]> {
  const response = await axios.get(`${API_URL}/workflow/drafts?urenperGcId=${urenperGcId}`);
  return response.data.entries || [];
}

// Get submitted entries for current user
export async function getSubmitted(urenperGcId: number): Promise<WorkflowEntry[]> {
  const response = await axios.get(`${API_URL}/workflow/submitted?urenperGcId=${urenperGcId}`);
  return response.data.entries || [];
}

// Get rejected entries for current user
export async function getRejected(urenperGcId: number): Promise<WorkflowEntry[]> {
  const response = await axios.get(`${API_URL}/workflow/rejected?urenperGcId=${urenperGcId}`);
  return response.data.entries || [];
}

// Submit draft entries for manager review
export async function submitEntries(data: SubmitTimeEntriesRequest): Promise<void> {
  await axios.post(`${API_URL}/workflow/submit`, data);
}

// Resubmit rejected entries
export async function resubmitRejected(data: SubmitTimeEntriesRequest): Promise<void> {
  await axios.post(`${API_URL}/workflow/resubmit`, data);
}

// Delete a draft entry
export async function deleteDraft(id: number): Promise<void> {
  await axios.delete(`${API_URL}/workflow/draft/${id}`);
}

// Get pending reviews (for managers)
export async function getPendingReview(urenperGcId: number): Promise<WorkflowEntry[]> {
  const response = await axios.get(`${API_URL}/workflow/review/pending?urenperGcId=${urenperGcId}`);
  return response.data.entries || [];
}

// Review (approve/reject) entries (for managers)
export async function reviewEntries(data: ReviewTimeEntriesRequest): Promise<void> {
  await axios.post(`${API_URL}/workflow/review`, data);
}
