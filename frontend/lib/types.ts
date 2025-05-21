// 1. Maak een types.ts bestand aan in je frontend/lib map

// Definieer je belangrijkste types hier
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
    function?: string;
    fullName?: string;
}

export interface Company {
    id: number;
    name: string;
}

export interface ProjectGroup {
    id: number;
    name: string;
    company?: Company;
    companyId?: number;
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
    projectId: number;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    distanceKm?: number;
    travelCosts?: number;
    expenses?: number;
    notes: string;
    status?: string;
    project?: Project;
    user?: User;
    localStatus?: "draft" | "changed" | "deleted" | "synced";
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

// Aanvulling voor frontend/lib/types.ts

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