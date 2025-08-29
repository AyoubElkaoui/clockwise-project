// Updated types.ts to match the new models with manager hierarchy and processing tracking
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
    rank: 'user' | 'manager' | 'admin'; // Add rank field
    function?: string;
    managerId?: number | null; // Add manager ID field
    manager?: {
        id: number;
        firstName: string;
        lastName: string;
        fullName: string;
    } | null; // Add manager object
    fullName: string;
    // Helper properties that might come from the backend
    isAdmin?: boolean;
    isManager?: boolean;
    isNormalUser?: boolean;
}

// Manager interface for navigation properties
export interface Manager {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    Rank?: string;
}

// Enhanced ProcessedByUser interface
export interface ProcessedByUser {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    Rank: string; // Include processor type
}

// Updated TimeEntry interface with processing tracking
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

    // Processing tracking fields
    processedBy?: number;
    processedByUser?: ProcessedByUser;
    processedDate?: string;
    processingNotes?: string;
    requestDate?: string;

    // Navigation properties
    project?: Project;
    user?: User;

    // Helper properties
    totalHours?: number;
    isApproved?: boolean;
    isPending?: boolean;
    isDraft?: boolean;
    hasBeenProcessed?: boolean;
    processingDuration?: number;
    canApprove?: boolean;

    // Frontend-specific
    localStatus?: "draft" | "changed" | "deleted" | "synced";
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

// Updated VacationRequest interface to support two-step approval
export interface VacationRequest {
    id: number;
    userId: number;
    startDate: string;
    endDate: string;
    hours: number;
    reason?: string;

    // UPDATED: New status values for two-step approval
    status: 'pending' | 'manager_approved' | 'approved' | 'rejected';

    // NEW: Helper properties for display
    approvalStage?: string; // "Pending Manager Approval", "Pending Admin Approval", etc.
    nextApprover?: string; // "Manager", "Admin", etc.

    // MANAGER APPROVAL TRACKING (NEW)
    managerApprovedBy?: number;
    managerApprovedByUser?: {
        id: number;
        firstName: string;
        lastName: string;
        fullName: string;
        rank: string;
    };
    managerApprovedDate?: string;
    managerApprovalNotes?: string;

    // ADMIN FINAL PROCESSING TRACKING (EXISTING, but now final step)
    processedBy?: number;
    processedByUser?: {
        id: number;
        firstName: string;
        lastName: string;
        fullName: string;
        rank: string;
    };
    processedDate?: string;
    processingNotes?: string;

    // Original submission tracking
    requestDate: string;

    // User information
    user?: {
        id: number;
        firstName: string;
        lastName: string;
        fullName: string;
        rank: string;
        managerId?: number;
        managerIds?: number[];
        manager?: {
            id: number;
            firstName: string;
            lastName: string;
            fullName: string;
            rank?: string;
        };
    };

    // Helper properties for UI
    workingDays?: number;
    hasBeenProcessed?: boolean;
    canBeProcessed?: boolean;
    processingDuration?: number;
    managerApprovalDuration?: number; // NEW: Time taken for manager approval
}

// Utility functions for status handling (inline usage only)
export function getStatusBadgeClass(status: string): string {
    switch (status) {
        case 'pending': return 'badge-warning';
        case 'manager_approved': return 'badge-info';
        case 'approved': return 'badge-success';
        case 'rejected': return 'badge-error';
        default: return 'badge-secondary';
    }
}

export function getStatusText(status: string): string {
    switch (status) {
        case 'pending': return '⏳ Wacht op Manager';
        case 'manager_approved': return '👨‍💼 Wacht op Admin';
        case 'approved': return '✅ Volledig Goedgekeurd';
        case 'rejected': return '❌ Afgewezen';
        default: return '❓ Onbekende Status';
    }
}

export function getApprovalStage(status: string): string {
    switch (status) {
        case 'pending': return 'Pending Manager Approval';
        case 'manager_approved': return 'Pending Admin Approval';
        case 'approved': return 'Fully Approved';
        case 'rejected': return 'Rejected';
        default: return 'Unknown Status';
    }
}

export function getNextApprover(status: string): string {
    switch (status) {
        case 'pending': return 'Manager';
        case 'manager_approved': return 'Admin';
        case 'approved': return 'None - Completed';
        case 'rejected': return 'None - Rejected';
        default: return 'Unknown';
    }
}

// NEW: Updated statistics interface to reflect two-step approval
export interface VacationRequestStats {
    totalRequests: number;
    pendingManagerApproval: number; // NEW: Requests waiting for manager
    pendingAdminApproval: number; // NEW: Requests waiting for admin
    fullyApproved: number; // UPDATED: Fully approved requests
    rejected: number;
    totalHoursRequested: number;
    totalHoursApproved: number;

    // UPDATED: Processing times for both steps
    averageManagerApprovalTime: number; // NEW: Time for manager to approve
    averageAdminProcessingTime: number; // NEW: Time for admin to process after manager approval
    averageTotalProcessingTime: number; // Total time from submission to final decision

    // NEW: Manager approval statistics
    topManagerApprovers: Array<{
        managerId: number;
        managerName: string;
        approvedCount: number;
        averageApprovalTime: number;
    }>;

    // UPDATED: Admin processing statistics
    topAdminProcessors: Array<{
        adminId: number;
        adminName: string;
        adminType: string;
        processedCount: number;
        approvedCount: number;
        rejectedCount: number;
        averageProcessingTime: number;
    }>;

    processingByRank: Array<{
        rank: string;
        totalProcessed: number;
        approved: number;
        rejected: number;
        averageProcessingTime: number;
    }>;

    requestsByRank: Array<{
        rank: string;
        totalRequests: number;
        pendingManager: number; // NEW
        pendingAdmin: number; // NEW
        approved: number;
        rejected: number;
        averageHours: number;
    }>;
}

// NEW: DTO for manager approval
export interface ManagerApprovalDto {
    managerId: number;
    notes?: string;
}

// UPDATED: DTO for admin processing (final step)
export interface ProcessVacationRequestDto {
    status: "approved" | "rejected";
    processedByUserId: number;
    processingNotes?: string;
}

export interface ProcessTimeEntryDto {
    notes?: string;
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

// Enhanced AdminStats with user type breakdown
export interface AdminStats {
    totalUsers: number;
    hoursThisMonth: number;
    activeProjects: number;
    pendingVacations: number;
    totalHours: number;

    // Enhanced statistics
    usersByType?: Record<string, number>;
    entriesByStatus?: Record<string, number>;
    totalApprovedHours?: number;
    totalPendingEntries?: number;
    totalProcessedEntries?: number;
}

// New ManagerStats interface
export interface ManagerStats {
    totalUsers: number;
    hoursThisMonth: number;
    activeProjects: number;
    pendingVacations: number;
    totalHours: number;
    managersCount: number;
    adminsCount: number;
}

// User hierarchy interfaces
export interface UserHierarchy {
    admins: Array<{
        id: number;
        fullName: string;
        Rank: string;
        function?: string;
    }>;
    managers: Array<{
        id: number;
        fullName: string;
        Rank: string;
        function?: string;
        teamSize: number;
        teamMembers: Array<{
            id: number;
            fullName: string;
            function?: string;
        }>;
    }>;
    unassignedUsers: Array<{
        id: number;
        fullName: string;
        Rank: string;
        function?: string;
    }>;
}

export interface ProjectData {
    name: string;
    projectGroupId: number;
}

export interface ToastProps {
    message: string;
    type: "success" | "error";
}

// Updated UserFormData with manager support
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
    Rank: string;
    function: string;
    managerId?: number;
}

// Enhanced vacation overview interfaces
export interface VacationOverviewItem {
    user: {
        id: number;
        fullName: string;
        firstName: string;
        lastName: string;
        Rank: string;
        managerId?: number;
        manager?: {
            id: number;
            fullName: string;
            Rank?: string;
        };
        function?: string;
    };
    balance: {
        totalHours: number;
        usedHours: number;
        pendingHours: number;
        remainingHours: number;
        utilizationPercentage: number;
    };
}

// Time entry processing statistics
export interface TimeEntryProcessingStats {
    totalProcessedEntries: number;
    processingByRank: Array<{
        Rank: string;
        count: number;
    }>;
    processingByStatus: Array<{
        status: string;
        count: number;
    }>;
    topProcessors: Array<{
        processorId: number;
        processorName: string;
        processorType: string;
        processedCount: number;
        approvedCount: number;
    }>;
    averageProcessingTime: number;
}
