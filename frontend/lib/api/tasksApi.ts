import axios from '../api';

// Types
export interface Task {
  id: number;
  code: string;
  description: string;
  shortName?: string;
  isHistorical: boolean;
}

export interface TasksResponse {
  tasks: Task[];
  totalCount: number;
}

export interface LeaveType {
  id: number;
  code: string;
  description: string;
  shortName?: string;
  isHistorical: boolean;
  category: string;
}

export interface LeaveTypesResponse {
  leaveTypes: LeaveType[];
  totalCount: number;
}

export interface LeaveBooking {
  bookingId: number;
  date: string;
  hours: number;
  description?: string;
  taskId: number;
  taskCode: string;
  taskDescription: string;
  category: string;
}

export interface MyLeaveResponse {
  bookings: LeaveBooking[];
  totalHours: number;
}

export interface LeaveBookingEntry {
  date: string;
  hours: number;
  description?: string;
}

export interface BookLeaveRequest {
  taskId: number;
  entries: LeaveBookingEntry[];
}

export interface BookLeaveResponse {
  success: boolean;
  createdBookingIds: number[];
  message: string;
  warnings?: string[];
}

// API Functions

/**
 * Haalt alle taken op uit AT_TAAK.
 */
export const getTasks = async (includeHistorical: boolean = false): Promise<TasksResponse> => {
  const response = await axios.get<TasksResponse>('/api/tasks', {
    params: { includeHistorical }
  });
  return response.data;
};

/**
 * Haalt één specifieke taak op.
 */
export const getTaskById = async (id: number): Promise<Task> => {
  const response = await axios.get<Task>(`/api/tasks/${id}`);
  return response.data;
};

/**
 * Haalt alle leave/vacation types op (Z-codes).
 */
export const getLeaveTypes = async (includeHistorical: boolean = false): Promise<LeaveTypesResponse> => {
  const response = await axios.get<LeaveTypesResponse>('/api/leave/types', {
    params: { includeHistorical }
  });
  return response.data;
};

/**
 * Haalt leave bookings op voor de ingelogde medewerker.
 */
export const getMyLeave = async (from: string, to: string): Promise<MyLeaveResponse> => {
  const response = await axios.get<MyLeaveResponse>('/api/leave/my', {
    params: { from, to }
  });
  return response.data;
};

/**
 * Boekt verlof/vakantie.
 */
export const bookLeave = async (request: BookLeaveRequest): Promise<BookLeaveResponse> => {
  const response = await axios.post<BookLeaveResponse>('/api/leave/book', request);
  return response.data;
};
