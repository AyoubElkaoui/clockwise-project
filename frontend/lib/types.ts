export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  address?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  loginName?: string;
  rank?: string;
  role?: string;
  function?: string;
  fullName?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Company {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  projectCount?: number;
}

export interface ProjectGroup {
  id: number;
  name: string;
  GcId?: number;
  GcCode?: string;
  company?: Company;
  companyId?: number;
  projects?: Project[];
}

export interface Project {
  id: number;
  name: string;
  projectGroup?: ProjectGroup;
  projectGroupId?: number;
}

export interface TimeEntry {
  id?: number;
  userId: number;
  date?: string;
  projectId: number;
  projectCode?: string;
  projectName?: string;
  taskName?: string;
  hours?: number;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  hoursWorked?: number;
  km?: number;
  distanceKm?: number;
  expenses?: number;
  travelCosts?: number;
  notes?: string;
  status?: string;
  project?: Project;
  user?: User;
  companyName?: string;
  projectGroupName?: string;
  localStatus?: "draft" | "changed" | "deleted" | "synced";
}

export interface TimeEntryWithDetails extends TimeEntry {
  projectName: string;
  projectGroupName?: string;
  companyName?: string;
}

export interface VacationRequest {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  hours: number;
  reason?: string;
  status: string;
  user?: User;
}

export interface Activity {
  id: number;
  userId: number;
  type: string;
  action?: string;
  message: string;
  details?: string;
  read: boolean;
  timestamp: string;
}

export interface UserProject {
  id: number;
  userId: number;
  projectId: number;
  assignedDate: string;
  assignedByUserId: number;
  user?: User;
  project?: Project;
}

export interface AdminStats {
  totalUsers: number;
  hoursThisMonth: number;
  activeProjects: number;
  pendingVacations: number;
  totalHours: number;
}

export interface ProjectData {
  name: string;
  projectGroupId: number;
}

export interface ToastProps {
  message: string;
  type: "success" | "error";
}

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  loginName: string;
  password: string;
  address: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  rank: string;
  function: string;
}
